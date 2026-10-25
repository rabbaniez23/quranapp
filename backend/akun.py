"""Akun pengguna: daftar (dengan kode verifikasi email), masuk, masuk lewat Google, sesi login.

Kata sandi tidak pernah disimpan apa adanya: yang disimpan hanya hash scrypt + garam acak.
Token sesi dan kode verifikasi juga hanya disimpan hash-nya, jadi kalau database bocor, tidak bisa dipakai.
"""
import base64
import hashlib
import hmac
import os
import re
import secrets
import threading
import time
from datetime import timedelta

from sqlalchemy import delete, func, insert, or_, select, update
from sqlalchemy.exc import IntegrityError

import database as db
import surel

SESSION_DAYS = 30
USERNAME_RE = re.compile(r"^[a-z0-9_.]{3,20}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", re.IGNORECASE)
KODE_MENIT = 15          # kode verifikasi berlaku sekian menit
KODE_MAKS_SALAH = 5      # kode salah sebanyak ini → harus daftar ulang
KIRIM_ULANG_DETIK = 60   # jeda minimal kirim ulang kode
KIRIM_MAKS = 5           # kirim kode maksimal sekian kali per pendaftaran
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class AkunError(ValueError):
    """Kesalahan yang pesannya boleh ditampilkan ke pengguna."""


# --- Kata sandi ---
def _hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def _verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_b64, digest_b64 = stored.split("$")
        salt, digest = base64.b64decode(salt_b64), base64.b64decode(digest_b64)
    except ValueError:
        return False
    test = hashlib.scrypt(password.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=len(digest))
    return hmac.compare_digest(test, digest)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _public(row) -> dict:
    return {"id": row.id, "nama": row.nama, "username": row.username, "email": row.email,
            "punya_sandi": row.password_hash != "!"}  # akun dari Google belum tentu punya kata sandi


def _rapikan_email(email: str) -> str:
    return email.strip().lower()


# --- Daftar: isi data → kode dikirim ke email → kode benar → akun dibuat ---
def _cek_data_baru(nama: str, username: str, email: str, password: str) -> tuple[str, str, str]:
    nama = " ".join(nama.split())
    username = username.strip().lower()
    email = _rapikan_email(email)
    if not 2 <= len(nama) <= 60:
        raise AkunError("Nama harus 2–60 huruf.")
    if not USERNAME_RE.match(username):
        raise AkunError("Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah.")
    if len(email) > 254 or not EMAIL_RE.match(email):
        raise AkunError("Alamat email tidak valid.")
    if not 8 <= len(password) <= 128:
        raise AkunError("Kata sandi minimal 8 karakter.")
    with db.engine.connect() as conn:
        dipakai = conn.execute(select(db.users.c.username, db.users.c.email).where(
            or_(db.users.c.username == username, db.users.c.email == email))).all()
    if any(r.username == username for r in dipakai):
        raise AkunError("Username sudah dipakai, coba yang lain.")
    if dipakai:
        raise AkunError("Email ini sudah terdaftar. Silakan masuk, atau pakai email lain.")
    return nama, username, email


def _kode_baru() -> tuple[str, str]:
    kode = f"{secrets.randbelow(10 ** 6):06d}"
    return kode, _token_hash(kode)


def mulai_daftar(nama: str, username: str, email: str, password: str) -> str:
    """Simpan pendaftaran sementara dan kirim kode ke email. Hasil: email yang dipakai."""
    nama, username, email = _cek_data_baru(nama, username, email, password)
    kode, kode_hash = _kode_baru()
    now = db.utc_now()
    with db.engine.begin() as conn:
        conn.execute(delete(db.pendaftaran).where(
            or_(db.pendaftaran.c.email == email, db.pendaftaran.c.kedaluwarsa < now)))
        conn.execute(insert(db.pendaftaran).values(
            email=email, username=username, nama=nama, password_hash=_hash_password(password), kode_hash=kode_hash,
            kedaluwarsa=now + timedelta(minutes=KODE_MENIT), percobaan=0, jumlah_kirim=1, dikirim=now))
    surel.kirim_kode(email, nama, kode, KODE_MENIT)
    return email


