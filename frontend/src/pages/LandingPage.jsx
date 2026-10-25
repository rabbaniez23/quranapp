import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BookOpen, Check, ChevronDown, Clock, Github, Mail, Mic, PlayCircle, RotateCcw, ScrollText,
  ShieldCheck, Smartphone, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ikutiKursor, useReveal } from '../hooks/useReveal';

// Data developer (foto: taruh file di frontend/public/developer.jpg; kalau belum ada, tampil inisial)
const DEVELOPER = {
  nama: 'Naufal Rizki Rabbani',
  inisial: 'NR',
  peran: 'Pembuat & Pengembang TemanTahfidz',
  foto: '/developer.jpg',
  github: 'https://github.com/rabbaniez23',
  email: 'temantahfidz0@gmail.com',
};

// Satu ayat untuk kartu contoh (Al-Fatihah: 2), kata demi kata
const DEMO_KATA = ['ٱلْحَمْدُ', 'لِلَّهِ', 'رَبِّ', 'ٱلْعَـٰلَمِينَ'];

const FITUR = [
  {
    icon: Mic, judul: 'Cek Hafalan dengan AI', besar: true,
    isi: 'AI menyimak bacaanmu kata demi kata. Kata yang terlewat atau dibaca lain langsung ditandai dan harus diulang, catatan kecil ditampilkan setelah ayat selesai.',
  },
  { icon: BarChart3, judul: 'Progres Hafalan', isi: 'Rekap harian, tren 30 hari, dan peta 30 juz untuk melihat seberapa jauh hafalanmu.' },
  { icon: BookOpen, judul: 'Al-Quran Digital', isi: 'Mushaf dengan terjemahan dan audio murottal per ayat maupun satu surat.' },
  { icon: ScrollText, judul: 'Kumpulan Hadits', isi: 'Hadits dari 9 imam beserta terjemahannya.' },
  { icon: Clock, judul: 'Jadwal Sholat', isi: 'Waktu sholat sesuai kotamu, langsung di beranda.' },
  {
    icon: Smartphone, judul: 'Nyaman di HP', penuh: true,
    isi: 'Tampilan ringan untuk HP, layar tetap menyala selama murojaah, dan tetap bisa dipakai walau jaringan sedang kurang bersahabat.',
  },
];

const LANGKAH = [
  { icon: BookOpen, judul: 'Pilih surat', isi: 'Buka Cek Hafalan, pilih surat atau halaman yang ingin dimurojaah.' },
  { icon: Mic, judul: 'Baca hafalanmu', isi: 'Tekan Mulai lalu baca. Kata yang benar terbuka satu per satu; yang salah berbunyi "teet" dan menunggu diulang.' },
  { icon: BarChart3, judul: 'Lihat catatan & progres', isi: 'Setelah ayat selesai, catatan muncul. Semua tercatat di Progres Hafalan.' },
];

const FAQ = [
  { t: 'Apakah TemanTahfidz gratis?', j: 'Ya, selama masa uji coba semua fitur bisa dipakai gratis. Kalau nanti ada fitur berbayar, akan kami beritahukan lebih dulu.' },
  { t: 'Apakah AI-nya bisa salah?', j: 'Bisa. AI membantu latihan murojaah, bukan pengganti guru. Tetap setorkan bacaanmu kepada ustadz/ustadzah.' },
  { t: 'Apa saja yang dicek?', j: 'Urutan kata, huruf, dan harakat. Huruf yang makhrajnya mirip dan panjang mad tidak dibuat ketat, supaya fokus pada hafalan.' },
  { t: 'Apakah suaraku disimpan?', j: 'Tidak. Suara diperiksa saat itu juga lalu dibuang. Selengkapnya ada di Kebijakan Privasi.' },
  { t: 'Bisa dipakai di HP?', j: 'Bisa, cukup lewat browser (disarankan Chrome). Izinkan mikrofon saat diminta.' },
];

// Angka yang menghitung naik saat terlihat
const AngkaNaik = ({ sampai, akhiran = '' }) => {
  const ref = useRef(null);
  // Tanpa animasi (pengguna memilih kurangi gerakan / browser lama): langsung angka akhirnya
  const [diam] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window));
  const [nilai, setNilai] = useState(diam ? sampai : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || diam) return;
    let raf;
    const pengamat = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      pengamat.disconnect();
      const mulai = performance.now();
      const langkah = (t) => {
        const p = Math.min(1, (t - mulai) / 1400);
        setNilai(Math.round(sampai * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(langkah);
      };
      raf = requestAnimationFrame(langkah);
    }, { threshold: 0.4 });
    pengamat.observe(el);
    return () => { pengamat.disconnect(); cancelAnimationFrame(raf); };
  }, [sampai, diam]);
  return <span ref={ref}>{nilai.toLocaleString('id-ID')}{akhiran}</span>;
};

