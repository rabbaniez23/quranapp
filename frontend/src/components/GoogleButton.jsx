import { useEffect, useRef, useState } from 'react';
import { getAuthConfig } from '../services/authApi';

// Skrip resmi "Sign in with Google" (Google Identity Services), dimuat sekali saja
let gsiPromise;
const muatGsi = () => {
  gsiPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => {
      gsiPromise = null;
      reject(new Error('Gagal memuat Google'));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
};

// Tombol "Masuk/Daftar dengan Google" + pemisah "atau". Tidak tampil kalau belum diaktifkan di server.
// onCredential(credential) dipanggil dengan ID token dari Google.
const GoogleButton = ({ onCredential, text = 'continue_with' }) => {
  const ref = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [status, setStatus] = useState('cek'); // 'cek' → 'tampil' / 'tidak'

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let alive = true;
    getAuthConfig()
      .then(async ({ google_client_id: clientId }) => {
        if (!alive) return;
        if (!clientId) return setStatus('tidak');
        const google = await muatGsi();
        if (!alive || !ref.current) return;
        setStatus('tampil');
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response.credential),
          ux_mode: 'popup',
        });
        google.accounts.id.renderButton(ref.current, {
          theme: 'filled_black', size: 'large', shape: 'pill', text, locale: 'id',
          width: Math.min(400, ref.current.offsetWidth || 320),
        });
      })
      .catch(() => alive && setStatus('tidak')); // server/Google tidak bisa dihubungi: tanpa tombol Google
    return () => { alive = false; };
  }, [text]);

  if (status === 'tidak') return null;
  return (
    // Selama dicek: tak terlihat dan setinggi 0 (bukan display:none) supaya lebar tombol bisa diukur
    <div className={status === 'tampil' ? '' : 'h-0 overflow-hidden invisible'} aria-hidden={status !== 'tampil'}>
      <div className="flex justify-center" ref={ref} />
      <div className="flex items-center gap-3 my-6 text-xs text-slate-500">
        <span className="h-px flex-1 bg-white/10" /> atau <span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
};

export default GoogleButton;
