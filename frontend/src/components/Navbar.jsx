import { Link } from 'react-router-dom';
import { BookOpen, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Navbar halaman publik (landing, masuk, daftar). Fitur aplikasi ada di dashboard setelah masuk.
const Navbar = () => {
  const { user, checking } = useAuth();

  return (
    <nav className="w-full bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-md border-b border-white/10 fixed top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-emerald-400 font-bold text-2xl tracking-tighter hover:opacity-80 transition-opacity">
            <BookOpen className="w-8 h-8" />
            <span>TemanTahfidz</span>
          </Link>

          {/* Tombol akun */}
          <div className="flex gap-3">
            {checking ? (
              <div className="h-9 w-36 rounded-full bg-white/5 animate-pulse" /> /* sedang cek akun: jangan tampilkan tombol yang salah */
            ) : user ? (
              <Link to="/dashboard" className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                <LayoutDashboard className="w-4 h-4" /> Buka Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-all">
                  Masuk
                </Link>
                <Link to="/register" className="px-5 py-2 text-sm font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                  Daftar
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
