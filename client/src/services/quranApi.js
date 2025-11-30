const BASE_URL_QURAN_COM = "https://api.quran.com/api/v4";
const BASE_URL_EQURAN = "https://equran.id/api/v2";

// --- API DATA SURAT & AYAT (EQURAN.ID) ---

export const getAllSurahs = async () => {
  try {
    const response = await fetch(`${BASE_URL_EQURAN}/surat`);
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Gagal ambil daftar surat:", error);
    return [];
  }
};

export const getSurahDetail = async (nomorSurat) => {
  try {
    const response = await fetch(`${BASE_URL_EQURAN}/surat/${nomorSurat}`);
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Gagal ambil detail surat:", error);
    return null;
  }
};

// --- API AUDIO (MANUAL LIST) ---

// KITA BUAT DAFTAR MANUAL AGAR PASTI 6 IMAM POPULER MUNCUL
export const getReciters = async () => {
  // Tidak perlu fetch, langsung return array
  return [
    { id: 7, reciter_name: "Mishari Rashid Al-Afasy", style: "Murattal" },
    { id: 3, reciter_name: "Abdur-Rahman as-Sudais", style: "Murattal" },
    { id: 4, reciter_name: "Abu Bakr al-Shatri", style: "Murattal" },
    { id: 5, reciter_name: "Hani Ar-Rifai", style: "Murattal" },
    { id: 6, reciter_name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
    { id: 10, reciter_name: "Saud Al-Shuraim", style: "Murattal" }
  ];
};

// Ambil Audio Full per Ayat dari Qari tertentu (Tetap Fetch ke API)
export const getAudioBySurah = async (surahId, reciterId) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/recitations/${reciterId}/by_chapter/${surahId}`);
    const data = await response.json();
    return data.audio_files; 
  } catch (error) {
    console.error("Gagal ambil audio:", error);
    return [];
  }
};

// --- API LAMA (Mushaf Hafalan - Jangan Dihapus) ---
export const getAyatByPage = async (pageNumber) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/verses/by_page/${pageNumber}?language=id&words=false&translations=33&fields=text_uthmani,chapter_id,audio_url`);
    const data = await response.json();
    if (!data.verses || data.verses.length === 0) return null;
    return {
      verses: data.verses, 
      meta: {
        chapter_id: data.verses[0].chapter_id,
        juz_number: data.verses[0].juz_number
      }
    };
  } catch (error) { return null; }
};

export const getSurahName = async (chapterId) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/chapters/${chapterId}?language=id`);
    const data = await response.json();
    return data.chapter;
  } catch (error) { return { name_simple: "Unknown" }; }
};

export const getPageByVerse = async (surahId, verseNumber) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/verses/by_key/${surahId}:${verseNumber}?fields=page_number`);
    const data = await response.json();
    if (data.verse) return data.verse.page_number;
    return null;
  } catch (error) { return null; }
};