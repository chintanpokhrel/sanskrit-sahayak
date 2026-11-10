// वर्ण — Devanagari ⇄ phoneme list, articulation data, Māheśvara sūtras, pratyāhāra.
// A phoneme is one of: an independent vowel ('अ'…'औ'), a bare consonant letter ('क' = k),
// or a mark ('ं' anusvāra, 'ः' visarga, 'ँ' candrabindu, 'ऽ' avagraha). 'रु' is a display-only token.

export const VOWELS = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ॠ', 'ऌ', 'ॡ', 'ए', 'ऐ', 'ओ', 'औ'];
const MATRA = { 'आ': 'ा', 'इ': 'ि', 'ई': 'ी', 'उ': 'ु', 'ऊ': 'ू', 'ऋ': 'ृ', 'ॠ': 'ॄ', 'ऌ': 'ॢ', 'ॡ': 'ॣ', 'ए': 'े', 'ऐ': 'ै', 'ओ': 'ो', 'औ': 'ौ' };
const MATRA_TO_VOWEL = Object.fromEntries(Object.entries(MATRA).map(([v, m]) => [m, v]));
const VIRAMA = '्';

export const VARGAS = [
  ['क', 'ख', 'ग', 'घ', 'ङ'],
  ['च', 'छ', 'ज', 'झ', 'ञ'],
  ['ट', 'ठ', 'ड', 'ढ', 'ण'],
  ['त', 'थ', 'द', 'ध', 'न'],
  ['प', 'फ', 'ब', 'भ', 'म'],
];
export const ANTAHSTHA = ['य', 'र', 'ल', 'व'];
export const USHMA = ['श', 'ष', 'स', 'ह'];
export const CONSONANTS = [...VARGAS.flat(), ...ANTAHSTHA, ...USHMA];

export const isVowel = (p) => VOWELS.includes(p);
export const isConsonant = (p) => CONSONANTS.includes(p);
export const last = (arr) => arr[arr.length - 1];

/** Devanagari string → phoneme array. Spaces and unknown characters pass through. */
export function parse(str) {
  const s = (str || '').normalize('NFC').replace(/[‌‍़]/g, '');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (isConsonant(c)) {
      out.push(c);
      const n = s[i + 1];
      if (n === VIRAMA) i++;
      else if (MATRA_TO_VOWEL[n]) { out.push(MATRA_TO_VOWEL[n]); i++; }
      else out.push('अ');
    } else out.push(c);
  }
  return out;
}

/** Phoneme array → Devanagari string. */
export function render(ph) {
  let s = '';
  for (let i = 0; i < ph.length; i++) {
    const p = ph[i];
    if (p === 'रु') { s += '(रु)'; continue; }
    if (isConsonant(p)) {
      const n = ph[i + 1];
      if (n === 'अ') { s += p; i++; }
      else if (isVowel(n)) { s += p + MATRA[n]; i++; }
      else s += p + VIRAMA;
    } else s += p;
  }
  return s;
}

/** Name a single phoneme for display: consonant → 'क्', vowel → 'अ'. */
export const show = (p) => (isConsonant(p) ? p + VIRAMA : p);

// ---- Vowel classes -------------------------------------------------------------------------
const BASE = { 'आ': 'अ', 'ई': 'इ', 'ऊ': 'उ', 'ॠ': 'ऋ', 'ॡ': 'ऌ' };
export const baseVowel = (v) => BASE[v] || v;
export const SHORT = ['अ', 'इ', 'उ', 'ऋ', 'ऌ'];
export const LONG_OF = { 'अ': 'आ', 'इ': 'ई', 'उ': 'ऊ', 'ऋ': 'ॠ', 'ऌ': 'ॡ' };

