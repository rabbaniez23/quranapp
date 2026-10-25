// --- LOGIKA PENCOCOKAN HAFALAN PER KATA ---
// Teks dari mikrofon (Google Speech, ejaan Arab biasa) dibandingkan dengan teks mushaf (Utsmani)
// kata demi kata secara BERURUTAN, supaya ketahuan kata yang benar, salah, atau terlewat.
//
// Status kata:
//   correct   = dibaca benar
//   corrected = sempat salah, lalu dibenarkan
//   wrong     = dibaca salah (mirip tapi beda)
//   skipped   = terlewat (kata sesudahnya sudah dibaca)
//   given     = sudah dibuka dari awal (ayat sebelum titik mulai)

// Harakat, tanda waqaf, alif kecil, dan tanda-tanda Utsmani lainnya
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g;

// Berapa kata ke depan yang dicek kalau ada kata terlewat
const MAX_SKIP = 5;
// Berapa kata ke belakang yang dianggap "mengulang" (bukan salah)
const REPEAT_WINDOW = 10;

// --- 1. NORMALIZER (KERANGKA HURUF) ---
// Ejaan Utsmani dan ejaan biasa sering beda di alif & hamzah (ٱلرَّحْمَـٰنِ vs الرحمن,
// ٱلصَّلَوٰةَ vs الصلاة). Supaya adil, keduanya diubah jadi kerangka huruf yang sama.
// Alif/hamzah di AWAL kata tetap disimpan, karena membedakan ٱللَّهِ (Allahi) dan لِلَّهِ (lillahi).
export const normalizeArabic = (text) => {
  if (!text) return '';
  const clean = text
    .replace(/ـ/g, '')            // tatweel (ـ)
    .replace(/و(?=ٰ)/g, '')        // waw Utsmani yang dibaca alif: صلوٰة, زكوٰة, حيوٰة
    .replace(DIACRITICS, '')
    .replace(/ٱ/g, 'ا')                 // alif washal (di luar rentang huruf dasar)
    .replace(/[^ء-ي]/g, '');  // buang spasi, angka, huruf latin
  const head = /^[أإآاء]/.test(clean) ? 'ا' : '';
  return head + clean
    .replace(/^[ٱأإآاء]+/, '')
    .replace(/[ٱأإآاءئؤ]/g, '')         // alif & hamzah di tengah/akhir kata
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
};

// Ta'awudz, basmalah, dan penutup yang boleh dibaca di awal ayat tanpa dianggap salah
const OPENING_WORDS = new Set(
  'أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم صدق الله العظيم'
    .split(' ')
    .map(normalizeArabic)
);

// --- 2. PEMECAH KATA AYAT ---
// Tanda waqaf yang berdiri sendiri (ۛ ۖ ۚ) atau ۞ bukan kata, jadi ditempel ke kata di sebelahnya.
export const splitAyatWords = (text) => {
  const words = [];
  let prefix = '';
  for (const part of (text || '').split(/\s+/).filter(Boolean)) {
    const skeleton = normalizeArabic(part);
    if (!skeleton) {
      if (words.length) words[words.length - 1].text += ` ${part}`;
      else prefix += `${part} `;
      continue;
    }
    words.push({ text: prefix + part, skeleton });
    prefix = '';
  }
  return words;
};

const tokenize = (text) =>
  (text || '')
    .split(/\s+/)
    .map((raw) => ({ raw, sk: normalizeArabic(raw) }))
    .filter((t) => t.sk);

// --- 3. RUMUS KEMIRIPAN (LEVENSHTEIN) ---
export const similarity = (a, b) => {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
};

// Huruf di depan kata yang mengubah bacaan: وَ فَ بِ كَ لِ dan alif "al-" (الذين ≠ والذين, الله ≠ بالله)
const PREFIX_LETTERS = 'وفبكلا';

