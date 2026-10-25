import { Link } from 'react-router-dom';
import { Bagian, Email, HalamanLegal } from '../components/HalamanLegal';

// Halaman publik /ketentuan
const KetentuanPage = () => (
  <HalamanLegal judul="Syarat & Ketentuan" berlaku="25 Oktober 2026"
    pengantar="Dengan mendaftar atau memakai TemanTahfidz, kamu menyetujui ketentuan berikut. Mohon dibaca sebentar.">

    <Bagian judul="1. Tentang layanan">
      <p>TemanTahfidz adalah alat bantu murojaah hafalan Al-Quran. Bacaanmu didengar dan dinilai oleh AI kata
        demi kata. AI bisa keliru, jadi hasilnya untuk membantu latihan, <span className="text-white">bukan pengganti
        guru</span>. Tetap setorkan bacaanmu kepada ustadz/ustadzah.</p>
    </Bagian>

    <Bagian judul="2. Akun">
      <ul className="list-disc pl-5 space-y-2">
        <li>Isi data dengan benar, dan jaga kerahasiaan kata sandimu. Satu akun untuk satu orang.</li>
        <li>Pengguna di bawah 13 tahun memakai layanan dengan pendampingan dan izin orang tua atau guru.</li>
        <li>Kamu bisa menghapus akunmu kapan saja di halaman Akun Saya.</li>
      </ul>
    </Bagian>

    <Bagian judul="3. Yang tidak boleh dilakukan">
      <ul className="list-disc pl-5 space-y-2">
        <li>Memakai bot atau program otomatis, atau sengaja membebani server.</li>
        <li>Mencoba membobol, mengakses akun orang lain, atau mengganggu keamanan website.</li>
        <li>Menyalahgunakan pendaftaran atau fitur email untuk mengirim spam.</li>
        <li>Mengubah teks Al-Quran yang ditampilkan, atau menyalin konten website untuk dijual kembali.</li>
      </ul>
      <p>Akun yang melanggar dapat kami nonaktifkan.</p>
    </Bagian>

    <Bagian judul="4. Masa uji coba dan biaya">
      <p>Saat ini TemanTahfidz masih tahap uji coba dan dapat dipakai gratis. Fitur dan harga bisa berubah di
        kemudian hari. Kalau nanti ada fitur berbayar, kami akan memberitahukannya lebih dulu, dan tidak ada biaya
        yang ditagih tanpa persetujuanmu.</p>
    </Bagian>

    <Bagian judul="5. Konten dari pihak lain">
      <p>Teks Al-Quran, terjemahan, audio murottal, hadits, dan jadwal sholat berasal dari pihak lain dan tetap
        menjadi hak pemiliknya masing-masing. Teks Al-Quran ditampilkan tanpa diubah. Daftar sumber dan lisensinya
        ada di halaman <Link to="/lisensi" className="text-emerald-400 hover:underline">Lisensi &amp; Sumber</Link>.</p>
    </Bagian>

    <Bagian judul="6. Ketersediaan layanan">
      <p>Layanan diberikan sebagaimana adanya. Sesekali website bisa terganggu atau sedang dalam perawatan, dan
        penilaian bacaan dapat memakai metode cadangan. Kami berusaha menjaga layanan tetap berjalan dengan baik,
        tetapi tidak dapat menjamin bebas gangguan.</p>
    </Bagian>

    <Bagian judul="7. Batasan tanggung jawab">
      <p>Sejauh diizinkan hukum, TemanTahfidz tidak bertanggung jawab atas kerugian yang timbul dari penilaian AI
        yang keliru, gangguan layanan, atau penggunaan yang tidak sesuai ketentuan ini.</p>
    </Bagian>

    <Bagian judul="8. Privasi">
      <p>Cara kami mengelola data pribadimu dijelaskan di <Link to="/privasi" className="text-emerald-400 hover:underline">Kebijakan Privasi</Link>.</p>
    </Bagian>

    <Bagian judul="9. Perubahan ketentuan dan hukum yang berlaku">
      <p>Ketentuan ini bisa diperbarui; perubahan penting akan diberitahukan di website. Ketentuan ini tunduk pada
        hukum Republik Indonesia.</p>
    </Bagian>

    <Bagian judul="10. Kontak">
      <p>Pertanyaan, saran, atau laporan bisa dikirim ke <Email />.</p>
    </Bagian>
  </HalamanLegal>
);

export default KetentuanPage;
