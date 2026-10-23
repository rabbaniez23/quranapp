"""Inti pengecekan tajwid: audio bacaan satu ayat -> daftar kesalahan per kata.

Memakai model open-source "Quran Muaalem" (obadx/muaalem-model-v3_2) yang mendengar bunyi
sampai level harakat, panjang mad, dan sifat huruf, lalu membandingkannya dengan teks mushaf.
"""
import re
from dataclasses import dataclass, field
from functools import lru_cache

import torch
from diff_match_patch import diff_match_patch
from rapidfuzz.distance import Levenshtein
from quran_transcript import Aya, MoshafAttributes, explain_error, quran_phonetizer
from quran_muaalem import Muaalem
from quran_muaalem.decode import phonemes_level_greedy_decode

SAMPLE_RATE = 16000  # model wajib 16 kHz
_DMP = diff_match_patch()

# Riwayat Hafs 'an 'Ashim (yang umum di Indonesia)
MOSHAF = MoshafAttributes(
    rewaya="hafs",
    madd_monfasel_len=4,
    madd_mottasel_len=4,
    madd_mottasel_waqf=4,
    madd_aared_len=4,
)

# Nama hukum tajwid dalam istilah yang biasa dipakai di Indonesia
RULE_NAMES = {
    "Normal Madd": "Mad Thabi'i",
    "Monfasel Madd": "Mad Jaiz Munfashil",
    "Mottasel Madd": "Mad Wajib Muttashil",
    "Mottasel Madd at Pause": "Mad Wajib Muttashil (waqaf)",
    "Lazem Madd": "Mad Lazim",
    "Aared Madd": "Mad 'Aridh Lissukun",
    "Leen Madd": "Mad Lin",
    "Qalqalah": "Qalqalah",
    "Full Merging": "Idgham",
    "Moshadad or Modgham Noon": "Ghunnah (nun bertasydid/idgham)",
    "Moshaddad or ModghamNoon": "Ghunnah (nun bertasydid/idgham)",
}

# Panjang mad (harakat) yang sama-sama dibolehkan dalam Hafs
ALLOWED_MADD_LEN = {
    "Normal Madd": {2},
    "Monfasel Madd": {4, 5},
    "Mottasel Madd": {4, 5, 6},
    "Mottasel Madd at Pause": {4, 5, 6},
    "Lazem Madd": {6},
    "Aared Madd": {2, 4, 6},
    "Leen Madd": {2, 4, 6},
}

HARAKAT = {"َ": "fathah", "ِ": "kasrah", "ُ": "dhammah"}
MADD_LETTERS = "اۦۥ"  # alif, ya mad, waw mad (versi fonetik muaalem)


@dataclass
class Kesalahan:
    kata_index: int        # urutan kata di ayat (mulai 0)
    kata: str              # kata Utsmani
    jenis: str             # harakat | mad | tajwid | huruf
    pesan: str             # penjelasan untuk pengguna
    hukum: list[str] = field(default_factory=list)


def _word_index(uthmani: str, char_pos: int) -> int:
    """Posisi huruf di teks ayat -> urutan kata."""
    return uthmani[:char_pos].count(" ")


def _harakat_of(text: str) -> str:
    for ch in text:
        if ch in HARAKAT:
            return HARAKAT[ch]
    return "tanpa harakat (sukun)"


def _madd_ok(rules: list[str], predicted_len: int) -> bool:
    allowed = set()
    for r in rules:
        allowed |= ALLOWED_MADD_LEN.get(r, set())
    if not allowed:
        return False
    nearest = min(allowed, key=lambda a: abs(a - predicted_len))
    # Model punya selisih sekitar 1 harakat untuk mad panjang, jadi diberi toleransi
    return predicted_len == nearest or (nearest >= 4 and abs(nearest - predicted_len) <= 1)


