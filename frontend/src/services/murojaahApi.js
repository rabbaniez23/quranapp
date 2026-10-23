import { apiFetch } from "./apiConfig";

// Simpan hasil satu sesi murojaah (dipanggil saat halaman selesai atau saat berhenti)
export const simpanMurojaah = (token, data) =>
  apiFetch("/api/murojaah", { method: "POST", token, body: data });

// { total_sesi, halaman_selesai, kata_benar, ketepatan, hari_beruntun, terakhir, riwayat }
export const getRingkasanMurojaah = (token) => apiFetch("/api/murojaah/ringkasan", { token });
