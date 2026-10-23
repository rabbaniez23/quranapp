import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, User, Lock, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import AuthField from '../components/AuthField';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { user, login, serverError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(serverError);
  const [loading, setLoading] = useState(false);

  // Halaman yang tadi mau dibuka sebelum diminta masuk
  const tujuan = location.state?.from?.pathname
    ? location.state.from.pathname + (location.state.from.search || '')
    : '/dashboard';

  if (user) return <Navigate to={tujuan} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('Isi username dan kata sandi.');
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
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
          <BookOpen className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-white mb-2">Selamat Datang Kembali</h1>
          <p className="text-slate-400 text-sm">Masuk untuk melanjutkan hafalanmu.</p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            label="Username" icon={User} value={username} onChange={setUsername}
            placeholder="mis. naufal" autoComplete="username" autoFocus
          />
          <AuthField
            label="Kata sandi" icon={Lock} value={password} onChange={setPassword}
            type="password" placeholder="••••••••" autoComplete="current-password"
          />
          <Button type="submit" loading={loading} className="w-full py-3.5">Masuk Sekarang</Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-8">
          Belum punya akun? <Link to="/register" state={location.state} className="text-emerald-400 hover:underline">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
