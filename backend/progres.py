"""Riwayat murojaah dan analisis progres hafalan (lihat database.py untuk struktur tabelnya)."""
from datetime import date, timedelta, timezone

from sqlalchemy import case, desc, func, insert, select

import database as db

S, A, K, D = db.murojaah_sesi, db.murojaah_ayat, db.murojaah_kata, db.dim_ayat
TOTAL_AYAT = 6236


def _epoch(waktu) -> float:
    """DATETIME (UTC) → detik sejak 1970, untuk ditampilkan "x menit lalu" di website."""
    return waktu.replace(tzinfo=timezone.utc).timestamp()


def _sesi_dict(r) -> dict:
    return {
        "surat": r.surat, "nama_surat": r.nama_surat, "halaman": r.halaman,
        "ayat_awal": r.ayat_awal, "ayat_akhir": r.ayat_akhir,
        "kata_benar": r.kata_benar, "kata_salah": r.kata_salah,
        "durasi_detik": r.durasi_detik, "selesai": bool(r.selesai), "waktu": _epoch(r.waktu),
    }


def _ayat_unik(user_id: int, sejak: date | None = None, sampai: date | None = None):
    """Subquery: pasangan (surat, ayat) berbeda yang pernah dibaca pengguna (opsional dalam rentang tanggal)."""
    q = select(A.c.surat, A.c.ayat).where(A.c.user_id == user_id)
    if sejak:
        q = q.where(A.c.tanggal >= sejak)
    if sampai:
        q = q.where(A.c.tanggal <= sampai)
    return q.distinct().subquery()


# --- Simpan ---
def simpan_murojaah(user_id: int, data: dict) -> int:
    tanggal, waktu = db.hari_ini(), db.utc_now()
    surat = data["surat"]
    awal, akhir = sorted((data["ayat_awal"], data["ayat_akhir"]))
    with db.engine.begin() as conn:
        sesi_id = conn.execute(insert(S).values(
            user_id=user_id, tanggal=tanggal, waktu=waktu, surat=surat, nama_surat=data["nama_surat"],
            halaman=data["halaman"], ayat_awal=awal, ayat_akhir=akhir,
            kata_benar=data["kata_benar"], kata_salah=data["kata_salah"],
            durasi_detik=data.get("durasi_detik", 0), selesai=data["selesai"],
        )).inserted_primary_key[0]

        # Fakta per ayat (hanya ayat yang benar-benar ada di surat itu)
        ayat_list = conn.execute(
            select(D.c.ayat).where(D.c.surat == surat, D.c.ayat.between(awal, akhir))
        ).scalars().all()
        if ayat_list:
            conn.execute(insert(A), [
                {"sesi_id": sesi_id, "user_id": user_id, "tanggal": tanggal, "surat": surat, "ayat": a}
                for a in ayat_list
            ])

        # Fakta per kata yang salah / diberi catatan
        kesalahan = data.get("kesalahan") or []
        if kesalahan:
            conn.execute(insert(K), [
                {"sesi_id": sesi_id, "user_id": user_id, "tanggal": tanggal, "surat": k["surat"],
                 "ayat": k["ayat"], "kata_index": k["kata_index"], "kata": k["kata"][:80],
                 "jenis": k["jenis"], "pesan": (k.get("pesan") or "")[:500]}
                for k in kesalahan
            ])
    return sesi_id


# --- Dashboard ---
def _hari_beruntun(tanggal_aktif: set) -> int:
    """Berapa hari berturut-turut (sampai hari ini/kemarin) ada murojaah."""
    streak, cek = 0, db.hari_ini()
    if cek not in tanggal_aktif:
        cek -= timedelta(days=1)  # belum murojaah hari ini, hitung dari kemarin
    while cek in tanggal_aktif:
        streak += 1
        cek -= timedelta(days=1)
    return streak


