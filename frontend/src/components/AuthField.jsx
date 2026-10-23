import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Kolom isian untuk halaman masuk/daftar (dengan ikon, tombol lihat sandi, dan pesan kesalahan)
const AuthField = ({ label, icon: Icon, value, onChange, type = 'text', error, hint, ...props }) => {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-slate-300 text-sm ml-1">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
        <input
          id={id}
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={`w-full bg-slate-900/50 border rounded-xl py-3 pl-12 ${isPassword ? 'pr-12' : 'pr-4'} text-white
            placeholder:text-slate-600 focus:outline-none transition-colors
            ${error ? 'border-red-500/60 focus:border-red-400' : 'border-slate-700 focus:border-emerald-500'}`}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1}
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-3 top-2.5 p-1 rounded-lg text-slate-500 hover:text-slate-300">
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error ? <p className="text-xs text-red-300 ml-1">{error}</p> : hint && <p className="text-xs text-slate-500 ml-1">{hint}</p>}
    </div>
  );
};

export default AuthField;
