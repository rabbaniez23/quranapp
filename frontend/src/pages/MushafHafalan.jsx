import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mic, Pause, RefreshCw, RotateCcw, ChevronLeft, ChevronRight, Eye, BookOpen, Search, Check, XCircle, Sparkles, Info } from 'lucide-react';
import { getAyatByPage, getSurahName, getAllSurahsMushaf, getPageByVerse } from '../services/quranApi';
import { checkAiHealth, connectHafalan } from '../services/tajwidApi';
import { simpanMurojaah } from '../services/murojaahApi';
import { useAuth } from '../context/AuthContext';
import { splitAyatWords, alignRecitation } from '../utils/hafalanMatcher';
import { createMicStream } from '../utils/audioRecorder';
import Card from '../components/ui/Card';

// --- HELPER: PEMBERSIH TERJEMAHAN ---
const cleanTranslation = (text) => {
  if (!text) return "";
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/g, '') // Hapus footnote angka (<sup>1</sup>)
    .replace(/<[^>]+>/g, '')             // Hapus tag HTML lainnya
    .replace(/[0-9]+/g, '')              // Hapus sisa angka jika ada
    .trim();
};

// Status yang dihitung sebagai kesalahan saat murojaah
const MISTAKES = ['wrong', 'skipped', 'corrected'];

// Kata tersembunyi. HP: balok abu-abu (teks transparan), karena efek blur di tiap kata sangat berat
// untuk GPU HP. Laptop (lg): tetap buram seperti biasa.
const HIDDEN_BASE = 'select-none text-transparent lg:text-slate-500 lg:opacity-40 lg:blur-[4px]';
const HIDDEN_STYLE = `${HIDDEN_BASE} bg-slate-700/60 lg:bg-transparent`;

// Tampilan kata sesuai statusnya. Kata yang salah TETAP tersembunyi (hanya ditandai posisinya),
// baru terbuka setelah dibaca benar.
const WORD_STYLE = {
  given: 'text-white',
  correct: 'text-white',
  corrected: 'text-amber-300',
  wrong: `${HIDDEN_BASE} bg-red-500/25 ring-2 ring-red-500/70`,
  skipped: `${HIDDEN_BASE} bg-red-500/25 ring-2 ring-red-500/70`,
};

// Kata yang terbuka tapi ada catatan kecil (tidak wajib diulang)
const MINOR_STYLE = 'text-white underline decoration-dotted decoration-amber-300/80 underline-offset-8';

const AI_NOTICE_KEY = 'quranapp-ai-notice-v1';

const readAiNotice = () => {
  try { return localStorage.getItem(AI_NOTICE_KEY) === 'ok'; } catch { return false; }
};

// Bunyi "teet" saat ada kata salah (dibuat langsung di browser, tanpa file suara)
const playErrorSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 170;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.onended = () => ctx.close();
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* browser tidak mendukung, tanpa suara */ }
};

// --- PEMBERITAHUAN AI (wajib sebelum pemakaian pertama, sesuai lisensi model Quran Muaalem) ---
const AiNotice = ({ recording, onAccept, onCancel }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
    <div className="max-w-md w-full bg-slate-800 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/15 text-violet-300"><Sparkles size={20} /></div>
        <h2 className="text-lg font-bold text-white">Pengecekan memakai AI</h2>
      </div>
      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
        <p>Bacaanmu didengar oleh AI <span className="text-white font-semibold">Quran Muaalem</span> (model open-source) yang memeriksa huruf kata demi kata. Kesalahan kecil hanya dicatat; yang harus diulang hanya kata yang terlewat atau dibaca lain. Panjang mad dan makhraj tidak dicek.</p>
        <p>AI bisa keliru. Hasilnya untuk membantu murojaah, <span className="text-white font-semibold">bukan pengganti guru</span>. Tetap setorkan bacaanmu ke ustadz/ustadzah.</p>
        {recording
          ? <p className="text-amber-300">Saat ini rekaman suaramu <span className="font-semibold">disimpan</span> di komputer server untuk memperbaiki penilaian aplikasi ini.</p>
          : <p className="text-slate-400">Suaramu hanya dikirim ke server AI untuk diperiksa saat itu juga, tidak disimpan.</p>}
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 text-sm">Batal</button>
        <button onClick={onAccept} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">Saya mengerti, mulai</button>
      </div>
    </div>
  </div>
);