// Kata pendek (≤2 huruf, mis. لا من في) harus persis sama.
// strict = dipakai saat menebak kata terlewat, supaya tidak salah tebak.
const isMatch = (spoken, target, strict = false) => {
  if (!spoken || !target) return false;
  if (spoken === target) return true;
  if (spoken[0] !== target[0] && (PREFIX_LETTERS.includes(spoken[0]) || PREFIX_LETTERS.includes(target[0]))) {
    return false;
  }
  const len = Math.max(spoken.length, target.length);
  if (len <= 2) return false;
  const score = similarity(spoken, target);
  if (strict) return len >= 4 && score >= 0.8;
  return score >= (len <= 3 ? 0.66 : 0.75);
};

// Mode longgar (Google): tulisan Google sering meleset 1-2 huruf dari bacaan yang sebenarnya benar
// (tanpa harakat, hamzah/ta marbuthah beda). Kata ≥4 huruf yang ±60% sama dianggap benar,
// asal huruf depannya tidak berbeda (وَ فَ بِ لِ كَ / al- tetap menentukan).
const MIRIP_LONGGAR = 0.6;
// Di bawah kemiripan ini kata yang terdengar dianggap salah dengar Google (bukan bacaan lain): diabaikan
const BEDA_JAUH = 0.3;
const isMatchLonggar = (spoken, target) => {
  if (isMatch(spoken, target)) return true;
  if (spoken[0] !== target[0] && (PREFIX_LETTERS.includes(spoken[0]) || PREFIX_LETTERS.includes(target[0]))) {
    return false;
  }
  return Math.max(spoken.length, target.length) >= 4 && similarity(spoken, target) >= MIRIP_LONGGAR;
};


