"""Backend QuranApp: akun (daftar/masuk), riwayat murojaah, cek hafalan real-time (WebSocket),
dan cek tajwid per ayat.

Dua cara jalan:
- Semua di satu komputer (default): model AI dimuat di sini.
- AI_SERVER=http://<ip>:8020 di .env: model AI ada di komputer lain (ai_worker.py), cek hafalan
  diteruskan ke sana. Kalau komputer AI mati, website tetap jalan dan cek hafalan pakai Google.

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
import urllib.request
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal
from dataclasses import asdict

import numpy as np
import uvicorn
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

import akun
import database
import progres

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
SAMPLE_RATE = 16000
# SIMPAN_REKAMAN=1 → tiap sesi murojaah disimpan ke folder rekaman/ (audio + keputusan AI),
# untuk dianalisis ulang kalau ada kata yang salah dinilai. Hanya di komputer ini.
SAVE_RECORDINGS = os.getenv("SIMPAN_REKAMAN") == "1"
# Model AI di komputer lain (ai_worker.py). Kosong = model dimuat di sini.
AI_SERVER = os.getenv("AI_SERVER", "").rstrip("/")
AI_KUNCI = os.getenv("AI_KUNCI", "")
# Hasil `npm run build` frontend; kalau ada, ikut disajikan dari sini (cukup satu alamat di server)
FRONTEND_DIST = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

checker = None  # TajwidChecker, hanya kalau model dimuat di sini
gpu_lock = threading.Lock()  # satu GPU, jadi proses satu per satu


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global checker
    database.init_db()
    print(f"🗄️  Database siap ({database.engine.url.render_as_string(hide_password=True)})")
    if AI_SERVER:
        print(f"🔗 Model AI di {AI_SERVER}")
    else:
        from tajwid import TajwidChecker  # torch hanya di-import kalau modelnya memang di sini
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
# Kirim kode verifikasi: maksimal 5 per email per jam, dan 100 per jam untuk seluruh website
# (supaya website ini tidak bisa dipakai bot untuk membanjiri email orang)
pembatas_kode_email = akun.PembatasPercobaan(batas=5, jendela=3600)
pembatas_kode_semua = akun.PembatasPercobaan(batas=100, jendela=3600)


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
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)
    website: str = Field(default="", max_length=200)  # jebakan bot: kolom tersembunyi, manusia tidak mengisinya


class VerifikasiBody(BaseModel):
    email: str = Field(max_length=254)
    kode: str = Field(max_length=10)


class EmailBody(BaseModel):
    email: str = Field(max_length=254)


class MasukBody(BaseModel):
    username: str = Field(max_length=254)  # username atau email
    password: str = Field(max_length=200)


class GoogleBody(BaseModel):
    credential: str = Field(max_length=4096)


def _boleh_kirim_kode(email: str):
    email = email.strip().lower()
    if pembatas_kode_email.diblokir(email) or pembatas_kode_semua.diblokir("semua"):
        raise HTTPException(429, "Terlalu banyak permintaan kode. Coba lagi nanti.")
    pembatas_kode_email.catat_gagal(email)
    pembatas_kode_semua.catat_gagal("semua")


@app.get("/api/auth/config")
def auth_config():
    """Pengaturan untuk halaman masuk/daftar (Client ID Google bukan rahasia)."""
    return {"google_client_id": akun.GOOGLE_CLIENT_ID or None}


@app.post("/api/auth/daftar")
def daftar(body: DaftarBody):
    """Langkah 1: data dicek, kode verifikasi dikirim ke email. Akun baru dibuat setelah kodenya benar."""
    if body.website:  # bot: pura-pura berhasil, tapi tidak ada yang dikirim/dibuat
        return {"email": body.email.strip().lower(), "perlu_verifikasi": True}
    _boleh_kirim_kode(body.email)
    try:
        email = akun.mulai_daftar(body.nama, body.username, body.email, body.password)
    except akun.AkunError as e:
        raise HTTPException(400, str(e)) from e
    except OSError as e:  # SMTP gagal
        print(f"⚠️  Gagal kirim email: {e!r}")
        raise HTTPException(503, "Email verifikasi gagal dikirim. Coba lagi sebentar.") from e
    return {"email": email, "perlu_verifikasi": True}


@app.post("/api/auth/daftar/kirim-ulang")
def kirim_ulang(body: EmailBody):
    _boleh_kirim_kode(body.email)
    try:
        akun.kirim_ulang_kode(body.email)
    except akun.AkunError as e:
        raise HTTPException(400, str(e)) from e
    except OSError as e:
        print(f"⚠️  Gagal kirim email: {e!r}")
        raise HTTPException(503, "Email verifikasi gagal dikirim. Coba lagi sebentar.") from e
    return {"ok": True}


@app.post("/api/auth/daftar/verifikasi")
def verifikasi(body: VerifikasiBody):
    """Langkah 2: kode dari email benar → akun dibuat dan langsung masuk."""
    try:
        user = akun.verifikasi_daftar(body.email, body.kode)
    except akun.AkunError as e:
        raise HTTPException(400, str(e)) from e
    return {"token": akun.buat_sesi(user["id"]), "user": user}


@app.post("/api/auth/google")
def masuk_google(body: GoogleBody):
    try:
        user = akun.masuk_google(body.credential)
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
        raise HTTPException(401, "Username/email atau kata sandi salah.")
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


# --- STATUS SERVER AI (kalau modelnya di komputer lain) ---
_status_ai = {"waktu": 0.0, "hasil": {"status": "offline"}}


def _tanya_ai() -> dict:
    req = urllib.request.Request(f"{AI_SERVER}/api/health", headers={"X-AI-Kunci": AI_KUNCI})
    with urllib.request.urlopen(req, timeout=2) as r:
        return json.load(r)


async def status_ai() -> dict:
    # Disimpan 10 detik supaya tiap pengunjung tidak memicu panggilan ke komputer AI
    if time.time() - _status_ai["waktu"] > 10:
        try:
            hasil = await run_in_threadpool(_tanya_ai)
        except Exception:
            hasil = {"status": "offline"}
        _status_ai.update(waktu=time.time(), hasil=hasil)
    return _status_ai["hasil"]


@app.get("/api/health")
async def health():
    if AI_SERVER:
        ai = await status_ai()
        return {"status": ai.get("status", "offline"), "device": ai.get("device"), "rekaman": ai.get("rekaman", False)}
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
        raise HTTPException(503, "Model tidak tersedia di server ini" if AI_SERVER else "Model masih dimuat")

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
    if AI_SERVER:
        await teruskan_ke_ai(ws)
        return
    if checker is None:
        await ws.send_json({"type": "error", "pesan": "Model masih dimuat, coba lagi sebentar."})
        await ws.close()
        return

    from hafalan_ws import layani_hafalan

    def predict(wave, ref):
        with gpu_lock:
            return checker.predict(wave, ref)

    await layani_hafalan(ws, predict, SAVE_RECORDINGS)


async def teruskan_ke_ai(ws: WebSocket):
    """Teruskan sesi cek hafalan ke ai_worker.py apa adanya (dua arah).
    Kalau komputer AI tidak bisa dihubungi atau putus, browser menerima error/tutup → pindah ke Google."""
    from websockets.asyncio.client import connect

    try:
        ai = await connect(f"{AI_SERVER.replace('http', 'ws', 1)}/ws/ai", additional_headers={"X-AI-Kunci": AI_KUNCI},
                           open_timeout=4, max_size=2**22)
    except Exception as e:
        print(f"⚠️  Server AI tidak bisa dihubungi: {e!r}")
        _status_ai.update(waktu=time.time(), hasil={"status": "offline"})
        await ws.send_json({"type": "error", "pesan": "Server AI tidak tersedia."})
        await ws.close()
        return

    async def ke_ai():
        while True:
            message = await ws.receive()
            if message["type"] == "websocket.disconnect":
                return
            if message.get("bytes") is not None:
                await ai.send(message["bytes"])
            elif message.get("text"):
                await ai.send(message["text"])

    async def ke_browser():
        async for message in ai:
            if isinstance(message, str):
                await ws.send_text(message)

    tugas = [asyncio.create_task(ke_ai()), asyncio.create_task(ke_browser())]
    try:
        await asyncio.wait(tugas, return_when=asyncio.FIRST_COMPLETED)
    finally:
        for t in tugas:
            t.cancel()
        await asyncio.gather(*tugas, return_exceptions=True)
        await ai.close()
        try:
            await ws.close()
        except Exception:
            pass  # browser sudah menutup duluan


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
