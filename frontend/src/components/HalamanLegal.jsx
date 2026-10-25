import { Link } from 'react-router-dom';

const KONTAK = 'temantahfidz0@gmail.com';

// Kerangka halaman Kebijakan Privasi / Syarat & Ketentuan / Lisensi
export const HalamanLegal = ({ judul, berlaku, pengantar, children }) => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
    <header>
      <h1 className="font-serif text-4xl text-white mb-3">{judul}</h1>
      {berlaku && <p className="text-slate-400">Berlaku sejak {berlaku}</p>}
      {pengantar && <p className="text-slate-300 mt-4 leading-relaxed">{pengantar}</p>}
    </header>
    {children}
    <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm pt-4 border-t border-white/10">
      <Link to="/" className="text-emerald-400 hover:underline">← Beranda</Link>
      <Link to="/privasi" className="text-slate-400 hover:text-white">Kebijakan Privasi</Link>
      <Link to="/ketentuan" className="text-slate-400 hover:text-white">Syarat &amp; Ketentuan</Link>
      <Link to="/lisensi" className="text-slate-400 hover:text-white">Lisensi &amp; Sumber</Link>
    </nav>
  </div>
);

export const Bagian = ({ judul, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-white">{judul}</h2>
    <div className="space-y-3 text-slate-300 leading-relaxed">{children}</div>
  </section>
);

export const Tautan = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{children}</a>
);

export const Email = () => <a href={`mailto:${KONTAK}`} className="text-emerald-400 hover:underline">{KONTAK}</a>;