def _explain(err, uthmani: str, ref_len: int) -> Kesalahan | None:
    start, end = err.uthmani_pos
    rules_en = [r.name.en for r in (err.ref_tajweed_rules or []) if r.name.en]
    hukum = [RULE_NAMES.get(r, r) for r in rules_en]
    idx = _word_index(uthmani, start)
    kata = uthmani.split(" ")[min(idx, uthmani.count(" "))]

    # Bunyi tambahan di paling awal/akhir rekaman = sisa ayat sebelum/sesudahnya, abaikan
    if err.speech_error_type == "insert" and (err.ph_pos[0] == 0 or err.ph_pos[0] >= ref_len):
        return None

    if err.error_type == "tajweed" and err.expected_len is not None and err.predicted_len is not None:
        if _madd_ok(rules_en, err.predicted_len):
            return None
        arah = "kurang panjang" if err.predicted_len < err.expected_len else "terlalu panjang"
        nama = hukum[0] if hukum else "Mad"
        return Kesalahan(idx, kata, "mad",
                         f"{nama} {arah}: harus {err.expected_len} harakat, terdengar {err.predicted_len}", hukum)

    if err.error_type == "tajweed":
        if err.speech_error_type == "delete" and err.expected_ph and all(c in MADD_LETTERS for c in err.expected_ph):
            return Kesalahan(idx, kata, "mad",
                             f"Mad tidak dibaca panjang (harus {len(err.expected_ph)} harakat)", hukum)
        nama = ", ".join(hukum) if hukum else "Hukum tajwid"
        return Kesalahan(idx, kata, "tajwid", f"{nama} belum tepat", hukum)

    if err.error_type == "tashkeel":
        harus, terdengar = _harakat_of(err.expected_ph), _harakat_of(err.preditected_ph)
        if harus == terdengar:
            return Kesalahan(idx, kata, "harakat", "Tasydid/harakat belum tepat", hukum)
        huruf = err.expected_ph[:1]
        return Kesalahan(idx, kata, "harakat",
                         f"Harakat huruf '{huruf}' salah: harus {harus}, terdengar {terdengar}", hukum)

    # error_type == "normal": huruf salah / hilang / tambahan
    if err.speech_error_type == "replace":
        pesan = f"Huruf salah: harus '{err.expected_ph}', terdengar '{err.preditected_ph}'"
    elif err.speech_error_type == "delete":
        pesan = f"Bunyi '{err.expected_ph}' tidak terdengar"
    else:
        pesan = f"Ada bunyi tambahan '{err.preditected_ph}'"
    return Kesalahan(idx, kata, "huruf", pesan, hukum)


class TajwidChecker:
    def __init__(self, device: str | None = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
        self.model = Muaalem(device=self.device, dtype=dtype)

    @torch.no_grad()
    def predict(self, wave, ref=None) -> str:
        """Audio -> fonem yang terdengar (lengkap dengan harakat dan panjang mad).

        Sengaja tidak memanggil Muaalem.__call__: itu juga mencocokkan sifat huruf ke referensi
        (align_predicted_sequence, Python murni) yang makan >90% waktu untuk ayat panjang,
        padahal di sini yang dipakai hanya fonemnya.
        """
        m = self.model
        features = m.processor([wave], sampling_rate=SAMPLE_RATE, return_tensors="pt")
        features = {k: v.to(m.device, dtype=m.dtype) for k, v in features.items()}
        logits = m.model(**features, return_dict=False)[0]["phonemes"]
        probs = torch.softmax(logits, dim=-1).cpu().to(torch.float32)
        return phonemes_level_greedy_decode(probs, m.multi_level_tokenizer.id_to_vocab["phonemes"])[0].text

    def check(self, wave, surah: int, ayat: int) -> dict:
        """wave: audio mono 16 kHz (list/numpy float). Hasil: kata-kata ayat + kesalahan."""
        uthmani = Aya(surah, ayat).get().uthmani
        words = uthmani.split(" ")
        ref = phonetize(uthmani)
        predicted = self.predict(wave, ref)
        kesalahan, stops = analyze_recitation(words, predicted)
        return {
            "kata": words,
            "kesalahan": kesalahan,
            "waqaf_setelah_kata": stops,
            "fonem_harus": ref.phonemes,
            "fonem_terdengar": predicted,
        }


# --- CEK LONGGAR: hanya huruf + harakat (a/i/u) ---
# Tidak dicek: panjang mad, ghunnah, idgham, qalqalah, tasydid, waqaf, dan makhraj yang mirip.
VOWELS = {"َ": "a (fathah)", "ِ": "i (kasrah)", "ُ": "u (dhammah)"}
# Tanda mad, imalah, qalqalah, saktah, dan hamzah (sering tertelan kalau membaca cepat: سَوَاءٌ → sawaun)
_DROP = set("اۦۥـڇۜء")
# Sisa bunyi di awal potongan audio yang boleh dibuang (lihat _strip_leading_junk)
MAX_LEADING_JUNK = 10
# Huruf sambung وَ / فَ di awal kata: hilang atau bertambah = kesalahan menghafal yang khas
# (وَٱلَّذِينَ dibaca ٱلَّذِينَ). ب / ل / ك tidak dimasukkan karena sering huruf asli kata
# (ٱلْبَصَرَ, لَوْ, كَفَرُوا) atau "al-".
PARTICLES = "وف"
# Harakat & tanda Utsmani (untuk melihat huruf terakhir kata Utsmani)
DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]")
_SAME = {
    "ں": "ن", "۾": "م", "ٲ": "ء", "۪": "َ", "ؙ": "ُ",   # ikhfa', tashil, imalah, ikhtilas
    # Huruf yang makhrajnya mirip dan sering tertukar dianggap sama
    "ح": "ه", "ع": "ء", "ط": "ت", "ض": "د", "ق": "ك", "غ": "خ",
    # s / ts / z / dz sering tertukar: ث ذ ز ظ س ص
    "ث": "س", "ص": "س", "ذ": "س", "ظ": "س", "ز": "س",
}


