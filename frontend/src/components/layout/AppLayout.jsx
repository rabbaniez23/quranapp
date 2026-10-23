import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MENU, initials } from './menu';

const NavItems = ({ onNavigate }) => {
  const location = useLocation();
  return (
    <nav className="space-y-6">
      {MENU.map(({ grup, items }) => (
        <div key={grup}>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{grup}</p>
          <div className="space-y-1">
            {items.map(({ to, label, icon: Icon, badge, match = [] }) => {
              const extra = match.some((p) => location.pathname.startsWith(p));
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive || extra
                        ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-300">{badge}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};

const UserCard = ({ user, onLogout }) => (
  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-sm font-bold text-white">
      {initials(user?.nama)}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white truncate">{user?.nama}</p>
      <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
    </div>
    <button onClick={onLogout} title="Keluar" aria-label="Keluar" className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
      <LogOut className="w-4 h-4" />
    </button>
  </div>
);

const Logo = ({ onClick }) => (
  <Link to="/dashboard" onClick={onClick} className="flex items-center gap-2 text-emerald-400 font-bold text-xl tracking-tight">
    <BookOpen className="w-7 h-7" />
    <span>TemanTahfidz</span>
  </Link>
);

// Tata letak aplikasi setelah masuk: sidebar (desktop) / menu laci (HP) + isi halaman
const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-slate-950/70 backdrop-blur-xl border-r border-white/5 px-4 py-6">
        <div className="px-2 mb-8"><Logo /></div>
        <div className="flex-1 overflow-y-auto"><NavItems /></div>
        <UserCard user={user} onLogout={handleLogout} />
      </aside>

      {/* Header HP */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 flex items-center justify-between px-4 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
        <button onClick={() => setDrawerOpen(true)} aria-label="Buka menu" className="p-2 -ml-2 rounded-lg text-slate-300 hover:bg-white/5">
          <Menu className="w-6 h-6" />
        </button>
        <Logo />
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-xs font-bold">
          {initials(user?.nama)}
        </div>
      </header>

      {/* Menu laci HP */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] flex flex-col bg-slate-950 border-r border-white/10 px-4 py-5">
            <div className="flex items-center justify-between px-2 mb-8">
              <Logo onClick={closeDrawer} />
              <button onClick={closeDrawer} aria-label="Tutup menu" className="p-2 rounded-lg text-slate-400 hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavItems onNavigate={closeDrawer} /></div>
            <UserCard user={user} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Isi halaman */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
