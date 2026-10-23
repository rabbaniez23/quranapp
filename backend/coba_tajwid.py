"""Coba cek tajwid manual dari terminal.

Cara pakai (dari folder backend):
    .venv\\Scripts\\python coba_tajwid.py --surat 1 --ayat 3                 # rekam dari mic
    .venv\\Scripts\\python coba_tajwid.py --surat 1 --ayat 3 --file baca.wav  # pakai file audio
"""
import argparse
import sys
import time

import librosa
import numpy as np
import soundfile as sf

from tajwid import SAMPLE_RATE, TajwidChecker
from quran_transcript import Aya

sys.stdout.reconfigure(encoding="utf-8")

MAX_SECONDS = 60
REKAMAN = "rekaman_terakhir.wav"


def rekam() -> np.ndarray:
    import sounddevice as sd

    input("\n🎤 Tekan ENTER untuk mulai merekam...")
    chunks = []
    stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32",
                            callback=lambda data, *_: chunks.append(data.copy()))
    with stream:
        print("🔴 Merekam... silakan baca ayatnya, lalu tekan ENTER kalau sudah selesai.")
        start = time.time()
        input()
    if time.time() - start > MAX_SECONDS:
        print(f"(Rekaman dipotong jadi {MAX_SECONDS} detik)")
    wave = np.concatenate(chunks)[:, 0][: MAX_SECONDS * SAMPLE_RATE] if chunks else np.zeros(1, "float32")
    sf.write(REKAMAN, wave, SAMPLE_RATE)
    print(f"💾 Rekaman disimpan di {REKAMAN} ({len(wave) / SAMPLE_RATE:.1f} detik)")
    return wave


def tampilkan(hasil: dict, ms: float):
    salah_per_kata = {}
    for k in hasil["kesalahan"]:
        salah_per_kata.setdefault(k.kata_index, []).append(k)

    print(f"\n===== HASIL (diproses {ms:.0f} ms) =====")
    for i, kata in enumerate(hasil["kata"]):
        if i in salah_per_kata:
            print(f"  ❌ {kata}")
            for k in salah_per_kata[i]:
                print(f"       └ [{k.jenis}] {k.pesan}")
        else:
            print(f"  ✅ {kata}")
    total = len(hasil["kesalahan"])
    print("\nMasyaAllah, tidak ada kesalahan terdeteksi." if total == 0 else f"\nAda {total} kesalahan.")
    print(f"\n(fonem harus    : {hasil['fonem_harus']})")
    print(f"(fonem terdengar: {hasil['fonem_terdengar']})")


def main():
    parser = argparse.ArgumentParser(description="Cek tajwid satu ayat")
    parser.add_argument("--surat", type=int, required=True, help="nomor surat, mis. 1")
    parser.add_argument("--ayat", type=int, required=True, help="nomor ayat, mis. 3")
    parser.add_argument("--file", help="file audio (wav/mp3/flac). Kalau kosong, rekam dari mic")
    args = parser.parse_args()

    aya = Aya(args.surat, args.ayat).get()
    print(f"\n📖 {aya.sura_name} ayat {args.ayat}:\n   {aya.uthmani}")
    print("\n⏳ Memuat model tajwid...")
    t = time.time()
    checker = TajwidChecker()
    print(f"✅ Model siap di {checker.device.upper()} ({time.time() - t:.0f} detik)")
    print("ℹ️  Pemberitahuan: pengecekan ini dilakukan oleh AI (model Quran Muaalem) dan bisa keliru.")
    print("   Tetap setorkan bacaanmu ke guru/ustadz untuk memastikan.")

    while True:
        wave = librosa.load(args.file, sr=SAMPLE_RATE, mono=True)[0] if args.file else rekam()
        t = time.perf_counter()
        hasil = checker.check(wave, args.surat, args.ayat)
        tampilkan(hasil, (time.perf_counter() - t) * 1000)
        if args.file:
            break
        if input("\nENTER = coba lagi, q = keluar: ").strip().lower() == "q":
            break


if __name__ == "__main__":
    main()
