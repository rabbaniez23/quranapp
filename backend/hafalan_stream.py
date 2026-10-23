"""Cek hafalan real-time per kata (mode AI penuh).

Audio mic masuk sedikit demi sedikit. Setiap kali ada audio baru, model mendengar fonem
(huruf + harakat + panjang mad) dari awal bagian yang sedang dibaca, lalu dicocokkan dengan
teks ayat. Kata dinilai begitu pembaca sudah mulai mengucapkan kata sesudahnya, atau saat
pembaca berhenti sejenak (waqaf).

Kalau ada kata yang salah: kirim event "salah", lalu langsung dengarkan lagi. Pembaca boleh
mengulang dari kata yang salah atau dari awal ayat.
"""
import threading

import numpy as np
from diff_match_patch import diff_match_patch
from rapidfuzz.distance import Levenshtein
from quran_transcript import Aya

from tajwid import (SAMPLE_RATE, analyze_recitation, check_words_lenient, phonetize,
                    simplified_spans, simplify_phonemes)

_DMP = diff_match_patch()

# Bacaan pembuka yang boleh dibaca sebelum ayat tanpa dianggap salah
BASMALAH = Aya(1, 1).get().uthmani
TAAWUDZ = Aya(1, 1).get().istiaatha_uthmani

SILENCE_SECONDS = 0.4    # diam selama ini = berhenti (waqaf / selesai ayat)
RESTART_BACK_WORDS = 5   # setelah salah, boleh mengulang dari maksimal 5 kata sebelumnya
REPEAT_BACK_WORDS = 12   # mengulang (murojaah) boleh mundur sampai 12 kata
REPEAT_SEARCH_BACK = 8   # pengulangan boleh mulai sampai 8 bunyi sebelum/sesudah awal kata yang dinilai
REPEAT_MIN_PHONEMES = 10 # pengulangan baru diakui kalau sudah cocok sepanjang ini
REPEAT_MAX_DISTANCE = 0.25
REPEAT_PENDING = -1      # tanda: mungkin sedang mulai mengulang, tunggu bunyi berikutnya
MAX_PREFIX_DISTANCE = 0.35
MAX_JUNK_PHONEMES = 20  # bunyi sisa di awal yang boleh dilewati saat mencari titik mulai
KEEP_TAIL_SAMPLES = int(0.3 * SAMPLE_RATE)
FRONTIER_FINAL = 0.8     # saat berhenti, kata terakhir dinilai kalau sudah 80% terucap


# --- Bantuan audio ---
def _frame_rms(wave: np.ndarray, frame: int = 800) -> np.ndarray:
    n = len(wave) // frame
    if n == 0:
        return np.zeros(1, np.float32)
    return np.sqrt((wave[: n * frame].reshape(n, frame) ** 2).mean(axis=1))


def _speech_level(wave: np.ndarray) -> float:
    return float(np.percentile(_frame_rms(wave), 90))


def _has_speech(wave: np.ndarray) -> bool:
    return _speech_level(wave) > 0.01


def _trailing_silence(wave: np.ndarray) -> bool:
    n = int(SILENCE_SECONDS * SAMPLE_RATE)
    if len(wave) < n * 2:
        return False
    tail = float(np.sqrt((wave[-n:] ** 2).mean()))
    return tail < max(0.004, 0.2 * _speech_level(wave))


# --- Bantuan pencocokan fonem ---
def _covered(ref: str, pred: str) -> tuple[int, int]:
    """Sampai posisi mana di `ref` yang sudah terdengar, dan berapa fonem kelebihan di luar `ref`."""
    window = ref[: int(len(pred) * 1.5) + 20]
    diffs = _DMP.diff_main(window, pred, False)
    while True:
        while diffs and diffs[-1][0] == -1:  # bagian ref yang belum dibaca
            diffs.pop()
        # Jangan melompat: lompatan besar di ref yang cuma diikuti sedikit kecocokan berarti
        # kebetulan cocok dengan huruf di kata jauh di depan (mis. mad panjang "ۥۥۥۥ"), bukan bacaan
        tail_equal, cut = 0, None
        for idx in range(len(diffs) - 1, -1, -1):
            op, t = diffs[idx]
            if op == 0:
                tail_equal += len(t)
            elif op == -1 and len(t) >= 3:
                if tail_equal < 6:
                    cut = idx
                break
        if cut is None:
            break
        diffs = diffs[:cut]
    covered = sum(len(t) for op, t in diffs if op != 1)
    # Fonem di pred setelah kecocokan terakhir = kelebihan (sudah masuk ayat berikutnya)
    trailing_insert = 0
    for op, t in reversed(diffs):
        if op != 1:
            break
        trailing_insert += len(t)
    trailing_insert += len(pred) - sum(len(t) for op, t in diffs if op != -1)  # bagian pred yang terpotong
    reached_end = len(window) == len(ref) and covered >= len(ref) - 1
    return covered, trailing_insert if reached_end else 0


