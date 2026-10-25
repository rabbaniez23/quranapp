import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, AtSign, KeyRound, Lock, Mail, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hapusAkun } from '../services/authApi';
import { initials } from '../components/layout/menu';

const Baris = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-3">
    <Icon className="w-5 h-5 text-slate-500 shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-white break-all">{value || '–'}</p>
    </div>
  </div>
);

// Halaman /akun: data akun, ganti kata sandi, dan hapus akun beserta seluruh datanya
const AkunPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [buka, setBuka] = useState(false);
  const [isian, setIsian] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const pakaiSandi = user?.punya_sandi !== false;

  const hapus = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await hapusAkun(token, pakaiSandi ? isian : '', pakaiSandi ? '' : isian);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white text-lg font-bold">
          {initials(user?.nama)}
        </div>
        <div>
          <h1 className="font-serif text-3xl text-white">Akun Saya</h1>
          <p className="text-slate-400 text-sm">Data akun dan pengaturan privasi.</p>
        </div>
      </header>

      <section className="rounded-3xl border border-white/5 bg-slate-800/30 px-5 sm:px-6 py-2 divide-y divide-white/5">
        <Baris icon={User} label="Nama" value={user?.nama} />
        <Baris icon={AtSign} label="Username" value={user?.username} />
        <Baris icon={Mail} label="Email" value={user?.email} />
      </section>

      <section className="rounded-3xl border border-white/5 bg-slate-800/30 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2"><KeyRound className="w-5 h-5 text-slate-400" /> Kata sandi</h2>
        <p className="text-sm text-slate-400 mb-4">
          {pakaiSandi
            ? 'Untuk mengganti kata sandi, kami kirim kode ke email akunmu.'
            : 'Akunmu dibuat lewat Google dan belum punya kata sandi. Kamu bisa membuatnya supaya bisa masuk juga tanpa Google.'}
        </p>
        {user?.email
          ? <Link to="/lupa-sandi" className="inline-block px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium">{pakaiSandi ? 'Ganti kata sandi' : 'Buat kata sandi'}</Link>
          : <p className="text-sm text-amber-300">Akun ini belum punya email, jadi kata sandi belum bisa diganti lewat email.</p>}
      </section>

      <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-red-300 flex items-center gap-2 mb-2"><Trash2 className="w-5 h-5" /> Hapus akun</h2>
        <p className="text-sm text-slate-300 mb-4">
          Akun beserta <span className="text-white">seluruh riwayat murojaah dan progres hafalanmu</span> akan dihapus permanen
          dan tidak bisa dikembalikan. Salinan cadangan server ikut terhapus dalam 14 hari.
        </p>
        {!buka ? (
          <button onClick={() => setBuka(true)} className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 text-sm font-medium">
            Saya ingin menghapus akun
          </button>
        ) : (
          <form onSubmit={hapus} className="space-y-3" noValidate>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <label className="block text-sm text-slate-300">
              {pakaiSandi ? 'Masukkan kata sandi untuk konfirmasi' : <>Ketik username <span className="text-white font-mono">{user?.username}</span> untuk konfirmasi</>}
              <div className="relative mt-1.5">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input type={pakaiSandi ? 'password' : 'text'} value={isian} onChange={(e) => setIsian(e.target.value)}
                  autoComplete={pakaiSandi ? 'current-password' : 'off'} autoFocus
                  className="w-full bg-slate-900/50 border border-slate-700 focus:border-red-400 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none" />
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!isian || loading}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold">
                {loading ? 'Menghapus...' : 'Hapus akun permanen'}
              </button>
              <button type="button" onClick={() => { setBuka(false); setIsian(''); setError(null); }}
                className="px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-700 text-sm">Batal</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default AkunPage;