def _simplify(text: str) -> list[tuple[str, str]]:
    """Fonem -> [(huruf sederhana, huruf asli)], huruf dobel (tasydid/ghunnah) disatukan."""
    out: list[tuple[str, str]] = []
    for ch in text:
        s = _SAME.get(ch, ch)
        if s in _DROP:
            continue
        if out and out[-1][0] == s:
            continue
        out.append((s, ch))
    return out


def simplify_phonemes(text: str) -> str:
    """Fonem terdengar -> versi sederhana (tanpa mad, ghunnah, tasydid, hamzah; makhraj mirip disamakan)."""
    return "".join(s for s, _ in _simplify(text))


@lru_cache(maxsize=4096)
def simplified_reference(text: str) -> tuple[tuple[tuple[str, str], ...], tuple[int, ...]]:
    """Teks Utsmani -> (huruf sederhana + asli, kata ke berapa untuk tiap huruf)."""
    words = text.split(" ")
    ph = phonetize(text)
    ref: list[tuple[str, str]] = []
    word_of: list[int] = []
    char = 0
    for idx, w in enumerate(words):
        poss = [ph.mappings[i].pos for i in range(char, char + len(w))]
        char += len(w) + 1
        seg = _simplify(ph.phonemes[min(p[0] for p in poss):max(p[1] for p in poss)])
        if ref and seg and ref[-1][0] == seg[0][0]:
            seg = seg[1:]  # huruf dobel di sambungan kata (idgham) dihitung sekali
        ref += seg
        word_of += [idx] * len(seg)
    return tuple(ref), tuple(word_of)


def simplified_spans(text: str) -> tuple[str, list[tuple[int, int]]]:
    """Teks Utsmani -> (fonem sederhana, rentang tiap kata di fonem itu)."""
    ref, word_of = simplified_reference(text)
    spans, start = [], 0
    for idx in range(text.count(" ") + 1):
        end = start + word_of.count(idx)
        spans.append((start, end))
        start = end
    return "".join(s for s, _ in ref), spans


def _strip_leading_junk(ref_s: str, pred: str) -> str:
    """Buang sisa bunyi di awal potongan audio (ekor ayat sebelumnya, bacaan yang diulang)
    sebelum awal kata pertama, kalau dengan begitu awalnya jadi jauh lebih cocok."""
    n = min(len(ref_s), 12)
    if n < 4 or len(pred) < 4:
        return pred
    best_k, best = 0, Levenshtein.distance(ref_s[:n], pred[:n])
    for k in range(1, min(MAX_LEADING_JUNK, len(pred) - 3) + 1):
        score = Levenshtein.distance(ref_s[:n], pred[k:k + n]) + 0.3 * k  # utamakan tanpa membuang
        if score < best - 1:
            best_k, best = k, score
    return pred[best_k:]


