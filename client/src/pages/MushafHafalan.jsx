import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Pause, RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff, BookOpen, Search, Check, XCircle } from 'lucide-react';
import { getAyatByPage, getSurahName, getAllSurahs, getPageByVerse } from '../services/quranApi'; 
import Card from '../components/ui/Card'; 

// --- 1. NORMALIZER CERDAS (Logika Server dipindah ke sini) ---
const normalizeArabic = (text) => {
  if (!text) return "";
  let res = text
    .replace(/[\u0640\u0653]/g, '') 
    .replace(/[\u0610-\u061A\u064B-\u0652\u06D6-\u06ED]/g, '');

  // 1. PENGECUALIAN KHUSUS (Zalika, Rahman, dll) - JANGAN UBAH
  res = res
    .replace(/ذ\u0670ل/g, 'ذل')   // Zalika
    .replace(/ه\u0670ذ/g, 'هذ')   // Haza
    .replace(/حم\u0670ن/g, 'حمن') // Rahman
    .replace(/ل\u0670ه/g, 'له')   // Allah
    .replace(/ل\u0670ك/g, 'لك')   // Lakin
    .replace(/ل\u0670ئ/g, 'لئ');  // Ulaika

  // 2. KHUSUS: Sholat, Zakat, dll (Waw dibuang) - JANGAN UBAH
  res = res
    .replace(/(صل|زك|حي|مشك|نج|غد|من)و\u0670(?=ة)/g, '$1ا')
    .replace(/ربو\u0670/g, 'ربا');

  // 3. UMUM: Waw + Dagger (Walid) -> Waw + Alif - JANGAN UBAH
  res = res.replace(/و\u0670/g, 'وا');

  // 4. KHUSUS: Ya + Dagger (Ataniya, Ala di Quran) -> Alif
  // Contoh: 'عَلَىٰ' -> 'علا'
  res = res.replace(/ى\u0670/g, 'ا');

  // 5. UMUM: Sisa Dagger Alif (Kitab) -> Alif - JANGAN UBAH
  res = res.replace(/\u0670/g, 'ا');

  // 6. STANDARISASI HURUF (UPDATE DISINI UNTUK 'ALA')
  res = res
    .replace(/(ة)/g, 'ه')       
    .replace(/(ؤ)/g, 'و')       
    .replace(/(ئ)/g, 'ي')
    // PERBAIKAN: Ubah 'ى' (Maqsura) jadi 'ا' (Alif)
    // Agar 'على' (User) jadi 'علا' -> Cocok dengan Quran 'علا'
    .replace(/(ى)/g, 'ا')       
    
    .replace(/[أإآٱء]/g, 'ا') // Hamza/Alif variasi -> Alif
    .replace(/ا+/g, 'ا')      // Gabungkan Alif ganda
    .replace(/[^ا-ي]/g, '')   // Hapus non-huruf
   

  res = res
   // 1. Hapus Tatweel (ـ) & Tanda Mad (~)
    .replace(/[\u0640\u0653]/g, '') 
    // 2. Hapus Harakat, Waqaf, & Alif Kecil
    .replace(/[\u0610-\u061A\u064B-\u0652\u0670\u06D6-\u06ED]/g, '') 
    // 3. Standarisasi Huruf
    .replace(/(ة)/g, 'ه')       
    .replace(/(ى)/g, 'ي')       
    .replace(/(ؤ)/g, 'و')       
    .replace(/(ئ)/g, 'ي')       
    // 4. HAPUS SEMUA BENTUK ALIF (Solusi Pamungkas)
    .replace(/[أإآٱا]/g, '') 
    // 3. KHUSUS: Gabungkan 'Alif Maqsura + Alif Kecil' (ىٰ) menjadi satu 'ا'
    // Ini memperbaiki "Ataniya" agar tidak terdeteksi ganda
    .replace(/ى\u0670/g, 'ا')

    // 4. Ubah Alif Kecil (Dagger Alif) sisanya menjadi 'ا' (Fix untuk 'Kitab')
    .replace(/\u0670/g, 'ا')

    // 7. ANTI-DOUBLE: Gabungkan Alif ganda jadi satu (Solusi "Gak Panjang")
    // Contoh: 'ااتاني' menjadi 'اتاني'
    .replace(/ا+/g, 'ا')

    // 7. ANTI-DOUBLE: Gabungkan Alif ganda jadi satu 
    // Contoh: 'ااتاني' -> 'اتاني', 'الصلواة' -> 'الصلاة' (Jaga-jaga sisa Waw)
    .replace(/ا+/g, 'ا')

    

       .replace(/[ء]/g, 'ا') 
    // 5. Hapus Spasi & Non-Huruf
    .replace(/[^ا-ي]/g, '')

    
    
    // // Hapus Hamza Tunggal (ء) agar 'Ataniya' (ءاتاني) cocok dengan 'اتاني'
    // .replace(/\u0621/g, 'ا')
    .trim();


  return res;
  
   
};

