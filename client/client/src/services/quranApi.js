const BASE_URL = "https://api.quran.com/api/v4";

export const getAyatByPage = async (pageNumber) => {
  try {
    // Kita panggil endpoint verses/by_page yang lebih lengkap
    // translations=33 (Bahasa Indonesia Kemenag)
    // fields=text_uthmani (Teks Arab Standar)
    const response = await fetch(`${BASE_URL}/verses/by_page/${pageNumber}?language=id&words=false&translations=33&fields=text_uthmani,chapter_id`);
    const data = await response.json();
    
    // Ambil Meta Data (untuk tau nama surat dari ayat pertama)
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

export const getSurahName = async (chapterId) => {
  try {
    const response = await fetch(`${BASE_URL}/chapters/${chapterId}?language=id`);
    const data = await response.json();
    return data.chapter;
  } catch (error) {
    return { name_simple: "Unknown" };
  }
};