def check_words_lenient(words: list[str], predicted: str, count_upto: int | None = None,
                        segment_start: bool = False) -> list[Kesalahan]:
    """Bandingkan fonem terdengar dengan kata-kata ini (mode mudah, untuk menghafal).

    Hasil: Kesalahan dengan jenis
      "berat"  : kata terlewat / dibaca lain (lebih dari separuh hurufnya beda), atau huruf sambung
                 (وَ / فَ) hilang/bertambah di tengah bacaan → harus diulang
      "ringan" : sedikit beda (harakat tertukar, 1-2 huruf terdengar lain) → kata tetap terbuka,
                 cukup dicatat
    segment_start: kata pertama adalah awal potongan audio (sesudah berhenti). Huruf pertamanya
                 sering tidak tertangkap model, jadi tidak dinilai.
    """
    limit = len(words) if count_upto is None else count_upto
    ref, word_of = simplified_reference(" ".join(words))
    word_end = {i for i in range(len(ref)) if i == len(ref) - 1 or word_of[i + 1] != word_of[i]}
    word_start = {i for i in range(len(ref)) if i == 0 or word_of[i - 1] != word_of[i]}

    ref_s = "".join(s for s, _ in ref)
    pred = simplify_phonemes(predicted)
    if segment_start:
        pred = _strip_leading_junk(ref_s, pred)
    catatan: dict[int, list[str]] = {}
    huruf_meleset: dict[int, int] = {}  # banyak huruf konsonan yang meleset per kata
    huruf_sambung: set[int] = set()     # وَ / فَ hilang/bertambah

    first_consonant, last_consonant = {}, {}
    for i, (s, _) in enumerate(ref):
        if s not in VOWELS:
            first_consonant.setdefault(word_of[i], i)
            last_consonant[word_of[i]] = i
    # Huruf pertama setelah berhenti: model sering tidak menangkapnya (وَمِنَ → مِنَ), jadi dilewati
    onset_end = first_consonant.get(0, -1) if segment_start else -1
    # Kata berakhiran ta marbuthah (ة): saat berhenti boleh dibaca -h, -tu, -tun, atau -tuh
    ta_marbutah = {idx for idx, w in enumerate(words) if DIACRITICS.sub("", w).endswith("ة")}

    def add(idx: int, pesan: str, consonant: bool = False, particle: bool = False):
        if idx >= limit:
            return
        if consonant:
            huruf_meleset[idx] = huruf_meleset.get(idx, 0) + 1
        if particle:
            huruf_sambung.add(idx)
        if pesan not in catatan.setdefault(idx, []):
            catatan[idx].append(pesan)

    terdengar: dict[int, int] = {}  # banyak huruf konsonan yang cocok persis per kata
    for op in Levenshtein.opcodes(ref_s, pred):
        a, b, c, d = op.src_start, op.src_end, op.dest_start, op.dest_end
        got = pred[c:d]
        if op.tag == "equal":
            for i in range(a, b):
                if ref[i][0] not in VOWELS:
                    terdengar[word_of[i]] = terdengar.get(word_of[i], 0) + 1
            continue
        if op.tag == "insert":
            if not ref or a >= len(ref):
                continue  # bunyi sesudah kata terakhir = awal kata berikutnya
            if segment_start and a == 0:
                continue  # sisa bunyi sebelum mulai membaca
            at_start = a in word_start
            idx = word_of[a] if at_start else word_of[a - 1]
            # Boleh: harakat tambahan (mis. dibaca bersambung), hamzah washal di awal
            # kata setelah berhenti, dan dengung nun/mim (izhar/idgham)
            if all(ch in VOWELS for ch in got):
                continue
            if at_start and got.startswith("ء") and all(ch in VOWELS for ch in got.lstrip("ء")):
                continue
            if set(got) <= {"ن", "م"} | set(VOWELS):
                continue
            # Akhiran ta marbuthah kata sebelumnya dibaca bersambung (غِشَـٰوَتُن وَلَهُم)
            prev = word_of[a - 1] if a > 0 else None
            if prev in ta_marbutah and a - 1 >= last_consonant.get(prev, a) - 1 and set(got) <= {"ت", "ه", "ن"} | set(VOWELS):
                continue
            if idx in ta_marbutah and a >= last_consonant.get(idx, a) and set(got) <= {"ت", "ه", "ن"} | set(VOWELS):
                continue
            # وَ / فَ dst. yang ditambahkan di awal kata (mis. "haulahu WA dzahaba")
            add(idx, f"Ada bunyi tambahan '{got}'", consonant=True, particle=at_start and got[0] in PARTICLES)
            continue
        for i in range(a, b):
            idx = word_of[i]
            expected_ch, original = ref[i]
            if i <= onset_end:
                continue
            # Boleh: harakat/nun tanwin di akhir kata dimatikan karena berhenti (waqaf)
            if op.tag == "delete" and i in word_end and expected_ch in set(VOWELS) | {"ن"}:
                continue
            # Boleh: dengung nun/mim ikhfa' (ں ۾) yang hilang saat dibaca cepat, dan nun/mim sukun
            # (diikuti huruf mati, mis. لَمْ تُنذِرْهُمْ) yang bunyinya memang sangat singkat
            if op.tag == "delete" and original in "ں۾":
                continue
            if op.tag == "delete" and expected_ch in "نم" and i + 1 < len(ref) and ref[i + 1][0] not in VOWELS:
                continue
            if op.tag == "delete" and i + 1 in word_end and expected_ch in VOWELS and ref[i + 1][0] == "ن":
                continue
            got_ch = got[i - a] if op.tag == "replace" and i - a < len(got) else ""
            # Ta marbuthah di akhir kata: ه (waqaf) dan ت (bersambung) sama-sama benar
            if idx in ta_marbutah and i == last_consonant.get(idx) and expected_ch in "هت" and got_ch in "هتن":
                continue
            # وَ / يَ yang menyatu dengan bunyi panjang "uu" / "ii" sebelumnya (ءَامَنُوا۟ وَعَمِلُوا۟)
            if op.tag == "delete" and i > 0 and (expected_ch, ref[i - 1][0]) in (("و", "ُ"), ("ي", "ِ")):
                continue
            if expected_ch in VOWELS:
                # Harakat yang TERTUKAR (a↔i↔u) dicatat (ringan). Harakat yang tidak tertangkap
                # dibiarkan: di tempo cepat model sering tidak mendengar harakat pendek.
                if got_ch in VOWELS:
                    letter = ref[i - 1][1] if i > 0 else ""
                    add(idx, f"Harakat huruf '{letter}' terdengar {VOWELS[got_ch]}, seharusnya {VOWELS[expected_ch]}")
                continue
            particle = i in word_start and expected_ch in PARTICLES
            if got_ch and got_ch not in VOWELS:
                add(idx, f"Huruf '{original}' terdengar seperti '{got_ch}'", consonant=True, particle=particle)
            else:
                add(idx, f"Huruf '{original}' tidak terdengar", consonant=True, particle=particle)

    hasil = []
    for idx, pesan in sorted(catatan.items()):
        n_consonant = sum(1 for i, (s, _) in enumerate(ref) if word_of[i] == idx and s not in VOWELS)
        meleset = huruf_meleset.get(idx, 0)
        # Kata yang tidak satu hurufnya pun terdengar = terlewat (mis. لَمْ), walaupun
        # huruf-hurufnya termasuk yang dilonggarkan (mim sukun dsb.). Kata 1 huruf (أَمْ, إِنْ) tidak,
        # karena sering menyatu dengan huruf yang sama di kata sebelahnya saat dibaca cepat.
        onset_only = segment_start and idx == 0 and n_consonant <= 1
        terlewat = n_consonant >= 2 and terdengar.get(idx, 0) == 0 and not onset_only
        # Berat: terlewat, huruf sambung salah, atau lebih dari separuh huruf kata ini berbeda
        berat = terlewat or idx in huruf_sambung or (n_consonant > 0 and meleset / n_consonant > 0.5)
        hasil += [Kesalahan(idx, words[idx], "berat" if berat else "ringan", p) for p in pesan]
    # Kata terlewat yang semua hurufnya masuk kelonggaran (jadi tidak punya catatan sama sekali)
    for idx in range(min(limit, len(words))):
        n_consonant = sum(1 for i, (s, _) in enumerate(ref) if word_of[i] == idx and s not in VOWELS)
        onset_only = segment_start and idx == 0 and n_consonant <= 1
        if idx not in catatan and n_consonant >= 2 and terdengar.get(idx, 0) == 0 and not onset_only:
            hasil.append(Kesalahan(idx, words[idx], "berat", "Kata ini tidak terdengar (terlewat?)"))
    return sorted(hasil, key=lambda k: k.kata_index)


