const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// --- KUNCI API ---
const MY_API_KEY = "AIzaSyAG7xV1iqHF06_MrnOrN9g0ZifTGSu76DE"; // Pastikan ini kunci yang valid
// Ganti ke FLASH biar CEPAT
const MODEL_NAME = "gemini-2.5-flash"; 

const genAI = new GoogleGenerativeAI(MY_API_KEY);

// Setup Folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: 'uploads/' });

app.post('/api/cek-hafalan', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No Audio' });
        
        const ayatTarget = req.body.ayatTarget || "";
        // console.log(`🎤 Menerima audio.. Target: ${ayatTarget.substring(0, 20)}...`);

        const audioPath = req.file.path;
        const audioFile = fs.readFileSync(audioPath);
        const audioBase64 = audioFile.toString('base64');

        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // PROMPT BARU: LEBIH PEMAAF & FOKUS KE KATA UTAMA
        const prompt = `
            Transkripsikan audio user (Bahasa Arab) dan bandingkan dengan target: "${ayatTarget}".
            
            Kriteria Penilaian (Strict pada Kata, Loose pada Tajwid):
            1. Jika user membaca semua kata dengan urutan benar, NILAI BENAR (true).
            2. Abaikan kesalahan panjang-pendek (mad) atau dengung (ghunnah) karena kualitas mic.
            3. Jika ada kata yang tertukar posisinya atau terlewat, baru NILAI SALAH (false).
            4. Jika audio terpotong di tengah ayat tapi bagian awalnya benar, anggap SALAH (minta ulangi).

            Output JSON:
            { "isCorrect": boolean, "transkripUser": "teks arab", "feedback": "saran singkat indonesia" }
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType: "audio/webm", data: audioBase64 } }
        ]);

        const response = await result.response;
        let textResponse = response.text().replace(/```json|```/g, '').trim();
        const jsonResponse = JSON.parse(textResponse);

        fs.unlinkSync(audioPath); // Hapus file
        res.json(jsonResponse);

    } catch (error) {
        console.error("Error:", error.message);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ isCorrect: false, feedback: "Gagal memproses." });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server Flash Siap di Port ${port}`);
});