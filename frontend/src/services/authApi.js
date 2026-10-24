import { apiFetch } from "./apiConfig";

// Daftar langkah 1: kode verifikasi dikirim ke email. website = jebakan bot (selalu kosong untuk manusia)
export const daftar = (nama, username, email, password, website = "") =>
  apiFetch("/api/auth/daftar", { method: "POST", body: { nama, username, email, password, website } });

// Daftar langkah 2: kode benar → akun dibuat, hasil { token, user }
export const verifikasiDaftar = (email, kode) =>
  apiFetch("/api/auth/daftar/verifikasi", { method: "POST", body: { email, kode } });

export const kirimUlangKode = (email) =>
  apiFetch("/api/auth/daftar/kirim-ulang", { method: "POST", body: { email } });

// username boleh diisi username atau email
export const masuk = (username, password) =>
  apiFetch("/api/auth/masuk", { method: "POST", body: { username, password } });

export const masukGoogle = (credential) =>
  apiFetch("/api/auth/google", { method: "POST", body: { credential } });

// { google_client_id } — null kalau Masuk dengan Google belum diaktifkan di server
let configPromise;
export const getAuthConfig = () => {
  configPromise ||= apiFetch("/api/auth/config").catch((err) => {
    configPromise = null;
    throw err;
  });
  return configPromise;
};

export const saya = (token) => apiFetch("/api/auth/saya", { token }).then((json) => json.user);

export const keluar = (token) => apiFetch("/api/auth/keluar", { method: "POST", token });