def _prefix_distance(ref: str, pred: str) -> float:
    """Seberapa beda awal `pred` dengan awal `ref` (0 = sama), dibandingkan sepanjang yang lebih pendek."""
    n = min(len(ref), len(pred))
    diffs = _DMP.diff_main(ref[:n], pred[:n], False)
    return _DMP.diff_levenshtein(diffs) / max(1, n)


def _fast_prefix_distance(ref: str, pred: str) -> float:
    """Sama seperti _prefix_distance, tapi lebih cepat (dipakai di pencarian yang banyak dicoba)."""
    n = min(len(ref), len(pred))
    return Levenshtein.distance(ref[:n], pred[:n]) / max(1, n)


def _end_in(prefix: str, pred: str) -> int:
    """Posisi di `pred` tempat `prefix` berakhir."""
    if not prefix:
        return 0
    diffs = _DMP.diff_main(prefix, pred[: int(len(prefix) * 1.5) + 20], False)
    # Pakai huruf terakhir prefix (+1): kalau pakai len(prefix), sisa pred ikut terhitung
    return _DMP.diff_xIndex(diffs, len(prefix) - 1) + 1


def _word_spans(text: str, ph) -> list[tuple[int, int]]:
    """Rentang fonem tiap kata di hasil phonetize(text)."""
    spans, char = [], 0
    for w in text.split(" "):
        poss = [ph.mappings[i].pos for i in range(char, char + len(w))]
        spans.append((min(p[0] for p in poss), max(p[1] for p in poss)))
        char += len(w) + 1
    return spans


