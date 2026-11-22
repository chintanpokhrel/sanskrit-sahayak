// तिङन्त इन्जिन — प्रथम गणसमूह (भ्वादि, दिवादि, तुदादि, चुरादि), कर्तृवाच्य, सार्वधातुक लकार
// (लट्, लोट्, लङ्, विधिलिङ्).
//
// Order follows अष्टाध्यायी सहजबोध, भाग १ (सार्वधातुक खण्ड):
//   1. धातु + विकरण → अङ्ग. The four gaṇas of this group always yield an अदन्त अङ्ग.
//      Special (अपवाद) dhātus are handled before the general classes.
//   2. Ready-made endings of the first gaṇa group are attached to the अदन्त अङ्ग. The join
//      depends only on the ending's first sound (six classes, JOIN below).
// Every step records the sūtra(s) it uses, so the UI can show the derivation and sweep sūtras.

import { parse, render, isVowel, inP, sutraNum as sutraLabel } from './varna.js';
import { DHATUS, GANAS, dhatuById } from './content/dhatu.js';
import { TIN } from './content/rupa.js';
import { sandhi } from './sandhi.js';

export { DHATUS, GANAS, dhatuById };

export const LAKARAS = [
  { key: 'lat', name: 'लट्', s: '3.2.123', use: 'वर्तमान' },
  { key: 'lot', name: 'लोट्', s: '3.3.162', use: 'आज्ञा, प्रार्थना' },
  { key: 'lan', name: 'लङ्', s: '3.2.111', use: 'अनद्यतन भूत' },
  { key: 'lin', name: 'विधिलिङ्', s: '3.3.161', use: 'विधि, सम्भावना' },
];
export const PADA = { P: 'परस्मैपद', A: 'आत्मनेपद' };

/** The 74 endings of the first gaṇa group, already shaped for an अदन्त अङ्ग. '|' separates alternatives. */
export const ENDINGS = {
  lat: { P: [['ति', 'तः', 'अन्ति'], ['सि', 'थः', 'थ'], ['मि', 'वः', 'मः']], A: [['ते', 'इते', 'अन्ते'], ['से', 'इथे', 'ध्वे'], ['ए', 'वहे', 'महे']] },
  lot: { P: [['तु|तात्', 'ताम्', 'अन्तु'], ['|तात्', 'तम्', 'त'], ['आनि', 'आव', 'आम']], A: [['ताम्', 'इताम्', 'अन्ताम्'], ['स्व', 'इथाम्', 'ध्वम्'], ['ऐ', 'आवहै', 'आमहै']] },
  lan: { P: [['त्', 'ताम्', 'अन्'], ['स्', 'तम्', 'त'], ['अम्', 'व', 'म']], A: [['त', 'इताम्', 'अन्त'], ['थाः', 'इथाम्', 'ध्वम्'], ['इ', 'वहि', 'महि']] },
  lin: { P: [['इत्', 'इताम्', 'इयुः'], ['इः', 'इतम्', 'इत'], ['इयम्', 'इव', 'इम']], A: [['ईत', 'ईयाताम्', 'ईरन्'], ['ईथाः', 'ईयाथाम्', 'ईध्वम्'], ['ईय', 'ईवहि', 'ईमहि']] },
};

/** How an ending joins an अदन्त अङ्ग — decided by its first sound alone. */
export const JOIN = {
  pararupa: { s: '6.1.97', label: 'ह्रस्व अ वा ए बाट सुरु', n: 'अतो गुणे: अङ्गको अ र प्रत्ययको अ/ए मिलेर पछिल्लो (पररूप) मात्र रहन्छ।' },
  dirgha: { s: '6.1.101', label: 'आ बाट सुरु', n: 'अकः सवर्णे दीर्घः: अ + आ = आ।' },
  vrddhi: { s: '6.1.88', label: 'ऐ बाट सुरु', n: 'वृद्धिरेचि: अ + ऐ = ऐ।' },
  guna: { s: '6.1.87', label: 'इ वा ई बाट सुरु', n: 'आद्गुणः: अ + इ/ई = ए।' },
  yanadi: { s: '7.3.101', label: 'व वा म (यञ्) बाट सुरु', n: 'अतो दीर्घो यञि: अङ्गको अ दीर्घ (आ) हुन्छ।' },
  none: { s: null, label: 'बाँकी व्यञ्जनबाट सुरु', n: 'कुनै कार्य छैन — सिधै जोड्ने।' },
  zero: { s: null, label: 'प्रत्यय लोप', n: 'सिप् → हि, अदन्त अङ्गपछि हि को लोप (अतो हेः ६।४।१०५)। अङ्ग जस्ताको तस्तै।' },
};
export const JOIN_ORDER = ['pararupa', 'dirgha', 'vrddhi', 'guna', 'yanadi', 'none', 'zero'];

