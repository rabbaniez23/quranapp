const { GoogleGenerativeAI } = require("@google/generative-ai");

// KUNCI KAMU YANG TADI (SUDAH BENAR)
const MY_KEY = "AIzaSyAG7xV1iqHF06_MrnOrN9g0ZifTGSu76DE"; 

async function tesKunci() {
  console.log("-----------------------------------------");
  console.log("🔑 Mengetes koneksi ke Google...");

  try {
    const genAI = new GoogleGenerativeAI(MY_KEY);
    
    // KITA COBA MODEL YANG LEBIH UMUM DULU
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    console.log("🤖 Mengirim pesan 'Halo' ke Gemini...");
    const result = await model.generateContent("Halo, tes koneksi.");
    const response = await result.response;
    const text = response.text();

    console.log("\n✅ SUKSES BESAR! Gemini membalas:");
    console.log(">> " + text);
    console.log("-----------------------------------------");
    console.log("Sekarang kamu bisa update file index.js servermu!");
    
  } catch (error) {
    console.log("\n❌ Masih Error:");
    console.log(error.message);
    console.log("\nTips: Coba ganti nama model jadi 'gemini-pro' (tanpa 1.5)");
  }
}

tesKunci();