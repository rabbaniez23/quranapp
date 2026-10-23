import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CalendarDays, CheckCircle2, Clock, FileText, Flame, Layers, RotateCcw, Target, TriangleAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAnalitik, getProgresHarian } from '../services/progresApi';

// Hari ini (WIB/zona browser) dalam format YYYY-MM-DD untuk input tanggal
const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTanggal = (iso, opsi = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', opsi);

const formatDurasi = (detik) => {
  if (!detik) return '0 menit';
  const menit = Math.round(detik / 60);
  if (menit < 1) return `${detik} detik`;
  if (menit < 60) return `${menit} menit`;
  return `${Math.floor(menit / 60)} jam ${menit % 60} menit`;
};

const angka = (n) => (n ?? 0).toLocaleString('id-ID');

const Tile = ({ icon: Icon, label, value, sub, className = '' }) => (
  <div className={`rounded-2xl bg-slate-800/40 border border-white/5 p-4 sm:p-5 ${className}`}>
    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
      <Icon className="w-4 h-4 text-emerald-400" /> {label}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const Section = ({ title, icon: Icon, children, right }) => (
  <section className="rounded-3xl border border-white/5 bg-slate-800/20 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Icon className="w-5 h-5 text-slate-400" /> {title}</h2>
      {right}
    </div>
    {children}
  </section>
);

// --- Grafik aktivitas harian (satu ukuran, batang hijau, tooltip saat disorot) ---
const METRIK = [
  { key: 'kata_benar', label: 'Kata benar', format: angka },
  { key: 'ayat', label: 'Ayat', format: angka },
  { key: 'durasi_detik', label: 'Waktu', format: formatDurasi },
];

const GrafikAktivitas = ({ tren }) => {
  const [metrik, setMetrik] = useState(METRIK[0]);
  const [tabel, setTabel] = useState(false);
  const nilai = tren.map((t) => t[metrik.key]);
  const maks = Math.max(...nilai, 1);
  const kosong = nilai.every((v) => v === 0);

  return (
    <div>
      {/* Pilihan ukuran: satu baris di atas grafik */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {METRIK.map((m) => (
          <button key={m.key} onClick={() => setMetrik(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              metrik.key === m.key ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
            {m.label}
          </button>
        ))}
        <button onClick={() => setTabel((v) => !v)} className="ml-auto text-xs text-slate-400 hover:text-white underline underline-offset-4">
          {tabel ? 'Lihat grafik' : 'Lihat tabel'}
        </button>
      </div>

      {tabel ? (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 text-slate-400 text-xs">
              <tr><th className="text-left px-4 py-2">Tanggal</th><th className="text-right px-4 py-2">Kata benar</th><th className="text-right px-4 py-2">Ayat</th><th className="text-right px-4 py-2">Waktu</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {[...tren].reverse().map((t) => (
                <tr key={t.tanggal}>
                  <td className="px-4 py-2">{formatTanggal(t.tanggal, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-2 text-right">{angka(t.kata_benar)}</td>
                  <td className="px-4 py-2 text-right">{angka(t.ayat)}</td>
                  <td className="px-4 py-2 text-right">{formatDurasi(t.durasi_detik)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          {/* Garis bantu tipis: nilai tertinggi & tengah */}
          <div className="absolute inset-x-0 top-0 h-48 pointer-events-none">
            {[0, 0.5].map((f) => (
              <div key={f} className="absolute inset-x-0 border-t border-dashed border-white/5" style={{ top: `${f * 100}%` }}>
                <span className="absolute -top-2.5 left-0 text-[10px] text-slate-500 bg-slate-900/80 pr-1">{metrik.format(Math.round(maks * (1 - f)))}</span>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-0.5 h-48 border-b border-white/10 pl-10" role="img"
            aria-label={`Grafik ${metrik.label.toLowerCase()} per hari selama ${tren.length} hari`}>
            {tren.map((t, i) => {
              const v = t[metrik.key];
              // Tooltip batang di pinggir menempel ke sisi dalam supaya tidak keluar kartu
              const posisi = i < 4 ? 'left-0' : i >= tren.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2';
              return (
                <div key={t.tanggal} className="group relative flex-1 h-full flex items-end">
                  {/* Area sorot lebih besar dari batangnya */}
                  <div className={`w-full rounded-t-[4px] transition-colors ${v ? 'bg-emerald-400 group-hover:bg-emerald-300' : 'bg-transparent'}`}
                    style={{ height: v ? `${Math.max(2, (v / maks) * 100)}%` : 0 }} />
                  <div className={`pointer-events-none absolute bottom-full ${posisi} mb-2 hidden group-hover:block z-10 whitespace-nowrap rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs shadow-xl`}>
                    <p className="text-slate-400">{formatTanggal(t.tanggal, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    <p className="text-white font-semibold">{metrik.label}: {metrik.format(v)}</p>
                    {t.sesi > 0 && <p className="text-slate-400">{t.sesi} sesi · {angka(t.ayat)} ayat</p>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Label tanggal: tiap 7 hari + hari ini */}
          <div className="flex gap-0.5 pl-10 mt-2">
            {tren.map((t, i) => (
              <div key={t.tanggal} className="flex-1 text-center text-[10px] text-slate-500 overflow-visible whitespace-nowrap">
                {(i === tren.length - 1 || (tren.length - 1 - i) % 7 === 0) ? formatTanggal(t.tanggal, { day: 'numeric', month: 'short' }) : ''}
              </div>
            ))}
          </div>
          {kosong && <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Belum ada aktivitas dalam {tren.length} hari terakhir.</p>}
        </div>
      )}
    </div>
  );
};

// --- Peta hafalan per juz: satu warna hijau, makin terang = makin banyak; angka % selalu tampil ---
const warnaJuz = (persen) => {
  if (persen === 0) return 'bg-slate-800/70 text-slate-500';
  if (persen < 25) return 'bg-emerald-900 text-emerald-100';
  if (persen < 50) return 'bg-emerald-700 text-white';
  if (persen < 75) return 'bg-emerald-500 text-white';
  if (persen < 100) return 'bg-emerald-400 text-slate-950';
  return 'bg-emerald-300 text-slate-950';
};

const PetaJuz = ({ juz }) => (
  <div>
    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-10 gap-1.5">
      {juz.map((j) => {
        const persen = Math.round((100 * j.ayat) / j.total);
        return (
          <div key={j.juz} className={`group relative rounded-xl p-2 sm:p-3 text-center ${warnaJuz(persen)}`}
            aria-label={`Juz ${j.juz}: ${j.ayat} dari ${j.total} ayat (${persen}%)`}>
            <p className="text-[10px] opacity-80">Juz</p>
            <p className="text-lg font-bold leading-tight">{j.juz}</p>
            <p className="text-[11px] font-medium">{persen}%</p>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white shadow-xl">
              Juz {j.juz}: {angka(j.ayat)} dari {angka(j.total)} ayat
            </div>
          </div>
        );
      })}
    </div>
    <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-400">
      <span>Ayat yang sudah pernah dimurojaah:</span>
      {[['bg-slate-800/70', '0%'], ['bg-emerald-900', '<25%'], ['bg-emerald-700', '<50%'], ['bg-emerald-500', '<75%'], ['bg-emerald-400', '<100%'], ['bg-emerald-300', '100%']].map(([c, l]) => (
        <span key={l} className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${c}`} /> {l}</span>
      ))}
    </div>
  </div>
);

const Progres = () => {
  const { token } = useAuth();
  const [tanggal, setTanggal] = useState(hariIni);
  const [harian, setHarian] = useState({ untuk: null, data: null });
  const [analitik, setAnalitik] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAnalitik(token, 30).then(setAnalitik).catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    let alive = true;
    getProgresHarian(token, tanggal)
      .then((data) => alive && setHarian({ untuk: tanggal, data }))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [token, tanggal]);

  const hari = harian.untuk === tanggal ? harian.data : null;
  const total = analitik?.total;
  const isHariIni = tanggal === hariIni();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-white">Progres Hafalan</h1>
          <p className="text-slate-400 mt-2">Lihat apa saja yang sudah dibaca dan seberapa jauh hafalanmu.</p>
        </div>
      </header>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      {/* Ringkasan keseluruhan */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tile icon={Layers} label="Ayat dimurojaah" value={total ? angka(total.ayat_unik) : '–'} sub={total ? `${total.persen_quran}% dari 6.236 ayat` : ''} />
        <Tile icon={FileText} label="Halaman tuntas" value={total ? angka(total.halaman_tuntas) : '–'} sub="semua ayatnya pernah dibaca" />
        <Tile icon={Flame} label="Hari aktif" value={total ? angka(total.hari_aktif) : '–'} sub="hari dengan murojaah" />
        <Tile icon={Clock} label="Total waktu" value={total ? formatDurasi(total.durasi_detik) : '–'} sub={total ? `${angka(total.kata_benar)} kata benar` : ''} />
      </section>

      {/* Rekap satu hari */}
      <Section
        title={isHariIni ? 'Hari ini' : formatTanggal(tanggal, { weekday: 'long', day: 'numeric', month: 'long' })}
        icon={CalendarDays}
        right={
          <div className="flex items-center gap-2">
            {!isHariIni && <button onClick={() => setTanggal(hariIni())} className="text-xs text-emerald-400 hover:underline">Kembali ke hari ini</button>}
            <input type="date" value={tanggal} max={hariIni()} onChange={(e) => e.target.value && setTanggal(e.target.value)}
              aria-label="Pilih tanggal"
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 [color-scheme:dark]" />
          </div>
        }
      >
        {!hari ? (
          <p className="text-sm text-slate-500">Memuat...</p>
        ) : hari.total.sesi === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">{isHariIni ? 'Belum ada murojaah hari ini.' : 'Tidak ada murojaah di hari ini.'}</p>
            {isHariIni && <Link to="/cek-hafalan" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold">Mulai murojaah</Link>}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Tile icon={BookOpen} label="Ayat dibaca" value={angka(hari.total.ayat)} />
              <Tile icon={FileText} label="Halaman" value={angka(hari.total.halaman)} />
              <Tile icon={CheckCircle2} label="Kata benar" value={angka(hari.total.kata_benar)} />
              <Tile icon={RotateCcw} label="Perlu diulang" value={angka(hari.total.kata_salah)} />
              <Tile icon={Clock} label="Waktu" value={formatDurasi(hari.total.durasi_detik)} className="col-span-2 sm:col-span-1" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Yang dibaca</h3>
                <div className="rounded-2xl border border-white/5 divide-y divide-white/5">
                  {hari.surat.map((s) => (
                    <div key={s.surat} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{s.nama_surat}</p>
                        <p className="text-xs text-slate-500">Ayat {s.ayat_awal}–{s.ayat_akhir}</p>
                      </div>
                      <span className="text-sm text-slate-300">{s.jumlah_ayat} ayat</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Kata yang perlu diulang</h3>
                {hari.perlu_diulang.length ? (
                  <div className="rounded-2xl border border-white/5 divide-y divide-white/5 max-h-64 overflow-y-auto">
                    {hari.perlu_diulang.map((k, i) => (
                      <div key={i} className="flex items-baseline gap-3 px-4 py-2.5">
                        <span className="font-serif text-xl text-amber-200 shrink-0" dir="rtl">{k.kata}</span>
                        <span className="text-xs text-slate-400">{k.surat}:{k.ayat} · {k.pesan}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-white/5 px-4 py-6 text-center text-sm text-emerald-300">MasyaAllah, tidak ada yang perlu diulang.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Tren */}
      <Section title="Aktivitas 30 hari terakhir" icon={Target}>
        {analitik ? <GrafikAktivitas tren={analitik.tren} /> : <div className="h-48 rounded-xl bg-slate-800/40 animate-pulse" />}
      </Section>

      {/* Peta juz */}
      <Section title="Peta hafalan per juz" icon={Layers}>
        {analitik ? <PetaJuz juz={analitik.juz} /> : <div className="h-40 rounded-xl bg-slate-800/40 animate-pulse" />}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per surat */}
        <Section title="Progres per surat" icon={BookOpen}>
          {analitik?.surat.length ? (
            <div className="space-y-4">
              {analitik.surat.slice(0, 10).map((s) => {
                const persen = Math.round((100 * s.ayat) / s.total);
                return (
                  <div key={s.surat}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-white">{s.surat}. {s.nama_surat}</span>
                      <span className="text-slate-400">{s.ayat}/{s.total} ayat · {persen}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="img" aria-label={`${s.nama_surat} ${persen}%`}>
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(persen, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{analitik ? 'Belum ada surat yang dimurojaah.' : 'Memuat...'}</p>
          )}
        </Section>

        {/* Sering salah */}
        <Section title="Kata yang sering salah" icon={TriangleAlert}>
          {analitik?.sering_salah.length ? (
            <div className="divide-y divide-white/5">
              {analitik.sering_salah.map((k, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <span className="font-serif text-2xl text-white w-28 shrink-0 text-right" dir="rtl">{k.kata}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{k.pesan || 'Tidak terdengar jelas'}</p>
                    <p className="text-xs text-slate-500">Surat {k.surat} ayat {k.ayat}</p>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    {k.salah > 0 && <p className="text-red-300">{k.salah}× diulang</p>}
                    {k.catatan > 0 && <p className="text-amber-300">{k.catatan}× catatan</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{analitik ? 'Belum ada kata yang salah tercatat.' : 'Memuat...'}</p>
          )}
        </Section>
      </div>
    </div>
  );
};

export default Progres;
