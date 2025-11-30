import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Play, TrendingUp, Clock, Award, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="pt-24 px-4 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl text-white mb-2">Ahlan wa Sahlan, Fulan!</h1>
          <p className="text-slate-400">Siap melanjutkan hafalan surat <span className="text-emerald-400 font-semibold">Al-Mulk</span> hari ini?</p>
        </div>
        <Link to="/cek-hafalan">
           <Button variant="primary" icon={Play}>Lanjut Hafalan</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4" hoverEffect={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><BookOpen size={24}/></div>
            <div>
              <p className="text-slate-400 text-xs">Surat Dihafal</p>
              <h3 className="text-2xl font-bold text-white">12</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4" hoverEffect={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400"><TrendingUp size={24}/></div>
            <div>
              <p className="text-slate-400 text-xs">Rata-rata Skor</p>
              <h3 className="text-2xl font-bold text-white">94%</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4" hoverEffect={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400"><Clock size={24}/></div>
            <div>
              <p className="text-slate-400 text-xs">Waktu Latihan</p>
              <h3 className="text-2xl font-bold text-white">4.5 Jam</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4" hoverEffect={false}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400"><Award size={24}/></div>
            <div>
              <p className="text-slate-400 text-xs">Pencapaian</p>
              <h3 className="text-2xl font-bold text-white">Juz 30</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Riwayat Hafalan Terakhir */}
      <section>
        <h2 className="font-serif text-2xl text-white mb-6">Riwayat Tes Terakhir</h2>
        <div className="space-y-4">
          {/* Item 1 */}
          <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-serif text-slate-300">30</div>
              <div>
                <h4 className="text-white font-medium">Surat An-Naba'</h4>
                <p className="text-xs text-slate-400">Jumat, 29 Nov 2025 • 19:30</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge text="Lulus" type="success" />
              <span className="text-white font-bold">98</span>
            </div>
          </div>
           {/* Item 2 */}
           <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-800/60 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-serif text-slate-300">29</div>
              <div>
                <h4 className="text-white font-medium">Surat Al-Mulk</h4>
                <p className="text-xs text-slate-400">Jumat, 29 Nov 2025 • 14:15</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge text="Belum Lulus" type="warning" />
              <span className="text-white font-bold">75</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
export default Dashboard;