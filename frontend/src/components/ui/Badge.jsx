const TYPES = {
  success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  info: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/10 text-red-300 border-red-500/30',
  neutral: 'bg-white/5 text-slate-300 border-white/10',
};

const Badge = ({ text, type = 'neutral', className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium ${TYPES[type] || TYPES.neutral} ${className}`}>
    {text}
  </span>
);

export default Badge;
