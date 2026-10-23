import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Mic, BookOpen, ScrollText, Clock, Newspaper, Flame, Target, CheckCircle2, BookMarked,
  ChevronRight, MapPin, History, BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getRingkasanMurojaah } from '../services/murojaahApi';
import { getJadwal, getKotaTersimpan, sholatBerikutnya, formatSisa, rapikanKota } from '../services/sholatApi';

const FITUR = [
  { to: '/cek-hafalan', label: 'Cek Hafalan', desc: 'Murojaah dengan AI, kata demi kata', icon: Mic, warna: 'emerald' },
  { to: '/progres', label: 'Progres Hafalan', desc: 'Rekap harian, tren & peta juz', icon: BarChart3, warna: 'teal' },
  { to: '/pilih-surat', label: 'Baca Al-Quran', desc: 'Mushaf, terjemahan & audio qari', icon: BookOpen, warna: 'sky' },
  { to: '/hadits', label: 'Hadits', desc: 'Kumpulan hadits 9 imam', icon: ScrollText, warna: 'amber' },
  { to: '/jadwal-sholat', label: 'Jadwal Sholat', desc: 'Waktu sholat sesuai kotamu', icon: Clock, warna: 'violet' },
  { to: '/artikel', label: 'Artikel', desc: 'Tips menghafal & tadabbur', icon: Newspaper, warna: 'rose' },
];

const WARNA = {
  emerald: 'bg-emerald-500/10 text-emerald-300 group-hover:bg-emerald-500/20',
  teal: 'bg-teal-500/10 text-teal-300 group-hover:bg-teal-500/20',
  sky: 'bg-sky-500/10 text-sky-300 group-hover:bg-sky-500/20',
  amber: 'bg-amber-500/10 text-amber-300 group-hover:bg-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-300 group-hover:bg-violet-500/20',
  rose: 'bg-rose-500/10 text-rose-300 group-hover:bg-rose-500/20',
};