def kirim_ulang_kode(email: str):
    email = _rapikan_email(email)
    now = db.utc_now()
    with db.engine.begin() as conn:
        p = conn.execute(select(db.pendaftaran).where(db.pendaftaran.c.email == email)).first()
        if p is None or p.kedaluwarsa < now:
            raise AkunError("Pendaftaran tidak ditemukan atau sudah kedaluwarsa. Silakan daftar ulang.")
        if (now - p.dikirim).total_seconds() < KIRIM_ULANG_DETIK:
            raise AkunError("Tunggu sebentar sebelum minta kode lagi.")
        if p.jumlah_kirim >= KIRIM_MAKS:
            raise AkunError("Sudah terlalu sering minta kode. Silakan daftar ulang nanti.")
        kode, kode_hash = _kode_baru()
        conn.execute(update(db.pendaftaran).where(db.pendaftaran.c.id == p.id).values(
            kode_hash=kode_hash, percobaan=0, jumlah_kirim=p.jumlah_kirim + 1, dikirim=now,
            kedaluwarsa=now + timedelta(minutes=KODE_MENIT)))
    surel.kirim_kode(email, p.nama, kode, KODE_MENIT)


def verifikasi_daftar(email: str, kode: str) -> dict:
    """Kode benar → akun dibuat. Hasil: data pengguna."""
    email = _rapikan_email(email)
    kode = kode.strip()
    now = db.utc_now()
    with db.engine.begin() as conn:
        p = conn.execute(select(db.pendaftaran).where(db.pendaftaran.c.email == email)).first()
        if p is None or p.kedaluwarsa < now:
            raise AkunError("Kode sudah kedaluwarsa. Silakan daftar ulang.")
        if not hmac.compare_digest(_token_hash(kode), p.kode_hash):
            if p.percobaan + 1 >= KODE_MAKS_SALAH:
                conn.execute(delete(db.pendaftaran).where(db.pendaftaran.c.id == p.id))
            else:
                conn.execute(update(db.pendaftaran).where(db.pendaftaran.c.id == p.id).values(
                    percobaan=p.percobaan + 1))
            salah_terus = p.percobaan + 1 >= KODE_MAKS_SALAH
        else:
            salah_terus = None
            conn.execute(delete(db.pendaftaran).where(db.pendaftaran.c.id == p.id))
    # (di luar transaksi supaya hitungan percobaan tetap tersimpan walaupun kodenya salah)
    if salah_terus:
        raise AkunError("Kode salah terlalu sering. Silakan daftar ulang.")
    if salah_terus is False:
        raise AkunError("Kode salah. Periksa lagi email kamu.")
    try:
        with db.engine.begin() as conn:
            result = conn.execute(insert(db.users).values(
                nama=p.nama, username=p.username, password_hash=p.password_hash, email=email, dibuat=now))
    except IntegrityError as e:  # username/email keburu dipakai orang lain selama menunggu kode
        raise AkunError("Username atau email sudah dipakai. Silakan daftar ulang.") from e
    return {"id": result.inserted_primary_key[0], "nama": p.nama, "username": p.username, "email": email,
            "punya_sandi": True}


