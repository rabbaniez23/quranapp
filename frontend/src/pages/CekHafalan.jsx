import { useState, useRef, useEffect } from 'react';
import { Mic, Square, RefreshCw, ChevronRight, Lock, CheckCircle, AlertCircle, Volume2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const CekHafalan = () => {
  // --- STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, success, error
  const [activeAyatIndex, setActiveAyatIndex] = useState(0); // Ayat mana yang sedang dites
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  // Dummy Data Surat (Nanti kita ambil dari API Quran asli)
  const surahData = {
    name: "Al-Fatihah",
    verses: [
      { id: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", trans: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang." },
      { id: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ", trans: "Segala puji bagi Allah, Tuhan seluruh alam," },
      { id: 3, text: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", trans: "Yang Maha Pengasih, Maha Penyayang," },
      { id: 4, text: "مَـٰلِكِ يَوْمِ ٱلدِّينِ", trans: "Pemilik hari pembalasan." },
      { id: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", trans: "Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami mohon pertolongan." },
      { id: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", trans: "Tunjukilah kami jalan yang lurus," },
      { id: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ", trans: "(yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat." },
    ]
  };

  // --- LOGIKA SIMULASI (Mockup) ---
  const handleToggleRecord = () => {
    if (!isRecording) {
      // Mulai Merekam
      setIsRecording(true);
      setStatus('listening');
      setFeedbackMsg('');
    } else {
      // Berhenti Merekam & Kirim ke AI
      setIsRecording(false);
      setStatus('processing');

      // Pura-pura loading kirim ke Gemini (2 detik)
      setTimeout(() => {
        // Simulasi Logika: Kita buat seolah-olah user selalu BENAR dulu biar kamu bisa lihat efeknya
        // Nanti di sini kita ganti dengan response asli dari Backend
        const isCorrect = true; 

        if (isCorrect) {
          setStatus('success');
          setFeedbackMsg('MasyaAllah, bacaanmu tepat!');
          // Tunggu sebentar lalu pindah ke ayat selanjutnya
          setTimeout(() => {
            if (activeAyatIndex < surahData.verses.length - 1) {
              setActiveAyatIndex(prev => prev + 1);
              setStatus('idle');
              setFeedbackMsg('');
            } else {
              setFeedbackMsg('Alhamdulillah! Satu surat selesai.');
            }
          }, 1500);
        } else {
          setStatus('error');
          setFeedbackMsg('Hmm, sepertinya ada kata yang tertukar. Coba lagi ya.');
        }
      }, 2000);
    }
  };

  // Auto scroll ke ayat yang aktif
  const activeRef = useRef(null);
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeAyatIndex]);

  return (
    <div className="pt-24 pb-32 px-4 max-w-3xl mx-auto min-h-screen flex flex-col">
      
      {/* Header */}
      <div className="text-center mb-8">
        <Badge text="Mode Hafalan" type="info" />
        <h1 className="font-serif text-4xl text-white mt-4">{surahData.name}</h1>
        <p className="text-slate-400">Bacalah ayat yang terkunci untuk membukanya.</p>
      </div>

      {/* Area Ayat (List) */}
      <div className="flex-grow space-y-6">
        {surahData.verses.map((verse, index) => {
          
          // Tentukan status ayat ini: SUDAH LEWAT (Opened), SEDANG DITES (Active), atau BELUM (Locked)
          const state = index < activeAyatIndex ? 'opened' : index === activeAyatIndex ? 'active' : 'locked';

          return (
            <div 
              key={verse.id}
              ref={state === 'active' ? activeRef : null}
              className={`relative transition-all duration-500 ${state === 'active' ? 'scale-105 my-8' : 'opacity-60 scale-95'}`}
            >
              <Card className={`p-6 border-2 ${
                state === 'active' 
                  ? status === 'listening' ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                  : status === 'error' ? 'border-red-500' 
                  : 'border-emerald-500'
                  : 'border-transparent'
              }`}>
                
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    state === 'opened' ? 'bg-emerald-500 text-white' : 
                    state === 'active' ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {state === 'opened' ? <CheckCircle size={16}/> : verse.id}
                  </div>
                  
                  {/* Status Indicator */}
                  {state === 'active' && (
                     <div className="flex items-center gap-2">
                        {status === 'listening' && <span className="text-xs text-emerald-400 animate-pulse">Mendengarkan...</span>}
                        {status === 'processing' && <span className="text-xs text-blue-400">Menganalisis...</span>}
                        {status === 'error' && <span className="text-xs text-red-400">Kurang Tepat</span>}
                     </div>
                  )}
                </div>

                {/* TEKS ARAB UTAMA (Logic Magic Reveal) */}
                <div className="text-right mb-4 min-h-[60px] relative">
                  {state === 'locked' ? (
                    // Tampilan Terkunci (Blur Total)
                    <div className="flex items-center justify-end gap-2 text-slate-600 select-none">
                      <Lock size={20} />
                      <span className="font-serif text-2xl blur-sm opacity-50">Ayat Terkunci</span>
                    </div>
                  ) : state === 'active' && status !== 'success' ? (
                    // Tampilan Sedang Dites (Blur Parsial / Hint)
                    <div className="relative">
                       <h2 className="font-serif text-3xl md:text-4xl leading-loose text-transparent bg-clip-text bg-gradient-to-l from-slate-500 to-slate-700 select-none blur-sm transition-all">
                         {verse.text}
                       </h2>
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-emerald-400/50 text-sm font-sans tracking-widest uppercase border border-emerald-500/30 px-3 py-1 rounded-full">
                            Silakan Baca Ayat Ini
                          </p>
                       </div>
                    </div>
                  ) : (
                    // Tampilan Terbuka (Jelas) - Untuk yang 'opened' atau 'active + success'
                    <h2 className="font-serif text-3xl md:text-4xl leading-loose text-white animate-in fade-in zoom-in duration-500">
                      {verse.text}
                    </h2>
                  )}
                </div>

                {/* Terjemahan (Hanya muncul kalau sudah terbuka) */}
                {(state === 'opened' || (state === 'active' && status === 'success')) && (
                  <p className="text-slate-400 text-sm border-t border-white/5 pt-4 animate-in slide-in-from-top-2">
                    {verse.trans}
                  </p>
                )}

              </Card>
            </div>
          );
        })}
      </div>

      {/* --- FOOTER KONTROL (Fixed di Bawah) --- */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-lg border-t border-white/10 p-6 z-40">
        <div className="max-w-md mx-auto flex flex-col items-center gap-4">
          
          {/* Feedback Message */}
          {feedbackMsg && (
            <div className={`px-4 py-2 rounded-full text-sm font-medium animate-bounce ${
              status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {feedbackMsg}
            </div>
          )}

          {/* Tombol Utama */}
          <button 
            onClick={handleToggleRecord}
            disabled={status === 'processing' || status === 'success'}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl relative
              ${isRecording 
                ? 'bg-red-500 scale-110 ring-4 ring-red-500/30' 
                : status === 'processing'
                  ? 'bg-slate-700 cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-105 ring-4 ring-emerald-500/30'
              }
            `}
          >
             {status === 'processing' ? (
               <RefreshCw className="w-8 h-8 text-white animate-spin" />
             ) : isRecording ? (
               <Square className="w-8 h-8 text-white fill-current" />
             ) : (
               <Mic className="w-8 h-8 text-white" />
             )}
          </button>
          
          <p className="text-slate-400 text-xs">
            {isRecording ? "Ketuk untuk kirim" : "Ketuk mikrofon untuk mulai baca"}
          </p>
        </div>
      </div>

    </div>
  );
};

export default CekHafalan;