import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  BookOpen, ChevronLeft, ChevronRight, Play, Pause, Loader2, 
  Volume2, Search, X, ListMusic, SkipBack, SkipForward 
} from 'lucide-react';
import { getAllSurahs, getSurahDetail, getReciters, getAudioBySurah, getSurahAudioFull } from '../services/quranApi'; 
import Card from '../components/ui/Card'; 

// Helper Time
const formatTime = (time) => {
  if (isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const QuranDigital = () => {
  const [searchParams] = useSearchParams();
  
  // Data
  const [surahList, setSurahList] = useState([]);
  const [currentSurah, setCurrentSurah] = useState(null);
  const [qariList, setQariList] = useState([]);
  const [selectedQari, setSelectedQari] = useState(7); 
  const [customAudioMap, setCustomAudioMap] = useState({});

  // Navigasi & Search
  const [currentSurahNomor, setCurrentSurahNomor] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Audio State
  const [activeVerse, setActiveVerse] = useState(null); // Jika play per ayat
  const [isFullSurahMode, setIsFullSurahMode] = useState(false); // Mode Full Surat (New)
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);

  const audioRef = useRef(new Audio());
  const verseRefs = useRef({});

  // 1. INIT LOAD
  useEffect(() => {
    const init = async () => {
      const [surahs, reciters] = await Promise.all([getAllSurahs(), getReciters()]);
      setSurahList(surahs);
      setQariList(reciters);

      const paramSurahId = searchParams.get('surahId');
      if (paramSurahId) setCurrentSurahNomor(parseInt(paramSurahId));
    };
    init();
  }, []);

  // 2. LOAD SURAH
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      resetPlayer();
      setSearchTerm('');

      const surahData = await getSurahDetail(currentSurahNomor);
      setCurrentSurah(surahData);

      // Load audio map untuk play per-ayat
      try {
        const audioFiles = await getAudioBySurah(currentSurahNomor, selectedQari);
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

  // 3. SEARCH
  useEffect(() => {
    if (!currentSurah || !searchTerm) {
      setSearchResults([]); return;
    }
    const term = searchTerm.toLowerCase();
    const matches = currentSurah.ayat.filter(verse => 
      verse.nomorAyat.toString() === term || 
      verse.teksIndonesia.toLowerCase().includes(term)
    ).map(v => v.nomorAyat);
    setSearchResults(matches);

    if (matches.length > 0 && verseRefs.current[matches[0]]) {
      verseRefs.current[matches[0]].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchTerm, currentSurah]);

  // --- AUDIO LOGIC ---

  // A. Play Satu Ayat (Manual)
  const playSingleVerse = (verseNum) => {
    setIsFullSurahMode(false); // Matikan mode full
    const url = customAudioMap[verseNum] 
      ? `https://verses.quran.com/${customAudioMap[verseNum]}`
      : currentSurah?.ayat?.find(a => a.nomorAyat === verseNum)?.audio['05'];

    if (!url) return alert("Audio belum tersedia");

    if (activeVerse !== verseNum) {
      audioRef.current.src = url;
      setActiveVerse(verseNum);
    }
    audioRef.current.play();
    setIsPlaying(true);
  };

  // B. Play Full Surat (Satu File Panjang - SMOOTH)
  const playFullSurah = async () => {
    // Jika sudah mode full, tinggal toggle play/pause
    if (isFullSurahMode && audioRef.current.src) {
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
        return;
    }

    // Jika belum, fetch URL full audio
    setIsLoading(true); // Kasih loading sebentar
    const fullAudioUrl = await getSurahAudioFull(currentSurahNomor, selectedQari);
    setIsLoading(false);

    if (fullAudioUrl) {
        setIsFullSurahMode(true);
        setActiveVerse(null); // Reset highlight ayat
        
        audioRef.current.src = fullAudioUrl;
        audioRef.current.play().catch(e => console.error("Play error:", e));
        setIsPlaying(true);
    } else {
        alert("Maaf, audio full surat belum tersedia untuk Qari ini.");
    }
  };

  const resetPlayer = () => {
    audioRef.current.pause();
    setActiveVerse(null);
    setIsFullSurahMode(false);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  };

  // Time Update Listener
  useEffect(() => {
    const audio = audioRef.current;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); }; // Cukup stop jika file habis

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const handleSeek = (e) => {
    const newTime = e.target.value;
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-40 px-4 flex flex-col items-center">
      
      {/* HEADER */}
      <div className="w-full max-w-4xl bg-slate-800/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl sticky top-24 z-30 mb-8 flex flex-col gap-4">
        
        {/* Navigasi & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 w-full bg-slate-900/50 p-2 rounded-xl border border-white/5 flex-1">
            <BookOpen className="text-emerald-500 ml-2" size={20} />
            <select 
              value={currentSurahNomor} 
              onChange={(e) => setCurrentSurahNomor(parseInt(e.target.value))}
              className="bg-transparent text-white text-sm border-none focus:ring-0 cursor-pointer w-full font-bold"
            >
              {surahList.map(s => (
                <option key={s.nomor} value={s.nomor} className="bg-slate-800">{s.nomor}. {s.namaLatin}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari ayat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 text-white pl-9 pr-8 py-2 rounded-xl text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X size={14} /></button>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => currentSurahNomor > 1 && setCurrentSurahNomor(p => p - 1)} disabled={currentSurahNomor === 1} className="p-2 bg-slate-700 hover:bg-emerald-600 rounded-lg text-white disabled:opacity-30"><ChevronLeft size={20}/></button>
            <button onClick={() => currentSurahNomor < 114 && setCurrentSurahNomor(p => p + 1)} disabled={currentSurahNomor === 114} className="p-2 bg-slate-700 hover:bg-emerald-600 rounded-lg text-white disabled:opacity-30"><ChevronRight size={20}/></button>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-3 border-t border-white/5">
            <button 
                onClick={playFullSurah}
                className={`flex items-center gap-3 px-6 py-2 rounded-full font-bold text-sm transition-all shadow-lg w-full md:w-auto justify-center ${isFullSurahMode && isPlaying ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
            >
                {isFullSurahMode && isPlaying ? <><Pause size={16}/> Pause Full Surat</> : <><Play size={16}/> Putar Surat Full (MP3)</>}
            </button>

            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-xl border border-white/5 w-full md:w-auto">
             <Volume2 size={16} className="text-slate-400"/>
             <select 
                value={selectedQari} 
                onChange={(e) => setSelectedQari(parseInt(e.target.value))}
                className="bg-transparent text-emerald-400 text-xs border-none focus:ring-0 cursor-pointer w-full font-medium py-0"
             >
                {qariList.length > 0 ? qariList.map(q => (
                    <option key={q.id} value={q.id} className="bg-slate-800">{q.reciter_name}</option>
                )) : <option value={7}>Mishari Rashid</option>}
             </select>
            </div>
        </div>
      </div>

      {/* LIST AYAT */}
      <div className="w-full max-w-4xl space-y-4">
        
        {/* Header Surat */}
        {!isLoading && currentSurah && (
          <div className="text-center mb-8 p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20">
            <h1 className="font-serif text-4xl text-emerald-400 mb-1">{currentSurah.nama}</h1>
            <h2 className="text-xl font-bold text-white">{currentSurah.namaLatin}</h2>
            <p className="text-xs text-slate-400 mt-2">{currentSurah.arti} • {currentSurah.jumlahAyat} Ayat</p>
            {currentSurahNomor !== 9 && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="font-serif text-3xl text-emerald-500/90">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
              </div>
            )}
          </div>
        )}

        {/* List Ayat Items */}
        {isLoading ? (
          <div className="py-20 text-center text-emerald-500"><Loader2 className="animate-spin w-10 h-10 mx-auto mb-2"/><p className="text-sm">Memuat...</p></div>
        ) : (
          currentSurah?.ayat?.map((verse) => {
            const isMatch = searchResults.includes(verse.nomorAyat);
            const isActive = activeVerse === verse.nomorAyat;

            return (
              <div 
                key={verse.nomorAyat} 
                ref={el => verseRefs.current[verse.nomorAyat] = el}
                className={`transition-all duration-500 ${isMatch ? 'translate-x-2' : ''}`}
              >
                <Card className={`p-0 overflow-hidden border-slate-700 bg-slate-800/30 hover:border-slate-600 transition-colors 
                  ${isActive ? 'ring-1 ring-emerald-500 bg-emerald-900/10' : ''} 
                  ${isMatch ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : ''}
                `}>
                  
                  {/* Header Item */}
                  <div className={`flex justify-between items-center px-5 py-3 border-b border-white/5 ${isMatch ? 'bg-amber-500/10' : 'bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {verse.nomorAyat}
                        </span>
                        {isMatch && <span className="text-[10px] text-amber-400 font-bold uppercase">Hasil Cari</span>}
                    </div>

                    <button 
                        onClick={() => {
                            if(isPlaying && activeVerse === verse.nomorAyat && !isFullSurahMode) {
                                audioRef.current.pause(); setIsPlaying(false);
                            } else {
                                playSingleVerse(verse.nomorAyat);
                            }
                        }}
                        className={`p-1.5 rounded-full transition-all ${isActive && !isFullSurahMode ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white bg-slate-700'}`}
                    >
                        {isActive && isPlaying && !isFullSurahMode ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}
                    </button>
                  </div>

                  {/* Body Text */}
                  <div className="p-6 space-y-6">
                    <p className="text-right font-serif text-3xl md:text-4xl leading-[2.4] text-white tracking-wide" dir="rtl">
                      {verse.teksArab}
                    </p>
                    <div className="space-y-2 pt-4 border-t border-white/5">
                      <p className="text-emerald-500/80 text-sm italic font-medium">{verse.teksLatin}</p>
                      <p className={`text-sm leading-relaxed ${isMatch ? 'text-amber-100' : 'text-slate-300'}`}>{verse.teksIndonesia}</p>
                    </div>
                  </div>

                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER PLAYER (Floating) */}
      <div className={`fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-4 transition-transform duration-500 z-50 ${activeVerse || isFullSurahMode ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
            
            <div className="w-full flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{formatTime(progress)}</span>
                <input 
                    type="range" min="0" max={duration || 0} value={progress} onChange={handleSeek}
                    className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-between mt-1">
                <div className="w-1/3 text-white text-xs truncate font-bold">
                    {isFullSurahMode ? `Full Surat: ${currentSurah?.namaLatin}` : `Ayat ${activeVerse}`}
                </div>

                <div className="flex items-center justify-center gap-4 w-1/3">
                    <button 
                        onClick={() => {
                            if(isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
                            else { audioRef.current.play(); setIsPlaying(true); }
                        }}
                        className="w-12 h-12 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center text-white shadow-lg transition-all"
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1"/>}
                    </button>
                </div>

                <div className="w-1/3 flex justify-end">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${isFullSurahMode ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {isFullSurahMode ? <><ListMusic size={12}/> Full Surat</> : 'Single Ayat'}
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default QuranDigital;