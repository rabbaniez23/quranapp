import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Halaman yang hanya bisa dibuka setelah masuk. Belum masuk → ke halaman masuk,
// lalu setelah berhasil masuk dikembalikan ke halaman yang tadi dituju.
const ProtectedRoute = ({ children }) => {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-5 h-5 animate-spin" /> Memuat akun...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
};

export default ProtectedRoute;