# --- Lupa kata sandi: kode dikirim ke email akun → kode benar → kata sandi diganti ---
def minta_reset(email: str):
    """Kirim kode ganti kata sandi kalau emailnya terdaftar. Sengaja tidak memberi tahu
    apakah email itu terdaftar atau tidak (supaya tidak bisa dipakai menebak email pengguna)."""
    email = _rapikan_email(email)
    now = db.utc_now()
    with db.engine.begin() as conn:
        user = conn.execute(select(db.users).where(db.users.c.email == email)).first()
        if user is None:
            return
        lama = conn.execute(select(db.reset_sandi).where(db.reset_sandi.c.user_id == user.id)).first()
        if lama is not None and (now - lama.dikirim).total_seconds() < KIRIM_ULANG_DETIK:
            return  # baru saja dikirim; kode lama masih berlaku
        kode, kode_hash = _kode_baru()
        conn.execute(delete(db.reset_sandi).where(db.reset_sandi.c.user_id == user.id))
        conn.execute(insert(db.reset_sandi).values(
            user_id=user.id, kode_hash=kode_hash, kedaluwarsa=now + timedelta(minutes=KODE_MENIT), percobaan=0,
            dikirim=now))
    surel.kirim_kode(email, user.nama, kode, KODE_MENIT, jenis="reset")


def reset_sandi(email: str, kode: str, password_baru: str):
    """Kode benar → kata sandi diganti dan semua sesi login lama dikeluarkan."""
    if not 8 <= len(password_baru) <= 128:
        raise AkunError("Kata sandi minimal 8 karakter.")
    email = _rapikan_email(email)
    now = db.utc_now()
    salah = AkunError("Kode salah atau sudah kedaluwarsa.")
    with db.engine.begin() as conn:
        user = conn.execute(select(db.users).where(db.users.c.email == email)).first()
        r = user and conn.execute(select(db.reset_sandi).where(db.reset_sandi.c.user_id == user.id)).first()
        if not r or r.kedaluwarsa < now:
            raise salah
        if not hmac.compare_digest(_token_hash(kode.strip()), r.kode_hash):
            if r.percobaan + 1 >= KODE_MAKS_SALAH:
                conn.execute(delete(db.reset_sandi).where(db.reset_sandi.c.user_id == user.id))
            else:
                conn.execute(update(db.reset_sandi).where(db.reset_sandi.c.user_id == user.id).values(
                    percobaan=r.percobaan + 1))
            ok = False
        else:
            conn.execute(update(db.users).where(db.users.c.id == user.id).values(
                password_hash=_hash_password(password_baru)))
            conn.execute(delete(db.reset_sandi).where(db.reset_sandi.c.user_id == user.id))
            conn.execute(delete(db.sessions).where(db.sessions.c.user_id == user.id))
            ok = True
    if not ok:  # di luar transaksi, supaya hitungan percobaan tetap tersimpan
        raise salah


# --- Hapus akun (hak pengguna menurut UU PDP) ---
def hapus_akun(user_id: int, password: str = "", konfirmasi: str = ""):
    """Hapus akun beserta seluruh riwayat murojaahnya. Akun dengan kata sandi harus memasukkan kata
    sandinya; akun Google (tanpa kata sandi) mengetik username-nya sebagai konfirmasi."""
    with db.engine.connect() as conn:
        user = conn.execute(select(db.users).where(db.users.c.id == user_id)).first()
    if user is None:
        raise AkunError("Akun tidak ditemukan.")
    if user.password_hash != "!":
        if not _verify_password(password, user.password_hash):
            raise AkunError("Kata sandi salah.")
    elif konfirmasi.strip().lower() != user.username:
        raise AkunError("Ketik username kamu untuk konfirmasi.")
    with db.engine.begin() as conn:
        for tabel in (db.murojaah_kata, db.murojaah_ayat, db.murojaah_sesi, db.sessions, db.reset_sandi):
            conn.execute(delete(tabel).where(tabel.c.user_id == user_id))
        conn.execute(delete(db.users).where(db.users.c.id == user_id))


# --- Masuk ---
def masuk(username_atau_email: str, password: str) -> dict | None:
    kunci = username_atau_email.strip().lower()
    kolom = db.users.c.email if "@" in kunci else db.users.c.username
    with db.engine.connect() as conn:
        row = conn.execute(select(db.users).where(kolom == kunci)).first()
    if row is None:
        _verify_password(password, _hash_password("pembanding"))  # samakan waktu respons
        return None
    return _public(row) if _verify_password(password, row.password_hash) else None


