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

// Lupa kata sandi: kode dikirim ke email (jawaban selalu ok, terdaftar atau tidak emailnya)
export const lupaSandi = (email) =>
  apiFetch("/api/auth/lupa-sandi", { method: "POST", body: { email } });

export const gantiSandi = (email, kode, password) =>
  apiFetch("/api/auth/lupa-sandi/ganti", { method: "POST", body: { email, kode, password } });

// Akun dengan kata sandi: isi password. Akun Google: isi konfirmasi = username.
export const hapusAkun = (token, password, konfirmasi) =>
  apiFetch("/api/auth/hapus-akun", { method: "POST", token, body: { password, konfirmasi } });

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
