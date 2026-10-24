import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../services/authApi';

const TOKEN_KEY = 'quranapp-token';
const AuthContext = createContext(null);

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const writeToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* browser memblokir penyimpanan: login hanya bertahan selama tab terbuka */ }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(readToken())); // sedang cek token lama
  const [serverError, setServerError] = useState(null);

  // Saat website dibuka: pastikan token lama masih berlaku
  useEffect(() => {
    if (!token) return;
    authApi.saya(token)
      .then(setUser)
      .catch((err) => {
        if (err.status === 401) {
          writeToken(null);
          setToken(null);
        } else {
          setServerError(err.message);
        }
      })
      .finally(() => setChecking(false));
    // hanya sekali saat website dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terima = useCallback(({ token: baru, user: u }) => {
    writeToken(baru);
    setToken(baru);
    setUser(u);
    setServerError(null);
    return u;
  }, []);

  const login = useCallback(
    (username, password) => authApi.masuk(username, password).then(terima),
    [terima]
  );
  // Daftar 2 langkah: register() mengirim kode ke email, verifyRegister() membuat akun dan langsung masuk
  const register = useCallback(
    (nama, username, email, password, website) => authApi.daftar(nama, username, email, password, website),
    []
  );
  const verifyRegister = useCallback(
    (email, kode) => authApi.verifikasiDaftar(email, kode).then(terima),
    [terima]
  );
  const loginGoogle = useCallback(
    (credential) => authApi.masukGoogle(credential).then(terima),
    [terima]
  );
  const logout = useCallback(async () => {
    if (token) await authApi.keluar(token).catch(() => {});
    writeToken(null);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, checking, serverError, login, register, verifyRegister, loginGoogle, logout }),
    [user, token, checking, serverError, login, register, verifyRegister, loginGoogle, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
