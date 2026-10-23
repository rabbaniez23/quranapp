// Jadwal sholat dari api.myquran.com (data Kemenag RI)
const BASE_URL = "https://api.myquran.com/v2/sholat";
const KOTA_KEY = "quranapp-kota-sholat";
export const KOTA_DEFAULT = { id: "1301", lokasi: "KOTA JAKARTA" };

// Urutan waktu yang ditampilkan. "wajib" = termasuk sholat lima waktu.
export const WAKTU = [
  { key: "imsak", label: "Imsak" },
  { key: "subuh", label: "Subuh", wajib: true },
  { key: "terbit", label: "Terbit" },
  { key: "dzuhur", label: "Dzuhur", wajib: true },
  { key: "ashar", label: "Ashar", wajib: true },
  { key: "maghrib", label: "Maghrib", wajib: true },
  { key: "isya", label: "Isya", wajib: true },
];

export const getKotaTersimpan = () => {
  try {
    return JSON.parse(localStorage.getItem(KOTA_KEY)) || KOTA_DEFAULT;
  } catch {
    return KOTA_DEFAULT;
  }
};

export const simpanKota = (kota) => {
  try { localStorage.setItem(KOTA_KEY, JSON.stringify(kota)); } catch { /* cukup untuk sesi ini */ }
};

export const cariKota = async (kata) => {
  const response = await fetch(`${BASE_URL}/kota/cari/${encodeURIComponent(kata)}`);
  const json = await response.json();
  return json.status ? json.data : [];
};

// Jadwal satu hari: { lokasi, daerah, jadwal: { tanggal, imsak, subuh, ... } }
export const getJadwal = async (idKota, tanggal = new Date()) => {
  const y = tanggal.getFullYear();
  const m = String(tanggal.getMonth() + 1).padStart(2, "0");
  const d = String(tanggal.getDate()).padStart(2, "0");
  const response = await fetch(`${BASE_URL}/jadwal/${idKota}/${y}/${m}/${d}`);
  const json = await response.json();
  if (!json.status) throw new Error("Jadwal tidak ditemukan");
  return json.data;
};

const keMenit = (jam) => {
  const [h, m] = jam.split(":").map(Number);
  return h * 60 + m;
};

// Sholat wajib berikutnya dari jadwal hari ini. Lewat Isya → Subuh (besok, perkiraan dari hari ini).
export const sholatBerikutnya = (jadwal, sekarang = new Date()) => {
  const menitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes();
  const wajib = WAKTU.filter((w) => w.wajib);
  const next = wajib.find((w) => keMenit(jadwal[w.key]) > menitSekarang);
  if (next) return { ...next, jam: jadwal[next.key], sisaMenit: keMenit(jadwal[next.key]) - menitSekarang, besok: false };
  const subuh = wajib[0];
  return { ...subuh, jam: jadwal.subuh, sisaMenit: 24 * 60 - menitSekarang + keMenit(jadwal.subuh), besok: true };
};

export const formatSisa = (menit) => {
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  if (jam === 0) return `${sisa} menit lagi`;
  return sisa ? `${jam} jam ${sisa} menit lagi` : `${jam} jam lagi`;
};

// Nama kota yang enak dibaca: "KOTA JAKARTA" → "Kota Jakarta"
export const rapikanKota = (lokasi) => lokasi.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
