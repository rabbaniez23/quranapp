import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, AtSign, Lock, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import AuthField from '../components/AuthField';
import { useAuth } from '../context/AuthContext';

// Aturan sama dengan backend (akun.py), supaya pengguna langsung tahu sebelum mengirim
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

const RegisterPage = () => {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ulang, setUlang] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const tujuan = location.state?.from?.pathname
    ? location.state.from.pathname + (location.state.from.search || '')
    : '/dashboard';
  if (user) return <Navigate to={tujuan} replace />;

  const usernameRapi = username.trim().toLowerCase();
  const masalah = {
    nama: nama && nama.trim().length < 2 ? 'Nama minimal 2 huruf.' : null,
    username: username && !USERNAME_RE.test(usernameRapi)
      ? '3–20 karakter: huruf kecil, angka, titik, atau garis bawah.' : null,
    password: password && password.length < 8 ? 'Minimal 8 karakter.' : null,
    ulang: ulang && ulang !== password ? 'Kata sandi tidak sama.' : null,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !username || !password || !ulang) return setError('Lengkapi semua isian.');
    if (Object.values(masalah).some(Boolean)) return setError('Periksa lagi isian yang ditandai merah.');
    setLoading(true);
    setError(null);
    try {
      await register(nama, usernameRapi, password);
      navigate(tujuan, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-white mb-2">Buat Akun Baru</h1>
          <p className="text-slate-400 text-sm">Mulai perjalanan menghafalmu hari ini.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthField label="Nama lengkap" icon={User} value={nama} onChange={setNama}
            placeholder="Fulan bin Fulan" autoComplete="name" autoFocus error={masalah.nama} />
          <AuthField label="Username" icon={AtSign} value={username} onChange={(v) => setUsername(v.toLowerCase())}
            placeholder="mis. naufal" autoComplete="username" error={masalah.username}
            hint="Dipakai untuk masuk. Huruf kecil tanpa spasi." />
          <AuthField label="Kata sandi" icon={Lock} value={password} onChange={setPassword}
            type="password" placeholder="Minimal 8 karakter" autoComplete="new-password" error={masalah.password} />
          <AuthField label="Ulangi kata sandi" icon={Lock} value={ulang} onChange={setUlang}
            type="password" placeholder="Ketik ulang kata sandi" autoComplete="new-password" error={masalah.ulang} />
          <Button type="submit" loading={loading} className="w-full py-3.5 mt-2">Daftar Akun</Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-8">
          Sudah punya akun? <Link to="/login" state={location.state} className="text-emerald-400 hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
