import { apiFetch } from "./apiConfig";

export const daftar = (nama, username, password) =>
  apiFetch("/api/auth/daftar", { method: "POST", body: { nama, username, password } });

export const masuk = (username, password) =>
  apiFetch("/api/auth/masuk", { method: "POST", body: { username, password } });

export const saya = (token) => apiFetch("/api/auth/saya", { token }).then((json) => json.user);

export const keluar = (token) => apiFetch("/api/auth/keluar", { method: "POST", token });
