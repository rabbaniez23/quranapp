import { Link } from 'react-router-dom';
import { BookOpen, Mail, Lock, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

const LoginPage = () => {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <BookOpen className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl text-white mb-2">Selamat Datang Kembali</h1>
          <p className="text-slate-400 text-sm">Masuk untuk melanjutkan hafalanmu.</p>
        </div>

        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-slate-300 text-sm ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input type="email" placeholder="nama@email.com" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-slate-300 text-sm ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input type="password" placeholder="••••••••" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>

          <Button variant="primary" className="w-full py-3.5">Masuk Sekarang</Button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-8">
          Belum punya akun? <Link to="/register" className="text-emerald-400 hover:underline">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
};
export default LoginPage;