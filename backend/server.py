"""Backend QuranApp: akun (daftar/masuk), riwayat murojaah, cek hafalan real-time (WebSocket),
dan cek tajwid per ayat.

Jalankan (dari folder backend):
    .venv\\Scripts\\python server.py
"""
import asyncio
import json
import logging
import os
import re
import sys
import threading
import time
import traceback
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal
from dataclasses import asdict

import numpy as np
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

import akun
import database
import progres
from hafalan_stream import HafalanSession
from tajwid import SAMPLE_RATE, TajwidChecker

# Supaya log berhuruf Arab/emoji tidak error saat output dialihkan ke file (Windows cp1252)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")


class SensorToken(logging.Filter):
    """Token login dikirim lewat ?token=... (WebSocket); jangan sampai tercatat utuh di log."""

    def filter(self, record):
        record.args = tuple(re.sub(r"token=[^&\s\"]+", "token=***", a) if isinstance(a, str) else a
                            for a in (record.args or ()))
        return True


logging.getLogger("uvicorn.access").addFilter(SensorToken())
logging.getLogger("uvicorn.error").addFilter(SensorToken())

PORT = int(os.getenv("PORT", "8010"))
# Alamat frontend yang boleh memanggil API ini (pisahkan dengan koma)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
MAX_SECONDS = 90
# SIMPAN_REKAMAN=1 → tiap sesi murojaah disimpan ke folder rekaman/ (audio + keputusan AI),
# untuk dianalisis ulang kalau ada kata yang salah dinilai. Hanya di komputer ini.
SAVE_RECORDINGS = os.getenv("SIMPAN_REKAMAN") == "1"
RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "rekaman")
# Hasil `npm run build` frontend; kalau ada, ikut disajikan dari sini (cukup satu alamat di server)
FRONTEND_DIST = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

checker: TajwidChecker | None = None
gpu_lock = threading.Lock()  # satu GPU, jadi proses satu per satu


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global checker
    database.init_db()
    print(f"🗄️  Database siap ({database.engine.url.render_as_string(hide_password=True)})")
    t = time.time()
    print("⏳ Memuat model tajwid...")
    checker = TajwidChecker()
    print(f"✅ Model siap di {checker.device.upper()} ({time.time() - t:.0f} detik)")
    yield


