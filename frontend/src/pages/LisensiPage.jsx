import { Bagian, HalamanLegal, Tautan } from '../components/HalamanLegal';

const MIT_MUAALEM = `MIT License

Copyright (c) 2025 Abdullah

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const TANZIL = `Tanzil Quran Text (Uthmani, Version 1.1)
Copyright (C) 2007-2024 Tanzil Project
License: Creative Commons Attribution 3.0

This copy of the Quran text is carefully produced, highly verified and
continuously monitored by a group of specialists at Tanzil Project.

TERMS OF USE:
- Permission is granted to copy and distribute verbatim copies of this text,
  but CHANGING IT IS NOT ALLOWED.
- This Quran text can be used in any website or application, provided that
  its source (Tanzil Project) is clearly indicated, and a link is made to
  tanzil.net to enable users to keep track of changes.
- This copyright notice shall be included in all verbatim copies of the text,
  and shall be reproduced appropriately in all files derived from or
  containing substantial portion of this text.

Please check updates at: http://tanzil.net/updates/`;

const Kode = ({ children }) => (
  <pre className="text-xs text-slate-400 bg-slate-950/60 border border-white/5 rounded-xl p-4 overflow-x-auto whitespace-pre">{children}</pre>
);

const Sumber = ({ nama, href, children }) => (
  <li><Tautan href={href}>{nama}</Tautan>: {children}</li>
);

// Halaman publik /lisensi: sumber konten dan perangkat lunak yang dipakai TemanTahfidz
const LisensiPage = () => (
  <HalamanLegal judul="Lisensi & Sumber"
    pengantar="TemanTahfidz dibangun di atas karya banyak pihak. Terima kasih kepada mereka. Berikut sumber konten dan perangkat lunak yang kami pakai beserta lisensinya.">

    <Bagian judul="Model AI pengecekan bacaan">
      <p>Pengecekan bacaan memakai model dan pustaka <Tautan href="https://github.com/obadx/quran-muaalem">Quran Muaalem</Tautan>{' '}
        (model <Tautan href="https://huggingface.co/obadx/muaalem-model-v3_2">obadx/muaalem-model-v3_2</Tautan>)
        dan <Tautan href="https://github.com/obadx/quran-transcript">quran-transcript</Tautan>, keduanya berlisensi MIT.</p>
      <Kode>{MIT_MUAALEM}</Kode>
    </Bagian>

    <Bagian judul="Teks Al-Quran untuk pengecekan">
      <p>Teks Al-Quran yang dipakai mesin pengecekan bersumber dari <Tautan href="https://tanzil.net">Tanzil Project (tanzil.net)</Tautan>,
        dipakai tanpa diubah, dengan ketentuan berikut:</p>
      <Kode>{TANZIL}</Kode>
    </Bagian>

    <Bagian judul="Konten yang ditampilkan">
      <ul className="list-disc pl-5 space-y-2">
        <Sumber nama="Quran.com / Quran Foundation" href="https://quran.com">teks mushaf dan terjemahan di Cek Hafalan.</Sumber>
        <Sumber nama="EQuran.id" href="https://equran.id">teks, terjemahan, dan audio murottal di menu Al-Quran.
          Rekaman audio adalah hak masing-masing qari dan penyedia rekamannya.</Sumber>
        <Sumber nama="Hadis API (hadis-api-id)" href="https://github.com/renomureza">kumpulan hadits beserta terjemahannya.</Sumber>
        <Sumber nama="myQuran API" href="https://api.myquran.com">jadwal sholat, bersumber dari data Kementerian Agama RI.</Sumber>
      </ul>
      <p>Seluruh konten di atas tetap menjadi hak pemiliknya masing-masing.</p>
    </Bagian>

    <Bagian judul="Font, ikon, dan perangkat lunak">
      <ul className="list-disc pl-5 space-y-2">
        <li>Font <Tautan href="https://fonts.google.com/specimen/Inter">Inter</Tautan> dan <Tautan href="https://fonts.google.com/specimen/Playfair+Display">Playfair Display</Tautan> (SIL Open Font License 1.1).</li>
        <li>Ikon <Tautan href="https://lucide.dev">Lucide</Tautan> (ISC).</li>
        <li>React, React Router, Tailwind CSS, dan Vite (MIT).</li>
        <li>FastAPI, SQLAlchemy, dan Uvicorn (MIT/BSD), PyTorch (BSD-3-Clause), Hugging Face Transformers (Apache-2.0).</li>
      </ul>
    </Bagian>
  </HalamanLegal>
);

export default LisensiPage;
