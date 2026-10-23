"""Putar ulang rekaman murojaah (dari SIMPAN_REKAMAN=1) lewat sistem cek hafalan.

Berguna untuk melihat kenapa suatu kata dinilai salah, dan membandingkan hasil
sebelum/sesudah aturan diubah.

Cara pakai (dari folder backend):
    .venv\\Scripts\\python putar_rekaman.py                        # rekaman terakhir
    .venv\\Scripts\\python putar_rekaman.py rekaman\\20261022-152024
"""
import glob
import json
import os
import sys

import numpy as np
import soundfile as sf

from hafalan_stream import HafalanSession
from tajwid import SAMPLE_RATE, TajwidChecker, simplified_spans, simplify_phonemes

sys.stdout.reconfigure(encoding="utf-8")
CHUNK = SAMPLE_RATE // 4  # 0,25 detik, sama seperti dari browser


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    detail = "--detail" in sys.argv  # tampilkan apa yang didengar model di tiap kata yang salah
    base = args[0] if args else max(glob.glob("rekaman/*.wav"), key=os.path.getmtime)[:-4]
    wave, _ = sf.read(f"{base}.wav", dtype="float32")
    log = json.load(open(f"{base}.json", encoding="utf-8"))
    commands = [(x["sampel"], x["perintah"]) for x in log if "perintah" in x]
    old = [(x["sampel"], x["event"]) for x in log if "event" in x]

    checker = TajwidChecker()
    session = HafalanSession(checker.predict)
    print(f"Memutar {base}.wav ({len(wave) / SAMPLE_RATE:.0f} detik)\n")

    def show(t, e):
        detail = e.get("status") or "; ".join(e.get("pesan", [])) or ""
        return f"{t:6.1f}s  {e['type']:13s} {e['surat']}:{e['ayat']} kata {e.get('kata', '-')}  {detail}"

    new = []
    for i in range(0, len(wave), CHUNK):
        for at, cmd in commands:
            if i <= at < i + CHUNK:
                if cmd["type"] == "mulai":
                    session.start(int(cmd["surat"]), int(cmd["ayat"]), int(cmd.get("kata", 0)))
                elif cmd["type"] == "berhenti":
                    session.stop()
        session.feed(wave[i:i + CHUNK])
        for e in session.process():
            new.append((i + CHUNK, e))
            if detail and e["type"] == "salah" and getattr(session, "last_eval", None):
                words_eval, pred_eval = session.last_eval
                ref_s, spans = simplified_spans(" ".join(words_eval))
                print(show((i + CHUNK) / SAMPLE_RATE, e))
                print(f"         kata    : {' '.join(words_eval)}")
                print(f"         harus   : {ref_s}")
                print(f"         didengar: {simplify_phonemes(pred_eval)}\n")

    print("=== DULU (saat direkam) ===")
    for at, e in old:
        if e["type"] in ("salah", "ayat_selesai", "surat_selesai"):
            print(show(at / SAMPLE_RATE, e))
    print("\n=== SEKARANG (aturan terbaru) ===")
    for at, e in new:
        if e["type"] in ("salah", "ayat_selesai", "surat_selesai"):
            print(show(at / SAMPLE_RATE, e))
    n_old = sum(e["type"] == "salah" for _, e in old)
    n_new = sum(e["type"] == "salah" for _, e in new)
    print(f"\nJumlah 'salah': dulu {n_old}, sekarang {n_new}")


if __name__ == "__main__":
    main()
