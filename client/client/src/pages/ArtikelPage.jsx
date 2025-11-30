import SearchBar from '../components/ui/SearchBar';
import Card from '../components/ui/Card';

const ArtikelPage = () => {
  return (
    <div className="pt-24 px-4 max-w-7xl mx-auto pb-20">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl text-white mb-4">Wawasan Islami</h1>
        <p className="text-slate-400 max-w-2xl mx-auto mb-8">Kumpulan artikel, tips menghafal, dan tadabbur ayat pilihan.</p>
        <div className="max-w-md mx-auto">
          <SearchBar placeholder="Cari topik..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="group cursor-pointer">
            <div className="h-48 bg-slate-800 rounded-2xl mb-4 overflow-hidden relative">
               {/* Placeholder Gambar */}
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
               <div className="absolute bottom-4 left-4">
                 <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Tips Hafalan</span>
               </div>
            </div>
            <h3 className="text-xl font-serif text-white mb-2 group-hover:text-emerald-400 transition-colors">
              Cara Efektif Menghafal Al-Quran Bagi Pekerja Sibuk
            </h3>
            <p className="text-slate-400 text-sm line-clamp-2">
              Banyak yang merasa tidak punya waktu, padahal metode ini hanya butuh 30 menit...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ArtikelPage;