def ringkasan_dashboard(user_id: int) -> dict:
    with db.engine.connect() as conn:
        total = conn.execute(select(
            func.count(), func.coalesce(func.sum(S.c.kata_benar), 0), func.coalesce(func.sum(S.c.kata_salah), 0),
        ).where(S.c.user_id == user_id)).one()
        halaman_selesai = conn.execute(
            select(func.count(func.distinct(S.c.halaman))).where(S.c.user_id == user_id, S.c.selesai.is_(True))
        ).scalar()
        tanggal_aktif = set(conn.execute(
            select(S.c.tanggal).where(S.c.user_id == user_id).distinct()
        ).scalars().all())
        riwayat = conn.execute(
            select(S).where(S.c.user_id == user_id).order_by(desc(S.c.waktu), desc(S.c.id)).limit(8)
        ).all()
    jumlah, benar, salah = total
    return {
        "total_sesi": jumlah,
        "halaman_selesai": halaman_selesai,
        "kata_benar": int(benar),
        "ketepatan": round(100 * benar / (benar + salah)) if benar + salah else None,
        "hari_beruntun": _hari_beruntun(tanggal_aktif),
        "terakhir": _sesi_dict(riwayat[0]) if riwayat else None,
        "riwayat": [_sesi_dict(r) for r in riwayat],
    }


# --- Rekap satu hari ---
def harian(user_id: int, tanggal: date) -> dict:
    with db.engine.connect() as conn:
        sesi = conn.execute(
            select(S).where(S.c.user_id == user_id, S.c.tanggal == tanggal).order_by(S.c.waktu)
        ).all()
        unik = _ayat_unik(user_id, tanggal, tanggal)
        ayat_dibaca = conn.execute(select(func.count()).select_from(unik)).scalar()
        per_surat = conn.execute(
            select(unik.c.surat, func.min(unik.c.ayat), func.max(unik.c.ayat), func.count())
            .group_by(unik.c.surat).order_by(unik.c.surat)
        ).all()
        perlu_diulang = conn.execute(
            select(K.c.surat, K.c.ayat, K.c.kata, K.c.pesan)
            .where(K.c.user_id == user_id, K.c.tanggal == tanggal, K.c.jenis == "salah")
            .order_by(K.c.id).limit(30)
        ).all()
    nama = {r.surat: r.nama_surat for r in sesi}
    return {
        "tanggal": tanggal.isoformat(),
        "total": {
            "sesi": len(sesi),
            "ayat": ayat_dibaca,
            "halaman": len({r.halaman for r in sesi}),
            "kata_benar": sum(r.kata_benar for r in sesi),
            "kata_salah": sum(r.kata_salah for r in sesi),
            "durasi_detik": sum(r.durasi_detik for r in sesi),
        },
        "surat": [{"surat": s, "nama_surat": nama.get(s, f"Surat {s}"), "ayat_awal": lo, "ayat_akhir": hi, "jumlah_ayat": n}
                  for s, lo, hi, n in per_surat],
        "sesi": [_sesi_dict(r) for r in sesi],
        "perlu_diulang": [{"surat": r.surat, "ayat": r.ayat, "kata": r.kata, "pesan": r.pesan} for r in perlu_diulang],
    }