class HafalanSession:
    """Satu orang yang sedang murojaah lewat satu koneksi WebSocket."""

    def __init__(self, predict, strict: bool = False):
        self.predict = predict  # fungsi(wave, ref) -> fonem terdengar
        self.strict = strict    # False = hanya huruf + harakat a/i/u (tajwid & makhraj tidak ketat)
        self.lock = threading.Lock()
        self.buffer = np.zeros(0, np.float32)
        self.new_audio = False
        self.active = False
        self.generation = 0
        self.debug = False  # True = cetak keputusan tiap langkah (untuk mencari masalah)

    # --- dipanggil dari WebSocket ---
    def start(self, surah: int, ayat: int, kata: int = 0):
        with self.lock:
            self.generation += 1
            self.surah, self.ayat = surah, ayat
            self._load_ayat()
            self.j = None                      # kata awal bagian yang sedang dibaca (belum pasti)
            self.candidates = [kata]
            self.confirmed = set(range(kata))  # kata sebelum titik mulai dianggap sudah dibuka
            self.allow_opening = True          # ta'awudz/basmalah boleh dibaca di awal
            self._reset_attempt()
            self.buffer = np.zeros(0, np.float32)
            self.new_audio = False
            self.active = True

    def stop(self):
        with self.lock:
            self.generation += 1
            self.active = False
            self.buffer = np.zeros(0, np.float32)

    def feed(self, chunk: np.ndarray):
        with self.lock:
            if self.active:
                self.buffer = np.concatenate([self.buffer, chunk])
                self.new_audio = True

    def has_new_audio(self) -> bool:
        return self.active and self.new_audio

    # --- inti ---
    def _load_ayat(self):
        aya = Aya(self.surah, self.ayat).get()
        self.words = aya.uthmani.split(" ")
        self.num_ayat = aya.num_ayat_in_sura
        openings = [TAAWUDZ, f"{TAAWUDZ} {BASMALAH}"]
        if not (self.surah == 1 and self.ayat == 1):  # Al-Fatihah ayat 1 memang basmalah
            openings.append(BASMALAH)
        self.openings = sorted((self._ref(o)[0] for o in openings), key=len, reverse=True)
        self.wrong: dict[int, list[str]] = {}  # kata yang pernah salah -> catatannya

    def _reset_attempt(self):
        self.consumed = ""          # fonem awal buffer yang sudah dinilai (ayat sebelumnya)
        self.pending_err: dict[int, tuple[int, int]] = {}  # kata -> (berapa kali salah, panjang fonem)

    def _drop_audio(self, upto: int):
        """Buang audio yang sudah selesai dinilai, simpan audio yang masuk selama proses.
        Sisakan sedikit ujungnya, supaya awal kata berikutnya yang pelan tidak ikut terpotong."""
        upto = max(0, upto - KEEP_TAIL_SAMPLES)
        with self.lock:
            self.buffer = self.buffer[upto:]
        self.consumed = ""

    def _ref(self, text: str) -> tuple[str, list[tuple[int, int]]]:
        """Fonem referensi + rentang tiap kata. Mode longgar memakai versi sederhana
        (tanpa mad/ghunnah/tasydid/hamzah), supaya bacaan cepat tanpa tajwid tetap dikenali."""
        if self.strict:
            ph = phonetize(text)
            return ph.phonemes, _word_spans(text, ph)
        return simplified_spans(text)

    def _find_repeat(self, ref_rest: str, spans, pred: str, r: int, pred_full: str) -> int | None:
        """Kalau bunyi mulai kata ke-r (relatif j) ternyata mengulang kata sebelumnya, kembalikan
        kata awal pengulangan dan lewati bunyi sebelumnya. Kalau tidak, None.

        Pengulangan boleh didahului potongan kata yang tidak jadi diucapkan
        (mis. "bi-b..." lalu mengulang dari awal ayat "walilladzina...")."""
        diffs = _DMP.diff_main(ref_rest[: int(len(pred) * 1.5) + 20], pred, False)
        tail_at = _DMP.diff_xIndex(diffs, spans[r][0])
        w = self.j + r
        here = _fast_prefix_distance(self._ref(" ".join(self.words[w:]))[0], pred[tail_at:])
        best, maybe = None, False
        # Cari titik di sekitar kata ke-r tempat pengulangan dimulai. Harus cocok kuat dan cukup
        # panjang, supaya kata yang dilewati (mis. لَمْ) tidak dikira mengulang kata yang mirip.
        for k in range(max(0, tail_at - REPEAT_SEARCH_BACK), tail_at + REPEAT_SEARCH_BACK + 1):
            rest = pred[k:]
            for c in range(max(0, w - REPEAT_BACK_WORDS), w):
                ref = self._ref(" ".join(self.words[c:]))[0]
                if min(len(ref), len(rest)) < REPEAT_MIN_PHONEMES:
                    # Baru mulai mengulang (bunyinya masih pendek tapi cocok): tunggu dulu
                    if 4 <= len(rest) < REPEAT_MIN_PHONEMES <= len(ref) and \
                            _fast_prefix_distance(ref, rest) <= REPEAT_MAX_DISTANCE:
                        maybe = True
                    continue
                score = _fast_prefix_distance(ref, rest) + 0.01 * abs(k - tail_at)
                if score < REPEAT_MAX_DISTANCE and score < here and (best is None or score < best[0]):
                    best = (score, c, k)
        if best is None:
            return REPEAT_PENDING if maybe else None
        tail_at = best[2]
        self.consumed = pred_full[: len(pred_full) - len(pred) + tail_at]
        return best[1]

    def _strip_opening(self, pred: str) -> str:
        # Pilih pembuka yang paling mirip (ta'awudz saja vs ta'awudz + basmalah, dst.)
        scores = {op: _prefix_distance(op, pred) for op in self.openings if len(pred) >= len(op) * 0.8}
        if scores:
            op = min(scores, key=scores.get)
            if scores[op] < 0.35:
                return pred[_end_in(op, pred):]
        return pred

    def _event(self, kind: str, **data) -> dict:
        return {"type": kind, "surat": self.surah, "ayat": self.ayat, **data}

    def process(self) -> list[dict]:
        """Dengarkan audio terbaru dan hasilkan event. Dipanggil berulang selama ada audio baru."""
        with self.lock:
            if not self.active or not self.new_audio:
                return []
            self.new_audio = False
            wave = self.buffer
            generation = self.generation
        events = self._process(wave)
        return events if generation == self.generation else []

    def _process(self, wave: np.ndarray) -> list[dict]:
        events: list[dict] = []
        if not _has_speech(wave):
            # Hening panjang sebelum mulai baca: simpan setengah detik terakhir saja
            self._drop_audio(max(0, len(wave) - SAMPLE_RATE // 2))
            return events
        silent = _trailing_silence(wave)

        start_word = self.j if self.j is not None else self.candidates[0]
        pred_full = self.predict(wave, phonetize(" ".join(self.words[start_word:])))
        if not self.strict:
            pred_full = simplify_phonemes(pred_full)
        cut = _end_in(self.consumed, pred_full) if self.consumed else 0
        pred = pred_full[cut:]
        if self.allow_opening and self.j is None:
            pred = self._strip_opening(pred)
            # Masih di tengah membaca ta'awudz/basmalah: tunggu sampai selesai
            if any(len(pred) < len(op) and _prefix_distance(op, pred) < 0.3 for op in self.openings):
                return events
        stripped = len(pred_full) - len(pred)
        if self.debug and self.j is None:
            print(f"[{len(wave) / SAMPLE_RATE:5.1f}s] cari awal: cand={self.candidates} silent={silent} "
                  f"pred_full={pred_full} -> pred={pred}")
        if len(pred) < 4:
            return events

        # Tentukan dari kata mana pembaca mulai (setelah salah, boleh mundur beberapa kata).
        # Bunyi sisa di awal (mis. bacaan salah yang masih terucap sebelum "teet" terdengar) dilewati.
        if self.j is None:
            best = None
            for off in range(0, min(MAX_JUNK_PHONEMES, len(pred)) + 1):
                rest = pred[off:]
                for c in self.candidates:
                    ref = self._ref(" ".join(self.words[c:]))[0]
                    if min(len(ref), len(rest)) < 8:
                        continue
                    score = _prefix_distance(ref, rest) + 0.01 * off  # utamakan tanpa melewati bunyi
                    if best is None or score < best[0]:
                        best = (score, c, off)
            if best is None:
                return events  # belum cukup bunyi untuk memutuskan
            score, start, off = best
            if score > MAX_PREFIX_DISTANCE:
                if silent or len(pred) > 40:  # bacaan tidak dikenali: buang, tunggu bacaan berikutnya
                    self._drop_audio(len(wave))
                return events
            self.j = start
            self.allow_opening = False
            # Ingat bagian awal yang dilewati (ta'awudz/basmalah atau bunyi sisa), supaya di
            # langkah berikutnya tetap dibuang
            if stripped or off:
                self.consumed = pred_full[: len(pred_full) - len(pred) + off]
                pred = pred[off:]
                stripped = len(pred_full) - len(pred)

        text_rest = " ".join(self.words[self.j:])
        ref_rest, spans = self._ref(text_rest)
        covered, overflow = _covered(ref_rest, pred)
        fully = sum(1 for _, e in spans if e <= covered)

        # Seberapa jauh kata yang sedang diucapkan sudah terdengar (0..1)
        frontier = 0.0
        if fully < len(spans):
            s, e = spans[fully]
            frontier = max(0.0, (covered - s) / max(1, e - s))
        at_boundary = True

        if covered >= len(ref_rest) - 1 and (silent or overflow >= 3):
            final, upto = True, len(spans)          # sampai akhir ayat
            if overflow:
                pred = pred[: len(pred) - overflow]
        elif silent and (fully >= 1 or frontier >= FRONTIER_FINAL):
            # Pembaca berhenti: nilai kata yang sudah diucapkan, termasuk kata terakhir kalau
            # hampir seluruhnya sudah terdengar (mungkin dibaca salah, jadi tidak pernah "selesai").
            # Kata yang baru setengah diucapkan (berhenti untuk mengingat) dibiarkan menunggu.
            final = True
            upto = fully + (1 if frontier >= FRONTIER_FINAL else 0)
            at_boundary = frontier >= FRONTIER_FINAL or covered <= spans[fully - 1][1] + 1
        else:
            final = False                           # masih membaca: nilai kata yang sudah lewat
            # Mode longgar: kata dibuka begitu selesai diucapkan (harakat akhir tidak dicek).
            # Mode ketat: tunggu 2 bunyi dari kata berikutnya supaya harakat akhir & mad sudah pasti.
            margin = 2 if self.strict else 0
            upto = sum(1 for _, e in spans if e + margin <= covered)
            if upto == 0:
                return events

        n_eval = upto if final else min(upto + 1, len(spans))
        # Kata yang sudah dinyatakan benar tidak dinilai ulang (supaya ayat panjang tetap cepat).
        # Mulai dari kata pertama yang belum pasti, plus 1 kata sebelumnya sebagai konteks.
        first_open = next((r for r in range(upto) if self.j + r not in self.confirmed), upto)
        ctx = max(0, first_open - 1)
        pred_eval = pred
        if ctx > 0:
            diffs = _DMP.diff_main(ref_rest[: int(len(pred) * 1.5) + 20], pred, False)
            pred_eval = pred[_DMP.diff_xIndex(diffs, spans[ctx][0]):]
        errs: dict[int, list[str]] = {}   # kesalahan berat: harus diulang
        notes: dict[int, list[str]] = {}  # kesalahan ringan: kata tetap terbuka, cukup dicatat
        if first_open < upto:
            words_eval = self.words[self.j + ctx:self.j + n_eval]
            self.last_eval = (words_eval, pred_eval)  # untuk analisis (putar_rekaman.py --detail)
            if self.strict:  # cek tajwid lengkap (mad, ghunnah, dll.): semua dianggap berat
                kesalahan, _ = analyze_recitation(words_eval, pred_eval, count_upto=upto - ctx)
            else:            # cek mudah: hanya huruf & harakat, kesalahan kecil tidak menghalangi
                kesalahan = check_words_lenient(words_eval, pred_eval, count_upto=upto - ctx,
                                                segment_start=ctx == 0)
            for k in kesalahan:
                if k.kata_index + ctx >= first_open:  # kesalahan di kata konteks diabaikan
                    target = notes if k.jenis == "ringan" else errs
                    target.setdefault(k.kata_index + ctx, []).append(k.pesan)
        if self.debug:
            print(f"[{len(wave) / SAMPLE_RATE:5.1f}s] {self.ayat}:j={self.j} silent={silent} final={final} "
                  f"upto={upto} cov={covered}/{len(ref_rest)} pred={pred} errs={errs}")

        for r in range(upto):
            w = self.j + r
            if w in self.confirmed:
                continue
            if errs.get(r):
                if not final:
                    # Masih membaca: kesalahan harus muncul 2x berturut-turut, masing-masing setelah ada
                    # bunyi baru (bukan audio yang sama didengar ulang saat pembaca memanjangkan mad)
                    count, seen_len = self.pending_err.get(w, (0, 0))
                    if len(pred) > seen_len:
                        count, seen_len = count + 1, len(pred)
                    self.pending_err[w] = (count, seen_len)
                    if count < 2:
                        break
                # Bukan salah kalau pembaca sedang MENGULANG kata-kata sebelumnya (biasa saat murojaah):
                # ikuti dari kata yang diulang, kata yang sudah benar tetap terbuka
                restart = self._find_repeat(ref_rest, spans, pred, r, pred_full)
                if restart == REPEAT_PENDING:
                    return events  # sepertinya mulai mengulang: jangan "teet" dulu
                if restart is not None:
                    self.j = restart
                    self.pending_err.clear()
                    return events
                notes = self.wrong.setdefault(w, [])
                notes += [p for p in errs[r] if p not in notes]
                events.append(self._event("salah", kata=w, pesan=errs[r]))
                # Dengar lagi mulai sekarang; pembaca boleh mengulang dari kata ini atau sebelumnya
                self.candidates = sorted({0, *range(max(0, w - RESTART_BACK_WORDS), w + 1)})
                self.j = None
                self._reset_attempt()
                self._drop_audio(len(wave))
                return events
            self.pending_err.pop(w, None)
            self.confirmed.add(w)
            events.append(self._event("kata", kata=w, status="dibenarkan" if w in self.wrong else "benar",
                                      catatan=notes.get(r, [])))

        if not final:
            return events

        if self.j + upto >= len(self.words):
            catatan = [{"kata": w, "pesan": p} for w, p in sorted(self.wrong.items())]
            events.append(self._event("ayat_selesai", catatan=catatan))
            if self.ayat >= self.num_ayat:
                events.append(self._event("surat_selesai"))
                self.active = False
                return events
            # Lanjut ke ayat berikutnya
            consumed = pred_full[: stripped + len(pred)] if overflow and not silent else ""
            self.ayat += 1
            self._load_ayat()
            self.j, self.candidates, self.confirmed = None, [0], set()
            self._reset_attempt()
            if consumed:
                self.consumed = consumed     # dibaca bersambung: ayat baru ada di audio yang sama
            else:
                self._drop_audio(len(wave))
        elif at_boundary:
            # Berhenti di tengah ayat: bagian berikutnya mulai dari kata sesudahnya
            self.j += upto
            self._drop_audio(len(wave))
            self.pending_err.clear()
        # (berhenti di tengah kata: kata sebelumnya sudah dinilai, audio dibiarkan untuk dilanjutkan)
        return events
