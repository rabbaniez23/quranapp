import { useState, useEffect, useRef } from 'react';
import { Mic, Pause, RefreshCw, ChevronLeft, ChevronRight, XCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { getAyatByPage, getSurahName } from '../services/quranApi'; 
import Card from '../components/ui/Card'; 

// --- VISUALIZER ---
const AudioVisualizer = ({ analyser }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / 20);
      let x = 0;
      for(let i = 0; i < 20; i++) {
        const barHeight = dataArray[i * 2] / 2; 
        ctx.fillStyle = `rgb(52, 211, 153)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };
    draw();
  }, [analyser]);
  return <canvas ref={canvasRef} width={100} height={30} className="rounded-md" />;
};

const MushafHafalan = () => {
  // --- STATE ---
  const [currentPage, setCurrentPage] = useState(2); 
  const [ayatList, setAyatList] = useState([]);
  const [pageInfo, setPageInfo] = useState({ surahName: 'Loading...', juz: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Hafalan State
  const [isListening, setIsListening] = useState(false);
  const [currentAyatIndex, setCurrentAyatIndex] = useState(0); 
  const [status, setStatus] = useState('idle'); 
  const [toast, setToast] = useState(null);
  const [isPeeking, setIsPeeking] = useState(false);

  // --- REFS (PENTING UNTUK MENGATASI BUG AYAT TERTINGGAL) ---
  const indexRef = useRef(0); // <-- INI SOLUSINYA: Ref selalu pegang nilai terbaru
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAyatRef = useRef(null);
  const analyserRef = useRef(null);

  // --- SYNC STATE KE REF ---
  useEffect(() => {
    // Setiap kali index di layar berubah, update juga catatan Ref
    indexRef.current = currentAyatIndex;
  }, [currentAyatIndex]);

  // --- FETCH DATA ---
  useEffect(() => { loadPageData(currentPage); }, [currentPage]);

  const loadPageData = async (page) => {
    setIsLoading(true);
    setStatus('idle');
    setIsListening(false);
    setCurrentAyatIndex(0);
    indexRef.current = 0; // Reset ref

    const data = await getAyatByPage(page);
    if (data) {
      const chapterId = data.meta.chapter_id;
      const surahData = await getSurahName(chapterId);
      setPageInfo({ surahName: surahData.name_simple, juz: data.meta.juz_number });

      const formattedAyats = data.verses.map((verse, index) => ({
        id: index + 1, 
        realVerseId: verse.verse_key,
        verseNo: verse.verse_key.split(':')[1],
        text: verse.text_uthmani,
        translation: verse.translations[0]?.text || "Terjemahan...",
        words: verse.text_uthmani.split(' ').map((word, wIdx) => ({
          id: wIdx, text: word, isRevealed: false
        })),
        isCompleted: false
      }));
      setAyatList(formattedAyats);
    }
    setIsLoading(false);
  };

  // --- AUTO SCROLL ---
  useEffect(() => {
    if (activeAyatRef.current) {
      activeAyatRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentAyatIndex, isLoading]);

  // --- FUNGSI UTAMA: RECORDER ---
  const startRecording = async () => {
    try {
      setStatus('listening');
      setIsListening(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (audioContext.state !== 'closed') audioContext.close();
        stream.getTracks().forEach(track => track.stop()); 
        
        setStatus('processing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], "hafalan.webm", { type: 'audio/webm' });
        
        // --- PERBAIKAN BUG DI SINI ---
        // Jangan pakai currentAyatIndex (karena bisa stale/usang)
        // Pakai indexRef.current (pasti terbaru)
        const activeIdx = indexRef.current; 
        const currentTargetText = ayatList[activeIdx].text;
        
        console.log("Mengirim Ayat Index ke:", activeIdx); // Debugging
        
        await sendToGemini(audioFile, currentTargetText, activeIdx);
      };

      mediaRecorder.start();
      detectSilence(analyser, mediaRecorder); 

    } catch (err) {
      console.error("Mic Error:", err);
      showToast("Gagal akses mikrofon", "error");
      setIsListening(false);
      setStatus('idle');
    }
  };

  // Logika Deteksi Diam (Biar Realtime)
  const detectSilence = (analyser, mediaRecorder) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart = performance.now();
    const SILENCE_THRESHOLD = 25; // Sensitivitas mic
    const SILENCE_DURATION = 1500; // 1.5 detik diam = kirim

    const checkVolume = () => {
      if (mediaRecorder.state !== 'recording') return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const average = sum / bufferLength;

      if (average < SILENCE_THRESHOLD) {
        if (performance.now() - silenceStart > SILENCE_DURATION) {
          mediaRecorder.stop(); // Stop otomatis
          return; 
        }
      } else {
        silenceStart = performance.now();
      }
      requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  const sendToGemini = async (audioFile, ayatTarget, idxToCheck) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('ayatTarget', ayatTarget);

    try {
      const response = await fetch('http://localhost:5000/api/cek-hafalan', {
        method: 'POST', body: formData,
      });
      const result = await response.json();

      if (result.isCorrect) {
        handleCorrect(result.feedback, idxToCheck);
      } else {
        handleWrong(result.feedback || "Kurang tepat, coba lagi.");
      }
    } catch (error) {
      console.error("Backend Error:", error);
      showToast("Gagal koneksi server", "error");
      setIsListening(false);
      setStatus('idle');
    }
  };

  const handleCorrect = (feedback, idxCorrect) => {
    playSound('correct');
    showToast(feedback || "Benar!", "success");
    setStatus('revealing');
    
    // Pastikan animasi reveal di ayat yang BENAR (idxCorrect)
    const currentWords = ayatList[idxCorrect].words;
    currentWords.forEach((_, wIdx) => {
      setTimeout(() => {
        setAyatList(prev => {
          const newList = [...prev];
          newList[idxCorrect].words[wIdx].isRevealed = true;
          return newList;
        });
      }, wIdx * 50);
    });

    // Pindah ke ayat selanjutnya
    setTimeout(() => {
      setAyatList(prev => {
        const newList = [...prev];
        newList[idxCorrect].isCompleted = true;
        return newList;
      });

      if (idxCorrect < ayatList.length - 1) {
        // Update Index
        const nextIndex = idxCorrect + 1;
        setCurrentAyatIndex(nextIndex);
        indexRef.current = nextIndex; // Update ref manual biar aman
        
        // Otomatis rekam ayat BARU (nextIndex)
        setTimeout(() => startRecording(), 1000); 
      } else {
        setIsListening(false);
        setStatus('finished');
        showToast("Halaman Selesai! Alhamdulillah.", "success");
      }
    }, currentWords.length * 50 + 1000);
  };

  const handleWrong = (msg) => {
    playSound('wrong');
    showToast(msg, "error");
    setIsListening(false);
    setStatus('idle');
  };

  const playSound = (type) => {
    const audioUrl = type === 'correct' 
      ? 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
      : 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3';
    new Audio(audioUrl).play().catch(() => {});
  };
  const showToast = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const handleNextPage = () => { if(currentPage < 604) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if(currentPage > 1) setCurrentPage(prev => prev - 1); };
  const progressPercent = ayatList.length > 0 ? ((currentAyatIndex) / ayatList.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-32 px-4 flex flex-col items-center">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-28 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={20}/> : <XCircle size={20}/>}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-3xl mb-8 flex items-end justify-between border-b border-white/10 pb-4">
        <div>
           <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
             <span className="bg-slate-800 px-2 py-1 rounded">Juz {pageInfo.juz}</span>
             <span>• Halaman {currentPage}</span>
           </div>
           <h1 className="font-serif text-3xl text-white">{isLoading ? "Memuat..." : pageInfo.surahName}</h1>
        </div>
        <div className="flex gap-2">
           <button onClick={handlePrevPage} disabled={currentPage===1} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white disabled:opacity-50 transition-colors"><ChevronLeft size={20}/></button>
           <button onClick={handleNextPage} disabled={currentPage===604} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white disabled:opacity-50 transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Card List */}
      <div className="w-full max-w-3xl space-y-6">
        {isLoading && <div className="text-center py-20 text-slate-500"><RefreshCw className="animate-spin w-8 h-8 mx-auto mb-2"/><p>Mengambil Data Quran...</p></div>}
        
        {!isLoading && ayatList.map((ayat, index) => {
           const isActive = index === currentAyatIndex;
           const isDone = index < currentAyatIndex;
           return (
             <div key={ayat.realVerseId} ref={isActive ? activeAyatRef : null} className={`transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-60'}`}>
               <Card className={`p-6 border-2 transition-colors duration-300 relative overflow-hidden ${isActive ? status === 'listening' ? 'border-emerald-500 bg-slate-800/80 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-slate-500 bg-slate-800' : 'border-transparent bg-slate-900'}`} hoverEffect={false}>
                 <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive || isDone ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{ayat.verseNo}</div>
                    {isActive && status === 'listening' && (
                       <div className="bg-slate-900/50 px-2 py-1 rounded border border-white/10">
                         <AudioVisualizer analyser={analyserRef.current} />
                       </div>
                    )}
                    {isActive && status === 'processing' && (
                       <div className="flex items-center gap-2 text-blue-400 text-xs font-bold animate-pulse"><RefreshCw className="animate-spin" size={12} /> Cek...</div>
                    )}
                 </div>
                 
                 {/* Ayat */}
                 <div className="text-right mb-6 leading-[2.5]" dir="rtl">
                    {ayat.words.map((word, wIdx) => {
                       const showWord = isDone || (isActive && word.isRevealed);
                       const showPeek = isActive && isPeeking;
                       return (
                         <span key={wIdx} className={`inline-block mx-1 text-3xl md:text-4xl font-serif font-medium transition-all duration-500 ${showWord ? 'text-white opacity-100 blur-0 translate-y-0' : showPeek ? 'text-white opacity-50 blur-0' : 'text-slate-600 opacity-20 blur-sm translate-y-1'}`}>
                           {word.text}
                         </span>
                       );
                    })}
                 </div>
                 
                 {/* Translation */}
                 <div className={`transition-all duration-500 overflow-hidden ${isDone || (isActive && status === 'revealing') ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-400 text-sm font-sans border-l-2 border-emerald-500 pl-3">{ayat.translation}</p>
                 </div>
               </Card>
             </div>
           );
        })}
      </div>

      {/* Footer Controls */}
      <div className="fixed bottom-6 left-0 w-full z-50 px-4">
        <div className="max-w-md mx-auto bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-full p-2 shadow-2xl flex items-center justify-between pl-6 pr-2">
          <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Progres</span>
             <span className="text-emerald-400 font-bold text-sm">{Math.round(progressPercent)}%</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => { setIsPeeking(true); setTimeout(() => setIsPeeking(false), 1000); }} disabled={!isListening && status !== 'idle'} className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-50">
               {isPeeking ? <EyeOff size={18}/> : <Eye size={18}/>}
             </button>
             <button onClick={() => isListening ? setIsListening(false) : startRecording()} disabled={isLoading} className={`h-14 px-6 rounded-full flex items-center gap-2 font-bold text-white transition-all duration-300 shadow-lg ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
               {isListening ? (
                 <> <Pause size={20} fill="currentColor"/> <span className="hidden sm:inline">Jeda</span> </>
               ) : (
                 <> <Mic size={20}/> <span>Mulai</span> </>
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MushafHafalan;