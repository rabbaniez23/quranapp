const BASE_URL = "https://api.hadith.gading.dev";

// 1. Ambil Daftar Perawi (Imam Bukhari, Muslim, dll)
export const getHadithBooks = async () => {
  try {
    const response = await fetch(`${BASE_URL}/books`);
    const json = await response.json();
    // Filter agar hanya menampilkan yang available > 0
    return json.data.filter(book => book.available > 0);
  } catch (error) {
    console.error("Gagal ambil daftar perawi:", error);
    return [];
  }
};

// 2. Ambil Hadits berdasarkan Range (Contoh: 1-20)
export const getHadithByRange = async (bookId, rangeStart, rangeEnd) => {
  try {
    const response = await fetch(`${BASE_URL}/books/${bookId}?range=${rangeStart}-${rangeEnd}`);
    const json = await response.json();
    return json.data; // Mengembalikan object { name, id, available, hadiths: [] }
  } catch (error) {
    console.error("Gagal ambil hadits:", error);
    return null;
  }
};

// 3. Cari Hadits Spesifik (No. tertentu)
export const getHadithByNumber = async (bookId, number) => {
  try {
    const response = await fetch(`${BASE_URL}/books/${bookId}/${number}`);
    const json = await response.json();
    return json.data; // Mengembalikan satu object hadits
  } catch (error) {
    console.error("Gagal cari hadits:", error);
    return null;
  }
};