# --- Analisis jangka panjang ---
def analitik(user_id: int, hari: int = 30) -> dict:
    sampai = db.hari_ini()
    sejak = sampai - timedelta(days=hari - 1)
    with db.engine.connect() as conn:
        # Tren harian: kata & durasi dari sesi, jumlah ayat berbeda dari fakta ayat
        per_hari = {r.tanggal: r for r in conn.execute(
            select(S.c.tanggal, func.sum(S.c.kata_benar).label("benar"), func.sum(S.c.kata_salah).label("salah"),
                   func.sum(S.c.durasi_detik).label("durasi"), func.count().label("sesi"))
            .where(S.c.user_id == user_id, S.c.tanggal >= sejak).group_by(S.c.tanggal)
        ).all()}
        ayat_harian_q = select(A.c.tanggal, A.c.surat, A.c.ayat).where(
            A.c.user_id == user_id, A.c.tanggal >= sejak).distinct().subquery()
        ayat_per_hari = dict(conn.execute(
            select(ayat_harian_q.c.tanggal, func.count()).group_by(ayat_harian_q.c.tanggal)
        ).all())

        # Cakupan: ayat berbeda yang pernah dimurojaah, dikelompokkan per juz / surat / halaman
        unik = _ayat_unik(user_id)
        dijangkau = select(D.c.surat, D.c.ayat, D.c.juz, D.c.halaman).join(
            unik, (unik.c.surat == D.c.surat) & (unik.c.ayat == D.c.ayat)).subquery()
        total_juz = dict(conn.execute(select(D.c.juz, func.count()).group_by(D.c.juz)).all())
        juz_dijangkau = dict(conn.execute(select(dijangkau.c.juz, func.count()).group_by(dijangkau.c.juz)).all())
        total_surat = dict(conn.execute(select(D.c.surat, func.count()).group_by(D.c.surat)).all())
        surat_rows = conn.execute(select(dijangkau.c.surat, func.count()).group_by(dijangkau.c.surat)).all()
        info_surat = {r.surat: r for r in conn.execute(
            select(S.c.surat, func.max(S.c.nama_surat).label("nama"), func.max(S.c.tanggal).label("terakhir"))
            .where(S.c.user_id == user_id).group_by(S.c.surat)
        ).all()}
        total_halaman = dict(conn.execute(select(D.c.halaman, func.count()).group_by(D.c.halaman)).all())
        halaman_dijangkau = conn.execute(
            select(dijangkau.c.halaman, func.count()).group_by(dijangkau.c.halaman)).all()

        # Kata yang paling sering salah (dan catatan kecil)
        sering_salah = conn.execute(
            select(K.c.surat, K.c.ayat, K.c.kata_index, K.c.kata,
                   func.sum(case((K.c.jenis == "salah", 1), else_=0)).label("salah"),
                   func.sum(case((K.c.jenis == "catatan", 1), else_=0)).label("catatan"),
                   func.max(K.c.pesan).label("pesan"), func.max(K.c.tanggal).label("terakhir"))
            .where(K.c.user_id == user_id)
            .group_by(K.c.surat, K.c.ayat, K.c.kata_index, K.c.kata)
            .order_by(desc("salah"), desc("catatan")).limit(10)
        ).all()
        hari_aktif = conn.execute(select(func.count(func.distinct(S.c.tanggal))).where(S.c.user_id == user_id)).scalar()
        total_kata, total_durasi = conn.execute(select(
            func.coalesce(func.sum(S.c.kata_benar), 0), func.coalesce(func.sum(S.c.durasi_detik), 0)
        ).where(S.c.user_id == user_id)).one()

    tren = []
    for i in range(hari):
        t = sejak + timedelta(days=i)
        r = per_hari.get(t)
        tren.append({
            "tanggal": t.isoformat(),
            "kata_benar": int(r.benar) if r else 0,
            "kata_salah": int(r.salah) if r else 0,
            "durasi_detik": int(r.durasi) if r else 0,
            "sesi": r.sesi if r else 0,
            "ayat": ayat_per_hari.get(t, 0),
        })
    ayat_unik = sum(juz_dijangkau.values())
    return {
        "total": {
            "hari_aktif": hari_aktif,
            "ayat_unik": ayat_unik,
            "persen_quran": round(100 * ayat_unik / TOTAL_AYAT, 1),
            "halaman_tuntas": sum(1 for h, n in halaman_dijangkau if n == total_halaman[h]),
            "kata_benar": int(total_kata),
            "durasi_detik": int(total_durasi),
        },
        "tren": tren,
        "juz": [{"juz": j, "ayat": juz_dijangkau.get(j, 0), "total": total_juz[j]} for j in sorted(total_juz)],
        "surat": sorted(
            [{"surat": s, "nama_surat": info_surat[s].nama if s in info_surat else f"Surat {s}",
              "ayat": n, "total": total_surat[s],
              "terakhir": info_surat[s].terakhir.isoformat() if s in info_surat else None}
             for s, n in surat_rows],
            key=lambda x: x["terakhir"] or "", reverse=True),
        "sering_salah": [
            {"surat": r.surat, "ayat": r.ayat, "kata": r.kata, "salah": int(r.salah), "catatan": int(r.catatan),
             "pesan": r.pesan, "terakhir": r.terakhir.isoformat()}
            for r in sering_salah],
    }
