"""Koneksi dan struktur database (MySQL; SQLite juga bisa untuk tes).

Alamat database diambil dari DATABASE_URL di file .env, contoh:
    DATABASE_URL=mysql+pymysql://quranapp:sandi@127.0.0.1:3306/quranapp?charset=utf8mb4

Struktur tabel analisis memakai pola data warehouse sederhana:
  - dim_ayat        : dimensi, semua 6.236 ayat (halaman, juz, jumlah kata)
  - murojaah_sesi   : fakta, satu baris per sesi murojaah
  - murojaah_ayat   : fakta, satu baris per ayat yang dibaca dalam sesi
  - murojaah_kata   : fakta, satu baris per kata yang salah / diberi catatan
Setiap fakta punya kolom `tanggal` (hari WIB), supaya rekap harian cukup GROUP BY tanggal.
"""
import json
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, MetaData, SmallInteger, String, Table,
    create_engine, func, insert, select,
)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

WIB = timezone(timedelta(hours=7))
DEFAULT_URL = "sqlite:///" + os.path.join(os.path.dirname(__file__), "data", "quranapp.db")

metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("nama", String(60), nullable=False),
    Column("username", String(20), nullable=False, unique=True),
    Column("password_hash", String(255), nullable=False),
    Column("dibuat", DateTime, nullable=False),
)

sessions = Table(
    "sessions", metadata,
    Column("token_hash", String(64), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("kedaluwarsa", DateTime, nullable=False),
)

dim_ayat = Table(
    "dim_ayat", metadata,
    Column("surat", SmallInteger, primary_key=True, autoincrement=False),
    Column("ayat", SmallInteger, primary_key=True, autoincrement=False),
    Column("halaman", SmallInteger, nullable=False, index=True),
    Column("juz", SmallInteger, nullable=False, index=True),
    Column("jumlah_kata", SmallInteger, nullable=False),
)

murojaah_sesi = Table(
    "murojaah_sesi", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("tanggal", Date, nullable=False),          # hari (WIB)
    Column("waktu", DateTime, nullable=False),        # UTC
    Column("surat", SmallInteger, nullable=False),
    Column("nama_surat", String(60), nullable=False),
    Column("halaman", SmallInteger, nullable=False),
    Column("ayat_awal", SmallInteger, nullable=False),
    Column("ayat_akhir", SmallInteger, nullable=False),
    Column("kata_benar", Integer, nullable=False),
    Column("kata_salah", Integer, nullable=False),
    Column("durasi_detik", Integer, nullable=False, default=0),
    Column("selesai", Boolean, nullable=False),
    Index("murojaah_sesi_user_tanggal", "user_id", "tanggal"),
)

murojaah_ayat = Table(
    "murojaah_ayat", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("sesi_id", Integer, ForeignKey("murojaah_sesi.id", ondelete="CASCADE"), nullable=False),
    Column("user_id", Integer, nullable=False),
    Column("tanggal", Date, nullable=False),
    Column("surat", SmallInteger, nullable=False),
    Column("ayat", SmallInteger, nullable=False),
    Index("murojaah_ayat_user_ayat", "user_id", "surat", "ayat"),
    Index("murojaah_ayat_user_tanggal", "user_id", "tanggal"),
)

murojaah_kata = Table(
    "murojaah_kata", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("sesi_id", Integer, ForeignKey("murojaah_sesi.id", ondelete="CASCADE"), nullable=False),
    Column("user_id", Integer, nullable=False),
    Column("tanggal", Date, nullable=False),
    Column("surat", SmallInteger, nullable=False),
    Column("ayat", SmallInteger, nullable=False),
    Column("kata_index", SmallInteger, nullable=False),
    Column("kata", String(80), nullable=False),
    Column("jenis", String(10), nullable=False),      # "salah" (harus diulang) / "catatan" (kesalahan kecil)
    Column("pesan", String(500), nullable=False, default=""),
    Index("murojaah_kata_user_kata", "user_id", "surat", "ayat", "kata_index"),
)


def make_engine(url: str | None = None):
    url = url or os.getenv("DATABASE_URL") or DEFAULT_URL
    if url.startswith("sqlite"):
        os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    # pool_pre_ping: sambungan MySQL yang sudah ditutup server otomatis diganti
    return create_engine(url, pool_pre_ping=True, pool_recycle=3600)


engine = make_engine()


def init_db(eng=None):
    """Buat tabel yang belum ada, lalu isi dim_ayat (sekali saja)."""
    eng = eng or engine
    metadata.create_all(eng)
    with eng.begin() as conn:
        if conn.execute(select(func.count()).select_from(dim_ayat)).scalar():
            return
        path = os.path.join(os.path.dirname(__file__), "quran_meta.json")
        with open(path, encoding="utf-8") as f:
            rows = json.load(f)["ayat"]
        conn.execute(insert(dim_ayat), [
            {"surat": s, "ayat": a, "halaman": h, "juz": j, "jumlah_kata": k} for s, a, h, j, k in rows
        ])


def utc_now() -> datetime:
    """Waktu sekarang (UTC, tanpa zona) untuk disimpan di kolom DATETIME."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hari_ini():
    """Tanggal hari ini menurut WIB."""
    return datetime.now(WIB).date()