app = FastAPI(title="QuranApp Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)
pembatas_login = akun.PembatasPercobaan()


# --- AKUN ---
def _token(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None


def pengguna(authorization: str | None = Header(default=None)) -> dict:
    """Dependency: pengguna yang sedang masuk (dari header Authorization: Bearer <token>)."""
    user = akun.pengguna_dari_token(_token(authorization))
    if user is None:
        raise HTTPException(401, "Silakan masuk dulu.")
    return user


class DaftarBody(BaseModel):
    nama: str = Field(max_length=100)
    username: str = Field(max_length=40)
    password: str = Field(max_length=200)


class MasukBody(BaseModel):
    username: str = Field(max_length=40)
    password: str = Field(max_length=200)


@app.post("/api/auth/daftar")
def daftar(body: DaftarBody):
    try:
        user = akun.daftar(body.nama, body.username, body.password)
    except akun.AkunError as e:
        raise HTTPException(400, str(e)) from e
    return {"token": akun.buat_sesi(user["id"]), "user": user}


@app.post("/api/auth/masuk")
def masuk(body: MasukBody):
    kunci = body.username.strip().lower()
    if pembatas_login.diblokir(kunci):
        raise HTTPException(429, "Terlalu banyak percobaan. Coba lagi 10 menit lagi.")
    user = akun.masuk(body.username, body.password)
    if user is None:
        pembatas_login.catat_gagal(kunci)
        raise HTTPException(401, "Username atau kata sandi salah.")
    pembatas_login.reset(kunci)
    return {"token": akun.buat_sesi(user["id"]), "user": user}


@app.get("/api/auth/saya")
def saya(user: dict = Depends(pengguna)):
    return {"user": user}


@app.post("/api/auth/keluar")
def keluar(authorization: str | None = Header(default=None)):
    token = _token(authorization)
    if token:
        akun.hapus_sesi(token)
    return {"ok": True}


# --- RIWAYAT MUROJAAH & PROGRES ---
class KesalahanBody(BaseModel):
    surat: int = Field(ge=1, le=114)
    ayat: int = Field(ge=1, le=286)
    kata_index: int = Field(ge=0, le=200)
    kata: str = Field(max_length=80)
    jenis: Literal["salah", "catatan"]  # salah = harus diulang, catatan = kesalahan kecil
    pesan: str = Field(default="", max_length=500)


class MurojaahBody(BaseModel):
    surat: int = Field(ge=1, le=114)
    nama_surat: str = Field(max_length=60)
    halaman: int = Field(ge=1, le=604)
    ayat_awal: int = Field(ge=1, le=286)
    ayat_akhir: int = Field(ge=1, le=286)
    kata_benar: int = Field(ge=0, le=10000)
    kata_salah: int = Field(ge=0, le=10000)
    durasi_detik: int = Field(default=0, ge=0, le=86400)
    selesai: bool
    kesalahan: list[KesalahanBody] = Field(default_factory=list, max_length=500)


@app.post("/api/murojaah")
def simpan_murojaah(body: MurojaahBody, user: dict = Depends(pengguna)):
    return {"id": progres.simpan_murojaah(user["id"], body.model_dump())}


@app.get("/api/murojaah/ringkasan")
def ringkasan_murojaah(user: dict = Depends(pengguna)):
    return progres.ringkasan_dashboard(user["id"])


@app.get("/api/progres/harian")
def progres_harian(tanggal: date | None = None, user: dict = Depends(pengguna)):
    """Apa saja yang dibaca pada satu hari (default: hari ini, WIB)."""
    return progres.harian(user["id"], tanggal or database.hari_ini())


@app.get("/api/progres/analitik")
def progres_analitik(hari: int = Query(30, ge=7, le=365), user: dict = Depends(pengguna)):
    """Tren harian, cakupan per juz/surat, dan kata yang sering salah."""
    return progres.analitik(user["id"], hari)


@app.get("/api/health")
def health():
    return {
        "status": "ok" if checker else "loading",
        "device": checker.device if checker else None,
        "rekaman": SAVE_RECORDINGS,  # supaya website bisa memberi tahu pengguna kalau suaranya disimpan
    }


@app.post("/api/cek-tajwid")
async def cek_tajwid(
    request: Request,
    surat: int = Query(..., ge=1, le=114),
    ayat: int = Query(..., ge=1, le=286),
    _user: dict = Depends(pengguna),
):
    """Body: audio mentah float32 mono 16 kHz (application/octet-stream)."""
    body = await request.body()
    if not body or len(body) % 4:
        raise HTTPException(400, "Audio kosong atau formatnya salah")
    wave = np.frombuffer(body, dtype=np.float32)
    if len(wave) > MAX_SECONDS * SAMPLE_RATE:
        raise HTTPException(413, f"Audio terlalu panjang (maks {MAX_SECONDS} detik)")
    if checker is None:
        raise HTTPException(503, "Model masih dimuat")

    def run():
        with gpu_lock:
            return checker.check(wave, surat, ayat)

    t = time.perf_counter()
    try:
        hasil = await run_in_threadpool(run)
    except Exception as e:  # mis. nomor ayat melebihi jumlah ayat surat
        raise HTTPException(400, f"Gagal memproses: {e}") from e

    return {
        "surat": surat,
        "ayat": ayat,
        "kata": hasil["kata"],
        "kesalahan": [asdict(k) for k in hasil["kesalahan"]],
        "waqaf_setelah_kata": hasil["waqaf_setelah_kata"],
        "durasi_audio": round(len(wave) / SAMPLE_RATE, 1),
        "waktu_proses_ms": round((time.perf_counter() - t) * 1000),
    }


@app.websocket("/ws/hafalan")
async def ws_hafalan(ws: WebSocket):
    """Cek hafalan real-time.

    Dari browser : JSON {"type": "mulai", "surat", "ayat", "kata"} / {"type": "berhenti"},
                   lalu audio mentah float32 mono 16 kHz terus-menerus (pesan biner).
    Ke browser   : JSON "siap", "kata" (benar/dibenarkan), "salah", "ayat_selesai", "surat_selesai", "error".
    """
    if ws.headers.get("origin") not in ALLOWED_ORIGINS:
        await ws.close(code=1008)
        return
    # Hanya pengguna yang sudah masuk (token dikirim lewat ?token=..., karena browser
    # tidak bisa menambah header Authorization ke WebSocket)
    if akun.pengguna_dari_token(ws.query_params.get("token")) is None:
        await ws.close(code=4401)
        return
    await ws.accept()
    if checker is None:
        await ws.send_json({"type": "error", "pesan": "Model masih dimuat, coba lagi sebentar."})
        await ws.close()
        return

    def predict(wave, ref):
        with gpu_lock:
            return checker.predict(wave, ref)

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
                    if SAVE_RECORDINGS:
                        rec_log.append({"sampel": rec_samples, "event": event})
        except Exception:
            traceback.print_exc()
            await ws.send_json({"type": "error", "pesan": "Terjadi kesalahan di server."})
        finally:
            busy = False

    await ws.send_json({"type": "siap"})
    try:
        while True:
            message = await ws.receive()
            if message["type"] == "websocket.disconnect":
                break
            data = message.get("bytes")
            if data is not None:
                if len(data) % 4 == 0:
                    chunk = np.frombuffer(data, dtype=np.float32).copy()
                    session.feed(chunk)
                    if SAVE_RECORDINGS:
                        rec_audio.append(chunk)
                        rec_samples += len(chunk)
            elif message.get("text"):
                command = json.loads(message["text"])
                if SAVE_RECORDINGS:
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
        if SAVE_RECORDINGS and rec_samples > SAMPLE_RATE:
            save_recording(np.concatenate(rec_audio), rec_log)


def save_recording(wave: np.ndarray, log: list[dict]):
    import soundfile as sf

    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    name = time.strftime("%Y%m%d-%H%M%S")
    sf.write(os.path.join(RECORDINGS_DIR, f"{name}.wav"), wave, SAMPLE_RATE)
    with open(os.path.join(RECORDINGS_DIR, f"{name}.json"), "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
    print(f"💾 Rekaman disimpan: rekaman/{name}.wav ({len(wave) / SAMPLE_RATE:.0f} detik)")


# --- FRONTEND (harus paling akhir, karena menangkap semua alamat lain) ---
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Tidak ditemukan")
        file = os.path.realpath(os.path.join(FRONTEND_DIST, path))
        if file.startswith(FRONTEND_DIST + os.sep) and os.path.isfile(file):
            return FileResponse(file)
        # Alamat halaman React (/login, /progres, ...) diarahkan ke index.html
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT)
