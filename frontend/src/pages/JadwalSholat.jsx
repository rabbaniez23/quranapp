import { useEffect, useRef, useState } from 'react';
import { MapPin, Calendar as CalIcon, Search, Loader2, Bell } from 'lucide-react';
import {
  WAKTU, cariKota, getJadwal, getKotaTersimpan, simpanKota, sholatBerikutnya, formatSisa, rapikanKota,
} from '../services/sholatApi';

const JadwalSholat = () => {
  const [kota, setKota] = useState(getKotaTersimpan);
  const [hasil, setHasil] = useState({ id: null, data: null, error: null }); // jadwal untuk kota hasil.id
  const [sekarang, setSekarang] = useState(() => new Date());
  const [cari, setCari] = useState('');
  const [hasilCari, setHasilCari] = useState([]);
  const [mencari, setMencari] = useState(false);
  const cariTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    getJadwal(kota.id)
      .then((data) => alive && setHasil({ id: kota.id, data, error: null }))
      .catch(() => alive && setHasil({ id: kota.id, data: null, error: 'Jadwal belum bisa dimuat. Periksa koneksi internet.' }));
    return () => { alive = false; };
  }, [kota.id]);
  // Selama jadwal kota yang baru dipilih belum datang, tampilkan "memuat"
  const data = hasil.id === kota.id ? hasil.data : null;
  const error = hasil.id === kota.id ? hasil.error : null;

  // Perbarui hitung mundur setiap 30 detik
  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Cari kota sambil mengetik (tunggu sebentar supaya tidak memanggil API tiap huruf)
  const handleCari = (value) => {
    setCari(value);
    clearTimeout(cariTimer.current);
    if (value.trim().length < 3) return setHasilCari([]);
    cariTimer.current = setTimeout(async () => {
      setMencari(true);
      try { setHasilCari(await cariKota(value.trim())); } catch { setHasilCari([]); }
      setMencari(false);
    }, 400);
  };

  const pilihKota = (k) => {
    setKota(k);
    simpanKota(k);
    setCari('');
    setHasilCari([]);
  };

  const jadwal = data?.jadwal;
  const berikutnya = jadwal ? sholatBerikutnya(jadwal, sekarang) : null;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 gap-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-white mb-2">Jadwal Sholat</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-sm">
            <span className="flex items-center gap-1"><MapPin size={14} /> {rapikanKota(kota.lokasi)}</span>
            {jadwal && <span className="flex items-center gap-1"><CalIcon size={14} /> {jadwal.tanggal}</span>}
          </div>
        </div>

        {/* Ganti kota */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            value={cari}
            onChange={(e) => handleCari(e.target.value)}
            placeholder="Ganti kota, mis. Bandung"
            className="w-full bg-slate-800 border border-slate-700 text-white pl-9 pr-9 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          {mencari && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />}
          {hasilCari.length > 0 && (
            <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-800 shadow-2xl">
              {hasilCari.map((k) => (
                <button key={k.id} onClick={() => pilihKota(k)} className="block w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5">
                  {rapikanKota(k.lokasi)}
                </button>
              ))}
            </div>
          )}
          {cari.trim().length >= 3 && !mencari && hasilCari.length === 0 && (
            <p className="absolute mt-2 text-xs text-slate-500">Kota tidak ditemukan.</p>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

      {!jadwal && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-pulse">
          {WAKTU.map((w) => <div key={w.key} className="h-28 rounded-2xl bg-slate-800/60" />)}
        </div>
      )}

      {jadwal && (
        <>
          {/* Sholat berikutnya */}
          <div className="mb-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 to-slate-900 p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/15 text-violet-300 flex items-center justify-center"><Bell className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-slate-400">Sholat berikutnya{berikutnya.besok ? ' (besok)' : ''}</p>
              <p className="text-2xl font-bold text-white">{berikutnya.label} {berikutnya.jam} <span className="text-base font-normal text-violet-300">· {formatSisa(berikutnya.sisaMenit)}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {WAKTU.map((w) => {
              const aktif = !berikutnya.besok && w.key === berikutnya.key;
              return (
                <div key={w.key} className={`rounded-2xl border p-5 text-center transition-colors ${
                  aktif ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/5 bg-slate-800/40'}`}>
                  <p className={`text-sm mb-2 ${aktif ? 'text-violet-200' : 'text-slate-400'}`}>{w.label}</p>
                  <p className={`text-2xl font-bold ${w.wajib ? 'text-white' : 'text-slate-400'}`}>{jadwal[w.key]}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-xs text-slate-500">Sumber: Kemenag RI melalui api.myquran.com · {rapikanKota(data.daerah || '')}</p>
        </>
      )}
    </div>
  );
};

export default JadwalSholat;
