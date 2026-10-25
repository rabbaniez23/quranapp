"""Sesi cek hafalan real-time lewat WebSocket. Dipakai server.py (semua di satu komputer)
dan ai_worker.py (model AI di komputer lain, dipanggil server utama).

Dari klien : JSON {"type": "mulai", "surat", "ayat", "kata"} / {"type": "berhenti"},
             lalu audio mentah float32 mono 16 kHz terus-menerus (pesan biner).
Ke klien   : JSON "siap", "kata" (benar/dibenarkan), "salah", "ayat_selesai", "surat_selesai", "error".
"""
import asyncio
import json
import os
import time
import traceback

import numpy as np
from fastapi import WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from hafalan_stream import HafalanSession
from tajwid import SAMPLE_RATE

RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "rekaman")
# Pengaman supaya satu sesi tidak bisa memborong GPU
MAKS_DETIK_SESI = 45 * 60      # sesi lebih lama diputus (browser lalu lanjut dengan Google)
MAKS_PESAN = 1 << 17           # 128 KB; potongan normal 16 KB (0,25 detik)
LONGGAR_DETIK = 10             # audio boleh mendahului waktu nyata paling banyak sekian detik


async def layani_hafalan(ws: WebSocket, predict, simpan_rekaman: bool = False):
    """ws sudah di-accept. predict(wave, ref) -> fonem yang terdengar."""
    session = HafalanSession(predict)
    busy = False
    # Untuk SIMPAN_REKAMAN: semua audio + perintah + event, dengan posisi sampel audio saat itu
    rec_audio: list[np.ndarray] = []
    rec_log: list[dict] = []
    rec_samples = 0

    async def pump():
        # Proses audio yang masuk; selama diproses, audio baru tetap ditampung
        nonlocal busy
        try:
            while session.has_new_audio():
                for event in await run_in_threadpool(session.process):
                    await ws.send_json(event)
                    if simpan_rekaman:
                        rec_log.append({"sampel": rec_samples, "event": event})
        except Exception:
            traceback.print_exc()
            await ws.send_json({"type": "error", "pesan": "Terjadi kesalahan di server."})
        finally:
            busy = False

    await ws.send_json({"type": "siap"})
    mulai = time.monotonic()
    sampel_diterima = 0
    try:
        while True:
            message = await ws.receive()
            if message["type"] == "websocket.disconnect":
                break
            lama = time.monotonic() - mulai
            if lama > MAKS_DETIK_SESI:
                await ws.close(code=4408)
                break
            data = message.get("bytes")
            if data is not None:
                # Buang potongan yang terlalu besar, dan audio yang dikirim lebih cepat dari waktu nyata
                # (bukan dari mikrofon sungguhan)
                if len(data) > MAKS_PESAN or sampel_diterima > (lama + LONGGAR_DETIK) * SAMPLE_RATE:
                    continue
                sampel_diterima += len(data) // 4
                if len(data) % 4 == 0:
                    chunk = np.frombuffer(data, dtype=np.float32).copy()
                    session.feed(chunk)
                    if simpan_rekaman:
                        rec_audio.append(chunk)
                        rec_samples += len(chunk)
            elif message.get("text"):
                command = json.loads(message["text"])
                if simpan_rekaman:
                    rec_log.append({"sampel": rec_samples, "perintah": command})
                if command.get("type") == "mulai":
                    try:
                        session.start(int(command["surat"]), int(command["ayat"]), int(command.get("kata", 0)))
                    except Exception:
                        await ws.send_json({"type": "error", "pesan": "Surat/ayat tidak valid."})
                elif command.get("type") == "berhenti":
                    session.stop()
            if not busy and session.has_new_audio():
                busy = True
                asyncio.create_task(pump())
    except WebSocketDisconnect:
        pass
    finally:
        session.stop()
        if simpan_rekaman and rec_samples > SAMPLE_RATE:
            save_recording(np.concatenate(rec_audio), rec_log)


def save_recording(wave: np.ndarray, log: list[dict]):
    import soundfile as sf

    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    name = time.strftime("%Y%m%d-%H%M%S")
    sf.write(os.path.join(RECORDINGS_DIR, f"{name}.wav"), wave, SAMPLE_RATE)
    with open(os.path.join(RECORDINGS_DIR, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
    print(f"💾 Rekaman disimpan: rekaman/{name}.wav ({len(wave) / SAMPLE_RATE:.0f} detik)")