// --- TOAST ---
const BeautifulToast = ({ message, type }) => {
  if (!message) return null;
  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400",
    error: "bg-red-500/10 border-red-500/50 text-red-400",
    info: "bg-blue-500/10 border-blue-500/50 text-blue-400"
  };
  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border backdrop-blur-md shadow-2xl ${styles[type] || styles.info}`}>
        <div className={`p-1 rounded-full ${type === 'success' ? 'bg-emerald-500/20' : type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
          {type === 'success' ? <Check className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
        </div>
        <span className="font-semibold text-sm tracking-wide">{message}</span>
      </div>
    </div>
  );
};

const MushafHafalan = () => {
  // State Data
  const [surahList, setSurahList] = useState([]);
  const [selectedSurahId, setSelectedSurahId] = useState(1); 
  const [targetAyatNum, setTargetAyatNum] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1); 
  const [ayatList, setAyatList] = useState([]);
  const [pageInfo, setPageInfo] = useState({ surahName: 'Loading...', juz: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Hafalan State
  const [isListening, setIsListening] = useState(false);
  const [currentAyatIndex, setCurrentAyatIndex] = useState(0); 
  const [spokenText, setSpokenText] = useState(""); 
  const [isPeeking, setIsPeeking] = useState(false);
  const [notification, setNotification] = useState({ msg: "", type: "" });

  // Refs
  const recognitionRef = useRef(null);
  const ayatListRef = useRef([]); 
  const currentIndexRef = useRef(0);
  const activeAyatRef = useRef(null);
  const lastProcessedTextRef = useRef(""); 
  const pendingJumpRef = useRef(null); 

  // Sync Refs
  useEffect(() => { ayatListRef.current = ayatList; }, [ayatList]);
  useEffect(() => { currentIndexRef.current = currentAyatIndex; }, [currentAyatIndex]);

  // --- 2. LOGIKA CEK REALTIME (PER KATA) ---
  const handleCheckRecitation = useCallback((transcript) => {
    const currentList = ayatListRef.current;
    const idx = currentIndexRef.current;

    if (!currentList.length || !transcript) return;

    const currentAyat = currentList[idx];
    if (!currentAyat || currentAyat.isCompleted) return;

    // 1. Normalisasi input user (Pakai logika tulang)
    const userSkeleton = normalizeArabic(transcript);
    
    // Optimasi: Jangan cek ulang kalau teks belum berubah
    if (userSkeleton === lastProcessedTextRef.current) return;
    lastProcessedTextRef.current = userSkeleton;

    // 2. Cek setiap kata di ayat target
    let hasChanges = false;
    const newWords = currentAyat.words.map((word) => {
      if (word.isRevealed) return word; // Lewati yang sudah benar

      const targetSkeleton = normalizeArabic(word.text);
      
      // KUNCI: Cek apakah 'tulang' kata target ada di dalam 'tulang' ucapan user?
      const isMatch = userSkeleton.includes(targetSkeleton);
      
      if (isMatch) hasChanges = true;
      return { ...word, isRevealed: isMatch };
    });

    // 3. Update tampilan jika ada kata baru yang terbuka
    if (hasChanges) {
      setAyatList(prev => {
        const newList = [...prev];
        newList[idx] = { ...newList[idx], words: newWords };
        return newList;
      });
    }

    // 4. Cek Selesai Ayat
    const allRevealed = newWords.every(w => w.isRevealed);
    if (allRevealed) {
        handleAyatCompleted(idx);
    }
  }, []);

  const handleAyatCompleted = (idx) => {
    new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(()=>{});
    
    setAyatList(prev => {
      const newList = [...prev];
      newList[idx].isCompleted = true;
      return newList;
    });

    setSpokenText(""); // Kosongkan tampilan teks sementara
    
    setTimeout(() => {
        if (idx < ayatListRef.current.length - 1) {
            setCurrentAyatIndex(prev => prev + 1);
            
            // --- RESET BUFFER MIC DISINI ---
            // Abort akan mematikan mic dan menghapus buffer teks sebelumnya.
            // onend akan menyalakan lagi otomatis karena isListening masih true.
            if (recognitionRef.current) {
                try { 
                    recognitionRef.current.abort(); 
                } catch(e) {}
            }
            // -------------------------------

        } else {
            stopMicrophone(); 
            triggerNotif("Alhamdulillah! Halaman Selesai.", "success");
            new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3').play().catch(()=>{});
        }
    }, 500);
  };

  // --- 3. SETUP WEB SPEECH API ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; 
      recognition.lang = 'ar-SA'; 

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const fullText = finalTranscript + interimTranscript;
        setSpokenText(fullText);
        handleCheckRecitation(fullText); // Cek langsung tanpa server
      };

      recognition.onerror = (event) => {
        if (event.error === 'aborted') return; 
        if (event.error === 'not-allowed') {
          setIsListening(false);
          triggerNotif("Izinkan mikrofon!", "error");
        }
      };

      recognition.onend = () => {
        // Fitur "Always On" (Nyala terus)
        if (isListening) {
          setTimeout(() => { try { recognition.start(); } catch (e) {} }, 300);
        }
      };

      recognitionRef.current = recognition;
    }
    
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [isListening, handleCheckRecitation]); 

  // --- DATA & NAVIGASI ---
  useEffect(() => {
    const fetchSurahs = async () => { setSurahList(await getAllSurahs()); };
    fetchSurahs();
  }, []);

  useEffect(() => { loadPageData(currentPage); }, [currentPage]);

  const loadPageData = async (page) => {
    setIsLoading(true);
    setIsListening(false);
    if(recognitionRef.current) try { recognitionRef.current.stop(); } catch(e){}
    
    setSpokenText("");
    setNotification(null);

    const data = await getAyatByPage(page);
    if (data) {
      const chapterId = data.meta.chapter_id;
      const surahData = await getSurahName(chapterId);
      setPageInfo({ surahName: surahData.name_simple, juz: data.meta.juz_number });
      setSelectedSurahId(chapterId);

      let formattedAyats = data.verses.map((verse, index) => ({
        id: index + 1, 
        realVerseId: verse.verse_key,
        verseNo: verse.verse_key.split(':')[1],
        text: verse.text_uthmani,
        translation: verse.translations[0]?.text || "Terjemahan...",
        words: verse.text_uthmani.split(/\s+/).map((word, wIdx) => ({
          id: wIdx, text: word, isRevealed: false 
        })),
        isCompleted: false
      }));

      // Auto-Jump Logic
      if (pendingJumpRef.current) {
        const targetVerseNo = pendingJumpRef.current;
        const targetIdx = formattedAyats.findIndex(v => v.verseNo == targetVerseNo);
        if (targetIdx !== -1) {
            setCurrentAyatIndex(targetIdx);
            formattedAyats = formattedAyats.map((ayat, idx) => {
                if (idx < targetIdx) {
                    return { ...ayat, isCompleted: true, words: ayat.words.map(w => ({ ...w, isRevealed: true })) };
                }
                return ayat;
            });
        }
        pendingJumpRef.current = null; 
      } else {
        setCurrentAyatIndex(0);
      }

      setAyatList(formattedAyats);
    }
    setIsLoading(false);
  };

 // ... state lainnya ...