// --- TOAST ---
const BeautifulToast = ({ message, type }) => {
  if (!message) return null;
  const styles = {
    success: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400",
    error: "bg-red-500/10 border-red-500/50 text-red-400",
    info: "bg-blue-500/10 border-blue-500/50 text-blue-400"
  };
  return (
    <div className="fixed top-24 left-1/2 lg:left-[calc(50%+8rem)] transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
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
  const { token } = useAuth();
  // Bisa dibuka langsung ke posisi tertentu, mis. dari tombol "Lanjutkan" di dashboard:
  // /cek-hafalan?halaman=3&surat=2&ayat=6
  const [searchParams] = useSearchParams();
  const awalHalaman = Math.min(604, Math.max(1, Number(searchParams.get('halaman')) || 1));
  const awalSurat = Number(searchParams.get('surat')) || 1;

  // State Data
  const [surahList, setSurahList] = useState([]);
  const [selectedSurahId, setSelectedSurahId] = useState(awalSurat);
  const [targetAyatNum, setTargetAyatNum] = useState("");
  const [currentPage, setCurrentPage] = useState(awalHalaman);
  const [ayatList, setAyatList] = useState([]);
  const [pageInfo, setPageInfo] = useState({ surahName: 'Loading...', juz: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Hafalan State (per kata di halaman ini, urut dari kata pertama sampai terakhir)
  const [wordStatus, setWordStatus] = useState([]);
  const [heardWords, setHeardWords] = useState([]);
  const [notesByPos, setNotesByPos] = useState({}); // pos -> catatan apa yang tadi salah (dari AI)
  const [minorByPos, setMinorByPos] = useState({}); // pos -> catatan kecil (kata tetap terbuka, tidak wajib diulang)
  const [aiRecording, setAiRecording] = useState(false); // server sedang menyimpan rekaman untuk analisis
  const [cursor, setCursor] = useState(0); // posisi kata yang sedang ditunggu
  const [isListening, setIsListening] = useState(false);
  const [usingAi, setUsingAi] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showAiNotice, setShowAiNotice] = useState(false);
  const [panelHp, setPanelHp] = useState(null); // HP: panel 'cari' / 'warna' yang sedang dibuka

  // Refs (dipakai di dalam event mikrofon supaya selalu dapat data terbaru)
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const ayatListRef = useRef([]);
  const expectedRef = useRef([]);            // semua kata di halaman: { skeleton, wordIdx, ayatIdx }
  const initialRef = useRef({ status: [], heard: [], pos: 0 });
  const committedRef = useRef({ status: [], heard: [] }); // hasil sesi mic sebelumnya (mode Google)
  const sessionStartRef = useRef(0);
  const latestRef = useRef({ status: [], heard: [], pos: 0 });
  const completedAyatRef = useRef(new Set());
  const activeAyatRef = useRef(null);
  const pendingJumpRef = useRef(searchParams.get('surat') ? searchParams.get('ayat') : null);
  const notifTimerRef = useRef(null);
  const tokenRef = useRef(token);
  const pageRef = useRef(awalHalaman);       // halaman yang sedang tampil (untuk riwayat)
  const surahListRef = useRef([]);
  const savedFromRef = useRef(0);            // kata pertama yang belum disimpan ke riwayat
  tokenRef.current = token;
  const aiOnlineRef = useRef(false);
  const aiConnRef = useRef(null);            // koneksi WebSocket ke server AI
  const micStreamRef = useRef(null);
  const buzzedRef = useRef(new Set());       // kata yang sudah dibunyikan "teet" (mode Google)
  const notesRef = useRef({});               // salinan notesByPos/minorByPos untuk riwayat (state bisa belum ter-render)
  const minorRef = useRef({});
  const micSinceRef = useRef(null);          // kapan mic terakhir dinyalakan (untuk lama murojaah)
  const durasiRef = useRef(0);               // detik mic menyala yang belum disimpan

  const triggerNotif = (msg, type) => {
    clearTimeout(notifTimerRef.current);
    setNotification({ msg, type });
    notifTimerRef.current = setTimeout(() => setNotification(null), 2000);
  };

  // --- 1. TERAPKAN HASIL PENCOCOKAN ---
  const applyResult = (result) => {
    // Ada kata yang baru saja salah/terlewat → bunyi "teet" (sekali per kata)
    const newMistake = result.status.findIndex((s, i) =>
      (s === 'wrong' || s === 'skipped') && !buzzedRef.current.has(i)
    );
    if (newMistake !== -1) {
      result.status.forEach((s, i) => { if (s === 'wrong' || s === 'skipped') buzzedRef.current.add(i); });
      playErrorSound();
    }

    latestRef.current = result;
    setWordStatus(result.status);
    setHeardWords(result.heard);
    setCursor(result.pos);

    const expected = expectedRef.current;
    const newlyDone = ayatListRef.current.filter((ayat, idx) =>
      result.pos > ayat.endPos && !completedAyatRef.current.has(idx)
    );
    if (!newlyDone.length) return;
    ayatListRef.current.forEach((ayat, idx) => {
      if (result.pos > ayat.endPos) completedAyatRef.current.add(idx);
    });

    if (result.pos >= expected.length) {
      handlePageCompleted(result);
    } else {
      // Bunyi Ting (Ayat Selesai)
      new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(()=>{});
    }
  };

  // --- RIWAYAT: simpan kata yang sudah dibaca sejak penyimpanan terakhir ---
  const saveProgress = (selesai) => {
    const expected = expectedRef.current;
    const latest = latestRef.current;
    const from = savedFromRef.current;
    const upto = Math.min(latest.pos, expected.length);
    if (!tokenRef.current || upto <= from) return;
    const status = latest.status.slice(from, upto);
    const benar = status.filter(s => s === 'correct' || s === 'corrected').length;
    if (!benar) return;
    savedFromRef.current = upto;

    // Lama mic menyala sejak penyimpanan terakhir
    const now = Date.now();
    if (micSinceRef.current) { durasiRef.current += (now - micSinceRef.current) / 1000; micSinceRef.current = now; }
    const durasi = Math.round(durasiRef.current);
    durasiRef.current = 0;

    const ayats = ayatListRef.current;
    // Kata yang sempat salah (wajib diulang) + kata dengan catatan kecil, untuk analisis "sering salah"
    const kesalahan = [];
    for (let p = from; p < upto; p++) {
      const s = latest.status[p];
      const minor = minorRef.current[p];
      if (!MISTAKES.includes(s) && !(s === 'correct' && minor?.length)) continue;
      const { wordIdx, ayatIdx } = expected[p];
      const ayat = ayats[ayatIdx];
      const salah = MISTAKES.includes(s);
      const pesan = salah
        ? notesRef.current[p]?.join(' · ') || (latest.heard[p] ? `Terdengar: ${latest.heard[p]}` : 'Terlewat')
        : minor.join(' · ');
      kesalahan.push({
        surat: ayat.surahId, ayat: Number(ayat.verseNo), kata_index: wordIdx,
        kata: (ayat.words[wordIdx]?.text || '').slice(0, 80), jenis: salah ? 'salah' : 'catatan', pesan: pesan.slice(0, 500),
      });
    }

    const awal = ayats[expected[from].ayatIdx];
    // Kalau halaman berisi lebih dari satu surat, catat sampai ayat terakhir surat yang sama
    const sampai = ayats.filter((a, i) => a.surahId === awal.surahId && i <= expected[upto - 1].ayatIdx);
    const surat = surahListRef.current.find(s => s.id === awal.surahId);
    simpanMurojaah(tokenRef.current, {
      surat: awal.surahId,
      nama_surat: surat?.name_simple || `Surat ${awal.surahId}`,
      halaman: pageRef.current,
      ayat_awal: Number(awal.verseNo),
      ayat_akhir: Number(sampai[sampai.length - 1].verseNo),
      kata_benar: benar,
      kata_salah: status.filter(s => MISTAKES.includes(s)).length,
      durasi_detik: durasi,
      kesalahan,
      selesai,
    }).catch(err => console.warn("Riwayat murojaah gagal disimpan:", err));
  };
  const saveProgressRef = useRef(saveProgress);
  saveProgressRef.current = saveProgress;

  const handlePageCompleted = (result) => {
    saveProgress(true);
    stopMicrophone();
    new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3').play().catch(()=>{});

    const mistakes = result.status.filter(s => MISTAKES.includes(s)).length;
    triggerNotif(
      mistakes ? `Halaman selesai, ada ${mistakes} kata yang perlu diulang.` : "Alhamdulillah! Halaman selesai tanpa salah.",
      mistakes ? "info" : "success"
    );

    // Auto Next Page hanya kalau lancar, supaya kesalahannya sempat dilihat
    if (!mistakes) {
      setTimeout(() => {
        setCurrentPage(prev => {
          if (prev >= 604) return prev;
          triggerNotif("Membuka halaman selanjutnya...", "info");
          return prev + 1;
        });
      }, 2000);
    }
  };

  // --- 2. MODE AI PENUH (server mendengar huruf + harakat, kata demi kata) ---
  const findPos = (surat, ayatNo, kata) => {
    const ayat = ayatListRef.current.find(a => a.surahId === surat && Number(a.verseNo) === ayatNo);
    if (!ayat || kata > ayat.endPos - ayat.startPos) return null;
    return ayat.startPos + kata;
  };

  const handleAiEvent = (event) => {
    if (event.type === 'error') {
      console.warn("Server AI:", event.pesan);
      if (isListeningRef.current) fallbackToGoogle();
      return;
    }
    if (event.type !== 'kata' && event.type !== 'salah') return;
    const pos = findPos(event.surat, event.ayat, event.kata);
    if (pos === null) return; // sudah lewat halaman ini

    const latest = latestRef.current;
    const status = [...latest.status];
    if (event.type === 'kata') {
      status[pos] = event.status === 'dibenarkan' ? 'corrected' : 'correct';
      // Kesalahan kecil: kata tetap terbuka, catatannya ditampilkan setelah ayat selesai
      if (event.catatan?.length) {
        minorRef.current = { ...minorRef.current, [pos]: event.catatan };
        setMinorByPos(minorRef.current);
      }
      applyResult({ ...latest, status, pos: Math.max(latest.pos, pos + 1) });
      return;
    }
    // Salah: bunyi "teet", kata tetap tersembunyi, tunggu diulang
    status[pos] = 'wrong';
    notesRef.current = { ...notesRef.current, [pos]: [...new Set([...(notesRef.current[pos] || []), ...event.pesan])] };
    setNotesByPos(notesRef.current);
    buzzedRef.current.add(pos);
    playErrorSound();
    applyResult({ ...latest, status });
  };

  const startAi = async () => {
    const pos = latestRef.current.pos;
    const ayat = ayatListRef.current[expectedRef.current[pos].ayatIdx];
    const conn = await connectHafalan(tokenRef.current, handleAiEvent, () => {
      if (!isListeningRef.current || aiConnRef.current !== conn) return;
      fallbackToGoogle();
    });
    try {
      conn.start(ayat.surahId, Number(ayat.verseNo), pos - ayat.startPos);
      aiConnRef.current = conn;
      micStreamRef.current = await createMicStream(chunk => conn.sendAudio(chunk));
    } catch (e) {
      conn.close();
      aiConnRef.current = null;
      throw e;
    }
    isListeningRef.current = true;
    micSinceRef.current = Date.now();
    setIsListening(true);
    setUsingAi(true);
  };

  // Server AI putus di tengah murojaah → lanjut diam-diam dengan Google dari kata yang sama, tanpa pemberitahuan
  const fallbackToGoogle = () => {
    const conn = aiConnRef.current;
    aiConnRef.current = null;
    aiOnlineRef.current = false; // dicek lagi tiap 15 detik; sesi berikutnya kembali ke AI kalau sudah menyala
    if (micStreamRef.current) { micStreamRef.current.stop(); micStreamRef.current = null; }
    if (conn) conn.close();
    startGoogle();
  };

  // --- 3. MODE CADANGAN: GOOGLE SPEECH (dipakai kalau server AI mati; tanpa cek harakat) ---
  // Hasil sesi mic disimpan sebelum mic restart, supaya sesi berikutnya lanjut dari situ
  const commitSession = () => {
    committedRef.current = { status: latestRef.current.status, heard: latestRef.current.heard };
    sessionStartRef.current = latestRef.current.pos;
  };

  const startGoogle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser tidak support. Gunakan Chrome.");

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch { /* mic sudah mati */ }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-SA';

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Ambil SEMUA hasil sesi ini, lalu cocokkan ulang dari awal sesi.
      // Chrome Android sering mengirim hasil baru yang MENGULANG hasil sebelumnya ("bismi", "bismi allah", ...):
      // hasil seperti itu menggantikan yang lama, bukan ditambahkan, supaya kata tidak dobel.
      const potongan = [];
      for (let i = 0; i < event.results.length; i++) {
        const teks = event.results[i][0].transcript.trim();
        if (!teks) continue;
        const akhir = potongan[potongan.length - 1];
        if (akhir && teks.startsWith(akhir.teks)) potongan[potongan.length - 1] = { teks, final: event.results[i].isFinal };
        else potongan.push({ teks, final: event.results[i].isFinal });
      }
      const final = potongan.filter(p => p.final).map(p => p.teks).join(' ');
      const interim = potongan.filter(p => !p.final).map(p => p.teks).join(' ');
      if (!(final + interim).trim()) return;
      if (!isListeningRef.current) return;
      applyResult(alignRecitation(expectedRef.current, committedRef.current, sessionStartRef.current, final, interim,
        { strict: true, longgar: true }));
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn("Speech error:", event.error);
      }
      if (event.error === 'not-allowed') {
        isListeningRef.current = false;
        micSinceRef.current = null;
        setIsListening(false);
        triggerNotif("Izinkan mikrofon!", "error");
      }
    };

    // Chrome otomatis mematikan mic setelah hening sebentar, jadi dinyalakan lagi
    recognition.onend = () => {
      commitSession();
      if (isListeningRef.current) {
        setTimeout(() => {
          try { recognition.start(); }
          catch { isListeningRef.current = false; setIsListening(false); }
        }, 250);
      } else {
        setIsListening(false);
      }
    };

    try {
      commitSession();
      recognition.start();
      recognitionRef.current = recognition;
      isListeningRef.current = true;
      micSinceRef.current = Date.now();
      setUsingAi(false);
    } catch (e) {
      console.error("Gagal start awal:", e);
      setIsListening(false);
    }
  };

  // --- 4. MIC CONTROLLER ---
  const stopMicrophone = () => {
    isListeningRef.current = false;
    setIsListening(false);
    commitSession();
    if (micSinceRef.current) { durasiRef.current += (Date.now() - micSinceRef.current) / 1000; micSinceRef.current = null; }
    saveProgress(false);
    if (micStreamRef.current) { micStreamRef.current.stop(); micStreamRef.current = null; }
    if (aiConnRef.current) { aiConnRef.current.close(); aiConnRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); }
      catch (e) { console.log("Mic stop error (ignored):", e); }
    }
  };

  const startMicrophone = async () => {
    if (latestRef.current.pos >= expectedRef.current.length) {
      return triggerNotif("Halaman sudah selesai. Tekan Ulangi untuk murojaah lagi.", "info");
    }
    if (aiOnlineRef.current) {
      try {
        await startAi();
        return;
      } catch (e) {
        console.warn("Mode AI gagal, pakai Google:", e);
      }
    }
    startGoogle(); // server AI mati → Google, tanpa pemberitahuan ke pengguna
  };

  const toggleListening = () => {
    if (isListening) stopMicrophone();
    else if (aiOnlineRef.current && !readAiNotice()) setShowAiNotice(true);
    else startMicrophone();
  };

  const acceptAiNotice = () => {
    try { localStorage.setItem(AI_NOTICE_KEY, 'ok'); } catch { /* tetap lanjut */ }
    setShowAiNotice(false);
    startMicrophone();
  };

  // HP: layar jangan mati sendiri selama murojaah (dilepas lagi saat berhenti)
  useEffect(() => {
    if (!isListening || !('wakeLock' in navigator)) return;
    let kunci = null;
    let aktif = true;
    const minta = async () => {
      try {
        const baru = await navigator.wakeLock.request('screen');
        if (aktif) kunci = baru;
        else baru.release();
      } catch { /* ditolak (mis. baterai hemat): layar mengikuti pengaturan HP */ }
    };
    // Kunci otomatis lepas kalau tab ditinggal; minta lagi saat kembali
    const saatKembali = () => { if (document.visibilityState === 'visible') minta(); };
    minta();
    document.addEventListener('visibilitychange', saatKembali);
    return () => {
      aktif = false;
      document.removeEventListener('visibilitychange', saatKembali);
      kunci?.release().catch(() => {});
    };
  }, [isListening]);

  // Cek apakah server AI menyala (diulang tiap 15 detik, supaya bisa dinyalakan belakangan)
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { online, recording } = await checkAiHealth();
      if (!alive) return;
      aiOnlineRef.current = online;
      setAiRecording(online && recording);
    };
    check();
    const timer = setInterval(check, 15000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    return () => {
      saveProgressRef.current(false); // pindah ke menu lain: simpan yang sudah dibaca
      isListeningRef.current = false;
      clearTimeout(notifTimerRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch { /* mic sudah mati */ }
      if (micStreamRef.current) micStreamRef.current.stop();
      if (aiConnRef.current) aiConnRef.current.close();
    };
  }, []);

  // --- 5. ULANGI HALAMAN (MUROJAAH LAGI) ---
  const resetProgress = (initial) => {
    initialRef.current = initial;
    savedFromRef.current = initial.pos;
    committedRef.current = { status: initial.status, heard: initial.heard };
    sessionStartRef.current = initial.pos;
    latestRef.current = initial;
    completedAyatRef.current = new Set(
      ayatListRef.current.map((ayat, idx) => (initial.pos > ayat.endPos ? idx : -1)).filter(idx => idx >= 0)
    );
    buzzedRef.current = new Set();
    setWordStatus(initial.status);
    setHeardWords(initial.heard);
    notesRef.current = {};
    minorRef.current = {};
    durasiRef.current = 0;
    setNotesByPos({});
    setMinorByPos({});
    setCursor(initial.pos);
  };

  const handleRestart = () => {
    stopMicrophone();
    resetProgress(initialRef.current);
    triggerNotif("Mulai ulang dari awal.", "info");
  };

  // --- DATA & NAVIGASI ---
  useEffect(() => {
    const fetchSurahs = async () => {
      const list = await getAllSurahsMushaf();
      surahListRef.current = list;
      setSurahList(list);
    };
    fetchSurahs();
  }, []);

  useEffect(() => { loadPageData(currentPage); }, [currentPage]);

  const loadPageData = async (page) => {
    try {
      setIsLoading(true);
      stopMicrophone();

      const data = await getAyatByPage(page);
      if (data) {
        const chapterId = data.meta.chapter_id;
        const surahData = await getSurahName(chapterId);
        setPageInfo({ surahName: surahData.name_simple, juz: data.meta.juz_number });

        // Susun ayat + daftar kata satu halaman
        let pos = 0;
        const expected = [];
        const formattedAyats = data.verses.map((verse, ayatIdx) => {
          const words = splitAyatWords(verse.text_uthmani);
          const startPos = pos;
          words.forEach((w, wordIdx) => expected.push({ skeleton: w.skeleton, wordIdx, ayatIdx }));
          pos += words.length;
          return {
            realVerseId: verse.verse_key,
            surahId: parseInt(verse.verse_key.split(':')[0]), // Ambil ID Surat
            verseNo: verse.verse_key.split(':')[1],
            translation: cleanTranslation(verse.translations[0]?.text), // TERJEMAHAN BERSIH
            words,
            startPos,
            endPos: pos - 1,
          };
        });

        // --- START POSITIONING ---
        let startIdx = 0;
        if (pendingJumpRef.current) {
          // Kasus 1: Jump ke Ayat tertentu (Fitur Search / tombol Lanjutkan). Utamakan surat yang dipilih.
          const sameSurah = formattedAyats.findIndex(v => v.verseNo == pendingJumpRef.current && v.surahId === selectedSurahId);
          const targetIdx = sameSurah !== -1 ? sameSurah : formattedAyats.findIndex(v => v.verseNo == pendingJumpRef.current);
          if (targetIdx !== -1) startIdx = targetIdx;
          pendingJumpRef.current = null;
        } else {
          // Kasus 2: Ganti Surat (Dropdown). Kalau suratnya tidak ada di halaman ini, mulai dari 0.
          const surahStartIndex = formattedAyats.findIndex(v => v.surahId === selectedSurahId);
          if (surahStartIndex !== -1) startIdx = surahStartIndex;
        }

        // Ayat SEBELUM startIdx langsung dibuka
        const startPos = formattedAyats[startIdx].startPos;
        const status = Array.from({ length: expected.length }, (_, i) => (i < startPos ? 'given' : undefined));

        expectedRef.current = expected;
        ayatListRef.current = formattedAyats;
        pageRef.current = page;
        setAyatList(formattedAyats);
        resetProgress({ status, heard: [], pos: startPos });
      }
    } catch (error) {
      console.error("Gagal memuat ayat:", error);
      triggerNotif("Gagal memuat data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

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
      if (page === currentPage) loadPageData(page);
      else setCurrentPage(page);
    } else {
      triggerNotif("Ayat tidak ditemukan.", "error");
    }
  };

  const handleNextPage = () => { if(currentPage < 604) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if(currentPage > 1) setCurrentPage(prev => prev - 1); };

  const totalWords = expectedRef.current.length;
  const currentAyatIndex = cursor < totalWords ? expectedRef.current[cursor].ayatIdx : ayatList.length;
  const progressPercent = totalWords > 0 ? (cursor / totalWords) * 100 : 0;
  const mistakeCount = wordStatus.filter(s => MISTAKES.includes(s)).length;

  // Catatan apa yang tadi salah, untuk kata yang sudah dibenarkan
  const noteFor = (pos) => notesByPos[pos]?.join(' · ') || (heardWords[pos] ? `Tadi terdengar: ${heardWords[pos]}` : 'Tadi sempat salah');

  useEffect(() => {
    if (activeAyatRef.current) activeAyatRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentAyatIndex, isLoading]);

  return (
    <div className="pb-32 flex flex-col items-center">

      <BeautifulToast message={notification?.msg} type={notification?.type} />
      {showAiNotice && <AiNotice recording={aiRecording} onAccept={acceptAiNotice} onCancel={() => setShowAiNotice(false)} />}

      {/* HEADER HP: 2 baris ringkas. Cari ayat & keterangan warna dibuka lewat tombol */}
      <div className="lg:hidden w-full mb-4 bg-slate-800/60 p-3 rounded-2xl border border-white/5 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevPage} disabled={currentPage===1} aria-label="Halaman sebelumnya" className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-700 rounded-xl text-white disabled:opacity-40"><ChevronLeft size={20}/></button>
          <select value={selectedSurahId} onChange={handleSurahChange} aria-label="Pilih surat" className="flex-1 min-w-0 h-11 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3">
            {surahList.length === 0 && <option>Memuat...</option>}
            {surahList.map(s => <option key={s.id} value={s.id}>{s.id}. {s.name_simple}</option>)}
          </select>
          <button onClick={handleNextPage} disabled={currentPage===604} aria-label="Halaman berikutnya" className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-700 rounded-xl text-white disabled:opacity-40"><ChevronRight size={20}/></button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400 truncate">{pageInfo.surahName} · Juz {pageInfo.juz} · Hlm {currentPage}</span>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setPanelHp(p => p === 'cari' ? null : 'cari')} aria-label="Cari ayat" aria-expanded={panelHp === 'cari'} className={`w-10 h-10 flex items-center justify-center rounded-xl ${panelHp === 'cari' ? 'bg-emerald-600 text-white' : 'bg-slate-700/70 text-slate-300'}`}><Search size={18}/></button>
            <button onClick={() => setPanelHp(p => p === 'warna' ? null : 'warna')} aria-label="Keterangan warna" aria-expanded={panelHp === 'warna'} className={`w-10 h-10 flex items-center justify-center rounded-xl ${panelHp === 'warna' ? 'bg-emerald-600 text-white' : 'bg-slate-700/70 text-slate-300'}`}><Info size={18}/></button>
          </div>
        </div>
        {panelHp === 'cari' && (
          <form onSubmit={(e) => { handleJumpToAyat(e); setPanelHp(null); }} className="flex gap-2 pt-1">
            <input type="number" inputMode="numeric" placeholder="Nomor ayat" aria-label="Nomor ayat" value={targetAyatNum} onChange={(e) => setTargetAyatNum(e.target.value)} className="flex-1 min-w-0 h-11 bg-slate-900 border border-slate-700 text-white rounded-xl px-3" autoFocus />
            <button type="submit" className="h-11 px-4 bg-emerald-600 text-white rounded-xl font-semibold text-sm">Cari</button>
          </form>
        )}
        {panelHp === 'warna' && (
          <div className="grid gap-2 pt-1 text-xs text-slate-300">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-white"></span> Benar</span>
            <span className="flex items-center gap-2"><span className="w-4 border-b-2 border-dotted border-amber-300"></span> Ada catatan kecil (tidak wajib diulang)</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-300"></span> Sempat salah, lalu dibenarkan</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded ring-2 ring-red-500/70 bg-red-500/25"></span> Terlewat / dibaca lain, ulangi dari sini</span>
          </div>
        )}
      </div>

      {/* HEADER LAPTOP */}
      <div className="hidden lg:block w-full max-w-4xl mb-6 bg-slate-800/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md shadow-lg">
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
             <span className="text-xs text-slate-400 whitespace-nowrap">{pageInfo.surahName} · Juz {pageInfo.juz} · Hlm {currentPage}</span>
             <div className="flex gap-1">
                <button onClick={handlePrevPage} disabled={currentPage===1} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50"><ChevronLeft size={18}/></button>
                <button onClick={handleNextPage} disabled={currentPage===604} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white disabled:opacity-50"><ChevronRight size={18}/></button>
             </div>
          </div>
        </div>

        {/* KETERANGAN WARNA */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-3 border-t border-white/5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white"></span> Benar</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-b-2 border-dotted border-amber-300"></span> Ada catatan kecil (tidak wajib diulang)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-300"></span> Sempat salah, lalu dibenarkan</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded ring-2 ring-red-500/70 bg-red-500/25"></span> Terlewat / dibaca lain, ulangi dari sini</span>
        </div>
      </div>

      {/* LIVE TRANSCRIPT */}
      <div className={`w-full max-w-3xl mb-4 text-center transition-all duration-300 ${isListening ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
         <div className="inline-block bg-slate-800/80 px-6 py-2 rounded-full border border-emerald-500/30 shadow-lg">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full lg:animate-ping"></span> Mendengarkan
            </p>
            {usingAi && aiRecording && <p className="text-amber-300/80 text-[10px] mt-0.5">Rekaman disimpan untuk perbaikan aplikasi</p>}
         </div>
      </div>

      {/* CARD LIST */}
      <div className="w-full max-w-3xl space-y-6">
        {isLoading && <div className="text-center py-20 text-slate-500"><RefreshCw className="animate-spin w-8 h-8 mx-auto mb-2"/><p>Mengambil Data...</p></div>}

        {!isLoading && ayatList.map((ayat, index) => {
           const isActive = index === currentAyatIndex;
           const isDone = index < currentAyatIndex;
           const ayatMistakes = wordStatus.slice(ayat.startPos, ayat.endPos + 1).filter(s => MISTAKES.includes(s)).length;
           const ayatPositions = ayat.words.map((_, wIdx) => ayat.startPos + wIdx);
           const correctedWords = ayatPositions.filter(pos => wordStatus[pos] === 'corrected');
           const minorWords = ayatPositions.filter(pos => wordStatus[pos] === 'correct' && minorByPos[pos]);
           return (
             <div key={ayat.realVerseId} ref={isActive ? activeAyatRef : null} className={`cv-auto lg:transition-all lg:duration-500 ${isActive ? 'opacity-100' : 'opacity-60 lg:scale-95'}`}>
               <Card className={`!p-4 sm:!p-6 border-2 relative overflow-hidden ${isActive ? isListening ? 'border-emerald-500 bg-slate-800/80 lg:shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-slate-500 bg-slate-800' : 'border-transparent bg-slate-900'}`} hoverEffect={false}>
                 <div className="flex justify-between items-start mb-4 sm:mb-6 border-b border-white/5 pb-3 sm:pb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isActive || isDone ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{ayat.verseNo}</div>
                    <div className="flex items-center gap-3">
                      {ayatMistakes > 0 && <span className="text-xs text-red-400 font-semibold">{ayatMistakes} salah</span>}
                      {isActive && isListening && <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold lg:animate-pulse"><Mic size={12} /> Live...</div>}
                    </div>
                 </div>

                 <div className="text-right mb-4 sm:mb-6 leading-[2.3] sm:leading-[2.5]" dir="rtl">
                    {ayat.words.map((word, wIdx) => {
                       const pos = ayat.startPos + wIdx;
                       const status = wordStatus[pos];
                       const isCurrent = pos === cursor && isListening;
                       const showPeek = isActive && isPeeking;
                       const hasMinor = status === 'correct' && minorByPos[pos];
                       const style = showPeek && !['given', 'correct', 'corrected'].includes(status)
                         ? 'text-white opacity-50'
                         : hasMinor ? MINOR_STYLE : WORD_STYLE[status] || HIDDEN_STYLE; // BURAM
                       return (
                         <span key={wIdx}
                           title={status === 'corrected' ? noteFor(pos) : hasMinor ? minorByPos[pos].join(' · ') : undefined}
                           className={`inline-block mx-0.5 sm:mx-1 my-0.5 text-3xl md:text-4xl font-serif font-medium lg:transition-all lg:duration-200 px-1 rounded ${style} ${isCurrent && status !== 'wrong' ? 'border-b-2 border-emerald-400/70' : ''}`}
                         >
                           {word.text}
                         </span>
                       );
                    })}
                 </div>

                 {/* CATATAN (muncul setelah ayat selesai) */}
                 {isDone && (correctedWords.length > 0 || minorWords.length > 0) && (
                   <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3 text-sm">
                     {correctedWords.length > 0 && (
                       <div className="space-y-2">
                         <p className="text-amber-300 font-semibold">Yang tadi salah:</p>
                         {correctedWords.map(pos => (
                           <div key={pos} className="flex items-baseline gap-3">
                             <span className="font-serif text-xl text-amber-200 shrink-0" dir="rtl">{ayat.words[pos - ayat.startPos].text}</span>
                             <span className="text-slate-300">{noteFor(pos)}</span>
                           </div>
                         ))}
                       </div>
                     )}
                     {minorWords.length > 0 && (
                       <div className="space-y-2">
                         <p className="text-amber-200/80 font-semibold">Catatan kecil (tidak wajib diulang):</p>
                         {minorWords.map(pos => (
                           <div key={pos} className="flex items-baseline gap-3">
                             <span className="font-serif text-xl text-slate-200 shrink-0" dir="rtl">{ayat.words[pos - ayat.startPos].text}</span>
                             <span className="text-slate-400">{minorByPos[pos].join(' · ')}</span>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 )}

                 <div className={`transition-all duration-500 overflow-hidden ${isDone ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-400 text-sm font-sans border-l-2 border-emerald-500 pl-3">{ayat.translation}</p>
                 </div>
               </Card>
             </div>
           );
        })}
      </div>

      {/* FOOTER */}
      <div className="fixed bottom-4 lg:bottom-6 left-0 right-0 lg:left-64 z-30 px-3 sm:px-4">
        <div className="max-w-md mx-auto bg-slate-800/95 lg:bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-full p-2 shadow-2xl flex items-center justify-between pl-5 sm:pl-6 pr-2">
          <div className="flex gap-3 sm:gap-4">
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Progres</span><span className="text-emerald-400 font-bold text-sm">{Math.round(progressPercent)}%</span></div>
            <div className="flex flex-col"><span className="text-[10px] text-slate-400 uppercase font-bold">Salah</span><span className={`font-bold text-sm ${mistakeCount ? 'text-red-400' : 'text-slate-300'}`}>{mistakeCount}</span></div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleRestart} title="Ulangi halaman" aria-label="Ulangi halaman" className="w-11 h-11 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors"><RotateCcw size={18}/></button>
             <button onClick={() => { setIsPeeking(true); setTimeout(() => setIsPeeking(false), 1000); }} title="Intip ayat" aria-label="Intip ayat" className="w-11 h-11 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors"><Eye size={18}/></button>

             <button onClick={toggleListening} className={`h-14 px-5 sm:px-6 rounded-full flex items-center gap-2 font-bold text-white lg:transition-all lg:duration-300 shadow-lg ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
               {isListening ? <><Pause size={20} fill="currentColor"/> Stop</> : <><Mic size={20}/> Mulai</>}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MushafHafalan;
