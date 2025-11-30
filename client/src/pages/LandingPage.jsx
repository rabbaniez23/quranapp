import { Link } from 'react-router-dom';
import { Mic, Book, ArrowRight, User, Star, CheckCircle, Quote } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const LandingPage = () => {
  return (
    <div className="space-y-32 pb-20">
      
      {/* --- HERO SECTION --- */}
      {/* Menggunakan grid agar layout lebih presisi */}
      <section className="pt-16 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Kiri: Copywriting Elegant */}
          <div className="space-y-8 text-center lg:text-left">
            <Badge text=" ✨ Versi 1.0 Beta" type="success" />
            
            <div className="space-y-4">
              <h1 className="font-serif text-4xl md:text-6xl font-medium leading-tight text-white">
                Menghafal Al-Quran <br/>
                <span className="italic text-emerald-400">Lebih Mudah & Terjaga</span>
              </h1>
              <p className="font-sans text-slate-400 text-lg leading-relaxed max-w-lg mx-auto lg:mx-0 font-light">
                Teknologi AI yang menyimak bacaanmu dengan teliti. Dapatkan koreksi instan layaknya setoran hafalan dengan guru ngaji.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/cek-hafalan">
                <Button variant="primary" icon={Mic} className="rounded-full px-8">Mulai Tes Hafalan</Button>
              </Link>
              <Link to="/quran">
                <Button variant="secondary" icon={Book} className="rounded-full px-8 bg-transparent border border-slate-600 hover:bg-slate-800 hover:border-slate-500">Baca Quran</Button>
              </Link>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                 <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-900"></div>
                 <div className="w-8 h-8 rounded-full bg-slate-500 border-2 border-slate-900"></div>
              </div>
              <p>Bergabung dengan 1,000+ Penghafal</p>
            </div>
          </div>

          {/* Kanan: Visualisasi App (Abstract & Clean) */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Background Glow Halus */}
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>
            
            {/* Mockup Card */}
            <div className="relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
              <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                <div>
                   <h3 className="text-white font-serif text-lg">Surat Al-Mulk</h3>
                   <p className="text-emerald-400 text-xs uppercase tracking-widest font-semibold">Sedang Merekam</p>
                </div>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              </div>

              {/* Waveform Visualization (CSS only) */}
              <div className="flex items-center justify-center gap-1 h-16 mb-8">
                 {[...Array(20)].map((_, i) => (
                   <div key={i} className="w-1 bg-emerald-500 rounded-full animate-pulse" style={{ 
                     height: `${Math.random() * 100}%`,
                     animationDelay: `${i * 0.05}s` 
                   }}></div>
                 ))}
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      "MasyaAllah, bacaan ayat 1-5 sudah lancar. Perhatikan panjang mad pada ayat ke-3."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- FITUR SECTION (Minimalist) --- */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 space-y-2">
          <h2 className="font-serif text-3xl md:text-4xl text-white">Fitur Unggulan</h2>
          <div className="h-1 w-20 bg-emerald-500 mx-auto rounded-full"></div>
          <p className="text-slate-400 font-light pt-4">Kami bantu istiqomah dengan fitur yang kamu butuhkan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Fitur 1 */}
          <div className="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
              <Mic className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Koreksi Otomatis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Kecerdasan buatan mendeteksi kesalahan kata, huruf tertukar, atau ayat yang terlewat.
            </p>
          </div>

          {/* Fitur 2 */}
          <div className="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
              <Book className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Mushaf Digital</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tampilan mushaf yang nyaman di mata, mode gelap, dan terjemahan lengkap.
            </p>
          </div>

           {/* Fitur 3 */}
           <div className="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="w-14 h-14 bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Tracking Hafalan</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Pantau progres hafalanmu setiap hari dengan grafik statistik yang informatif.
            </p>
          </div>
        </div>
      </section>

      {/* --- QUOTE / ARTIKEL SECTION --- */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-900/40 to-slate-900 rounded-3xl border border-emerald-500/20 p-10 md:p-16 text-center">
          <Quote className="w-12 h-12 text-emerald-500/30 mx-auto mb-6 rotate-180" />
          <h2 className="font-serif text-2xl md:text-4xl text-white leading-relaxed italic mb-8">
            "Sebaik-baik kalian adalah orang yang belajar Al-Quran dan mengajarkannya."
          </h2>
          <div className="flex justify-center items-center gap-4">
            <div className="h-px w-10 bg-emerald-500/50"></div>
            <p className="text-emerald-400 font-medium tracking-widest uppercase text-sm">HR. Bukhari</p>
            <div className="h-px w-10 bg-emerald-500/50"></div>
          </div>
          
          <div className="mt-10">
            <Link to="/artikel">
              <button className="text-slate-300 hover:text-white text-sm border-b border-transparent hover:border-white transition-all pb-1">
                Baca Artikel Inspiratif Lainnya &rarr;
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- ABOUT SECTION (Simplified) --- */}
      <section className="max-w-4xl mx-auto px-6 pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-xs mb-6">
          <User className="w-3 h-3" />
          <span>Tentang Developer</span>
        </div>
        <h2 className="font-serif text-3xl text-white mb-6">Membangun untuk Umat</h2>
        <p className="text-slate-400 leading-relaxed font-light">
          QuranAI dibangun sebagai proyek wakaf digital. Harapannya sederhana: membantu satu orang saja untuk lebih dekat dengan Al-Quran, itu sudah menjadi kebahagiaan terbesar bagi kami.
        </p>
      </section>

    </div>
  );
};

export default LandingPage;