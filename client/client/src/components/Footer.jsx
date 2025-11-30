import { BookOpen, Github, Instagram, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-slate-900 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Kolom 1: Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-2xl mb-4">
              <BookOpen className="w-8 h-8" />
              <span>QuranAI</span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              Platform pintar untuk membantu menghafal Al-Quran dengan teknologi Artificial Intelligence. Koreksi bacaanmu kapan saja, di mana saja.
            </p>
          </div>

          {/* Kolom 2: Link Cepat */}
          <div>
            <h4 className="text-white font-semibold mb-4">Menu</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><a href="/quran" className="hover:text-emerald-400 transition-colors">Quran Digital</a></li>
              <li><a href="/cek-hafalan" className="hover:text-emerald-400 transition-colors">Tes Hafalan</a></li>
              <li><a href="/artikel" className="hover:text-emerald-400 transition-colors">Artikel Islami</a></li>
              <li><a href="/jadwal-sholat" className="hover:text-emerald-400 transition-colors">Jadwal Sholat</a></li>
            </ul>
          </div>

          {/* Kolom 3: Sosmed / Kontak */}
          <div>
            <h4 className="text-white font-semibold mb-4">Terhubung</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-pink-500 hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm">
          <p>&copy; 2024 QuranAI Project. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 md:mt-0">
            Dibuat dengan <Heart className="w-4 h-4 text-red-500 fill-current" /> oleh Developer
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;