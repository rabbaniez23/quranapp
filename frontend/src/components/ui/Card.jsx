const Card = ({ children, className = "", hoverEffect = true }) => {
  return (
    <div 
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-white/10 to-white/5 
        backdrop-blur-xl border border-white/10 
        rounded-3xl p-6 shadow-2xl
        transition-all duration-300 ease-out
        ${hoverEffect ? 'hover:-translate-y-2 hover:shadow-emerald-500/10 hover:border-emerald-500/30' : ''}
        ${className}
      `}
    >
      {/* Efek Kilau (Glow) di pojok */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Card;