// Alamat backend (Python). Bisa diganti lewat file .env: VITE_TAJWID_API_URL=...
export const BASE_URL = import.meta.env.VITE_TAJWID_API_URL || "http://localhost:8010";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Panggil backend. token (opsional) dikirim sebagai "Authorization: Bearer ...".
export const apiFetch = async (path, { token, method = "GET", body } = {}) => {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Server tidak bisa dihubungi. Pastikan backend sudah dinyalakan.", 0);
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    // FastAPI: detail berupa teks (error biasa) atau daftar (error validasi)
    const detail = typeof json.detail === "string" ? json.detail : "Data yang dikirim tidak valid.";
    throw new ApiError(detail, response.status);
  }
  return json;
};
