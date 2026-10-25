import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import AuthField from '../components/AuthField';
import { gantiSandi, lupaSandi } from '../services/authApi';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

// Lupa kata sandi: (1) isi email → kode dikirim, (2) isi kode + kata sandi baru
const LupaSandiPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [terkirim, setTerkirim] = useState(false);
  const [kode, setKode] = useState('');
  const [password, setPassword] = useState('');
  const [ulang, setUlang] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const kirimKode = async (e) => {
    e.preventDefault();
    const rapi = email.trim().toLowerCase();
    if (!EMAIL_RE.test(rapi)) return setError('Alamat email tidak valid.');
    setLoading(true);
    setError(null);
    try {
      await lupaSandi(rapi);
      setEmail(rapi);
      setTerkirim(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const simpan = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(kode)) return setError('Kode terdiri dari 6 angka.');
    if (password.length < 8) return setError('Kata sandi minimal 8 karakter.');
    if (password !== ulang) return setError('Kata sandi tidak sama.');
    setLoading(true);
    setError(null);
    try {
      await gantiSandi(email, kode, password);
      navigate('/login', { replace: true, state: { pesan: 'Kata sandi berhasil diganti. Silakan masuk dengan kata sandi baru.' } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl text-white mb-2">Lupa Kata Sandi</h1>
          <p className="text-slate-400 text-sm">
            {terkirim
              ? <>Kalau <span className="text-white break-all">{email}</span> terdaftar, kode 6 angka sudah kami kirim ke sana. Cek juga folder Spam.</>
              : 'Masukkan email akunmu, kami kirim kode untuk membuat kata sandi baru.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {!terkirim ? (
          <form onSubmit={kirimKode} className="space-y-4" noValidate>
            <AuthField label="Email" icon={Mail} value={email} onChange={setEmail} placeholder="nama@email.com"
              autoComplete="email" inputMode="email" autoFocus />
            <Button type="submit" loading={loading} className="w-full py-3.5">Kirim Kode</Button>
          </form>
        ) : (
          <form onSubmit={simpan} className="space-y-4" noValidate>
            <AuthField label="Kode dari email" icon={KeyRound} value={kode}
              onChange={(v) => setKode(v.replace(/\D/g, '').slice(0, 6))} placeholder="123456"
              inputMode="numeric" autoComplete="one-time-code" autoFocus />
            <AuthField label="Kata sandi baru" icon={Lock} value={password} onChange={setPassword}
              type="password" placeholder="Minimal 8 karakter" autoComplete="new-password" />
            <AuthField label="Ulangi kata sandi baru" icon={Lock} value={ulang} onChange={setUlang}
              type="password" placeholder="Ketik ulang kata sandi" autoComplete="new-password" />
            <Button type="submit" loading={loading} className="w-full py-3.5">Simpan Kata Sandi Baru</Button>
            <button type="button" onClick={() => { setTerkirim(false); setKode(''); setError(null); }}
              className="w-full text-sm text-slate-400 hover:text-white">← Ganti email / kirim ulang kode</button>
          </form>
        )}

        <p className="text-center text-slate-400 text-sm mt-8">
          Ingat kata sandinya? <Link to="/login" className="text-emerald-400 hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default LupaSandiPage;