const JudulBagian = ({ label, judul, sub }) => (
  <div className="text-center max-w-2xl mx-auto mb-12 lg:mb-16 reveal">
    <p className="text-emerald-400 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-3">{label}</p>
    <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">{judul}</h2>
    {sub && <p className="text-slate-400 mt-4 leading-relaxed">{sub}</p>}
  </div>
);

// Kartu contoh tampilan Cek Hafalan (animasi CSS: kata terbuka satu per satu)
const KartuContoh = () => (
  <div className="relative w-full max-w-md">
    <div className="relative rounded-[2rem] border border-white/10 bg-slate-900/80 lg:bg-slate-900/60 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl shadow-emerald-950/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white font-serif text-lg">Al-Fatihah · Ayat 2</p>
          <p className="text-emerald-400 text-[11px] uppercase tracking-[0.2em] font-semibold">Contoh tampilan</p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-[11px] font-semibold text-red-300">
          <span className="w-2 h-2 rounded-full bg-red-500 lg:animate-pulse" /> Mendengarkan
        </span>
      </div>

      <div className="rounded-2xl bg-slate-950/60 border border-white/5 px-4 py-6 mb-5" dir="rtl">
        <div className="flex flex-wrap gap-x-3 gap-y-2 justify-start font-serif text-3xl sm:text-4xl leading-loose">
          {DEMO_KATA.map((kata, i) => (
            <span key={kata} className="relative inline-block">
              <span className="demo-kata inline-block text-white" style={{ animationDelay: `${i * 0.9}s` }}>{kata}</span>
              <span className="demo-balok absolute inset-x-0 top-1/2 -translate-y-1/2 h-[0.9em] rounded-lg bg-slate-700/70"
                style={{ animationDelay: `${i * 0.9}s` }} aria-hidden="true" />
            </span>
          ))}
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-5">
        <div className="demo-bar h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-emerald-200">
          <Check className="w-4 h-4 shrink-0" /> Ayat 1 lancar
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-amber-200">
          <RotateCcw className="w-4 h-4 shrink-0" /> 1 kata diulang
        </div>
      </div>
    </div>

    {/* Label melayang (laptop) */}
    <div className="hidden lg:flex absolute -left-16 -top-7 lg-melayang items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl px-4 py-3 shadow-xl">
      <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><Mic className="w-4 h-4" /></span>
      <span className="text-sm text-white">Kata demi kata</span>
    </div>
    <div className="hidden lg:flex absolute -right-8 -bottom-12 lg-melayang [animation-delay:-3s] items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl px-4 py-3 shadow-xl">
      <span className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-200 flex items-center justify-center"><BarChart3 className="w-4 h-4" /></span>
      <span className="text-sm text-white">Progres tercatat</span>
    </div>
  </div>
);

