import { BarChart3, BookOpen, Clock, LayoutDashboard, Mic, Newspaper, ScrollText } from 'lucide-react';

// Menu aplikasi setelah masuk. "match" = alamat lain yang juga dianggap menu ini aktif.
export const MENU = [
  {
    grup: 'Utama',
    items: [
      { to: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
      { to: '/cek-hafalan', label: 'Cek Hafalan', icon: Mic, badge: 'AI' },
      { to: '/progres', label: 'Progres Hafalan', icon: BarChart3 },
    ],
  },
  {
    grup: 'Belajar',
    items: [
      { to: '/pilih-surat', label: 'Al-Quran', icon: BookOpen, match: ['/quran-digital'] },
      { to: '/hadits', label: 'Hadits', icon: ScrollText },
      { to: '/artikel', label: 'Artikel', icon: Newspaper },
    ],
  },
  {
    grup: 'Ibadah',
    items: [{ to: '/jadwal-sholat', label: 'Jadwal Sholat', icon: Clock }],
  },
];

// "Naufal Rizki Rabbani" → "NR"
export const initials = (nama = '') =>
  nama.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
