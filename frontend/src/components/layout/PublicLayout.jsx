import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from '../Footer';

// Tata letak halaman publik: landing page, masuk, daftar
const PublicLayout = () => (
  <div className="min-h-screen bg-slate-900 text-white font-sans">
    <Navbar />
    <div className="pt-24 px-4 pb-10"> {/* Padding top supaya tidak tertutup navbar */}
      <Outlet />
    </div>
    <Footer />
  </div>
);

export default PublicLayout;
