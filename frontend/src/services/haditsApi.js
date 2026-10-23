// Data hadits berbahasa Indonesia dari hadis-api-id.vercel.app (9 imam).
// (api.hadith.gading.dev yang dulu dipakai sudah tidak bisa diakses: sertifikat SSL-nya rusak.)
// Bentuk data yang dikembalikan sengaja dibuat sama seperti dulu, supaya halaman Hadits tidak perlu diubah.
const BASE_URL = "https://hadis-api-id.vercel.app";

// 1. Ambil Daftar Perawi (Imam Bukhari, Muslim, dll) → [{ id, name, available }]
export const getHadithBooks = async () => {
  try {
    const response = await fetch(`${BASE_URL}/hadith`);
    const json = await response.json();
    return json
      .filter(book => book.total > 0)
      .map(book => ({ id: book.slug, name: book.name, available: book.total }));
  } catch (error) {
    console.error("Gagal ambil daftar perawi:", error);
    return [];
  }
};

// 2. Ambil Hadits berdasarkan Range (Contoh: 1-50) → { id, name, available, hadiths: [{ number, arab, id }] }
// API ini memakai halaman (page & limit), jadi range diubah ke halaman berukuran pageSize.
export const getHadithByRange = async (bookId, rangeStart, rangeEnd, pageSize = 50) => {
  try {
    const page = Math.floor((rangeStart - 1) / pageSize) + 1;
    const response = await fetch(`${BASE_URL}/hadith/${bookId}?page=${page}&limit=${pageSize}`);
    const json = await response.json();
    const hadiths = json.items.filter(h => h.number >= rangeStart && h.number <= rangeEnd);
    return { id: json.slug, name: json.name, available: json.total, hadiths };
  } catch (error) {
    console.error("Gagal ambil hadits:", error);
    return null;
  }
};

// 3. Cari Hadits Spesifik (No. tertentu) → { number, arab, id }
export const getHadithByNumber = async (bookId, number) => {
  try {
    const response = await fetch(`${BASE_URL}/hadith/${bookId}/${number}`);
    const json = await response.json();
    return { number: json.number, arab: json.arab, id: json.id };
  } catch (error) {
    console.error("Gagal cari hadits:", error);
    return null;
  }
};