const isListeningRef = useRef(false); // 1. Tambahkan Ref ini agar state selalu update di dalam event listener

// Sync State ke Ref (Agar event listener baca data terbaru)
useEffect(() => {
  isListeningRef.current = isListening;
}, [isListening]);

// --- 5. SETUP WEB SPEECH API (VERSI ANTI-MACET) ---
useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    triggerNotif("Browser tidak mendukung Speech API", "error");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true; // Agar tidak mati tiap 1 kalimat
  recognition.interimResults = true; // Agar teks muncul real-time
  recognition.lang = 'ar-SA'; 

  recognition.onstart = () => {
    console.log("Mic Nyala");
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    const fullText = finalTranscript + interimTranscript;
    setSpokenText(fullText);
    handleCheckRecitation(fullText);
  };

  recognition.onerror = (event) => {
    console.warn("Speech Error:", event.error);
    
    // Abaikan error "no-speech" (hening) & "aborted" (stop manual)
    if (event.error === 'no-speech' || event.error === 'network') {
       // Jangan matikan isListening, biarkan onend yang merestart
       return; 
    }

    if (event.error === 'not-allowed') {
      setIsListening(false);
      triggerNotif("Izinkan akses mikrofon!", "error");
    }
  };

  recognition.onend = () => {
    console.log("Mic Mati (OnEnd)");
    
    // LOGIKA RESTART AGRESIF
    // Cek pakai Ref (bukan state biasa) untuk memastikan kita memang masih ingin mendengar
    if (isListeningRef.current) {
      console.log("Mencoba menyalakan kembali...");
      // Delay sedikit biar browser tidak crash (Throttling)
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.error("Gagal restart mic:", e);
        }
      }, 300); // 300ms delay cukup aman
    } else {
      setIsListening(false); // Pastikan state UI mati jika memang disuruh berhenti
    }
  };

  recognitionRef.current = recognition;

  // Cleanup saat unmount
  return () => {
    if (recognitionRef.current) recognitionRef.current.abort();
  };
}, [handleCheckRecitation]); // Dependency dikurangi agar tidak sering re-mount