// --- 4. PENCOCOKAN BERURUTAN ---
// expected  : daftar kata satu halaman [{ skeleton, wordIdx }]
// base      : status hasil sesi mic sebelumnya { status: [], heard: [] }
// startPos  : posisi kata yang ditunggu saat sesi mic ini mulai
// finalText : teks yang sudah pasti dari Google
// interimText: teks sementara (kata terakhirnya bisa masih berubah)
// strict    : mode ketat. Kalau salah/terlewat, posisi BERHENTI di kata itu sampai dibaca benar
//             (boleh mengulang dari awal ayat). Mode longgar menandai merah lalu lanjut.
// longgar   : untuk Google. Teks sementara hanya boleh MEMBUKA kata (tidak pernah menyalahkan, karena
//             tebakan sementara Google masih berubah-ubah), ejaan yang sedikit meleset diterima, dan kata
//             yang sama sekali tidak mirip dianggap salah dengar (diabaikan).
// Dihitung ulang dari awal sesi setiap ada hasil baru, jadi kalau Google merevisi tebakannya,
// statusnya ikut terkoreksi.
export const alignRecitation = (expected, base, startPos, finalText, interimText = '', { strict = false, longgar = false } = {}) => {
  const finalTokens = tokenize(finalText);
  const interimTokens = tokenize(interimText);
  const tokens = [...finalTokens, ...interimTokens];
  const status = [...base.status];
  const heard = [...base.heard];
  let pos = startPos;

  const markCorrect = (p) => {
    status[p] = status[p] === 'wrong' ? 'corrected' : 'correct';
  };

  // Mengulang dari awal ayat (atau beberapa kata sebelumnya) tidak dianggap salah
  const isRepeat = (sk) => {
    const window = Math.max(REPEAT_WINDOW, expected[pos].wordIdx + 5);
    for (let p = pos - 1; p >= Math.max(0, pos - window); p--) {
      if (isMatch(sk, expected[p].skeleton)) return true;
    }
    return false;
  };

  // Cari kata di depan yang cocok. Hasil: jumlah kata terlewat, 0 = tidak ada, -1 = tunggu kata berikutnya.
  const findSkip = (sk, next) => {
    for (let k = 1; k <= MAX_SKIP && pos + k < expected.length; k++) {
      if (!isMatch(sk, expected[pos + k].skeleton, true)) continue;
      if (k === 1) return k;
      // Lompat lebih dari 1 kata: butuh bukti dari kata berikutnya supaya tidak salah tebak
      const after = expected[pos + k + 1];
      if (!after) return k;
      if (!next) return -1;
      if (isMatch(next.sk, after.skeleton)) return k;
    }
    return 0;
  };

  let i = 0;
  while (i < tokens.length && pos < expected.length) {
    const tok = tokens[i];
    const next = tokens[i + 1];
    const target = expected[pos].skeleton;
    const isTentative = longgar
      ? i >= finalTokens.length
      : interimTokens.length > 0 && i === tokens.length - 1;

    // a. Kata yang ditunggu dibaca benar
    if (isMatch(tok.sk, target)) {
      markCorrect(pos);
      pos++; i++;
      continue;
    }
    // b. Google memecah satu kata jadi dua (يا أيها → يٰٓأَيُّهَا). Alif di depan kata kedua jadi di tengah.
    const disambung = next && tok.sk + next.sk.replace(/^ا/, '');
    if (next && (longgar ? isMatchLonggar(disambung, target) : isMatch(disambung, target, true))) {
      markCorrect(pos);
      pos++; i += 2;
      continue;
    }
    // c. Google menggabung dua kata jadi satu (bukan sekadar kata berikutnya saja, mis. لا terlewat lalu ريب)
    const nextTarget = expected[pos + 1]?.skeleton;
    if (nextTarget && !isMatch(tok.sk, nextTarget) && isMatch(tok.sk, target + nextTarget, true)) {
      markCorrect(pos); markCorrect(pos + 1);
      pos += 2; i++;
      continue;
    }
    // d. Mengulang kata sebelumnya (biasa saat murojaah) → abaikan
    if (isRepeat(tok.sk)) { i++; continue; }
    // e. Ta'awudz / basmalah sebelum ayat → abaikan
    if (expected[pos].wordIdx === 0 && OPENING_WORDS.has(tok.sk)) { i++; continue; }
    // Kata terakhir yang masih sementara: jangan dihukum dulu, tunggu Google yakin
    if (isTentative) break;

    // Mode longgar: tulisan Google yang meleset sedikit tetap dihitung benar
    if (longgar && isMatchLonggar(tok.sk, target)) {
      markCorrect(pos);
      pos++; i++;
      continue;
    }

    // f. Ada kata yang terlewat
    const k = findSkip(tok.sk, next);
    if (k === -1) break;
    // Longgar: Google (terutama di HP) kadang memotong kata panjang yang dibaca dipanjangkan: "يسو" dulu
    // sebagai hasil akhir, "رون" menyusul. Kata akhir yang masih lebih pendek dari kata yang ditunggu dan
    // belum ada hasil akhir sesudahnya → tunggu sisanya (lalu disambung di aturan b), jangan langsung "teet".
    if (longgar && k === 0 && i + 1 >= finalTokens.length && tok.sk.length < target.length) break;
    if (strict) {
      // Mode ketat: tandai salah dan tetap tunggu kata ini dibaca benar.
      // Longgar: kata yang sama sekali tidak mirip (dan bukan kata sesudahnya) = salah dengar Google, diabaikan.
      // (kata pendek butuh kemiripan lebih tinggi: Google sering menyelipkan kata pendek acak seperti يا)
      const batasBeda = Math.max(tok.sk.length, target.length) <= 3 ? 0.5 : BEDA_JAUH;
      const dibacaLain = longgar ? similarity(tok.sk, target) >= batasBeda : tok.sk.length >= 2;
      if (k > 0 || dibacaLain) {
        status[pos] = 'wrong';
        heard[pos] = k > 0 ? `${tok.raw} (kata ini terlewat)` : tok.raw;
      }
      i++;
      continue;
    }
    if (k > 0) {
      for (let p = pos; p < pos + k; p++) {
        if (status[p] !== 'wrong') status[p] = 'skipped';
      }
      markCorrect(pos + k);
      pos += k + 1; i++;
      continue;
    }
    // g. Mirip tapi salah → tandai salah, tetap tunggu kata ini dibaca benar
    if (similarity(tok.sk, target) >= 0.4) {
      status[pos] = 'wrong';
      heard[pos] = tok.raw;
    }
    i++;
  }

  return { status, heard, pos };
};
