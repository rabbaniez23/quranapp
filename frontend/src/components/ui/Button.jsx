import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20',
  secondary: 'bg-slate-800 text-slate-100 border border-white/10 hover:bg-slate-700',
  ghost: 'text-slate-300 hover:text-white hover:bg-white/5',
  danger: 'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20',
};

const Button = ({ children, variant = 'primary', icon: Icon, loading = false, className = '', type = 'button', disabled, ...props }) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
      transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60
      disabled:opacity-60 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${className}`}
    {...props}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

export default Button;