export function joinClass(ending) {
  const x = parse(ending)[0];
  if (!x) return 'zero';
  if (x === 'अ' || x === 'ए') return 'pararupa';
  if (x === 'आ') return 'dirgha';
  if (x === 'ऐ') return 'vrddhi';
  if (x === 'इ' || x === 'ई') return 'guna';
  if (inP(x, 'यञ्')) return 'yanadi';
  return 'none';
}

/** सार्वधातुक प्रत्ययका चार वर्ग for one cell of ENDINGS. pit = प् इत् (or made पित्). */
export function endingVarga(lk, pada, p, n, ending) {
  const pit = (lk === 'lat' || lk === 'lan') ? pada === 'P' && n === 0
    : lk === 'lot' ? (p === 2) || (pada === 'P' && p === 0 && n === 0 && ending === 'तु') : false;
  const x = parse(ending)[0];
  return { pit, aj: !!x && isVowel(x) };
}
export const vargaName = ({ pit, aj }) => `${aj ? 'अजादि' : 'हलादि'} ${pit ? 'पित्' : 'अपित्'}`;

// ---- अङ्ग -------------------------------------------------------------------------------------
const GUNA_OF = { 'इ': ['ए'], 'ई': ['ए'], 'उ': ['ओ'], 'ऊ': ['ओ'], 'ऋ': ['अ', 'र'], 'ॠ': ['अ', 'र'] };
const AYADI = { 'ए': ['अ', 'य'], 'ओ': ['अ', 'व'], 'ऐ': ['आ', 'य'], 'औ': ['आ', 'व'] };
const VRDDHI_AT = { 'अ': ['आ'], 'आ': ['आ'], 'इ': ['ऐ'], 'ई': ['ऐ'], 'ए': ['ऐ'], 'ऐ': ['ऐ'], 'उ': ['औ'], 'ऊ': ['औ'], 'ओ': ['औ'], 'औ': ['औ'], 'ऋ': ['आ', 'र'] };
const IK = ['इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ॠ'];
const EC = ['ए', 'ऐ', 'ओ', 'औ'];

/** अङ्गका वर्ग (सहजबोध): स्वरान्तमा अन्तिम स्वर, हलन्तमा उपधा हेर्ने। */
export const ANGA_VARGA = {
  adanta: 'अदन्त', akaranta: 'आकारान्त', igant: 'इगन्त', ejanta: 'एजन्त', laghu: 'लघु इगुपध', shesha: 'बाँकी हलन्त',
};
export function angaVarga(ph) {
  const x = ph[ph.length - 1];
  if (isVowel(x)) return x === 'अ' ? 'adanta' : x === 'आ' ? 'akaranta' : IK.includes(x) ? 'igant' : EC.includes(x) ? 'ejanta' : 'shesha';
  return ['इ', 'उ', 'ऋ'].includes(ph[ph.length - 2]) ? 'laghu' : 'shesha';
}

const st = (f, s, n) => ({ f, s: [].concat(s || []), n });

/** Rule lab: `off` is a Set of sūtra ids that must not fire. The derivation then takes whatever path the
 *  remaining rules give — usually the general rule (utsarga) that the switched-off rule overrides. */
const on = (off, id) => !off?.has(id);
const SP_SUTRA = { adesha: '7.3.78', chh: '7.3.77', kram: '7.3.76', shamadi: '7.3.74', hali: '8.2.77', mucadi: '7.1.59', rtid: '7.1.100' };
export const TIN_SWITCHABLE = ['7.3.84', '7.3.86', '1.1.5', '6.1.78', '6.4.77', ...Object.values(SP_SUTRA), '7.2.116',
  '6.1.97', '6.1.101', '6.1.87', '6.1.88', '7.3.101', '6.4.71', '6.4.72', '6.1.77'];
const offKey = (off) => (off?.size ? [...off].sort().join(',') : '');
const R = render;
const plus = (...parts) => parts.map((x) => (Array.isArray(x) ? R(x) : x)).join(' + ');

