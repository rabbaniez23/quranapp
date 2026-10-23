import { BASE_URL } from "./apiConfig";

// Cek apakah backend AI sedang menyala, dan apakah rekaman suara sedang disimpan untuk analisis
export const checkAiHealth = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const json = await response.json();
    return { online: json.status === "ok", recording: Boolean(json.rekaman) };
  } catch {
    return { online: false, recording: false };
  }
};

// Buka koneksi cek hafalan real-time. onEvent dipanggil untuk tiap pesan dari server
// ("kata", "salah", "ayat_selesai", "surat_selesai", "error"). token = sesi login.
export const connectHafalan = (token, onEvent, onClose) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE_URL.replace(/^http/, "ws")}/ws/hafalan?token=${encodeURIComponent(token || "")}`);
    ws.binaryType = "arraybuffer";
    let ready = false;

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === "siap" && !ready) {
        ready = true;
        resolve({
          start: (surat, ayat, kata) => ws.send(JSON.stringify({ type: "mulai", surat, ayat, kata })),
          sendAudio: (chunk) => { if (ws.readyState === WebSocket.OPEN) ws.send(chunk.buffer); },
          close: () => { ws.onclose = null; ws.close(); },
        });
        return;
      }
      if (event.type === "error" && !ready) {
        reject(new Error(event.pesan));
        return;
      }
      onEvent(event);
    };
    ws.onerror = () => { if (!ready) reject(new Error("Tidak bisa terhubung ke server AI")); };
    ws.onclose = (e) => {
      if (ready) onClose();
      else if (e.code === 4401) reject(new Error("Sesi login berakhir, silakan masuk lagi."));
    };
  });
