"""Server AI saja (model Quran Muaalem), untuk dijalankan di komputer ber-GPU.

Server utama (server.py dengan AI_SERVER=...) meneruskan cek hafalan ke sini. Tidak ada akun,
database, atau website di sini; yang boleh masuk hanya yang membawa AI_KUNCI yang sama.

Isi .env di komputer ini:
    AI_KUNCI=<kunci rahasia, sama dengan di server utama>
    AI_HOST=<IP Tailscale komputer ini>   (default 127.0.0.1)
    AI_PORT=8020

Jalankan (dari folder backend):
    .venv\\Scripts\\python ai_worker.py
    .venv\\Scripts\\pythonw ai_worker.py --log ai_worker.log   (tanpa jendela, untuk Task Scheduler)
"""
import hmac
import os
import sys
import threading
import time
from contextlib import asynccontextmanager

# pythonw tidak punya konsol: arahkan semua keluaran ke file log
if "--log" in sys.argv:
    _log = open(sys.argv[sys.argv.index("--log") + 1], "a", encoding="utf-8", buffering=1)
    sys.stdout = sys.stderr = _log
else:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import uvicorn  # noqa: E402
from dotenv import load_dotenv  # noqa: E402
from fastapi import FastAPI, Header, HTTPException, WebSocket  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from hafalan_ws import layani_hafalan  # noqa: E402
from tajwid import TajwidChecker  # noqa: E402

AI_KUNCI = os.getenv("AI_KUNCI", "")
HOST = os.getenv("AI_HOST", "127.0.0.1")
PORT = int(os.getenv("AI_PORT", "8020"))
SAVE_RECORDINGS = os.getenv("SIMPAN_REKAMAN") == "1"

checker: TajwidChecker | None = None
gpu_lock = threading.Lock()  # satu GPU, jadi proses satu per satu


def kunci_cocok(kunci: str | None) -> bool:
    return bool(AI_KUNCI) and kunci is not None and hmac.compare_digest(kunci, AI_KUNCI)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global checker
    t = time.time()
    print(f"⏳ Memuat model tajwid... ({time.strftime('%Y-%m-%d %H:%M:%S')})")
    checker = TajwidChecker()
    print(f"✅ Server AI siap di {checker.device.upper()} ({time.time() - t:.0f} detik), http://{HOST}:{PORT}")
    yield


app = FastAPI(title="QuranApp AI", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/api/health")
def health(x_ai_kunci: str | None = Header(default=None)):
    if not kunci_cocok(x_ai_kunci):
        raise HTTPException(403, "Kunci salah")
    return {"status": "ok" if checker else "loading", "device": checker.device if checker else None,
            "rekaman": SAVE_RECORDINGS}


@app.websocket("/ws/ai")
async def ws_ai(ws: WebSocket):
    if not kunci_cocok(ws.headers.get("x-ai-kunci")):
        await ws.close(code=4403)
        return
    await ws.accept()
    if checker is None:
        await ws.send_json({"type": "error", "pesan": "Model masih dimuat, coba lagi sebentar."})
        await ws.close()
        return

    def predict(wave, ref):
        with gpu_lock:
            return checker.predict(wave, ref)

    await layani_hafalan(ws, predict, SAVE_RECORDINGS)


if __name__ == "__main__":
    if not AI_KUNCI:
        sys.exit("AI_KUNCI belum diisi di .env")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