@lru_cache(maxsize=4096)
def phonetize(text: str):
    """Teks Utsmani -> fonem referensi (disimpan, karena teks yang sama sering dipakai ulang)."""
    return quran_phonetizer(text, MOSHAF, remove_spaces=True)


def analyze_recitation(words: list[str], predicted: str, count_upto: int | None = None
                       ) -> tuple[list[Kesalahan], list[int]]:
    """Bandingkan fonem terdengar dengan kata-kata ini. Hasil: kesalahan + titik waqaf yang terdeteksi.

    count_upto: hanya kesalahan di kata sebelum indeks ini yang dihitung saat memilih titik waqaf
    (kata sesudahnya masih diucapkan, jadi kesalahannya belum berarti).
    """
    limit = len(words) if count_upto is None else count_upto

    def score(ks: list[Kesalahan]) -> int:
        return sum(1 for k in ks if k.kata_index < limit)

    # Referensi awal menganggap dibaca bersambung tanpa berhenti
    stops: list[int] = []
    kesalahan = _analyze(words, stops, predicted)

    # Kalau pembaca berhenti (waqaf) di tengah, harakat akhir kata memang dimatikan dan
    # madnya berubah. Coba anggap berhenti di dekat setiap kesalahan; pakai kalau lebih cocok.
    candidates = sorted({j for k in kesalahan if k.kata_index < limit
                         for j in (k.kata_index - 1, k.kata_index) if 0 <= j < len(words) - 1})
    for j in candidates:
        trial = _analyze(words, sorted(stops + [j]), predicted)
        if score(trial) < score(kesalahan):
            stops, kesalahan = sorted(stops + [j]), trial
    return kesalahan, stops