// Update toggleListening agar sinkron dengan Ref
const toggleListening = () => {
  if (!recognitionRef.current) return alert("Gunakan Chrome/Edge.");
  
  if (isListening) {
    // STOP MANUAL
    setIsListening(false);
    isListeningRef.current = false; // Update Ref segera
    recognitionRef.current.stop();
  } else {
    // START MANUAL
    setIsListening(true);
    isListeningRef.current = true; // Update Ref segera
    setSpokenText("");
    try { recognitionRef.current.start(); } catch(e){}
  }
};

  // Handlers Navigasi
  const handleSurahChange = (e) => {
    const newSurahId = parseInt(e.target.value);
    setSelectedSurahId(newSurahId);
    setTargetAyatNum(""); 
    const targetSurah = surahList.find(s => s.id === newSurahId);
    if (targetSurah && targetSurah.pages) setCurrentPage(targetSurah.pages[0]); 
  };

  const handleJumpToAyat = async (e) => {
    e.preventDefault();
    if (!targetAyatNum) return;
    triggerNotif(`Mencari Ayat ${targetAyatNum}...`, "info");
    const page = await getPageByVerse(selectedSurahId, targetAyatNum);
    if (page) {
      pendingJumpRef.current = targetAyatNum; 
      setCurrentPage(page); 
    } else {
      triggerNotif("Ayat tidak ditemukan.", "error");
    }
  };

  const handleNextPage = () => { if(currentPage < 604) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if(currentPage > 1) setCurrentPage(prev => prev - 1); };
  const progressPercent = ayatList.length > 0 ? ((currentAyatIndex) / ayatList.length) * 100 : 0;
  const triggerNotif = (msg, type) => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 2000); };

  useEffect(() => {
    if (activeAyatRef.current) activeAyatRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentAyatIndex, isLoading]);

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-32 px-4 flex flex-col items-center">
      
      <BeautifulToast message={notification?.msg} type={notification?.type} />

      {/* HEADER */}
      <div className="w-full max-w-4xl mb-6 bg-slate-800/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3 w-full lg:w-auto flex-1">
             <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><BookOpen size={20} /></div>
             <select value={selectedSurahId} onChange={handleSurahChange} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg block w-full p-2.5 focus:ring-emerald-500 focus:border-emerald-500">
               {surahList.length === 0 && <option>Memuat...</option>}
               {surahList.map(s => <option key={s.id} value={s.id}>{s.id}. {s.name_simple}</option>)}
             </select>
          </div>
          <form onSubmit={handleJumpToAyat} className="flex items-center gap-2 w-full lg:w-auto">
             <input type="number" placeholder="Ayat..." value={targetAyatNum} onChange={(e) => setTargetAyatNum(e.target.value)} className="w-20 bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5 focus:ring-emerald-500 focus:border-emerald-500 text-center" />
             <button type="submit" className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"><Search size={18} /></button>
          </form>
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
             <span className="text-xs text-slate-400 whitespace-nowrap">Hlm {currentPage}</span>
             <div className="flex gap-1">
                <button onClick={handlePrevPage} disabled={currentPage===1} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50"><ChevronLeft size={18}/></button>
                <button onClick={handleNextPage} disabled={currentPage===604} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50"><ChevronRight size={18}/></button>
             </div>
          </div>
        </div>
      </div>

      {/* LIVE TRANSCRIPT */}
      <div className={`w-full max-w-3xl mb-4 text-center transition-all duration-300 ${isListening ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
         <div className="inline-block bg-slate-800/80 px-6 py-2 rounded-full border border-emerald-500/30 shadow-lg">
            <p className="text-slate-400 text-[10px] mb-1 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span> Mendengar:
            </p>
            <p className="text-emerald-300 text-xl font-serif leading-relaxed" dir="rtl">{spokenText || "..."}</p>
         </div>
      </div>

      {/* CARD LIST */}
      <div className="w-full max-w-3xl space-y-6">
        {isLoading && <div className="text-center py-20 text-slate-500"><RefreshCw className="animate-spin w-8 h-8 mx-auto mb-2"/><p>Mengambil Data...</p></div>}
        
        {!isLoading && ayatList.map((ayat, index) => {
           const isActive = index === currentAyatIndex;
           const isDone = index < currentAyatIndex;
           return (
             <div key={ayat.realVerseId} ref={isActive ? activeAyatRef : null} className={`transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-60'}`}>
               <Card className={`p-6 border-2 transition-colors duration-300 relative overflow-hidden ${isActive ? isListening ? 'border-emerald-500 bg-slate-800/80 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-slate-500 bg-slate-800' : 'border-transparent bg-slate-900'}`} hoverEffect={false}>
                 <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive || isDone ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{ayat.verseNo}</div>
                    {isActive && isListening && <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-pulse"><Mic size={12} /> Live...</div>}
                 </div>
                 
                 <div className="text-right mb-6 leading-[2.5]" dir="rtl">
                    {ayat.words.map((word, wIdx) => {
                       const showWord = isDone || (isActive && word.isRevealed);
                       const showPeek = isActive && isPeeking;
                       return (
                         <span key={wIdx} 
                           className={`
                             inline-block mx-1 text-3xl md:text-4xl font-serif font-medium transition-all duration-200 px-1 rounded
                             ${showWord 
                                 ? 'text-white opacity-100 blur-0 scale-100' // BENAR
                                 : showPeek
                                   ? 'text-white opacity-50 blur-0' 
                                   : 'text-slate-500 opacity-40 blur-[4px]' // BURAM
                             }
                           `}
                         >
                           {word.text}
                         </span>
                       );
                    })}
                 </div>
                 
                 <div className={`transition-all duration-500 overflow-hidden ${isDone || (isActive && ayat.isCompleted) ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-400 text-sm font-sans border-l-2 border-emerald-500 pl-3">{ayat.translation}</p>
                 </div>
               </Card>
             </div>
           );
        })}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-6 left-0 w-full z-50 px-4">
        <div className="max-w-md mx-auto bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-full p-2 shadow-2xl flex items-center justify-between pl-6 pr-2">
          <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Progres</span><span className="text-emerald-400 font-bold text-sm">{Math.round(progressPercent)}%</span></div>
          <div className="flex items-center gap-3">
             <button onClick={() => { setIsPeeking(true); setTimeout(() => setIsPeeking(false), 1000); }} disabled={!isListening && status !== 'idle'} className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-50"><Eye size={18}/></button>
             
             <button onClick={toggleListening} className={`h-14 px-6 rounded-full flex items-center gap-2 font-bold text-white transition-all duration-300 shadow-lg ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
               {isListening ? <><Pause size={20} fill="currentColor"/> Stop</> : <><Mic size={20}/> Mulai</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MushafHafalan;