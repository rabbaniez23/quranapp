import { Link } from 'react-router-dom';
import { Bagian, Email, HalamanLegal } from '../components/HalamanLegal';

// Halaman publik /privasi (juga dipakai sebagai link kebijakan privasi di layar persetujuan Google)
const KebijakanPrivasi = () => (
  <HalamanLegal judul="Kebijakan Privasi" berlaku="25 Oktober 2026"
    pengantar="TemanTahfidz membantu kamu memurojaah hafalan Al-Quran. Halaman ini menjelaskan data apa yang kami kumpulkan, untuk apa, berapa lama disimpan, dan bagaimana kamu bisa menghapusnya.">

    <Bagian judul="Data yang kami kumpulkan">
      <ul className="list-disc pl-5 space-y-2">
        <li><span className="text-white">Data akun:</span> nama, username, alamat email, dan kata sandi.
          Kata sandi hanya disimpan dalam bentuk acak (hash), tidak bisa dibaca siapa pun termasuk kami.</li>
        <li><span className="text-white">Masuk dengan Google:</span> nama, alamat email, dan ID akun Google kamu.
          Kami tidak pernah menerima kata sandi Google kamu.</li>
        <li><span className="text-white">Riwayat murojaah:</span> surat dan ayat yang dibaca, tanggal dan lama
          membaca, jumlah kata benar, serta kata yang perlu diulang beserta catatannya. Data ini dipakai untuk
          halaman Progres Hafalan.</li>
        <li><span className="text-white">Suara bacaan:</span> saat kamu menekan tombol Mulai di Cek Hafalan,
          suara dari mikrofon dikirim ke server kami untuk diperiksa saat itu juga, lalu dibuang. Rekaman suara
          tidak disimpan.</li>
        <li><span className="text-white">Catatan teknis:</span> alamat IP dan waktu akses dicatat sementara di
          log server untuk keamanan (mis. mencegah tebak-tebakan kata sandi).</li>
      </ul>
    </Bagian>

    <Bagian judul="Untuk apa data dipakai">
      <p>Hanya untuk menjalankan layanan: masuk ke akun, menyimpan dan menampilkan progres hafalan, mengirim
        kode verifikasi atau kode ganti kata sandi ke email, dan menjaga keamanan website.</p>
      <p>Kami <span className="text-white">tidak menjual</span> data kamu dan tidak memakainya untuk iklan.</p>
    </Bagian>

    <Bagian judul="Layanan pihak lain">
      <ul className="list-disc pl-5 space-y-2">
        <li><span className="text-white">Google:</span> untuk fitur Masuk dengan Google. Pada kondisi tertentu,
          pengenalan suara juga dapat memakai layanan pengenalan suara bawaan browser (misalnya Google di Chrome),
          yang tunduk pada kebijakan privasi Google.</li>
        <li><span className="text-white">Email:</span> kode verifikasi dan kode ganti kata sandi dikirim lewat layanan email (Gmail).</li>
        <li><span className="text-white">Cloudflare:</span> meneruskan lalu lintas website dengan aman (HTTPS).</li>
        <li><span className="text-white">Data Al-Quran, hadits, dan jadwal sholat</span> diambil langsung oleh browser
          dari layanan publik tanpa mengirim data akunmu. Daftar lengkapnya ada di <Link to="/lisensi" className="text-emerald-400 hover:underline">Lisensi &amp; Sumber</Link>.</li>
      </ul>
    </Bagian>

    <Bagian judul="Penyimpanan di browser">
      <p>Browser kamu menyimpan tanda masuk (supaya tidak perlu login ulang), kota pilihan untuk jadwal sholat,
        dan tanda bahwa kamu sudah membaca pemberitahuan pengecekan AI. Semua ini bisa dihapus dengan keluar dari
        akun atau membersihkan data situs di browser.</p>
    </Bagian>

    <Bagian judul="Keamanan, penyimpanan, dan cadangan">
      <p>Website memakai koneksi terenkripsi (HTTPS). Data akun dan riwayat murojaah disimpan di server kami di
        Indonesia selama akunmu aktif. Database dicadangkan otomatis setiap hari dan salinan cadangan disimpan
        paling lama 14 hari. Pendaftaran yang belum diverifikasi dihapus setelah kodenya kedaluwarsa.</p>
      <p>Kalau terjadi kebocoran data yang menyangkut data pribadimu, kami akan memberi tahu kamu paling lambat
        3×24 jam setelah mengetahuinya, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>
    </Bagian>

    <Bagian judul="Hak kamu">
      <ul className="list-disc pl-5 space-y-2">
        <li>Melihat data akunmu di halaman <span className="text-white">Akun Saya</span>, dan riwayatmu di Progres Hafalan.</li>
        <li><span className="text-white">Menghapus akun</span> beserta seluruh riwayat murojaah kapan saja lewat
          halaman Akun Saya (salinan cadangan ikut terhapus paling lambat 14 hari kemudian).</li>
        <li>Meminta salinan data atau mengajukan pertanyaan lewat email ke <Email />.</li>
      </ul>
    </Bagian>

    <Bagian judul="Anak-anak">
      <p>Pengguna di bawah 13 tahun sebaiknya memakai TemanTahfidz dengan pendampingan dan izin orang tua atau guru.</p>
    </Bagian>

    <Bagian judul="Perubahan dan kontak">
      <p>Kebijakan ini bisa diperbarui; tanggal di atas akan ikut berubah, dan perubahan penting akan kami
        beritahukan di website. Pertanyaan apa pun tentang privasi bisa dikirim ke <Email />.</p>
    </Bagian>
  </HalamanLegal>
);

export default KebijakanPrivasi;
