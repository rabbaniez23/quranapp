import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from '../Footer';

// Tata letak halaman publik: landing page, masuk, daftar, halaman legal
const PublicLayout = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-clip">
      <Navbar />
      {pathname === '/' ? (
        <Outlet /> /* landing page mengatur jarak & latar penuhnya sendiri */
      ) : (
        <div className="pt-24 px-4 pb-10"> {/* Padding top supaya tidak tertutup navbar */}
          <Outlet />
        </div>
      )}
      <Footer />
    </div>
  );
};

export default PublicLayout;
