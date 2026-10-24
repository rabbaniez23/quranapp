import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, AtSign, Mail, Lock, AlertCircle, KeyRound, MailCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import AuthField from '../components/AuthField';
import GoogleButton from '../components/GoogleButton';
import { useAuth } from '../context/AuthContext';
import { kirimUlangKode } from '../services/authApi';

// Aturan sama dengan backend (akun.py), supaya pengguna langsung tahu sebelum mengirim
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const JEDA_KIRIM_ULANG = 60; // detik, sama dengan KIRIM_ULANG_DETIK di backend

const Galat = ({ pesan }) => pesan && (
  <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {pesan}
  </div>
);

// Langkah 2: masukkan kode 6 angka dari email
const LangkahKode = ({ email, onBack, onDone }) => {
  const { verifyRegister } = useAuth();
  const [kode, setKode] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jeda, setJeda] = useState(JEDA_KIRIM_ULANG);

  useEffect(() => {
    if (jeda <= 0) return;
    const t = setTimeout(() => setJeda((d) => d - 1), 1000);
    return () => clearTimeout(t);
  }, [jeda]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(kode)) return setError('Kode terdiri dari 6 angka.');
    setLoading(true);
    setError(null);
    try {
      await verifyRegister(email, kode);
      onDone();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const kirimUlang = async () => {
    setError(null);
    setInfo(null);
    try {
      await kirimUlangKode(email);
      setInfo('Kode baru sudah dikirim.');
      setJeda(JEDA_KIRIM_ULANG);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-3xl text-white mb-2">Cek Email Kamu</h1>
        <p className="text-slate-400 text-sm">
          Kami mengirim kode 6 angka ke <span className="text-white font-medium break-all">{email}</span>.
          Kalau tidak ada, cek juga folder Spam.
        </p>
      </div>
      <Galat pesan={error} />
      {info && <p className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{info}</p>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField label="Kode verifikasi" icon={KeyRound} value={kode}
          onChange={(v) => setKode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456" inputMode="numeric" autoComplete="one-time-code" autoFocus
          className="w-full bg-slate-900/50 border border-slate-700 focus:border-emerald-500 rounded-xl py-3 pl-12 pr-4 text-white text-xl tracking-[0.5em] placeholder:text-slate-600 placeholder:tracking-[0.5em] focus:outline-none" />
        <Button type="submit" loading={loading} className="w-full py-3.5 mt-2">Verifikasi &amp; Masuk</Button>
      </form>
      <div className="flex items-center justify-between text-sm mt-6">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-white">← Ganti data</button>
        <button type="button" onClick={kirimUlang} disabled={jeda > 0}
          className="text-emerald-400 hover:underline disabled:text-slate-500 disabled:no-underline">
          {jeda > 0 ? `Kirim ulang (${jeda})` : 'Kirim ulang kode'}
        </button>
      </div>
    </>
  );
};

const RegisterPage = () => {
  const { user, register, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ulang, setUlang] = useState('');
  const [website, setWebsite] = useState(''); // jebakan bot, tidak terlihat oleh manusia
  const [emailTerkirim, setEmailTerkirim] = useState(null); // ada → langkah 2 (masukkan kode)
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const tujuan = location.state?.from?.pathname
    ? location.state.from.pathname + (location.state.from.search || '')
    : '/dashboard';
  if (user) return <Navigate to={tujuan} replace />;

  const usernameRapi = username.trim().toLowerCase();
  const emailRapi = email.trim().toLowerCase();
  const masalah = {
    nama: nama && nama.trim().length < 2 ? 'Nama minimal 2 huruf.' : null,
    username: username && !USERNAME_RE.test(usernameRapi)
      ? '3–20 karakter: huruf kecil, angka, titik, atau garis bawah.' : null,
    email: email && !EMAIL_RE.test(emailRapi) ? 'Alamat email tidak valid.' : null,
    password: password && password.length < 8 ? 'Minimal 8 karakter.' : null,
    ulang: ulang && ulang !== password ? 'Kata sandi tidak sama.' : null,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim() || !username || !email || !password || !ulang) return setError('Lengkapi semua isian.');
    if (Object.values(masalah).some(Boolean)) return setError('Periksa lagi isian yang ditandai merah.');
    setLoading(true);
    setError(null);
    try {
      const hasil = await register(nama, usernameRapi, emailRapi, password, website);
      setEmailTerkirim(hasil.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError(null);
    try {
      await loginGoogle(credential);
      navigate(tujuan, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        {emailTerkirim ? (
          <LangkahKode email={emailTerkirim} onBack={() => setEmailTerkirim(null)}
            onDone={() => navigate(tujuan, { replace: true })} />
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl text-white mb-2">Buat Akun Baru</h1>
              <p className="text-slate-400 text-sm">Mulai perjalanan menghafalmu hari ini.</p>
            </div>

            <Galat pesan={error} />
            <GoogleButton onCredential={handleGoogle} text="signup_with" />

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AuthField label="Nama lengkap" icon={User} value={nama} onChange={setNama}
                placeholder="Fulan bin Fulan" autoComplete="name" error={masalah.nama} />
              <AuthField label="Username" icon={AtSign} value={username} onChange={(v) => setUsername(v.toLowerCase())}
                placeholder="mis. naufal" autoComplete="username" error={masalah.username}
                hint="Dipakai untuk masuk. Huruf kecil tanpa spasi." />
              <AuthField label="Email" icon={Mail} value={email} onChange={setEmail} type="email"
                placeholder="nama@email.com" autoComplete="email" inputMode="email" error={masalah.email}
                hint="Kode verifikasi akan dikirim ke sini." />
              <AuthField label="Kata sandi" icon={Lock} value={password} onChange={setPassword}
                type="password" placeholder="Minimal 8 karakter" autoComplete="new-password" error={masalah.password} />
              <AuthField label="Ulangi kata sandi" icon={Lock} value={ulang} onChange={setUlang}
                type="password" placeholder="Ketik ulang kata sandi" autoComplete="new-password" error={masalah.ulang} />
              {/* Jebakan bot: tersembunyi dari manusia dan pembaca layar */}
              <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off"
                  value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              </div>
              <Button type="submit" loading={loading} className="w-full py-3.5 mt-2">Daftar Akun</Button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-8">
              Sudah punya akun? <Link to="/login" state={location.state} className="text-emerald-400 hover:underline">Masuk di sini</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
