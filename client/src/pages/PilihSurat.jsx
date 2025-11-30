import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen } from 'lucide-react';
import { getAllSurahs } from '../services/quranApi';
import Badge from '../components/ui/Badge';

const PilihSurat = () => {
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState([]);
  const [filteredSurahs, setFilteredSurahs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await getAllSurahs();
      setSurahs(data);
      setFilteredSurahs(data);
      setIsLoading(false);
    };
    fetch();
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = surahs.filter(s => 
      s.namaLatin.toLowerCase().includes(term) || 
      s.arti.toLowerCase().includes(term) ||
      s.nomor.toString().includes(term)
    );
    setFilteredSurahs(filtered);
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-20 pb-10 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER COMPACT */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white font-serif flex items-center gap-3">
              <BookOpen className="text-emerald-500" size={32} />
              Daftar Surat
            </h1>
            <p className="text-slate-400 text-sm">Pilih surat untuk mulai membaca.</p>
          </div>

          {/* SEARCH BAR COMPACT */}
          <div className="relative w-full md:w-72 group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari surat..." 
                value={searchTerm}
                onChange={handleSearch}
                className="w-full bg-slate-800 border border-slate-700 text-white pl-9 pr-4 py-2 rounded-full text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-lg placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* GRID SURAT (SMALLER CARDS) */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-pulse">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-800 rounded-xl border border-white/5"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredSurahs.map((surah) => (
              <button 
                key={surah.nomor} 
                onClick={() => navigate(`/quran-digital?surahId=${surah.nomor}`)}
                className="group relative text-left h-full transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-full bg-slate-800/40 border border-white/5 p-4 rounded-xl hover:bg-slate-800 hover:border-emerald-500/30 transition-all flex flex-col justify-between group-hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
                  
                  {/* Top Row: Nomor & Info */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-bold text-emerald-500 border border-white/5 group-hover:border-emerald-500/50 transition-colors">
                        {surah.nomor}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate w-24">
                          {surah.namaLatin}
                        </h3>
                        <p className="text-[10px] text-slate-500">{surah.arti}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Arab & Ayat */}
                  <div className="flex justify-between items-end border-t border-white/5 pt-2 mt-2">
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${surah.tempatTurun === 'Mekah' ? 'border-amber-500/20 text-amber-500/70' : 'border-blue-500/20 text-blue-500/70'}`}>
                      {surah.jumlahAyat} ayat
                    </span>
                    <p className="font-serif text-xl text-slate-400 group-hover:text-white transition-colors">
                      {surah.nama}
                    </p>
                  </div>

                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PilihSurat;