/** Vikaraṇa data: name, sūtra, what remains, its इत् sūtras, and its class. */
const VIK = {
  bhvadi: { name: 'शप्', s: '3.1.68', ph: ['अ'], its: ['1.3.8', '1.3.3', '1.3.9'], pit: true,
    n: 'श् (लशक्वतद्धिते) र प् (हलन्त्यम्) इत् — अ बाँकी। शित् भएकाले सार्वधातुक, प् इत् भएकाले पित्: अजादि पित् सार्वधातुक।' },
  divadi: { name: 'श्यन्', s: '3.1.69', ph: ['य', 'अ'], its: ['1.3.8', '1.3.3', '1.3.9'], pit: false,
    n: 'श् र न् इत् — य बाँकी। शित् → सार्वधातुक; प् इत् छैन → अपित्: हलादि अपित् सार्वधातुक।' },
  tudadi: { name: 'श', s: '3.1.77', ph: ['अ'], its: ['1.3.8', '1.3.9'], pit: false,
    n: 'श् इत् — अ बाँकी। शित् → सार्वधातुक; अपित्: अजादि अपित् सार्वधातुक।' },
};

/** Special (अपवाद) aṅga rules, applied before the general classes — "विशेष पहिले, सामान्य पछि". */
const SPECIAL = {
  adesha(ph, dh, steps) { // ७।३।७८ पिब, जिघ्र, तिष्ठ, पश्य, सीद …
    const to = parse(dh.to);
    steps.push(st(plus(to, ['अ']), '7.3.78', `शित् (शप्) पछि ${R(ph)} को ठाउँमा ${dh.to} आदेश।`));
    steps.push(st(R(to), '6.1.97', `आदेश आफैँ अदन्त छ; त्यसको अ र शप् को अ — अतो गुणे ले पररूप। अङ्ग: ${dh.to}`));
    return to;
  },
  chh(ph, dh, steps, vik) { // ७।३।७७ इष्, गम्, यम् → छ्
    let a = [...ph.slice(0, -1), 'छ'];
    steps.push(st(plus(a, vik.ph), '7.3.77', `शित् पछि ${R(ph)} को अन्तिम वर्ण → छ्।`));
    a = [...ph.slice(0, -1), 'त', 'छ'];
    steps.push(st(plus(a, vik.ph), '6.1.73', 'ह्रस्व स्वरपछि छ — बीचमा तुक् (त्)।'));
    a = [...ph.slice(0, -1), 'च', 'छ'];
    steps.push(st(R([...a, ...vik.ph]), '8.4.40', 'त् को चवर्गसँग योग — श्चुत्व: त् → च्।'));
    return [...a, ...vik.ph];
  },
  kram(ph, dh, steps, vik, pada) { // ७।३।७६
    if (pada !== 'P') return null;
    const a = [...ph]; a[a.length - 2] = 'आ';
    steps.push(st(R([...a, ...vik.ph]), '7.3.76', 'परस्मैपदी शित् पछि क्रम् को अ दीर्घ।'));
    return [...a, ...vik.ph];
  },
  shamadi(ph, dh, steps, vik) { // ७।३।७४
    const a = [...ph]; a[a.length - 2] = 'आ';
    steps.push(st(R([...a, ...vik.ph]), '7.3.74', 'श्यन् पछि शम् आदि आठ धातुको स्वर दीर्घ।'));
    return [...a, ...vik.ph];
  },
  hali(ph, dh, steps, vik) { // ८।२।७७ (दिव् + य)
    const a = [...ph]; a[a.length - 2] = { 'इ': 'ई', 'उ': 'ऊ', 'ऋ': 'ॠ' }[a[a.length - 2]];
    steps.push(st(R([...a, ...vik.ph]), '8.2.77', 'व् अन्त्य भएको धातुको उपधाको इक् दीर्घ, हल् (य) पछि आउँदा।'));
    return [...a, ...vik.ph];
  },
  mucadi(ph, dh, steps, vik) { // ७।१।५९
    const last = ph[ph.length - 1];
    let a = [...ph.slice(0, -1), 'न', last];
    steps.push(st(plus(a, vik.ph), '7.1.59', 'श पछि मुचादि धातुलाई नुम् (न्) — अन्तिम स्वरपछि।'));
    a = [...ph.slice(0, -1), { 'च': 'ञ', 'छ': 'ञ', 'ज': 'ञ', 'प': 'म', 'द': 'न', 'त': 'न' }[last] || 'न', last];
    steps.push(st(R([...a, ...vik.ph]), ['8.3.24', '8.4.58'], 'न् → अनुस्वार (झल् पछि) → परसवर्ण।'));
    return [...a, ...vik.ph];
  },
  rtid(ph, dh, steps, vik) { // ७।१।१००
    const a = [...ph.slice(0, -1), 'इ', 'र'];
    steps.push(st(plus(a, vik.ph), ['7.1.100', '1.1.51'], 'गुण भएन (अपित्); धातुको अन्तिम ॠ → इ, रपर भई इर्।'));
    return [...a, ...vik.ph];
  },
};

