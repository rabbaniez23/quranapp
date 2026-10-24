import { Link } from 'react-router-dom';

const KONTAK = 'temantahfidz0@gmail.com';

const Bagian = ({ judul, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-white">{judul}</h2>
    <div className="space-y-3 text-slate-300 leading-relaxed">{children}</div>
  </section>
);

// Halaman publik /privasi (juga dipakai sebagai link kebijakan privasi di layar persetujuan Google)
const KebijakanPrivasi = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
    <header>
      <h1 className="font-serif text-4xl text-white mb-3">Kebijakan Privasi</h1>
      <p className="text-slate-400">Berlaku sejak 24 Oktober 2026</p>
      <p className="text-slate-300 mt-4 leading-relaxed">
        TemanTahfidz membantu kamu memurojaah hafalan Al-Quran. Halaman ini menjelaskan data apa yang kami
        kumpulkan, untuk apa, dan bagaimana kamu bisa memintanya dihapus.
      </p>
    </header>

    <Bagian judul="Data yang kami kumpulkan">
      <ul className="list-disc pl-5 space-y-2">
        <li><span className="text-white">Data akun:</span> nama, username, alamat email, dan kata sandi.
          Kata sandi hanya disimpan dalam bentuk acak (hash), tidak bisa dibaca siapa pun.</li>
        <li><span className="text-white">Masuk dengan Google:</span> nama, alamat email, dan ID akun Google kamu.
          Kami tidak pernah menerima kata sandi Google kamu.</li>
        <li><span className="text-white">Riwayat murojaah:</span> surat dan ayat yang dibaca, tanggal dan lama
          membaca, jumlah kata benar, serta kata yang perlu diulang beserta catatannya. Data ini dipakai untuk
          halaman Progres Hafalan.</li>
        <li><span className="text-white">Suara bacaan:</span> saat kamu menekan tombol Mulai di Cek Hafalan,
          suara dari mikrofon dikirim ke server kami untuk diperiksa saat itu juga, lalu dibuang. Rekaman suara
          tidak disimpan.</li>
      </ul>
    </Bagian>

    <Bagian judul="Layanan pihak lain">
      <ul className="list-disc pl-5 space-y-2">
        <li><span className="text-white">Google:</span> untuk fitur Masuk dengan Google. Pada kondisi tertentu,
          pengenalan suara juga dapat memakai layanan pengenalan suara bawaan browser (misalnya Google di Chrome),
          yang tunduk pada kebijakan privasi Google.</li>
        <li><span className="text-white">Email:</span> kode verifikasi pendaftaran dikirim lewat layanan email (Gmail).</li>
        <li><span className="text-white">Data Al-Quran, hadits, dan jadwal sholat</span> diambil dari layanan publik
          (api.quran.com, equran.id, myquran.com, dan lainnya) tanpa mengirim data pribadimu.</li>
      </ul>
      <p>Kami <span className="text-white">tidak menjual</span> data kamu dan tidak memakainya untuk iklan.</p>
    </Bagian>

    <Bagian judul="Penyimpanan di browser">
      <p>
        Browser kamu menyimpan tanda masuk (supaya tidak perlu login ulang), kota pilihan untuk jadwal sholat,
        dan tanda bahwa kamu sudah membaca pemberitahuan pengecekan AI. Semua ini bisa dihapus dengan keluar
        dari akun atau membersihkan data situs di browser.
      </p>
    </Bagian>

    <Bagian judul="Keamanan dan lama penyimpanan">
      <p>
        Website memakai koneksi terenkripsi (HTTPS). Data akun dan riwayat murojaah disimpan selama akunmu
        aktif. Kamu bisa meminta akun beserta seluruh datanya dihapus kapan saja dengan mengirim email ke{' '}
        <a href={`mailto:${KONTAK}`} className="text-emerald-400 hover:underline">{KONTAK}</a>{' '}
        dari alamat email akunmu.
      </p>
    </Bagian>

    <Bagian judul="Anak-anak">
      <p>Pengguna di bawah 13 tahun sebaiknya memakai TemanTahfidz dengan pendampingan orang tua atau guru.</p>
    </Bagian>

    <Bagian judul="Perubahan dan kontak">
      <p>
        Kebijakan ini bisa diperbarui; tanggal di atas akan ikut berubah. Pertanyaan apa pun tentang privasi
        bisa dikirim ke <a href={`mailto:${KONTAK}`} className="text-emerald-400 hover:underline">{KONTAK}</a>.
      </p>
    </Bagian>

    <p><Link to="/" className="text-emerald-400 hover:underline">← Kembali ke beranda</Link></p>
  </div>
);

export default KebijakanPrivasi;