const FotoDeveloper = () => {
  const [gagal, setGagal] = useState(false);
  return (
    <div className="relative w-44 h-44 sm:w-56 sm:h-56 shrink-0">
      <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-amber-300 to-emerald-600 opacity-80" />
      <div className="relative w-full h-full rounded-[1.75rem] overflow-hidden bg-slate-900 flex items-center justify-center">
        {gagal ? (
          <span className="font-serif text-6xl sm:text-7xl teks-kilau">{DEVELOPER.inisial}</span>
        ) : (
          <img src={DEVELOPER.foto} alt={`Foto ${DEVELOPER.nama}`} className="w-full h-full object-cover" onError={() => setGagal(true)} />
        )}
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { user } = useAuth();
  const { hash } = useLocation();
  useReveal();

  // Dari tautan navbar (/#fitur dst.): gulir ke bagiannya
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  const tujuanUtama = user ? '/dashboard' : '/register';

  return (
    <div className="relative">
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden pt-28 sm:pt-32 lg:pt-40 pb-20 lg:pb-32">
        {/* Latar: cahaya aurora (gradien radial, ringan di HP) + pola bintang */}
        <div className="absolute inset-0 -z-10 pola-bintang [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -z-10 -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] lg-aurora rounded-full bg-[radial-gradient(closest-side,rgb(16_185_129/0.28),transparent)]" />
        <div className="absolute -z-10 top-40 -right-40 w-[600px] h-[600px] lg-aurora [animation-delay:-7s] rounded-full bg-[radial-gradient(closest-side,rgb(251_191_36/0.12),transparent)]" />
        <div className="absolute -z-10 bottom-0 -left-40 w-[500px] h-[500px] lg-aurora [animation-delay:-13s] rounded-full bg-[radial-gradient(closest-side,rgb(45_212_191/0.15),transparent)]" />

        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <div className="anim-naik inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs sm:text-sm text-emerald-200">
              <Sparkles className="w-4 h-4" /> Versi Beta · Gratis selama masa uji coba
            </div>
            <h1 className="anim-naik [animation-delay:.1s] mt-6 font-serif text-[2.6rem] leading-[1.1] sm:text-6xl lg:text-7xl text-white">
              Jaga Hafalan<br />Al-Quran, <span className="teks-kilau italic">Setiap Hari</span>
            </h1>
            <p className="anim-naik [animation-delay:.2s] mt-6 text-base sm:text-lg text-slate-300/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Teman murojaah yang menyimak bacaanmu kata demi kata dengan AI. Kata yang terlewat langsung ditandai,
              progres hafalanmu tercatat rapi.
            </p>
            <div className="anim-naik [animation-delay:.3s] mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to={tujuanUtama}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-7 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/50 hover:brightness-110 transition-all">
                {user ? 'Buka Dashboard' : 'Mulai Murojaah Gratis'}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#cara-kerja"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors">
                <PlayCircle className="w-5 h-5" /> Lihat Cara Kerja
              </a>
            </div>
            <ul className="anim-naik [animation-delay:.4s] mt-9 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-slate-400">
              {['Koreksi kata demi kata', 'Tanpa instal aplikasi', 'Nyaman di HP'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> {t}</li>
              ))}
            </ul>
          </div>

          <div className="anim-naik [animation-delay:.35s] flex justify-center lg:justify-end">
            <KartuContoh />
          </div>
        </div>
      </section>

      {/* ===== ANGKA ===== */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 -mt-6 lg:-mt-12 relative">
        <div className="reveal grid grid-cols-2 lg:grid-cols-4 rounded-3xl border border-white/10 bg-white/[0.03] lg:backdrop-blur-xl divide-white/10 overflow-hidden">
          {[[114, 'Surat'], [6236, 'Ayat'], [604, 'Halaman'], [30, 'Juz']].map(([n, l], i) => (
            <div key={l} className={`p-6 sm:p-8 text-center ${i % 2 ? 'border-l border-white/10' : ''} ${i > 1 ? 'border-t lg:border-t-0 border-white/10' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
              <p className="font-serif text-3xl sm:text-5xl teks-kilau"><AngkaNaik sampai={n} /></p>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 tracking-wide">{l} siap dimurojaah</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FITUR ===== */}
      <section id="fitur" className="scroll-mt-24 max-w-6xl mx-auto px-5 sm:px-6 pt-24 lg:pt-36">
        <JudulBagian label="Fitur" judul="Semua yang kamu butuhkan untuk istiqomah"
          sub="Dari menyimak hafalan sampai memantau progres, dalam satu tempat." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {FITUR.map(({ icon: Icon, judul, isi, besar, penuh }, i) => (
            <div key={judul} onMouseMove={ikutiKursor} style={{ '--delay': `${(i % 3) * 90}ms` }}
              className={`reveal sorot group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 sm:p-8 hover:border-emerald-400/30 transition-colors ${besar ? 'md:col-span-2' : ''} ${penuh ? 'md:col-span-3' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 border border-emerald-400/20 text-emerald-300 flex items-center justify-center mb-5 lg:group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-white mb-2">{judul}</h3>
              <p className="text-slate-400 leading-relaxed text-sm sm:text-base">{isi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CARA KERJA ===== */}
      <section id="cara-kerja" className="scroll-mt-24 max-w-6xl mx-auto px-5 sm:px-6 pt-24 lg:pt-36">
        <JudulBagian label="Cara Kerja" judul="Tiga langkah, setiap hari" />
        <div className="relative grid md:grid-cols-3 gap-5">
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          {LANGKAH.map(({ icon: Icon, judul, isi }, i) => (
            <div key={judul} className="reveal relative text-center px-4" style={{ '--delay': `${i * 120}ms` }}>
              <div className="relative mx-auto w-20 h-20 rounded-full border border-emerald-400/30 bg-slate-950 flex items-center justify-center shadow-[0_0_40px_-8px_rgb(16_185_129/0.5)]">
                <Icon className="w-8 h-8 text-emerald-300" />
                <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-300 text-slate-950 text-xs font-bold flex items-center justify-center">{i + 1}</span>
              </div>
              <h3 className="mt-6 font-serif text-2xl text-white">{judul}</h3>
              <p className="mt-2 text-slate-400 leading-relaxed">{isi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HADITS ===== */}
      <section className="max-w-5xl mx-auto px-5 sm:px-6 pt-24 lg:pt-36">
        <div className="reveal relative overflow-hidden rounded-[2rem] border border-amber-200/20 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 px-6 py-14 sm:p-16 text-center">
          <div className="absolute inset-0 pola-bintang opacity-60" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[radial-gradient(closest-side,rgb(251_191_36/0.12),transparent)]" />
          <div className="relative">
            <p className="font-serif text-3xl sm:text-5xl text-amber-100 leading-loose" dir="rtl" lang="ar">خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ</p>
            <p className="mt-6 font-serif text-xl sm:text-2xl text-white italic">
              "Sebaik-baik kalian adalah orang yang belajar Al-Quran dan mengajarkannya."
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <span className="h-px w-10 bg-amber-200/40" />
              <span className="text-amber-200/80 text-sm tracking-[0.25em] uppercase">HR. Bukhari</span>
              <span className="h-px w-10 bg-amber-200/40" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== DEVELOPER ===== */}
      <section id="developer" className="scroll-mt-24 max-w-6xl mx-auto px-5 sm:px-6 pt-24 lg:pt-36">
        <JudulBagian label="Developer" judul="Di balik TemanTahfidz" />
        <div onMouseMove={ikutiKursor}
          className="reveal sorot relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] lg:backdrop-blur-xl p-7 sm:p-12">
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[radial-gradient(closest-side,rgb(16_185_129/0.18),transparent)]" />
          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left">
            <FotoDeveloper />
            <div className="flex-1">
              <p className="text-emerald-400 text-xs font-semibold tracking-[0.2em] uppercase">{DEVELOPER.peran}</p>
              <h3 className="mt-3 font-serif text-3xl sm:text-5xl text-white">{DEVELOPER.nama}</h3>
              <p className="mt-5 text-slate-300 leading-relaxed max-w-2xl">
                TemanTahfidz saya bangun dengan harapan sederhana: menjaga hafalan Al-Quran terasa lebih mudah dan
                menyenangkan, kapan saja dan di mana saja. Kalau satu orang saja jadi lebih dekat dengan Al-Quran
                lewat aplikasi ini, itu sudah menjadi kebahagiaan terbesar bagi saya.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <a href={`mailto:${DEVELOPER.email}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-slate-950 px-6 py-3 text-sm font-semibold hover:bg-emerald-100 transition-colors">
                  <Mail className="w-4 h-4" /> Hubungi saya
                </a>
                <a href={DEVELOPER.github} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors">
                  <Github className="w-4 h-4" /> GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="scroll-mt-24 max-w-3xl mx-auto px-5 sm:px-6 pt-24 lg:pt-36">
        <JudulBagian label="FAQ" judul="Pertanyaan yang sering ditanyakan" />
        <div className="space-y-3">
          {FAQ.map(({ t, j }, i) => (
            <details key={t} className="reveal group rounded-2xl border border-white/10 bg-white/[0.03] open:bg-white/[0.06] transition-colors" style={{ '--delay': `${i * 60}ms` }}>
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 sm:px-6 py-5 text-white font-medium [&::-webkit-details-marker]:hidden">
                {t}
                <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 sm:px-6 pb-5 -mt-1 text-slate-400 leading-relaxed">{j}</p>
            </details>
          ))}
        </div>
        <p className="reveal mt-6 text-center text-sm text-slate-500">
          <ShieldCheck className="inline w-4 h-4 mr-1 text-emerald-400" />
          Baca juga <Link to="/privasi" className="text-slate-300 hover:text-emerald-400 underline underline-offset-2">Kebijakan Privasi</Link> dan{' '}
          <Link to="/ketentuan" className="text-slate-300 hover:text-emerald-400 underline underline-offset-2">Syarat &amp; Ketentuan</Link>.
        </p>
      </section>

      {/* ===== AJAKAN PENUTUP ===== */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-24 lg:py-36">
        <div className="reveal relative overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-600/25 via-emerald-900/30 to-slate-950 px-6 py-14 sm:p-16 text-center">
          <div className="absolute inset-0 pola-bintang opacity-50" />
          <div className="relative">
            <h2 className="font-serif text-3xl sm:text-5xl text-white leading-tight">Mulai murojaah pertamamu hari ini</h2>
            <p className="mt-4 text-slate-300 max-w-xl mx-auto">Gratis selama masa uji coba. Cukup daftar, pilih surat, lalu baca.</p>
            <Link to={tujuanUtama}
              className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-slate-950 hover:bg-emerald-100 transition-colors w-full sm:w-auto">
              {user ? 'Buka Dashboard' : 'Daftar Gratis'} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