function upadeshaSteps(dh) {
  const steps = [];
  if (dh.u !== dh.d) {
    const sat = dh.u[0] === 'ष' && dh.d[0] === 'स', nat = dh.u[0] === 'ण' && dh.d[0] === 'न';
    const its = dh.itS || [...(/ँ/.test(dh.u) ? ['1.3.2'] : []), ...(/्$/.test(dh.u) ? ['1.3.3'] : [])];
    const s = [...its, ...(its.length && !its.includes('1.3.9') ? ['1.3.9'] : []), ...(sat ? ['6.1.64'] : []), ...(nat ? ['6.1.65'] : [])];
    const n = dh.itN || [its.length ? 'उपदेशका अनुबन्ध (इत्) हटे।' : '', sat ? 'सुरुको ष् → स्।' : '', nat ? 'सुरुको ण् → न्।' : ''].filter(Boolean).join(' ');
    steps.push(st(`${dh.u} → ${dh.d}`, s, n));
  }
  let ph = parse(dh.d);
  if (dh.idit) {
    ph = [...ph.slice(0, -1), 'न', ph[ph.length - 1]];
    steps.push(st(R(ph), ['7.1.58', '8.3.24', '8.4.58'], 'इ इत् भएकाले नुम् (न्) — अन्तिम स्वरपछि। न् → अनुस्वार → परसवर्ण न्।'));
  }
  return { ph, steps };
}

/** Rule lab fallback: the aṅga rule that normally joins dhātu + vikaraṇa is off, so the general sandhi engine joins them. */
function joinPlain(ph, vikph, steps, off, why) {
  if (!isVowel(ph[ph.length - 1]) || !isVowel(vikph[0])) return [...ph, ...vikph];
  const r = sandhi(R(ph), R(vikph), { internal: true, off });
  const out = parse(r.result.replace(/ /g, ''));
  steps.push(st(R(out), r.main, `${why} ${r.main ? 'सामान्य अच् सन्धि लाग्यो।' : 'स्वर जस्ताको तस्तै रहे।'}`));
  return out;
}

/** Join a dhātu that ends in ए/ओ/ऐ/औ (after guṇa or as एजन्त) to the vikaraṇa's अ. */
function withVikaranaA(a, steps, note, off) {
  const x = a[a.length - 1];
  if (AYADI[x] && on(off, '6.1.78')) {
    const out = [...a.slice(0, -1), ...AYADI[x], 'अ'];
    steps.push(st(R(out), '6.1.78', `${x} पछि अ — ${x} → ${R(AYADI[x])}${note ? ' ' + note : ''}`));
    return out;
  }
  return [...a, 'अ'];
}

