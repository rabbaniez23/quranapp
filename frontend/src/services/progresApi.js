import { apiFetch } from "./apiConfig";

// Apa saja yang dibaca pada satu hari. tanggal: "YYYY-MM-DD" (kosong = hari ini)
export const getProgresHarian = (token, tanggal) =>
  apiFetch(`/api/progres/harian${tanggal ? `?tanggal=${tanggal}` : ""}`, { token });

// Tren harian, cakupan per juz/surat, kata yang sering salah
export const getAnalitik = (token, hari = 30) => apiFetch(`/api/progres/analitik?hari=${hari}`, { token });
