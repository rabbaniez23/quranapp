"""Kirim email (kode verifikasi pendaftaran) lewat SMTP.

Isi di .env, contoh pakai Gmail (perlu Sandi Aplikasi, bukan sandi Gmail biasa):
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=alamat@gmail.com
    SMTP_PASSWORD=<sandi aplikasi 16 huruf>
    SMTP_FROM=TemanTahfidz <alamat@gmail.com>

Kalau SMTP_HOST kosong, email tidak dikirim: kodenya hanya ditulis ke log server (untuk tes di komputer sendiri).
"""
import html
import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr, parseaddr

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER


def aktif() -> bool:
    return bool(SMTP_HOST)


_JENIS = {
    # jenis: (judul email, untuk apa kodenya, kalau tidak merasa meminta)
    "daftar": ("kode verifikasi", "Kode verifikasi pendaftaran TemanTahfidz kamu",
               "Kalau kamu tidak merasa mendaftar, abaikan email ini."),
    "reset": ("kode ganti kata sandi", "Kode untuk mengganti kata sandi TemanTahfidz kamu",
              "Kalau kamu tidak meminta ganti kata sandi, abaikan email ini; kata sandimu tetap aman."),
}


def kirim_kode(email: str, nama: str, kode: str, menit: int, jenis: str = "daftar"):
    judul, untuk, abaikan = _JENIS[jenis]
    if not SMTP_HOST:
        print(f"📧 [SMTP belum diatur] Kode {jenis} untuk {email}: {kode}")
        return
    nama = html.escape(nama)
    msg = EmailMessage()
    msg["Subject"] = f"{kode} adalah {judul} TemanTahfidz"
    nama_pengirim, alamat_pengirim = parseaddr(SMTP_FROM)
    msg["From"] = formataddr((nama_pengirim or "TemanTahfidz", alamat_pengirim))
    msg["To"] = email
    msg.set_content(
        f"Assalamu'alaikum {nama},\n\n"
        f"{untuk}: {kode}\n\n"
        f"Kode ini berlaku {menit} menit. {abaikan}\n"
    )
    msg.add_alternative(f"""\
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="color:#059669;margin-bottom:4px">TemanTahfidz</h2>
  <p>Assalamu'alaikum {nama},</p>
  <p>{untuk}:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#ecfdf5;padding:16px;text-align:center;border-radius:12px">{kode}</p>
  <p style="color:#475569;font-size:14px">Kode ini berlaku {menit} menit. {abaikan}</p>
</div>""", subtype="html")
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as s:
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)
