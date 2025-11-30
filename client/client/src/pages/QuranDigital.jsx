import SearchBar from '../components/ui/SearchBar';
import { Book } from 'lucide-react';

const QuranDigital = () => {
  // Dummy data surat
  const surahs = [
    { number: 1, name: "Al-Fatihah", arti: "Pembukaan", ayat: 7, type: "Makkiyah" },
    { number: 2, name: "Al-Baqarah", arti: "Sapi Betina", ayat: 286, type: "Madaniyah" },
    { number: 3, name: "Ali 'Imran", arti: "Keluarga Imran", ayat: 200, type: "Madaniyah" },
    { number: 4, name: "An-Nisa'", arti: "Wanita", ayat: 176, type: "Madaniyah" },
    { number: 18, name: "Al-Kahfi", arti: "Gua", ayat: 110, type: "Makkiyah" },
    { number: 36, name: "Ya-Sin", arti: "Ya Sin", ayat: 83, type: "Makkiyah" },
    { number: 67, name: "Al-Mulk", arti: "Kerajaan", ayat: 30, type: "Makkiyah" },
    { number: 112, name: "Al-Ikhlas", arti: "Ikhlas", ayat: 4, type: "Makkiyah" },
  ];

  return (
    <div className="pt-24 px-4 max-w-7xl mx-auto pb-20">
      <div className="text-center mb-10 space-y-4">
        <h1 className="font-serif text-4xl text-white">Al-Quran Digital</h1>
        <div className="max-w-md mx-auto">
          <SearchBar placeholder="Cari surat..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {surahs.map((surah) => (
          <div key={surah.number} className="group bg-slate-800/40 border border-white/5 p-6 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-500 font-serif font-bold group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                {surah.number}
              </div>
              <div>
                <h3 className="text-white font-medium text-lg">{surah.name}</h3>
                <p className="text-slate-400 text-xs">{surah.arti} • {surah.ayat} Ayat</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-serif text-slate-600 group-hover:text-emerald-400 transition-colors">
                 {/* Ini teks arab placeholder nama surat, nanti dari API */}
                 سورة
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default QuranDigital;