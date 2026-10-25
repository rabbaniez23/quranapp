import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Bagian-bagian landing page (alamat /#id, digulir oleh LandingPage)
const BAGIAN = [
  { id: 'fitur', label: 'Fitur' },
  { id: 'cara-kerja', label: 'Cara Kerja' },
  { id: 'developer', label: 'Developer' },
  { id: 'faq', label: 'FAQ' },
];

// Navbar halaman publik (landing, masuk, daftar). Fitur aplikasi ada di dashboard setelah masuk.
const Navbar = () => {
  const { user, checking } = useAuth();
  const { pathname } = useLocation();
  const [tergulir, setTergulir] = useState(false);
  const [menuHp, setMenuHp] = useState(false);
  const [halamanMenu, setHalamanMenu] = useState(pathname);

  // Pindah halaman → menu HP otomatis tertutup
  if (halamanMenu !== pathname) {
    setHalamanMenu(pathname);
    setMenuHp(false);
  }

  useEffect(() => {
    const cek = () => setTergulir(window.scrollY > 12);
    cek();
    window.addEventListener('scroll', cek, { passive: true });
    return () => window.removeEventListener('scroll', cek);
  }, []);

  const transparan = pathname === '/' && !tergulir && !menuHp;

  const tombolAkun = (penuh) => checking ? (
    <div className={`h-10 ${penuh ? 'w-full' : 'w-36'} rounded-full bg-white/5 animate-pulse`} /> /* sedang cek akun */
  ) : user ? (
    <Link to="/dashboard" className={`${penuh ? 'w-full justify-center' : ''} flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/25`}>
      <LayoutDashboard className="w-4 h-4" /> Buka Dashboard
    </Link>
  ) : (
    <>
      <Link to="/login" className={`${penuh ? 'flex-1 text-center' : ''} px-5 py-2.5 text-sm font-medium text-white border border-white/15 rounded-full hover:bg-white/10 transition-colors`}>
        Masuk
      </Link>
      <Link to="/register" className={`${penuh ? 'flex-1 text-center' : ''} px-5 py-2.5 text-sm font-semibold bg-emerald-500 text-white rounded-full hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/25`}>
        Daftar Gratis
      </Link>
    </>
  );

  return (
    <nav className={`w-full fixed top-0 z-50 transition-colors duration-300 border-b ${transparan
      ? 'bg-transparent border-transparent'
      : 'bg-slate-950/95 lg:bg-slate-950/70 backdrop-blur-xl border-white/10'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20 gap-4">
          <Link to="/" className="flex items-center gap-2 text-emerald-400 font-bold text-xl sm:text-2xl tracking-tight hover:opacity-80 transition-opacity shrink-0">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8" />
            <span>TemanTahfidz</span>
          </Link>

          {/* Laptop: tautan bagian + tombol akun */}
          <div className="hidden lg:flex items-center gap-8 text-sm text-slate-300">
            {BAGIAN.map((b) => (
              <Link key={b.id} to={{ pathname: '/', hash: `#${b.id}` }} className="hover:text-white transition-colors">{b.label}</Link>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-3">{tombolAkun(false)}</div>

          {/* HP: tombol menu */}
          <button onClick={() => setMenuHp((v) => !v)} aria-label={menuHp ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuHp}
            className="lg:hidden w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-slate-200 hover:bg-white/10">
            {menuHp ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* HP: panel menu */}
      {menuHp && (
        <div className="lg:hidden border-t border-white/10 bg-slate-950 px-4 pt-3 pb-5 anim-naik [animation-duration:.35s]">
          <div className="grid">
            {BAGIAN.map((b) => (
              <Link key={b.id} to={{ pathname: '/', hash: `#${b.id}` }} onClick={() => setMenuHp(false)}
                className="py-3 px-2 text-base text-slate-200 border-b border-white/5 last:border-0">{b.label}</Link>
            ))}
          </div>
          <div className="flex gap-3 mt-4">{tombolAkun(true)}</div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
