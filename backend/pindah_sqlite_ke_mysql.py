"""Pindahkan data lama dari SQLite (data/quranapp.db) ke database di DATABASE_URL (MySQL). Cukup sekali.

Cara pakai (dari folder backend):
    .venv\\Scripts\\python pindah_sqlite_ke_mysql.py
"""
import os
import sqlite3
import sys
from datetime import datetime, timezone

from sqlalchemy import func, insert, select

import database as db

sys.stdout.reconfigure(encoding="utf-8")
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "data", "quranapp.db")


def utc(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, timezone.utc).replace(tzinfo=None)


def main():
    if db.engine.url.get_backend_name() == "sqlite":
        sys.exit("DATABASE_URL masih SQLite. Isi DATABASE_URL MySQL di file .env dulu.")
    if not os.path.exists(SQLITE_PATH):
        sys.exit(f"Tidak ada data lama di {SQLITE_PATH}")
    db.init_db()
    with db.engine.connect() as conn:
        if conn.execute(select(func.count()).select_from(db.users)).scalar():
            sys.exit("Database tujuan sudah berisi pengguna. Dibatalkan supaya data tidak dobel.")

    lama = sqlite3.connect(SQLITE_PATH)
    lama.row_factory = sqlite3.Row
    users = lama.execute("SELECT * FROM users").fetchall()
    sessions = lama.execute("SELECT * FROM sessions").fetchall()
    murojaah = lama.execute("SELECT * FROM murojaah ORDER BY waktu").fetchall()

    with db.engine.begin() as conn:
        for u in users:  # id dipertahankan supaya sesi & riwayat tetap terhubung
            conn.execute(insert(db.users).values(
                id=u["id"], nama=u["nama"], username=u["username"], password_hash=u["password_hash"],
                dibuat=utc(u["dibuat"])))
        for s in sessions:
            conn.execute(insert(db.sessions).values(
                token_hash=s["token_hash"], user_id=s["user_id"], kedaluwarsa=utc(s["kedaluwarsa"])))
        for m in murojaah:
            tanggal = datetime.fromtimestamp(m["waktu"], db.WIB).date()
            sesi_id = conn.execute(insert(db.murojaah_sesi).values(
                user_id=m["user_id"], tanggal=tanggal, waktu=utc(m["waktu"]), surat=m["surat"],
                nama_surat=m["nama_surat"], halaman=m["halaman"], ayat_awal=m["ayat_awal"],
                ayat_akhir=m["ayat_akhir"], kata_benar=m["kata_benar"], kata_salah=m["kata_salah"],
                durasi_detik=0, selesai=bool(m["selesai"]))).inserted_primary_key[0]
            ayat = conn.execute(select(db.dim_ayat.c.ayat).where(
                db.dim_ayat.c.surat == m["surat"], db.dim_ayat.c.ayat.between(m["ayat_awal"], m["ayat_akhir"]))
            ).scalars().all()
            if ayat:
                conn.execute(insert(db.murojaah_ayat), [
                    {"sesi_id": sesi_id, "user_id": m["user_id"], "tanggal": tanggal, "surat": m["surat"], "ayat": a}
                    for a in ayat])
    print(f"Selesai: {len(users)} pengguna, {len(sessions)} sesi login, {len(murojaah)} riwayat murojaah dipindahkan.")
    print(f"File lama tetap ada di {SQLITE_PATH} (boleh dihapus kalau sudah yakin).")


if __name__ == "__main__":
    main()