def _analyze(words: list[str], stops: list[int], predicted: str) -> list[Kesalahan]:
    """Bandingkan fonem terdengar dengan referensi, dengan anggapan pembaca berhenti setelah kata `stops`."""
    segments, start = [], 0
    for end in stops + [len(words) - 1]:
        segments.append((start, end))
        start = end + 1
    refs = [phonetize(" ".join(words[a:b + 1])) for a, b in segments]

    # Potong fonem terdengar sesuai batas tiap bagian referensi
    diffs = _DMP.diff_main("".join(r.phonemes for r in refs), predicted) if len(refs) > 1 else None
    hasil, ref_end, cut_start = [], 0, 0
    for i, ((a, b), ref) in enumerate(zip(segments, refs)):
        ref_end += len(ref.phonemes)
        cut_end = len(predicted) if i == len(refs) - 1 else _DMP.diff_xIndex(diffs, ref_end)
        part = predicted[cut_start:cut_end]
        cut_start = cut_end
        text = " ".join(words[a:b + 1])
        try:
            errors = explain_error(uthmani_text=text, ref_ph_text=ref.phonemes,
                                   predicted_ph_text=part, mappings=ref.mappings)
        except Exception:
            # Potongan tidak bisa dibandingkan: anggap seluruh bagian ini salah baca
            hasil += [Kesalahan(a + n, words[a + n], "huruf", "Kata ini tidak terdengar jelas")
                      for n in range(b - a + 1)]
            continue
        for e in errors:
            k = _explain(e, text, len(ref.phonemes))
            if k:
                k.kata_index += a
                k.kata = words[k.kata_index]
                hasil.append(k)
    return hasil