def _verifikasi_token_google(credential: str) -> dict:
    """Periksa ID token dari tombol "Masuk dengan Google" (tanda tangan Google, penerima, kedaluwarsa)."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    return id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)


def _username_dari_email(conn, email: str) -> str:
    dasar = re.sub(r"[^a-z0-9_.]", "", email.split("@")[0].lower())[:16].ljust(3, "0")
    calon, n = dasar, 1
    while conn.execute(select(func.count()).select_from(db.users).where(db.users.c.username == calon)).scalar():
        n += 1
        calon = f"{dasar[:20 - len(str(n))]}{n}"
    return calon


def masuk_google(credential: str) -> dict:
    """Masuk/daftar lewat Google. Akun yang emailnya sama otomatis disambungkan."""
    if not GOOGLE_CLIENT_ID:
        raise AkunError("Masuk dengan Google belum diaktifkan.")
    try:
        info = _verifikasi_token_google(credential)
    except Exception as e:
        raise AkunError("Gagal memeriksa akun Google. Coba lagi.") from e
    if not info.get("email_verified"):
        raise AkunError("Email akun Google ini belum terverifikasi.")
    sub, email = str(info["sub"]), _rapikan_email(info["email"])
    with db.engine.begin() as conn:
        row = conn.execute(select(db.users).where(db.users.c.google_sub == sub)).first()
        if row is None:
            row = conn.execute(select(db.users).where(db.users.c.email == email)).first()
            if row is not None:
                conn.execute(update(db.users).where(db.users.c.id == row.id).values(google_sub=sub))
            else:
                nama = " ".join((info.get("name") or "").split())[:60]
                if len(nama) < 2:
                    nama = email.split("@")[0][:60]
                uid = conn.execute(insert(db.users).values(
                    nama=nama, username=_username_dari_email(conn, email), password_hash="!", email=email,
                    google_sub=sub, dibuat=db.utc_now())).inserted_primary_key[0]
                row = conn.execute(select(db.users).where(db.users.c.id == uid)).first()
    return _public(row)


def buat_sesi(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = db.utc_now()
    with db.engine.begin() as conn:
        conn.execute(delete(db.sessions).where(db.sessions.c.kedaluwarsa < now))
        conn.execute(insert(db.sessions).values(
            token_hash=_token_hash(token), user_id=user_id, kedaluwarsa=now + timedelta(days=SESSION_DAYS)))
    return token


def pengguna_dari_token(token: str | None) -> dict | None:
    if not token:
        return None
    with db.engine.connect() as conn:
        row = conn.execute(
            select(db.users)
            .join(db.sessions, db.sessions.c.user_id == db.users.c.id)
            .where(db.sessions.c.token_hash == _token_hash(token), db.sessions.c.kedaluwarsa > db.utc_now())
        ).first()
    return _public(row) if row else None


def hapus_sesi(token: str):
    with db.engine.begin() as conn:
        conn.execute(delete(db.sessions).where(db.sessions.c.token_hash == _token_hash(token)))


class PembatasPercobaan:
    """Batasi tebak-tebakan kata sandi: maksimal `batas` gagal per username dalam `jendela` detik."""

    def __init__(self, batas: int = 8, jendela: int = 600):
        self.batas, self.jendela = batas, jendela
        self.gagal: dict[str, list[float]] = {}
        self.lock = threading.Lock()

    def diblokir(self, kunci: str) -> bool:
        with self.lock:
            now = time.time()
            self.gagal[kunci] = [t for t in self.gagal.get(kunci, []) if now - t < self.jendela]
            return len(self.gagal[kunci]) >= self.batas

    def catat_gagal(self, kunci: str):
        with self.lock:
            self.gagal.setdefault(kunci, []).append(time.time())

    def reset(self, kunci: str):
        with self.lock:
            self.gagal.pop(kunci, None)
