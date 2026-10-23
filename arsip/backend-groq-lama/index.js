require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Groq = require("groq-sdk");

const app = express();
const port = process.env.PORT || 5000; // Gunakan process.env.PORT jika ada

app.use(cors());
app.use(express.json());

// API Key Groq diambil dari file .env (lokal) atau Environment Variables (Vercel)
// JANGAN tulis key langsung di sini
if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY belum diisi. Salin .env.example jadi .env lalu isi key-nya.");
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- PERBAIKAN PATH UPLOAD UNTUK VERCEL ---
// Vercel hanya mengizinkan tulis file di folder /tmp
const isProduction = process.env.NODE_ENV === 'production';
const uploadPath = isProduction ? '/tmp' : 'uploads/';

const uploadDir = isProduction ? '/tmp' : path.join(__dirname, 'uploads');
if (!isProduction && !fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Konfigurasi Multer
const upload = multer({ dest: uploadPath });

// --- 1. RUMUS KEMIRIPAN (LEVENSHTEIN) ---
const calculateSimilarity = (s1, s2) => {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) { longer = s2; shorter = s1; }
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    
    const editDistance = (s1, s2) => {
      s1 = s1.toLowerCase(); s2 = s2.toLowerCase();
      const costs = new Array();
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i == 0) costs[j] = j;
          else {
            if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    }
    return (longerLength - editDistance(longer, shorter)) / longerLength;
};

// --- 2. NORMALIZER TULANG (SKELETON) ---
const normalizeArabic = (text) => {
    if (!text) return "";
    let clean = text
        .replace(/[\u0640\u0653\u0610-\u061A\u064B-\u0652\u0670\u06D6-\u06ED]/g, '') 
        .replace(/[أإآٱا]/g, '') 
        .replace(/(ة)/g, 'ه')       
        .replace(/(ى)/g, 'ي')       
        .replace(/(ؤ)/g, 'و')       
        .replace(/(ئ)/g, 'ي')
        .replace(/[^ا-ي]/g, '') 
        .trim();
        
    return clean;
};

app.post('/api/cek-hafalan', upload.single('audio'), async (req, res) => {
    let audioPath = null;
    let renamedPath = null;

    try {
        if (!req.file) return res.status(400).json({ error: 'No Audio' });
        
        const ayatTarget = req.body.ayatTarget || "";
        const contextPrompt = ayatTarget.substring(0, 200); 
        
        console.log(`\n🎤 Target: ${contextPrompt}...`);

        audioPath = req.file.path;
        renamedPath = `${req.file.path}.webm`;
        
        // Rename sync mungkin error jika cross-device, kita gunakan copy & unlink jika perlu, 
        // tapi untuk simple case renameSync biasanya oke di folder yang sama.
        fs.renameSync(audioPath, renamedPath);

        // --- KIRIM KE GROQ DENGAN DYNAMIC PROMPT ---
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(renamedPath),
            model: "whisper-large-v3",
            language: "ar", 
            response_format: "json",
            prompt: contextPrompt 
        });

        const userText = transcription.text;
        console.log(`🗣️  Groq Dengar: ${userText}`);

        // --- PROSES BANDING ---
        const userClean = normalizeArabic(userText);
        const targetClean = normalizeArabic(ayatTarget);

        console.log(`🔍 Bandingkan:`);
        console.log(`   User   : [${userClean}]`);
        console.log(`   Target : [${targetClean}]`);

        let isCorrect = userClean.includes(targetClean);
        let similarity = 0;

        if (!isCorrect) {
            similarity = calculateSimilarity(userClean, targetClean);
            console.log(`📊 Skor: ${(similarity * 100).toFixed(2)}%`);
            
            if (similarity >= 0.75) {
                isCorrect = true;
                console.log("   (Lulus Fuzzy Match)");
            }
        }

        console.log(`✅ Status: ${isCorrect ? "BENAR" : "SALAH"}`);

        // Bersihkan file temporary
        if (fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);

        res.json({
            isCorrect: isCorrect,
            wordStatus: isCorrect ? Array(50).fill(true) : [], 
            feedback: isCorrect ? "Lancar!" : `Kurang tepat (${(similarity*100).toFixed(0)}%)`,
            transkripUser: userText
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        // Cleanup jika error
        try {
            if (renamedPath && fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);
            if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        } catch (e) { console.error("Error cleaning up files", e); }
        
        res.status(500).json({ isCorrect: false, feedback: "Gagal memproses." });
    }
});

app.get('/', (req, res) => {
    res.send('Server QuranApp is Running!');
});

// --- BAGIAN INI YANG DIUBAH AGAR BISA JALAN DI VERCEL & LOCAL ---

if (process.env.NODE_ENV !== 'production') {
    // Jalankan app.listen HANYA jika di local development
    app.listen(port, () => {
        console.log(`🚀 Server Groq (Dynamic Context) Siap di Port ${port}`);
    });
}

// Export app agar Vercel bisa menjalankannya sebagai Serverless Function
module.exports = app;