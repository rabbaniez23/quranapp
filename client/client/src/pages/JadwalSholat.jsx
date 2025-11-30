import { MapPin, Calendar as CalIcon } from 'lucide-react';
import Card from '../components/ui/Card';

const JadwalSholat = () => {
  const times = [
    { name: "Imsak", time: "04:10" },
    { name: "Subuh", time: "04:20" },
    { name: "Dzuhur", time: "11:45" },
    { name: "Ashar", time: "15:05" },
    { name: "Maghrib", time: "17:55" },
    { name: "Isya", time: "19:08" },
  ];

  return (
    <div className="pt-24 px-4 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
        <div>
           <h1 className="font-serif text-4xl text-white mb-2">Jadwal Sholat</h1>
           <div className="flex items-center gap-4 text-slate-400 text-sm">
             <span className="flex items-center gap-1"><MapPin size={14}/> Jakarta, Indonesia</span>
             <span className="flex items-center gap-1"><CalIcon size={14}/> 29 Nov 2025</span>
           </div>
        </div>
        <div className="text-right">
           <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Sholat Berikutnya</p>
           <h2 className="text-emerald-400 text-3xl font-bold font-serif">Isya 19:08</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {times.map((t, idx) => (
          <Card key={idx} className="text-center py-6" hoverEffect={true}>
            <p className="text-slate-400 text-sm mb-2">{t.name}</p>
            <h3 className="text-2xl font-bold text-white">{t.time}</h3>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default JadwalSholat;