const tanggalHariIni = () => {
  const now = new Date();
  const masehi = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let hijriah = '';
  try {
    hijriah = now.toLocaleDateString('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { /* browser tidak mendukung kalender Hijriah */ }
  return { masehi, hijriah };
};

const waktuLalu = (detik) => {
  const selisih = Math.floor(Date.now() / 1000 - detik);
  if (selisih < 60) return 'baru saja';
  if (selisih < 3600) return `${Math.floor(selisih / 60)} menit lalu`;
  if (selisih < 86400) return `${Math.floor(selisih / 3600)} jam lalu`;
  if (selisih < 172800) return 'kemarin';
  if (selisih < 604800) return `${Math.floor(selisih / 86400)} hari lalu`;
  return new Date(detik * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

// Alamat untuk melanjutkan dari murojaah terakhir
const urlLanjut = (t) => {
  if (!t) return '/cek-hafalan';
  if (t.selesai) return `/cek-hafalan?halaman=${Math.min(604, t.halaman + 1)}`;
  return `/cek-hafalan?halaman=${t.halaman}&surat=${t.surat}&ayat=${t.ayat_akhir + 1}`;
};

const Stat = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-2xl bg-slate-800/40 border border-white/5 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3">
      <Icon className="w-4 h-4 text-emerald-400" /> {label}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

const SholatCard = () => {
  const [kota] = useState(getKotaTersimpan);
  const [info, setInfo] = useState(null);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    let alive = true;
    const muat = () => getJadwal(kota.id)
      .then((data) => alive && setInfo(sholatBerikutnya(data.jadwal)))
      .catch(() => alive && setGagal(true));
    muat();
    const timer = setInterval(muat, 60000); // perbarui hitung mundur tiap menit
    return () => { alive = false; clearInterval(timer); };
  }, [kota.id]);

  return (
    <Link to="/jadwal-sholat" className="group rounded-3xl border border-white/5 bg-slate-800/40 hover:bg-slate-800/70 p-6 flex flex-col justify-between transition-colors">
      <div className="flex items-center justify-between text-slate-400 text-sm">
        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-violet-300" /> Sholat berikutnya</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
      {info ? (
        <div className="mt-4">
          <p className="text-3xl font-bold text-white">{info.label} <span className="text-violet-300">{info.jam}</span></p>
          <p className="text-sm text-slate-400 mt-1">{info.besok ? 'besok, ' : ''}{formatSisa(info.sisaMenit)}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{gagal ? 'Jadwal belum bisa dimuat.' : 'Memuat jadwal...'}</p>
      )}
      <p className="mt-4 text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {rapikanKota(kota.lokasi)}</p>
    </Link>
  );
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const [ringkasan, setRingkasan] = useState(null);
  const [error, setError] = useState(null);
  const { masehi, hijriah } = tanggalHariIni();
  const namaDepan = user?.nama?.split(' ')[0] || '';

  useEffect(() => {
    getRingkasanMurojaah(token).then(setRingkasan).catch((err) => setError(err.message));
  }, [token]);

  const terakhir = ringkasan?.terakhir;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Sapaan */}
      <header>
        <p className="text-sm text-slate-500">{masehi}{hijriah && ` · ${hijriah}`}</p>
        <h1 className="font-serif text-3xl md:text-4xl text-white mt-1">Assalamu'alaikum, {namaDepan}</h1>
        <p className="text-slate-400 mt-2">Semoga istiqomah menjaga hafalan hari ini.</p>
      </header>

      {/* Lanjutkan murojaah + sholat berikutnya */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/25 via-emerald-900/20 to-slate-900 p-6 sm:p-8">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <p className="text-emerald-300 text-sm font-semibold flex items-center gap-2">
              <BookMarked className="w-4 h-4" /> {terakhir ? 'Lanjutkan murojaah' : 'Mulai murojaah'}
            </p>
            {terakhir ? (
              <>
                <h2 className="font-serif text-2xl sm:text-3xl text-white mt-3">{terakhir.nama_surat}</h2>
                <p className="text-slate-300 mt-1">
                  Halaman {terakhir.halaman} · ayat {terakhir.ayat_awal}–{terakhir.ayat_akhir}
                  <span className="text-slate-500"> · {waktuLalu(terakhir.waktu)}</span>
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {terakhir.selesai ? 'Halaman ini sudah selesai, lanjut ke halaman berikutnya.' : 'Lanjutkan dari ayat terakhir yang kamu baca.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl sm:text-3xl text-white mt-3">Bismillah, mulai dari mana saja</h2>
                <p className="text-slate-300 mt-1">Pilih surat, tekan Mulai, lalu baca hafalanmu. AI akan menyimak kata demi kata.</p>
              </>
            )}
            <Link to={urlLanjut(terakhir)}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-colors">
              <Play className="w-4 h-4" fill="currentColor" /> {terakhir ? 'Lanjutkan' : 'Mulai murojaah'}
            </Link>
          </div>
        </div>
        <SholatCard />
      </section>

      {/* Statistik */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={CheckCircle2} label="Halaman selesai" value={ringkasan?.halaman_selesai ?? '–'} sub="dari 604 halaman" />
        <Stat icon={BookOpen} label="Kata terbaca benar" value={ringkasan ? ringkasan.kata_benar.toLocaleString('id-ID') : '–'} />
        <Stat icon={Flame} label="Hari beruntun" value={ringkasan?.hari_beruntun ?? '–'} sub={ringkasan?.hari_beruntun ? 'pertahankan!' : 'mulai hari ini'} />
        <Stat icon={Target} label="Ketepatan" value={ringkasan?.ketepatan != null ? `${ringkasan.ketepatan}%` : '–'} sub="kata benar tanpa diulang" />
      </section>
      {error && <p className="text-sm text-amber-300/80 -mt-4">{error}</p>}

      {/* Menu fitur */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Mau apa hari ini?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {FITUR.map(({ to, label, desc, icon: Icon, warna }) => (
            <Link key={to} to={to} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-800/40 hover:bg-slate-800/70 hover:border-white/10 p-4 sm:p-5 transition-all">
              <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-colors ${WARNA[warna]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{label}</p>
                <p className="text-sm text-slate-400 leading-snug">{desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      {/* Riwayat */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-slate-400" /> Riwayat murojaah</h2>
          <Link to="/progres" className="text-sm text-emerald-400 hover:underline flex items-center gap-1">Lihat progres <ChevronRight className="w-4 h-4" /></Link>
        </div>
        {ringkasan?.riwayat?.length ? (
          <div className="rounded-2xl border border-white/5 bg-slate-800/30 divide-y divide-white/5">
            {ringkasan.riwayat.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {r.halaman}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.nama_surat} <span className="text-slate-500 font-normal">· ayat {r.ayat_awal}–{r.ayat_akhir}</span></p>
                  <p className="text-xs text-slate-500">{waktuLalu(r.waktu)} · {r.kata_benar} kata benar{r.kata_salah ? `, ${r.kata_salah} perlu diulang` : ''}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${r.selesai ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-white/10 text-slate-400'}`}>
                  {r.selesai ? 'Selesai' : 'Sebagian'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500 text-sm">
            {ringkasan ? 'Belum ada riwayat. Murojaah pertamamu akan muncul di sini.' : error ? 'Riwayat belum bisa dimuat.' : 'Memuat riwayat...'}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
