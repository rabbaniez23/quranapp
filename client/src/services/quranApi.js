const BASE_URL = "https://api.quran.com/api/v4";

// 1. Ambil Data Ayat per Halaman
export const getAyatByPage = async (pageNumber) => {
  try {
    const response = await fetch(`${BASE_URL}/verses/by_page/${pageNumber}?language=id&words=false&translations=33&fields=text_uthmani,chapter_id`);
    const data = await response.json();
    
    if (!data.verses || data.verses.length === 0) return null;

    const firstVerse = data.verses[0];
    return {
      verses: data.verses, 
      meta: {
        chapter_id: firstVerse.chapter_id,
        juz_number: firstVerse.juz_number
      }
    };
  } catch (error) {
    console.error("Gagal mengambil data Quran:", error);
    return null;
  }
};

// 2. Ambil Info Surat
export const getSurahName = async (chapterId) => {
  try {
    const response = await fetch(`${BASE_URL}/chapters/${chapterId}?language=id`);
    const data = await response.json();
    return data.chapter;
  } catch (error) {
    return { name_simple: "Unknown" };
  }
};

// 3. Ambil Daftar Semua Surat
export const getAllSurahs = async () => {
  try {
    const response = await fetch(`${BASE_URL}/chapters?language=id`);
    const data = await response.json();
    return data.chapters; 
  } catch (error) {
    console.error("Gagal ambil daftar surat");
    return [];
  }
};

// 4. BARU: Cari Halaman berdasarkan Ayat (Untuk Fitur Lompat)
export const getPageByVerse = async (surahId, verseNumber) => {
  try {
    // Contoh: verses/by_key/2:255?fields=page_number
    const response = await fetch(`${BASE_URL}/verses/by_key/${surahId}:${verseNumber}?fields=page_number`);
    const data = await response.json();
    if (data.verse) {
      return data.verse.page_number;
    }
    return null;
  } catch (error) {
    console.error("Gagal cari ayat:", error);
    return null;
  }
};