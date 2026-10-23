const BASE_URL_QURAN_COM = "https://api.quran.com/api/v4";
const BASE_URL_EQURAN = "https://equran.id/api/v2";

// --- API BARU (EQURAN.ID) - Untuk Quran Digital ---
export const getAllSurahs = async () => {
  try {
    const response = await fetch(`${BASE_URL_EQURAN}/surat`);
    const json = await response.json();
    return json.data;
  } catch (error) {
    return [];
  }
};

export const getSurahDetail = async (nomorSurat) => {
  try {
    const response = await fetch(`${BASE_URL_EQURAN}/surat/${nomorSurat}`);
    const json = await response.json();
    return json.data;
  } catch (error) {
    return null;
  }
};

// --- API AUDIO ---
export const getReciters = async () => {
  return [
    { id: 7, reciter_name: "Mishari Rashid Al-Afasy", style: "Murattal" },
    { id: 3, reciter_name: "Abdur-Rahman as-Sudais", style: "Murattal" },
    { id: 4, reciter_name: "Abu Bakr al-Shatri", style: "Murattal" },
    { id: 5, reciter_name: "Hani Ar-Rifai", style: "Murattal" },
    { id: 6, reciter_name: "Mahmoud Khalil Al-Husary", style: "Murattal" },
    { id: 10, reciter_name: "Saud Al-Shuraim", style: "Murattal" }
  ];
};

export const getAudioBySurah = async (surahId, reciterId) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/recitations/${reciterId}/by_chapter/${surahId}`);
    const data = await response.json();
    return data.audio_files; 
  } catch (error) { return []; }
};

export const getSurahAudioFull = async (surahId, reciterId) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/chapter_recitations/${reciterId}/${surahId}`);
    const data = await response.json();
    return data.audio_file.audio_url; 
  } catch (error) { return null; }
};

// --- API LAMA (MUSHAF HAFALAN) ---

// 1. (BARU) Ambil Daftar Surat Format Lama (PENTING untuk MushafHafalan)
export const getAllSurahsMushaf = async () => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/chapters?language=id`);
    const data = await response.json();
    return data.chapters; 
  } catch (error) {
    console.error("Gagal ambil daftar surat mushaf");
    return [];
  }
};

// 2. Ambil Ayat per Halaman
export const getAyatByPage = async (pageNumber) => {
  try {
    const response = await fetch(`${BASE_URL_QURAN_COM}/verses/by_page/${pageNumber}?language=id&words=false&translations=33&fields=text_uthmani,chapter_id`);
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