const angaCache = new Map();
/** अङ्ग for a dhātu of the first gaṇa group: { ph, steps } (steps exclude the उपदेश steps). */
export function buildAnga(dh, pada = dh.pada === 'A' ? 'A' : 'P', off) {
  const key = `${dh.id}|${dh.g}|${dh.sp || ''}|${pada}|${offKey(off)}`;
  if (angaCache.has(key)) return angaCache.get(key);
  const up = upadeshaSteps(dh);
  let ph = up.ph;
  const steps = [];

  if (dh.g === 'curadi') {
    steps.push(st(plus(ph, 'णिच्'), '3.1.25', 'चुरादि धातुबाट स्वार्थमा णिच्।'));
    steps.push(st(plus(ph, ['इ']), ['1.3.7', '1.3.3', '1.3.9'], 'ण् (प्रत्ययको सुरुको टवर्ग) र च् इत् — इ बाँकी। ण् इत् भएकाले णित्। णिच् आर्धधातुक (३।४।११४)।'));
    if (dh.adanta) {
      ph = ph.slice(0, -1);
      steps.push(st(plus(ph, ['इ']), ['6.4.48', '1.1.57'], 'उपदेशमै अदन्त अङ्ग, आर्धधातुक पछि — अ लोप। लोप भएको अ स्थानिवत्, त्यसैले उपधा वृद्धि हुँदैन।'));
    } else {
      const v = angaVarga(ph);
      if (v === 'laghu' && on(off, '7.3.86')) {
        const u = ph[ph.length - 2];
        ph = [...ph.slice(0, -2), ...GUNA_OF[u], ph[ph.length - 1]];
        steps.push(st(plus(ph, ['इ']), '7.3.86', `लघु इगुपध: उपधाको ${u} → गुण।`));
      } else if (ph[ph.length - 2] === 'अ' && on(off, '7.2.116')) {
        ph = [...ph.slice(0, -2), 'आ', ph[ph.length - 1]];
        steps.push(st(plus(ph, ['इ']), '7.2.116', 'णित् पछि उपधाको अ → वृद्धि आ।'));
      } else steps.push(st(plus(ph, ['इ']), null, 'उपधा न लघु इक् हो न अ — कुनै अङ्गकार्य छैन।'));
    }
    ph = [...ph, 'इ'];
    steps.push(st(R(ph), '3.1.32', `णिच् अन्त्यमा भएकाले ${R(ph)} पनि धातु।`));
    steps.push(st(plus(ph, 'शप्'), '3.1.68', 'अब यो नयाँ धातुमा शप् — भ्वादि जस्तै।'));
    steps.push(st(plus(ph, ['अ']), ['1.3.8', '1.3.3', '1.3.9'], VIK.bhvadi.n));
    ph = [...ph.slice(0, -1), 'ए'];
    steps.push(st(plus(ph, ['अ']), ['7.3.84', '1.1.3'], 'अङ्गको अन्तिम इक् (इ) → गुण ए।'));
    ph = withVikaranaA(ph, steps, '', off);
  } else {
    const vik = VIK[dh.g];
    steps.push(st(plus(ph, vik.name), vik.s, 'कर्तृवाच्य सार्वधातुक (तिङ्) पछि आउँदा धातु र प्रत्ययको बीचमा विकरण।'));
    steps.push(st(plus(ph, vik.ph), vik.its, vik.n));
    const v = angaVarga(ph);
    const special = dh.sp && on(off, SP_SUTRA[dh.sp]) && SPECIAL[dh.sp]?.(ph, dh, steps, vik, pada);
    const pit = vik.pit || !on(off, '1.1.5');
    if (!vik.pit && pit && (v === 'igant' || v === 'laghu') && !special) steps.push(st(plus(ph, vik.ph), null, '१।१।५ (क्ङिति च) बन्द: अपित् विकरण अघि पनि गुण हुन्छ।'));
    if (special) ph = special;
    else if (pit) { // शप् — गुण हुन्छ
      if (v === 'igant' && !on(off, '7.3.84')) {
        ph = joinPlain(ph, vik.ph, steps, off, '७।३।८४ बन्द: गुण भएन।');
      } else if (v === 'igant') {
        const x = ph[ph.length - 1];
        const g = [...ph.slice(0, -1), ...GUNA_OF[x]];
        steps.push(st(plus(g, ['अ']), ['7.3.84', '1.1.3', ...(x === 'ऋ' || x === 'ॠ' ? ['1.1.51'] : [])], `इगन्त: अङ्गको अन्तिम ${x} → गुण ${R(GUNA_OF[x])}।`));
        ph = withVikaranaA(g, steps, '', off);
      } else if (v === 'ejanta') {
        ph = withVikaranaA(ph, steps, '(एजन्त)।', off);
      } else if (v === 'laghu' && on(off, '7.3.86')) {
        const u = ph[ph.length - 2];
        ph = [...ph.slice(0, -2), ...GUNA_OF[u], ph[ph.length - 1]];
        steps.push(st(R([...ph, ...vik.ph]), '7.3.86', `लघु इगुपध: उपधाको ${u} → गुण ${R(GUNA_OF[u])}।`));
        ph = [...ph, ...vik.ph];
      } else if (v === 'akaranta' && on(off, '6.1.101')) {
        steps.push(st(R(ph), '6.1.101', 'आकारान्त: अङ्गकार्य छैन; आ + अ = आ (सवर्ण दीर्घ)।'));
      } else if (off?.size && isVowel(ph[ph.length - 1])) {
        ph = joinPlain(ph, vik.ph, steps, off, 'अङ्गकार्यको सूत्र बन्द।');
      } else {
        ph = [...ph, ...vik.ph];
        steps.push(st(R(ph), null, 'न इगन्त, न एजन्त, न लघु इगुपध — कुनै अङ्गकार्य छैन। सिधै जोड्ने।'));
      }
    } else { // श्यन्, श — अपित्, ङिद्वत्
      if (v === 'igant' || v === 'laghu') steps.push(st(plus(ph, vik.ph), ['1.2.4', '1.1.5'], 'अपित् सार्वधातुक ङिद्वत् — गुण हुँदैन।'));
      const x = ph[ph.length - 1];
      if (vik.ph[0] === 'अ' && IK.includes(x) && x !== 'ऋ' && x !== 'ॠ' && on(off, '6.4.77')) {
        ph = [...ph.slice(0, -1), ...({ 'इ': ['इ', 'य'], 'ई': ['इ', 'य'], 'उ': ['उ', 'व'], 'ऊ': ['उ', 'व'] }[x]), 'अ'];
        steps.push(st(R(ph), '6.4.77', `अजादि प्रत्यय पछि धातुको ${x} → ${x === 'उ' || x === 'ऊ' ? 'उव्' : 'इय्'}।`));
      } else if (vik.ph[0] === 'अ' && AYADI[x]) {
        ph = withVikaranaA(ph, steps, '(एजन्त)।', off);
      } else if (vik.ph[0] === 'अ' && v === 'akaranta' && on(off, '6.1.101')) {
        steps.push(st(R(ph), '6.1.101', 'आ + अ = आ (सवर्ण दीर्घ)।'));
      } else if (off?.size && isVowel(x) && isVowel(vik.ph[0])) {
        ph = joinPlain(ph, vik.ph, steps, off, 'अङ्गकार्यको सूत्र बन्द।');
      } else {
        ph = [...ph, ...vik.ph];
        if (v !== 'igant' && v !== 'laghu') steps.push(st(R(ph), null, 'कुनै अङ्गकार्य छैन — सिधै जोड्ने।'));
      }
    }
  }
  const out = { pre: up.steps, dhatu: R(up.ph), ph, steps, angaStr: R(ph) };
  angaCache.set(key, out);
  return out;
}

