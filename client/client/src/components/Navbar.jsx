import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Mic, Calendar, FileText, Book } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  // Fungsi helper untuk mengecek menu aktif
  const isActive = (path) => {
    return location.pathname === path ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white hover:bg-white/5";
  };

  return (
    <nav className="w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10 fixed top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-emerald-400 font-bold text-2xl tracking-tighter hover:opacity-80 transition-opacity">
            <BookOpen className="w-8 h-8" />
            <span>QuranAI</span>
          </Link>

          {/* Menu Links (Desktop) */}
          <div className="hidden md:flex items-center gap-1">
            
            <Link to="/quran" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/quran')}`}>
              <Book className="w-4 h-4" /> Quran
            </Link>

            <Link to="/cek-hafalan" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/cek-hafalan')}`}>
              <Mic className="w-4 h-4" /> Tes Hafalan
            </Link>
            
            <Link to="/hadits" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/hadits')}`}>
              <BookOpen className="w-4 h-4" /> Hadis
            </Link>

            <Link to="/jadwal-sholat" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/jadwal-sholat')}`}>
              <Calendar className="w-4 h-4" /> Jadwal
            </Link>

            <Link to="/artikel" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/artikel')}`}>
              <FileText className="w-4 h-4" /> Artikel
            </Link>

          </div>

          {/* Auth Buttons */}
          <div className="flex gap-3">
             <Link to="/login" className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-all">
               Masuk
             </Link>
             <Link to="/register" className="px-5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
               Daftar
             </Link>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;