// ---- Sthāna (place of articulation) --------------------------------------------------------
export const STHANA = [
  { key: 'kantha', name: 'कण्ठ', letters: ['अ', 'आ', 'क', 'ख', 'ग', 'घ', 'ङ', 'ह', 'ः'], rule: 'अकुहविसर्जनीयानां कण्ठः' },
  { key: 'talu', name: 'तालु', letters: ['इ', 'ई', 'च', 'छ', 'ज', 'झ', 'ञ', 'य', 'श'], rule: 'इचुयशानां तालु' },
  { key: 'murdha', name: 'मूर्धा', letters: ['ऋ', 'ॠ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'र', 'ष'], rule: 'ऋटुरषाणां मूर्धा' },
  { key: 'danta', name: 'दन्त', letters: ['ऌ', 'ॡ', 'त', 'थ', 'द', 'ध', 'न', 'ल', 'स'], rule: 'लृतुलसानां दन्ताः' },
  { key: 'oshtha', name: 'ओष्ठ', letters: ['उ', 'ऊ', 'प', 'फ', 'ब', 'भ', 'म'], rule: 'उपूपध्मानीयानामोष्ठौ' },
  { key: 'kanthatalu', name: 'कण्ठ-तालु', letters: ['ए', 'ऐ'], rule: 'एदैतोः कण्ठतालु' },
  { key: 'kanthoshtha', name: 'कण्ठ-ओष्ठ', letters: ['ओ', 'औ'], rule: 'ओदौतोः कण्ठोष्ठम्' },
  { key: 'dantoshtha', name: 'दन्त-ओष्ठ', letters: ['व'], rule: 'वकारस्य दन्तोष्ठम्' },
  { key: 'nasika', name: 'नासिका', letters: ['ङ', 'ञ', 'ण', 'न', 'म', 'ं'], rule: 'ञमङणनानां नासिका च · नासिकाऽनुस्वारस्य' },
];

export function vargaOf(c) {
  for (let v = 0; v < 5; v++) {
    const pos = VARGAS[v].indexOf(c);
    if (pos >= 0) return { varga: v, pos };
  }
  return null;
}

/** Ābhyantara prayatna, per LSK: स्पृष्टं स्पर्शानाम्, ईषत्स्पृष्टमन्तःस्थानाम्, विवृतमूष्मणां स्वराणां च. */
export function abhyantara(p) {
  if (vargaOf(p)) return 'स्पृष्ट';
  if (ANTAHSTHA.includes(p)) return 'ईषत्स्पृष्ट';
  if (USHMA.includes(p) || isVowel(p)) return 'विवृत';
  return null;
}

export function describe(p) {
  const sthana = STHANA.filter((s) => s.letters.includes(p)).map((s) => s.name);
  const d = { sthana, abhyantara: abhyantara(p) };
  if (isConsonant(p)) {
    const vg = vargaOf(p);
    const aghosha = (vg && vg.pos <= 1) || ['श', 'ष', 'स'].includes(p);
    const maha = (vg && (vg.pos === 1 || vg.pos === 3)) || USHMA.includes(p);
    d.ghosha = aghosha ? 'अघोष' : 'घोष';
    d.prana = maha ? 'महाप्राण' : 'अल्पप्राण';
    if (vg && vg.pos === 4) d.nasal = true;
  } else if (isVowel(p)) {
    d.matra = SHORT.includes(p) ? 'ह्रस्व' : (['ए', 'ऐ', 'ओ', 'औ'].includes(p) ? 'दीर्घ (सन्ध्यक्षर)' : 'दीर्घ');
  }
  return d;
}

/** सवर्ण (1.1.9 + vārttika ऋ~ऌ + 1.1.10 नाज्झलौ). */
export function savarna(a, b) {
  if (isVowel(a) !== isVowel(b)) return false; // 1.1.10
  if (isVowel(a)) {
    const x = baseVowel(a), y = baseVowel(b);
    if (['ए', 'ओ', 'ऐ', 'औ'].includes(x) || ['ए', 'ओ', 'ऐ', 'औ'].includes(y)) return x === y;
    const rl = (v) => (v === 'ऋ' || v === 'ऌ' ? 'ऋ' : v); // ऋलृवर्णयोर्मिथः सावर्ण्यं वाच्यम्
    return rl(x) === rl(y);
  }
  const va = vargaOf(a), vb = vargaOf(b);
  if (va && vb) return va.varga === vb.varga;
  return a === b;
}

// ---- Māheśvara sūtras & pratyāhāra ---------------------------------------------------------
// The last item of each sūtra is its इत् (anubandha).
export const MAHESHVARA = [
  ['अ', 'इ', 'उ', 'ण'], ['ऋ', 'ऌ', 'क'], ['ए', 'ओ', 'ङ'], ['ऐ', 'औ', 'च'],
  ['ह', 'य', 'व', 'र', 'ट'], ['ल', 'ण'], ['ञ', 'म', 'ङ', 'ण', 'न', 'म'], ['झ', 'भ', 'ञ'],
  ['घ', 'ढ', 'ध', 'ष'], ['ज', 'ब', 'ग', 'ड', 'द', 'श'], ['ख', 'फ', 'छ', 'ठ', 'थ', 'च', 'ट', 'त', 'व'],
  ['क', 'प', 'य'], ['श', 'ष', 'स', 'र'], ['ह', 'ल'],
];

/** Flattened sequence: {l, it, s (sūtra index), i (position)}. */
export const SEQ = MAHESHVARA.flatMap((row, s) => row.map((l, k) => ({ l, it: k === row.length - 1, s, k })));

/** The 41 pratyāhāras Pāṇini uses (अण् counted once; see note on ण्). */
export const PRATYAHARAS = ['अण्', 'अक्', 'अच्', 'अट्', 'अम्', 'अश्', 'अल्', 'इक्', 'इच्', 'इण्', 'उक्', 'एङ्', 'एच्', 'ऐच्',
  'हश्', 'हल्', 'यण्', 'यम्', 'यञ्', 'यय्', 'यर्', 'वश्', 'वल्', 'रल्', 'मय्', 'ङम्', 'झष्', 'झश्', 'झय्', 'झर्', 'झल्',
  'भष्', 'जश्', 'बश्', 'खय्', 'खर्', 'छव्', 'चय्', 'चर्', 'शर्', 'शल्'];

// इण् always closes at the second ण् (लण्). अण् closes at the first (अइउण्) except in 1.1.69.
const SECOND_N = new Set(['इण्']);

/** Range in SEQ for a pratyāhāra; `useSecondN` forces the later ण्. Returns null if invalid. */
export function pratyaharaRange(name, useSecondN = false) {
  const ph = parse(name);
  const start = ph[0], it = last(ph);
  const sIdx = SEQ.findIndex((e) => !e.it && e.l === start);
  if (sIdx < 0) return null;
  const its = SEQ.map((e, i) => (e.it && e.l === it && i > sIdx ? i : -1)).filter((i) => i >= 0);
  if (!its.length) return null;
  const eIdx = (it === 'ण' && (useSecondN || SECOND_N.has(name)) && its.length > 1) ? its[1] : its[0];
  return { start: sIdx, end: eIdx };
}

export function pratyaharaMembers(name, useSecondN = false) {
  const r = pratyaharaRange(name, useSecondN);
  if (!r) return [];
  return SEQ.slice(r.start, r.end + 1).filter((e) => !e.it).map((e) => e.l)
    .filter((l, i, a) => a.indexOf(l) === i); // ह appears twice
}

/** Membership including savarṇa long vowels (अणुदित्सवर्णस्य चाप्रत्ययः). */
export function inP(p, name) {
  if (!p) return false;
  return pratyaharaMembers(name).includes(isVowel(p) ? baseVowel(p) : p);
}

/** Build the name of a pratyāhāra from a start letter and an it letter. */
export const pratyaharaName = (start, it) => render([start, ...(isConsonant(start) ? ['अ'] : []), it]);

// ---- Number formatting ---------------------------------------------------------------------
const DEV_DIGITS = '०१२३४५६७८९';
export const toDevDigits = (s) => String(s).replace(/[0-9]/g, (d) => DEV_DIGITS[d]);
/** '6.1.77' → '६।१।७७'; vārttika ids pass through as 'वार्त्तिक'. */
export const sutraNum = (id) => (/^\d/.test(id) ? toDevDigits(id.replace(/\./g, '।')) : 'वार्त्तिक');