export const padasOf = (dh) => (dh.pada === 'U' ? ['P', 'A'] : [dh.pada]);
const PADA_SUTRA = (dh) => (dh.pada === 'P' ? '1.3.78' : dh.pada === 'A' ? '1.3.12' : dh.g === 'curadi' ? '1.3.74' : '1.3.72');
const PADA_NOTE = { P: 'परस्मैपदी — आत्मनेपदको कारण छैन।', A: 'आत्मनेपदी — अनुदात्त स्वर वा ङ् इत् भएको।', U: 'उभयपदी — फल कर्तालाई: आत्मनेपद, अरूलाई: परस्मैपद।' };

/** One form with its full derivation. → { form, alts, steps } */
export function derive(dhId, lk, pada, p, n, off) {
  const dh = typeof dhId === 'string' ? dhatuById(dhId) : dhId;
  const L = LAKARAS.find((x) => x.key === lk);
  const A = buildAnga(dh, pada, off);
  const tin = (pada === 'P' ? TIN.parasmai : TIN.atmane)[p][n];
  const head = [
    ...A.pre,
    st(A.dhatu, PADA_SUTRA(dh), `${PADA_NOTE[dh.pada]}${dh.pada === 'U' ? ` यहाँ ${PADA[pada]}।` : ''}`),
    st(`${A.dhatu} + ${L.name} → ${A.dhatu} + ${tin}`, [L.s, '3.4.78'], `${L.use} — ${L.name}; त्यसको ठाउँमा तिङ् ${tin}। तिङ् सार्वधातुक (३।४।११३), त्यसैले विकरण आउँछ।`),
    ...A.steps,
  ];
  const results = ENDINGS[lk][pada][p][n].split('|').map((e) => finish(A.ph, e, lk, tin, off));
  return { form: results[0].form, alts: results.slice(1).map((r) => r.form), steps: [...head, ...results[0].steps], altSteps: results.slice(1).map((r) => r.steps), anga: A.angaStr };
}

