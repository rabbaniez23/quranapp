import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  BookOpen, ChevronLeft, ChevronRight, Play, Pause, Loader2, 
  Settings, Volume2, Repeat
} from 'lucide-react';
import { getAllSurahs, getSurahDetail, getReciters, getAudioBySurah } from '../services/quranApi'; 
import Card from '../components/ui/Card'; 

const QuranDigital = () => {
  const [searchParams] = useSearchParams();
  
  // Data State
  const [surahList, setSurahList] = useState([]);
  const [currentSurah, setCurrentSurah] = useState(null);
  const [qariList, setQariList] = useState([]);
  const [selectedQari, setSelectedQari] = useState(7); // Default: Misyari Rasyid (ID 7)
  const [customAudioMap, setCustomAudioMap] = useState({}); // Mapping audio khusus Qari

  // Navigation State
  const [currentSurahNomor, setCurrentSurahNomor] = useState(1);

  // Audio State
  const [activeVerse, setActiveVerse] = useState(null); // Nomor ayat yang sedang play
  const [isPlayingAll, setIsPlayingAll] = useState(false); // Mode putar full satu surat
  const [isLoading, setIsLoading] = useState(true);

  const audioRef = useRef(new Audio());
  const verseRefs = useRef({});

// --- 1. INITIAL LOAD (Surat & Reciters) ---
  useEffect(() => {
    const init = async () => {
      // getReciters sekarang return array langsung (tanpa fetch lama)
      // jadi ini akan sangat cepat
      const [surahs, reciters] = await Promise.all([getAllSurahs(), getReciters()]);
      setSurahList(surahs);
      setQariList(reciters);

      const paramSurahId = searchParams.get('surahId');
      if (paramSurahId) setCurrentSurahNomor(parseInt(paramSurahId));
    };
    init();
  }, []);

  // --- 2. LOAD SURAH & AUDIO MAP ---
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      stopAudio(); // Reset Audio

      // Load Teks Surat
      const surahData = await getSurahDetail(currentSurahNomor);
      setCurrentSurah(surahData);

      // Load Audio Khusus Qari Pilihan (Jika bukan default)
      // Default Equran.id pakai Misyari (05). Kalau user pilih Qari lain, kita ambil dari Quran.com
      try {
        const audioFiles = await getAudioBySurah(currentSurahNomor, selectedQari);
        // Convert array to map: { "1": "url...", "2": "url..." }
        const map = {};
        audioFiles.forEach(f => {
            const verseNum = parseInt(f.verse_key.split(':')[1]);
            map[verseNum] = f.url;
        });
        setCustomAudioMap(map);
      } catch (e) { console.error("Audio Qari Error", e); }

      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    loadContent();
  }, [currentSurahNomor, selectedQari]);

  // --- AUDIO LOGIC ---
  const getAudioUrl = (verseNum) => {
    // Prioritas: Audio dari Qari Pilihan (Quran.com) -> Audio Default (Equran.id)
    if (customAudioMap[verseNum]) {
        // Quran.com audio relative path fix
        return `https://verses.quran.com/${customAudioMap[verseNum]}`;
    }
    // Fallback ke audio default dari data surat (biasanya Misyari)
    return currentSurah?.ayat?.find(a => a.nomorAyat === verseNum)?.audio['05'];
  };

  const playVerse = (verseNum) => {
    const url = getAudioUrl(verseNum);
    if (!url) return alert("Audio belum tersedia");

    audioRef.current.src = url;
    audioRef.current.play().catch(e => console.error("Play error:", e));
    setActiveVerse(verseNum);

    // Auto scroll ke ayat yang sedang dibaca
    if(verseRefs.current[verseNum]) {
        verseRefs.current[verseNum].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const stopAudio = () => {
    audioRef.current.pause();
    setActiveVerse(null);
    setIsPlayingAll(false);
  };

  // Handler Tombol Play Per Ayat
  const togglePlayVerse = (verseNum) => {
    if (activeVerse === verseNum) {
      stopAudio();
    } else {
      setIsPlayingAll(false); // Mode manual
      playVerse(verseNum);
    }
  };

  // Handler Tombol "Putar Satu Surat"
  const togglePlayAll = () => {
    if (isPlayingAll) {
      stopAudio();
    } else {
      setIsPlayingAll(true);
      playVerse(1); // Mulai dari ayat 1
    }
  };

  // Event Listener Audio Selesai
  useEffect(() => {
    const handleEnded = () => {
      if (isPlayingAll && currentSurah) {
        // Cari ayat berikutnya
        const nextVerse = activeVerse + 1;
        if (nextVerse <= currentSurah.jumlahAyat) {
          playVerse(nextVerse);
        } else {
          stopAudio(); // Selesai surat
        }
      } else {
        setActiveVerse(null); // Mode manual selesai
      }
    };

    audioRef.current.addEventListener('ended', handleEnded);
    return () => audioRef.current.removeEventListener('ended', handleEnded);
  }, [activeVerse, isPlayingAll, currentSurah]);


  // --- NAVIGASI ---
  const handleNextSurah = () => { if (currentSurahNomor < 114) setCurrentSurahNomor(prev => prev + 1); };
  const handlePrevSurah = () => { if (currentSurahNomor > 1) setCurrentSurahNomor(prev => prev - 1); };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20 px-4 flex flex-col items-center">
      
      {/* HEADER CONTROL (Sticky) */}
      <div className="w-full max-w-4xl bg-slate-800/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl sticky top-24 z-40 mb-8 flex flex-col gap-4">
        
        {/* Baris 1: Navigasi Surat */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto bg-slate-900/50 p-2 rounded-xl border border-white/5">
            <BookOpen className="text-emerald-500 ml-2" size={20} />
            <select 
              value={currentSurahNomor} 
              onChange={(e) => setCurrentSurahNomor(parseInt(e.target.value))}
              className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer w-full md:w-64 font-bold"
            >
              {surahList.map(s => (
                <option key={s.nomor} value={s.nomor} className="bg-slate-800">{s.nomor}. {s.namaLatin}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrevSurah} disabled={currentSurahNomor === 1} className="p-2 bg-slate-700 hover:bg-emerald-600 rounded-lg text-white disabled:opacity-30 transition-colors"><ChevronLeft size={20}/></button>
            <button onClick={handleNextSurah} disabled={currentSurahNomor === 114} className="p-2 bg-slate-700 hover:bg-emerald-600 rounded-lg text-white disabled:opacity-30 transition-colors"><ChevronRight size={20}/></button>
          </div>
        </div>

        {/* Baris 2: Audio Control & Qari */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-white/5">
            
            {/* Play Full Surat Button */}
            <button 
                onClick={togglePlayAll}
                className={`flex items-center gap-3 px-6 py-2 rounded-full font-bold text-sm transition-all shadow-lg w-full md:w-auto justify-center ${isPlayingAll ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
            >
                {isPlayingAll ? <><Pause size={18} fill="currentColor"/> Stop Murottal</> : <><Play size={18} fill="currentColor"/> Putar Surat Full</>}
            </button>

            {/* Qari Selector */}
            <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 w-full md:w-auto">
                <Volume2 size={16} className="text-slate-400"/>
                <span className="text-xs text-slate-500 whitespace-nowrap">Qari:</span>
                <select 
                    value={selectedQari} 
                    onChange={(e) => setSelectedQari(parseInt(e.target.value))}
                    className="bg-transparent text-emerald-400 text-sm border-none focus:ring-0 cursor-pointer w-full font-medium py-0"
                >
                    {qariList.length > 0 ? qariList.map(q => (
                        <option key={q.id} value={q.id} className="bg-slate-800">
                            {q.reciter_name} ({q.style || 'Default'})
                        </option>
                    )) : <option value={7}>Mishari Rashid Al-Afasy</option>}
                </select>
            </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Header Surat */}
        {!isLoading && currentSurah && (
          <div className="text-center mb-10 space-y-3 p-8 rounded-3xl bg-gradient-to-br from-emerald-900/20 to-slate-900 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
            <h1 className="font-serif text-5xl text-emerald-400 drop-shadow-lg mb-2">{currentSurah.nama}</h1>
            <h2 className="text-3xl font-bold text-white">{currentSurah.namaLatin}</h2>
            <div className="flex justify-center gap-3 text-sm text-slate-400 mt-2">
                <span className="px-3 py-1 bg-slate-800 rounded-full border border-white/5">{currentSurah.arti}</span>
                <span className="px-3 py-1 bg-slate-800 rounded-full border border-white/5">{currentSurah.jumlahAyat} Ayat</span>
                <span className="px-3 py-1 bg-slate-800 rounded-full border border-white/5">{currentSurah.tempatTurun}</span>
            </div>
            
            {/* Bismillah */}
            {currentSurahNomor !== 9 && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="font-serif text-4xl text-emerald-500/90 leading-relaxed drop-shadow-md">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                </p>
              </div>
            )}
          </div>
        )}

        {/* List Ayat */}
        {isLoading ? (
          <div className="py-20 text-center text-emerald-500"><Loader2 className="animate-spin w-12 h-12 mx-auto mb-4"/><p>Memuat Surat...</p></div>
        ) : (
          currentSurah?.ayat?.map((verse) => (
            <div key={verse.nomorAyat} ref={el => verseRefs.current[verse.nomorAyat] = el}>
              <Card className={`p-0 overflow-hidden border-slate-700 bg-slate-800/40 hover:border-slate-600 transition-all duration-500 ${activeVerse === verse.nomorAyat ? 'ring-2 ring-emerald-500 bg-emerald-900/10 scale-[1.02] shadow-2xl z-10 relative' : 'hover:bg-slate-800/60'}`}>
                
                {/* Header Ayat */}
                <div className="flex justify-between items-center px-6 py-4 bg-white/5 border-b border-white/5">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${activeVerse === verse.nomorAyat ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-800 text-emerald-500 border-slate-600'}`}>
                    {verse.nomorAyat}
                  </span>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => togglePlayVerse(verse.nomorAyat)} 
                        className={`p-2 rounded-full transition-all ${activeVerse === verse.nomorAyat ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-emerald-500 hover:text-white'}`}
                    >
                        {activeVerse === verse.nomorAyat ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                    </button>
                  </div>
                </div>

                {/* Body Ayat */}
                <div className="p-8 space-y-8">
                  <p className="text-right font-serif text-4xl md:text-5xl leading-[2.8] text-white tracking-wide drop-shadow-sm" dir="rtl">
                    {verse.teksArab}
                  </p>
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <p className="text-emerald-400/80 text-lg italic font-medium font-serif leading-relaxed">{verse.teksLatin}</p>
                    <p className="text-slate-300 text-base leading-relaxed">{verse.teksIndonesia}</p>
                  </div>
                </div>

              </Card>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default QuranDigital;