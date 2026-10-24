import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';

// Halaman publik
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import KebijakanPrivasi from './pages/KebijakanPrivasi';

// Halaman setelah masuk
import Dashboard from './pages/Dashboard';
import MushafHafalan from './pages/MushafHafalan';
import PilihSurat from './pages/PilihSurat';
import QuranDigital from './pages/QuranDigital';
import HaditsPage from './pages/HaditsPage';
import JadwalSholat from './pages/JadwalSholat';
import ArtikelPage from './pages/ArtikelPage';
import Progres from './pages/Progres';

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
    <p className="text-6xl font-serif text-emerald-400">404</p>
    <p className="text-slate-300">Halaman yang kamu cari tidak ada.</p>
    <Link to="/" className="text-emerald-400 hover:underline text-sm">Kembali ke beranda</Link>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/privasi" element={<KebijakanPrivasi />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cek-hafalan" element={<MushafHafalan />} />
            <Route path="/progres" element={<Progres />} />
            <Route path="/pilih-surat" element={<PilihSurat />} />
            <Route path="/quran-digital" element={<QuranDigital />} />
            <Route path="/hadits" element={<HaditsPage />} />
            <Route path="/jadwal-sholat" element={<JadwalSholat />} />
            <Route path="/artikel" element={<ArtikelPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
