import { useState, useEffect, useRef } from 'react';
import { 
  Book, ChevronLeft, ChevronRight, Search, Loader2, BookOpen, ScrollText 
} from 'lucide-react';
import { getHadithBooks, getHadithByRange } from '../services/haditsApi'; 
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const ITEMS_PER_PAGE = 50; // Kita anggap 1 "Bab" berisi 50 Hadits

const HaditsPage = () => {
  // --- STATE DATA ---
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState('bukhari'); // ID Kitab
  const [bookInfo, setBookInfo] = useState(null); // Info total hadits
  const [hadithList, setHadithList] = useState([]);

  // --- STATE NAVIGASI ---
  const [currentRangeIndex, setCurrentRangeIndex] = useState(0); // Index range (0 = 1-50, 1 = 51-100)
  const [rangeOptions, setRangeOptions] = useState([]); // Daftar pilihan range untuk dropdown

  // --- STATE UI ---
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Refs
  const topRef = useRef(null);

  // 1. LOAD DAFTAR KITAB (IMAM)
  useEffect(() => {
    const fetchBooks = async () => {
      const data = await getHadithBooks();
      setBooks(data);
      // Set info awal untuk bukhari (default)
      const defaultBook = data.find(b => b.id === 'bukhari');
      if (defaultBook) setupPagination(defaultBook.available);
    };
    fetchBooks();
  }, []);

  // Helper: Membuat Opsi Dropdown "Bab" (Range)
  const setupPagination = (total) => {
    const options = [];
    for (let i = 0; i < total; i += ITEMS_PER_PAGE) {
      const start = i + 1;
      const end = Math.min(i + ITEMS_PER_PAGE, total);
      options.push({ label: `Hadits ${start} - ${end}`, start, end, index: i / ITEMS_PER_PAGE });
    }
    setRangeOptions(options);
    setCurrentRangeIndex(0); // Reset ke awal
  };

  // 2. LOAD HADITS SAAT NAVIGASI BERUBAH
  useEffect(() => {
    const loadHadiths = async () => {
      if (!rangeOptions.length) return;

      setIsLoading(true);
      setErrorMsg('');
      
      const currentOpt = rangeOptions[currentRangeIndex];
      const data = await getHadithByRange(selectedBook, currentOpt.start, currentOpt.end);
      
      if (data && data.hadiths) {
        setHadithList(data.hadiths);
        setBookInfo({ name: data.name, total: data.available });
        
        // EFEK SCROLL KE ATAS (Smooth)
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg('Gagal memuat data. Silakan coba lagi.');
      }
      setIsLoading(false);
    };

    loadHadiths();
  }, [selectedBook, currentRangeIndex, rangeOptions]);

  // --- HANDLERS ---

  const handleBookChange = (e) => {
    const newBookId = e.target.value;
    setSelectedBook(newBookId);
    
    // Reset Pagination sesuai jumlah hadits kitab baru
    const book = books.find(b => b.id === newBookId);
    if (book) setupPagination(book.available);
  };

  const handleRangeChange = (e) => {
    setCurrentRangeIndex(parseInt(e.target.value));
  };

  const handleNext = () => {
    if (currentRangeIndex < rangeOptions.length - 1) {
      setCurrentRangeIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentRangeIndex > 0) {
      setCurrentRangeIndex(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20 px-4 flex flex-col items-center">
      
      {/* HEADER CONTROL (Sticky seperti Quran) */}
      <div className="w-full max-w-4xl bg-slate-800/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl sticky top-24 z-40 mb-8 flex flex-col gap-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Dropdown 1: Pilih Imam */}
          <div className="flex items-center gap-3 w-full bg-slate-900/50 p-2 rounded-xl border border-white/5 flex-1">
            <Book className="text-amber-500 ml-2" size={20} />
            <select 
              value={selectedBook} 
              onChange={handleBookChange}
              className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer w-full font-bold"
            >
              {books.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-800">HR. {b.name} ({b.available})</option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Pilih Range (Bab Virtual) */}
          <div className="flex items-center gap-3 w-full bg-slate-900/50 p-2 rounded-xl border border-white/5 flex-1">
            <ScrollText className="text-amber-500 ml-2" size={20} />
            <select 
              value={currentRangeIndex} 
              onChange={handleRangeChange}
              className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer w-full font-bold"
            >
              {rangeOptions.map((opt) => (
                <option key={opt.index} value={opt.index} className="bg-slate-800">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Navigasi Next/Prev */}
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} disabled={currentRangeIndex === 0} className="p-2 bg-slate-700 hover:bg-amber-600 rounded-lg text-white disabled:opacity-30 transition-colors"><ChevronLeft size={20}/></button>
            <button onClick={handleNext} disabled={currentRangeIndex === rangeOptions.length - 1} className="p-2 bg-slate-700 hover:bg-amber-600 rounded-lg text-white disabled:opacity-30 transition-colors"><ChevronRight size={20}/></button>
          </div>

        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Judul Besar Kitab */}
        {!isLoading && bookInfo && (
          <div className="text-center mb-8 p-6 rounded-3xl bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/20">
            <h1 className="font-serif text-3xl md:text-4xl text-amber-500 mb-2">Sahih {bookInfo.name}</h1>
            <p className="text-slate-400 text-sm">Menampilkan {rangeOptions[currentRangeIndex]?.label}</p>
          </div>
        )}

        {/* List Hadits */}
        {isLoading ? (
          <div className="py-20 text-center text-amber-500"><Loader2 className="animate-spin w-10 h-10 mx-auto mb-2"/><p className="text-sm">Memuat Hadits...</p></div>
        ) : errorMsg ? (
          <div className="text-center text-red-400 p-10 bg-red-500/10 rounded-2xl">{errorMsg}</div>
        ) : (
          hadithList.map((hadith) => (
            <Card key={hadith.number} className="p-0 overflow-hidden border-slate-700 bg-slate-800/40 hover:border-amber-500/30 transition-all hover:bg-slate-800/60 group">
              
              {/* Header Card */}
              <div className="flex justify-between items-center px-6 py-4 bg-white/5 border-b border-white/5">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  {hadith.number}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-widest">Hadits Riwayat {bookInfo?.name}</span>
              </div>

              {/* Isi Hadits */}
              <div className="p-8 space-y-8">
                {/* Arab */}
                <p className="text-right font-serif text-3xl md:text-4xl leading-[2.6] text-white tracking-wide drop-shadow-sm" dir="rtl">
                  {hadith.arab}
                </p>
                
                {/* Terjemahan */}
                <div className="pt-6 border-t border-white/5">
                  <p className="text-slate-300 text-base leading-relaxed text-justify">
                    {hadith.id}
                  </p>
                </div>
              </div>

            </Card>
          ))
        )}

        {/* Tombol Next Besar di Bawah */}
        {!isLoading && (
          <div className="flex justify-center mt-8">
             <button 
                onClick={handleNext} 
                disabled={currentRangeIndex === rangeOptions.length - 1}
                className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-full shadow-lg shadow-amber-500/20 disabled:opacity-0 transition-all flex items-center gap-2"
             >
                Lanjut Bab Berikutnya <ChevronRight size={18}/>
             </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default HaditsPage;