function finish(anga, e, lk, tin, off) {
  const steps = [];
  let a = anga.slice();
  if (lk === 'lan') {
    if (isVowel(a[0]) && on(off, '6.4.72')) {
      const v = VRDDHI_AT[a[0]];
      steps.push(st(plus(['आ'], a), '6.4.72', 'अजादि अङ्ग — लङ् मा आट् आगम (सुरुमा)।'));
      a = [...v, ...a.slice(1)];
      steps.push(st(R(a), '6.1.90', `आट् + ${anga[0]} → वृद्धि ${R(v)}।`));
    } else if (!isVowel(a[0]) && on(off, '6.4.71')) {
      a = ['अ', ...a];
      steps.push(st(R(a), '6.4.71', 'लङ् मा अङ्गलाई अट् (अ) आगम — सुरुमा।'));
    }
  }
  const E = parse(e);
  steps.push(st(plus(a, e || '(लोप)'), null, `${tin} को प्रथम गणसमूहको तयार प्रत्यय: ${e || 'लोप'}${e === 'तात्' ? ' (तातङ्, विकल्पले — ७।१।३५)' : ''}।`));
  const jc = joinClass(e), J = JOIN[jc];
  let out;
  if (J.s && !on(off, J.s)) { // rule lab: the join rule is off — let the general sandhi engine join instead
    const E0 = E[0], A1 = a[a.length - 1];
    if (E0 && isVowel(E0) && isVowel(A1)) {
      const r = sandhi(R(a), e, { internal: true, off });
      out = parse(r.result.replace(/ /g, ''));
      steps.push(st(R(out), r.main, `${sutraLabel(J.s)} बन्द: ${r.main ? 'सामान्य नियम लाग्यो।' : 'कुनै नियम लागेन।'}`));
    } else {
      out = [...a, ...E];
      steps.push(st(R(out), null, `${sutraLabel(J.s)} बन्द: सिधै जोडियो।`));
    }
    return { form: R(out), steps };
  }
  if (jc === 'pararupa') out = [...a.slice(0, -1), ...E];
  else if (jc === 'dirgha') out = [...a.slice(0, -1), ...E];
  else if (jc === 'vrddhi') out = [...a.slice(0, -1), 'ऐ', ...E.slice(1)];
  else if (jc === 'guna') out = [...a.slice(0, -1), 'ए', ...E.slice(1)];
  else if (jc === 'yanadi') out = [...a.slice(0, -1), 'आ', ...E];
  else out = [...a, ...E];
  if (jc !== 'none' && jc !== 'zero') steps.push(st(R(out), J.s, J.n));
  else steps.push(st(R(out), null, J.n));
  if (out[out.length - 1] === 'स' && E.length === 1) { // लङ् सिप् → स् → रु → विसर्ग
    const r = [...out.slice(0, -1), 'र'];
    steps.push(st(R(r), ['8.2.66', '1.3.2', '1.3.9'], 'पदान्त स् → रु → र्।'));
    out = [...out.slice(0, -1), 'ः'];
    steps.push(st(R(out), '8.3.15', 'अवसानमा र् → विसर्ग।'));
  }
  return { form: R(out), steps };
}

/** 3×3 table of derive() results. */
export const paradigm = (dhId, lk, pada) => [0, 1, 2].map((p) => [0, 1, 2].map((n) => derive(dhId, lk, pada, p, n)));

/** Every (dhātu, lakāra, pada, cell) derivation, indexed by the sūtras it cites. Built once, lazily. */
let sweepIndex = null;
export function tinSweep() {
  if (sweepIndex) return sweepIndex;
  sweepIndex = new Map();
  for (const dh of DHATUS) for (const L of LAKARAS) for (const pada of padasOf(dh)) for (let p = 0; p < 3; p++) for (let n = 0; n < 3; n++) {
    const r = derive(dh, L.key, pada, p, n);
    const ids = new Set(r.steps.flatMap((s) => s.s));
    for (const id of ids) {
      if (!sweepIndex.has(id)) sweepIndex.set(id, []);
      sweepIndex.get(id).push({ dh: dh.id, lk: L.key, pada, p, n, form: r.form });
    }
  }
  return sweepIndex;
}
