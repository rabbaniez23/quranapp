"""Akun pengguna: daftar, masuk, sesi login.

Kata sandi tidak pernah disimpan apa adanya: yang disimpan hanya hash scrypt + garam acak.
Token sesi juga hanya disimpan hash-nya, jadi kalau database bocor, token tidak bisa dipakai.
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

from sqlalchemy import delete, insert, select
from sqlalchemy.exc import IntegrityError

import database as db

SESSION_DAYS = 30
USERNAME_RE = re.compile(r"^[a-z0-9_.]{3,20}$")


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
    return {"id": row.id, "nama": row.nama, "username": row.username}


# --- Akun & sesi ---
def daftar(nama: str, username: str, password: str) -> dict:
    nama = " ".join(nama.split())
    username = username.strip().lower()
    if not 2 <= len(nama) <= 60:
        raise AkunError("Nama harus 2–60 huruf.")
    if not USERNAME_RE.match(username):
        raise AkunError("Username 3–20 karakter: huruf kecil, angka, titik, atau garis bawah.")
    if not 8 <= len(password) <= 128:
        raise AkunError("Kata sandi minimal 8 karakter.")
    try:
        with db.engine.begin() as conn:
            result = conn.execute(insert(db.users).values(
                nama=nama, username=username, password_hash=_hash_password(password), dibuat=db.utc_now()))
    except IntegrityError as e:
        raise AkunError("Username sudah dipakai, coba yang lain.") from e
    return {"id": result.inserted_primary_key[0], "nama": nama, "username": username}


def masuk(username: str, password: str) -> dict | None:
    with db.engine.connect() as conn:
        row = conn.execute(select(db.users).where(db.users.c.username == username.strip().lower())).first()
    if row is None:
        _verify_password(password, _hash_password("pembanding"))  # samakan waktu respons
        return None
    return _public(row) if _verify_password(password, row.password_hash) else None


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
