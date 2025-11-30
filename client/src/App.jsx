import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';

// Import Halaman Lama
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import QuranDigital from './pages/QuranDigital';
import CekHafalan from './pages/CekHafalan';
import MushafHafalan from './pages/MushafHafalan';

// Import Halaman BARU
import HaditsPage from './pages/HaditsPage';
import ArtikelPage from './pages/ArtikelPage';
import JadwalSholat from './pages/JadwalSholat';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        
        <Navbar />

        <div className="pt-24 px-4 pb-10"> {/* Padding top ditambah biar ga ketutupan navbar */}
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Fitur Utama */}
            <Route path="/quran" element={<QuranDigital />} />
            <Route path="/cek-hafalan" element={<MushafHafalan />} />
            
            {/* Fitur Tambahan */}
            <Route path="/hadits" element={<HaditsPage />} />
            <Route path="/artikel" element={<ArtikelPage />} />
            <Route path="/jadwal-sholat" element={<JadwalSholat />} />
          </Routes>
        </div>

        <Footer />

      </div>
    </Router>
  );
}

export default App;