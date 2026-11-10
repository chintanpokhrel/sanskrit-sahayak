// सन्धि इन्जिन — applies Pāṇinian rules to a pair of words and records every step with its sūtra.
// Scope: अच् सन्धि, common हल् सन्धि (stop/म्/न् finals), विसर्ग सन्धि. Upasarga-specific
// exceptions (एङि पररूपम् etc.) are taught in lessons, not computed here.

import { parse, render, isVowel, isConsonant, last, show, baseVowel, savarna, inP, vargaOf, VARGAS, SHORT, LONG_OF } from './varna.js';

export const JASH = { 'क': 'ग', 'ख': 'ग', 'ग': 'ग', 'घ': 'ग', 'च': 'ज', 'छ': 'ज', 'ज': 'ज', 'झ': 'ज', 'ट': 'ड', 'ठ': 'ड', 'ड': 'ड', 'ढ': 'ड', 'त': 'द', 'थ': 'द', 'द': 'द', 'ध': 'द', 'प': 'ब', 'फ': 'ब', 'ब': 'ब', 'भ': 'ब' };
export const CAR = { 'ग': 'क', 'ज': 'च', 'ड': 'ट', 'द': 'त', 'ब': 'प' };
export const NASAL_OF = { 'ग': 'ङ', 'ज': 'ञ', 'ड': 'ण', 'द': 'न', 'ब': 'म' };
const FOURTH_OF = { 'ग': 'घ', 'ज': 'झ', 'ड': 'ढ', 'द': 'ध', 'ब': 'भ', 'क': 'घ', 'च': 'झ', 'ट': 'ढ', 'त': 'ध', 'प': 'भ' };
export const KHAR = ['क', 'ख', 'च', 'छ', 'ट', 'ठ', 'त', 'थ', 'प', 'फ', 'श', 'ष', 'स'];
export const NASALS = ['ङ', 'ञ', 'ण', 'न', 'म'];
const CU = VARGAS[1], TU = VARGAS[2];
const GUNA = { 'इ': ['ए'], 'उ': ['ओ'], 'ऋ': ['अ', 'र'], 'ऌ': ['अ', 'ल'] };
const VRDDHI = { 'ए': 'ऐ', 'ऐ': 'ऐ', 'ओ': 'औ', 'औ': 'औ' };
export const YAN = { 'इ': 'य', 'उ': 'व', 'ऋ': 'र', 'ऌ': 'ल' };
const AYADI = { 'ए': ['अ', 'य'], 'ओ': ['अ', 'व'], 'ऐ': ['आ', 'य'], 'औ': ['आ', 'व'] };

/** Words whose final visarga comes from र्, not स् (so no रु-rules apply). */
const R_ORIGIN = new Set(['पुनः', 'प्रातः', 'अन्तः', 'स्वः', 'मातः', 'पितः', 'भ्रातः']);
const TAD = new Set(['सः', 'एषः']);

/** For optional (वैकल्पिक) rules: which outcome is the commonly printed primary form. */
const PREFER_APPLY = { '8.3.19': true, '8.3.36': true, '8.4.45': true, '8.4.59': false, '8.4.62': true, '8.4.63': true, '6.1.76': true };

const isAm = (p) => isVowel(p) || ['ह', 'य', 'व', 'र', 'ल', ...NASALS].includes(p);
const isAt = (p) => isVowel(p) || ['ह', 'य', 'व', 'र'].includes(p);

/**
 * sandhi('इति', 'आदि') → { ok, kind, result, alts, steps:[{s, note, from, to, also}], main }
 * opts.internal — joining a suffix inside one pada (no padānta rules).
 * opts.dual     — first word is a dual (प्रगृह्य).
 */
export function sandhi(a, b, opts = {}) {
  const main = run(a, b, opts, true);
  if (!main.ok) return main;
  const other = run(a, b, opts, false);
  main.alts = other.ok && other.result !== main.result ? [other.result] : [];
  return main;
}

// The vowel ऌ is commonly typed as 'लृ' (ल + ऋ-mātrā) because ॢ is hard to reach on keyboards.
const vowelL = (w) => w.replace(/^लृ/, 'ऌ');

function run(a, b, opts, pref) {
  const L = parse(vowelL((a || '').trim())), R = parse(vowelL((b || '').trim()));
  if (!L.length || !R.length) return { ok: false, reason: 'empty' };
  if (L.includes(' ') || R.includes(' ')) return { ok: false, reason: 'oneWord' };
  if (last(L) === 'ं') L[L.length - 1] = 'म';
  const c = { L, R, steps: [], pref, opts, apart: false, main: null, err: null, rOrigin: false };
  let kind;
  const x = last(L), y = R[0];
  if (x === 'स' || x === 'र') { // typed रामस् / पुनर् — treat as the visarga it becomes
    c.rOrigin = x === 'र';
    L[L.length - 1] = 'ः';
  }
  const fx = last(L);
  if (isVowel(fx) && isVowel(y)) { kind = 'ac'; ac(c); }
  else if (isVowel(fx) && isConsonant(y)) { kind = vowelConsonant(c); }
  else if (fx === 'ः' && (isVowel(y) || isConsonant(y))) { kind = 'visarga'; visarga(c); }
  else if (isConsonant(fx) && (isVowel(y) || isConsonant(y))) { kind = 'hal'; hal(c); }
  else return { ok: false, reason: 'unsupported' };
  if (c.err) return { ok: false, reason: c.err };
  return { ok: true, kind, steps: c.steps, main: c.main, result: output(c), alts: [] };
}

const display = (c) => (c.R.length ? render(c.L) + ' + ' + render(c.R) : render(c.L));
const output = (c) => (c.apart ? render(c.L) + ' ' + render(c.R) : render(c.L.concat(c.R)));
const setLast = (c, p) => { c.L[c.L.length - 1] = p; };
const merge = (c) => { c.L = c.L.concat(c.R); c.R = []; };

function step(c, s, note, fn, extra = {}) {
  const from = extra.from || display(c);
  if (fn) fn();
  c.steps.push({ s, note, from, to: extra.to || display(c), also: extra.also || [] });
}
/** Should this optional rule apply in the current run? */
const opt = (c, sid) => c.pref === PREFER_APPLY[sid];

// ---- अच् सन्धि -------------------------------------------------------------------------------
function ac(c) {
  const x = last(c.L), y = c.R[0];
  if (c.opts.dual && ['ई', 'ऊ', 'ए'].includes(x)) {
    step(c, '1.1.11', `द्विवचनको अन्तिम ${x} — प्रगृह्य संज्ञा।`);
    step(c, '6.1.125', 'प्रगृह्य पछि स्वर आए पनि सन्धि हुँदैन (प्रकृतिभाव)।');
    c.apart = true; c.main = '6.1.125'; return;
  }
  if (!c.opts.internal && (x === 'ए' || x === 'ओ') && y === 'अ') {
    step(c, '6.1.109', `पदान्त ${x} पछि ह्रस्व अ — दुवैको ठाउँमा पूर्वरूप (${x})। हटेको अ लाई ऽ ले देखाइन्छ।`,
      () => { c.R[0] = 'ऽ'; }, { also: ['6.1.84'] });
    c.main = '6.1.109'; return;
  }
  if (inP(x, 'अक्') && inP(y, 'अक्') && savarna(x, y)) {
    const bx = baseVowel(x), by = baseVowel(y);
    const v = bx === 'ऌ' && by === 'ऌ' ? 'ॡ' : (['ऋ', 'ऌ'].includes(bx) || ['ऋ', 'ऌ'].includes(by) ? 'ॠ' : LONG_OF[bx]);
    step(c, '6.1.101', `${x} (अक्) पछि सवर्ण ${y} — दुवैको ठाउँमा एउटै दीर्घ ${v}।`,
      () => { c.L.splice(-1, 1, v); c.R.shift(); merge(c); }, { also: ['6.1.84'] });
    c.main = '6.1.101'; return;
  }
  if (x === 'अ' || x === 'आ') {
    const by = baseVowel(y);
    if (GUNA[by]) {
      const g = GUNA[by];
      const also = ['6.1.84', '1.1.50'];
      if (by === 'ऋ' || by === 'ऌ') also.push('1.1.51');
      step(c, '6.1.87', `${x} पछि ${y} (इक्) — दुवैको ठाउँमा गुण ${render(g)}।`,
        () => { c.L.splice(-1, 1, ...g); c.R.shift(); merge(c); }, { also });
      c.main = '6.1.87'; return;
    }
    if (VRDDHI[y]) {
      step(c, '6.1.88', `${x} पछि ${y} (एच्) — दुवैको ठाउँमा वृद्धि ${VRDDHI[y]}।`,
        () => { c.L.splice(-1, 1, VRDDHI[y]); c.R.shift(); merge(c); }, { also: ['6.1.84', '1.1.50'] });
      c.main = '6.1.88'; return;
    }
  }
  if (inP(x, 'इक्')) {
    const yn = YAN[baseVowel(x)];
    step(c, '6.1.77', `${x} (इक्) पछि फरक स्वर ${y} (अच्) — ${x} को ठाउँमा यण् ${show(yn)}।`,
      () => setLast(c, yn), { also: ['1.1.50'] });
    c.main = '6.1.77'; return;
  }
  if (AYADI[x]) {
    const r = AYADI[x];
    step(c, '6.1.78', `${x} (एच्) पछि ${y} (अच्) — ${x} को ठाउँमा ${render(r)}।`,
      () => { c.L.splice(-1, 1, ...r); });
    c.main = '6.1.78';
    if (!c.opts.internal && opt(c, '8.3.19')) {
      step(c, '8.3.19', `पदान्त ${show(last(c.L))} को विकल्पले लोप। लोप असिद्ध भएकाले फेरि सन्धि हुँदैन।`,
        () => { c.L.pop(); c.apart = true; }, { also: ['8.2.1'] });
    }
  }
}

// ---- स्वर + व्यञ्जन -----------------------------------------------------------------------------
function vowelConsonant(c) {
  const x = last(c.L), y = c.R[0];
  if (y === 'छ') {
    const short = SHORT.includes(x);
    if (short || opt(c, '6.1.76')) {
      step(c, short ? '6.1.73' : '6.1.76', `${short ? 'ह्रस्व' : 'पदान्त दीर्घ'} ${x} पछि छ — बीचमा तुक् (त्) आगम।`, () => c.L.push('त'));
      step(c, '8.4.40', 'त् पछि छ (चवर्ग) — त् → च् (श्चुत्व)।', () => setLast(c, 'च'));
      c.main = short ? '6.1.73' : '6.1.76';
      return 'hal';
    }
  }
  c.apart = true;
  return 'none';
}

// ---- हल् सन्धि -------------------------------------------------------------------------------
function hal(c) {
  const f = last(c.L);
  if (JASH[f]) return stopFinal(c);
  if (f === 'म') return mFinal(c);
  if (f === 'न') return nFinal(c);
  c.err = 'unsupported';
}

function stopFinal(c) {
  const f = last(c.L), y = c.R[0];
  if (JASH[f] !== f) step(c, '8.2.39', `पदको अन्त्यमा झल् ${show(f)} → जश् ${show(JASH[f])}।`, () => setLast(c, JASH[f]));
  if (last(c.L) === 'द') {
    if (CU.includes(y) || y === 'श') step(c, '8.4.40', `द् (तवर्ग) पछि ${show(y)} (श्चु) — द् → ज्।`, () => setLast(c, 'ज'));
    else if (TU.includes(y)) step(c, '8.4.41', `द् (तवर्ग) पछि ${show(y)} (टवर्ग) — द् → ड्।`, () => setLast(c, 'ड'));
    else if (y === 'ष') step(c, '8.4.43', 'तवर्ग पछि ष् — ष्टुत्व हुँदैन।');
  }
  const g = last(c.L);
  if (NASALS.includes(y) && NASAL_OF[g] && opt(c, '8.4.45')) {
    step(c, '8.4.45', `${show(g)} पछि अनुनासिक ${show(y)} — विकल्पले ${show(g)} → ${show(NASAL_OF[g])}।`, () => setLast(c, NASAL_OF[g]));
  }
  if (KHAR.includes(y) && CAR[last(c.L)]) {
    const h = last(c.L);
    step(c, '8.4.55', `${show(h)} पछि खर् ${show(y)} — ${show(h)} → चर् ${show(CAR[h])}।`, () => setLast(c, CAR[h]));
  }
  if (y === 'ल' && last(c.L) === 'द') step(c, '8.4.60', 'तवर्ग पछि ल् — द् → ल् (परसवर्ण)।', () => setLast(c, 'ल'));
  if (y === 'ह' && FOURTH_OF[last(c.L)] && opt(c, '8.4.62')) {
    const h = last(c.L);
    step(c, '8.4.62', `${show(h)} (झय्) पछिको ह् → ${show(FOURTH_OF[h])} (पूर्वसवर्ण, विकल्प)।`, () => { c.R[0] = FOURTH_OF[h]; });
  }
  if (y === 'श' && isAt(c.R[1]) && opt(c, '8.4.63')) {
    step(c, '8.4.63', `${show(last(c.L))} (झय्) पछिको श्, त्यसपछि अट् — श् → छ् (विकल्प)।`, () => { c.R[0] = 'छ'; });
  }
  const order = ['8.4.63', '8.4.62', '8.4.60', '8.4.45', '8.4.40', '8.4.41', '8.4.55', '8.2.39'];
  c.main = order.find((s) => c.steps.some((st) => st.s === s)) || null;
}

function mFinal(c) {
  const y = c.R[0];
  if (isVowel(y)) return; // हरिम् + अत्र → हरिमत्र
  step(c, '8.3.23', `पदान्त म् पछि व्यञ्जन ${show(y)} — म् → अनुस्वार।`, () => { setLast(c, 'ं'); c.apart = true; });
  c.main = '8.3.23';
  const vg = vargaOf(y);
  if (vg && opt(c, '8.4.59')) {
    const n = VARGAS[vg.varga][4];
    step(c, '8.4.59', `अनुस्वार पछि ${show(y)} — विकल्पले परसवर्ण ${show(n)}।`, () => { setLast(c, n); c.apart = false; });
  }
}

function nFinal(c) {
  const y = c.R[0], v = c.L[c.L.length - 2];
  if (isVowel(y)) {
    if (SHORT.includes(v)) {
      step(c, '8.3.32', `ह्रस्व ${v} पछिको पदान्त न्, त्यसपछि स्वर — स्वरलाई ङमुट् (न्) आगम।`, () => c.R.unshift('न'));
      c.main = '8.3.32';
    }
    return;
  }
  if (['च', 'छ', 'ट', 'ठ', 'त', 'थ'].includes(y) && isAm(c.R[1])) {
    step(c, '8.3.7', `पदान्त न् पछि ${show(y)} (छव्) र त्यसपछि अम् — न् → रु।`, () => setLast(c, 'रु'));
    step(c, '8.3.4', 'रु अघि अनुस्वार थपिन्छ (वा अघिल्लो स्वर अनुनासिक)।', () => c.L.splice(-1, 0, 'ं'));
    step(c, '8.3.15', 'खर् पछि रु → विसर्ग।', () => setLast(c, 'ः'));
    step(c, '8.3.34', 'खर् पछि विसर्ग → स्।', () => setLast(c, 'स'));
    if (CU.includes(y)) step(c, '8.4.40', 'स् पछि चवर्ग — स् → श्।', () => setLast(c, 'श'));
    if (TU.includes(y)) step(c, '8.4.41', 'स् पछि टवर्ग — स् → ष्।', () => setLast(c, 'ष'));
    c.main = '8.3.7'; return;
  }
  if (['ज', 'झ', 'ञ'].includes(y)) { step(c, '8.4.40', `न् पछि ${show(y)} (चवर्ग) — न् → ञ्।`, () => setLast(c, 'ञ')); c.main = '8.4.40'; return; }
  if (['ड', 'ढ', 'ण'].includes(y)) { step(c, '8.4.41', `न् पछि ${show(y)} (टवर्ग) — न् → ण्।`, () => setLast(c, 'ण')); c.main = '8.4.41'; return; }
  if (y === 'ल') {
    step(c, '8.4.60', 'न् पछि ल् — न् → अनुनासिक ल्ँ (परसवर्ण)।', () => c.L.splice(-1, 1, 'ँ', 'ल'));
    c.main = '8.4.60'; return;
  }
  if (['श', 'ष', 'स'].includes(y)) c.err = 'unsupported';
}

// ---- विसर्ग सन्धि -----------------------------------------------------------------------------
function visarga(c) {
  const word = render(c.L), y = c.R[0];
  const body = c.L.slice(0, -1), v = last(body);
  const rOrigin = c.rOrigin || R_ORIGIN.has(word);
  const right = render(c.R);

  if (TAD.has(word) && isConsonant(y)) {
    step(c, '6.1.132', `${word} (तद्/एतद्) पछि व्यञ्जन — सु (विसर्ग) को लोप।`, () => { c.L.pop(); c.apart = true; });
    c.main = '6.1.132'; return;
  }
  if (rOrigin) {
    step(c, null, `${word} को विसर्ग र् बाट बनेको हो (मूल रूप ${render(body)}र्)। रु होइन — उत्व/यत्व लाग्दैन।`,
      () => setLast(c, 'र'), { from: `${word} + ${right}` });
  } else {
    step(c, '8.2.66', `विसर्गको मूल स् हो (${render(body)}स्)। पदान्त स् → रु।`,
      () => setLast(c, 'रु'), { from: `${render(body)}स् + ${right}` });
  }

  if (KHAR.includes(y)) {
    step(c, '8.3.15', `खर् ${show(y)} पछि आउँदा र् → विसर्ग।`, () => setLast(c, 'ः'));
    if (['क', 'ख', 'प', 'फ'].includes(y)) {
      c.apart = true; c.main = '8.3.15';
      c.steps[c.steps.length - 1].also = ['8.3.37'];
      return;
    }
    if (['श', 'ष', 'स'].includes(y) && opt(c, '8.3.36')) {
      step(c, '8.3.36', `शर् ${show(y)} पछि — विकल्पले विसर्ग नै रहन्छ।`, () => { c.apart = true; });
      c.main = '8.3.36'; return;
    }
    step(c, '8.3.34', `खर् ${show(y)} पछि विसर्ग → स्।`, () => setLast(c, 'स'));
    if (CU.includes(y) || y === 'श') step(c, '8.4.40', `स् पछि ${show(y)} — स् → श्।`, () => setLast(c, 'श'));
    if (TU.includes(y) || y === 'ष') step(c, '8.4.41', `स् पछि ${show(y)} — स् → ष्।`, () => setLast(c, 'ष'));
    c.main = '8.3.34'; return;
  }

  // y is a vowel or a soft consonant (अश्)
  const ru = !rOrigin;
  if (ru && v === 'अ' && y === 'अ') {
    step(c, '6.1.113', 'ह्रस्व अ पछिको रु, त्यसपछि ह्रस्व अ — रु → उ।', () => setLast(c, 'उ'));
    step(c, '6.1.87', 'अ + उ → ओ (गुण)।', () => c.L.splice(-2, 2, 'ओ'));
    step(c, '6.1.109', 'पदान्त ओ पछि अ — पूर्वरूप; अ को ठाउँमा ऽ।', () => { c.R[0] = 'ऽ'; });
    c.main = '6.1.113'; return;
  }
  if (ru && v === 'अ' && isConsonant(y)) {
    step(c, '6.1.114', `ह्रस्व अ पछिको रु, त्यसपछि हश् ${show(y)} — रु → उ।`, () => setLast(c, 'उ'));
    step(c, '6.1.87', 'अ + उ → ओ (गुण)।', () => { c.L.splice(-2, 2, 'ओ'); c.apart = true; });
    c.main = '6.1.114'; return;
  }
  if (ru && (v === 'अ' || v === 'आ')) {
    step(c, '8.3.17', `${v} पछिको रु, त्यसपछि अश् ${show(y)} — रु → य्।`, () => setLast(c, 'य'));
    if (isConsonant(y)) {
      step(c, '8.3.22', `य् पछि व्यञ्जन ${show(y)} — य् को लोप (अनिवार्य)।`, () => { c.L.pop(); c.apart = true; });
      c.main = '8.3.22'; return;
    }
    c.main = '8.3.17';
    if (opt(c, '8.3.19')) {
      step(c, '8.3.19', 'पदान्त य् को विकल्पले लोप। लोप असिद्ध — फेरि सन्धि हुँदैन।', () => { c.L.pop(); c.apart = true; }, { also: ['8.2.1'] });
    }
    return;
  }
  if (ru) step(c, '1.3.2', 'रु को उँ इत् — लोप भई र् मात्र बाँकी।', () => setLast(c, 'र'), { also: ['1.3.9'] });
  if (y === 'र') {
    step(c, '8.3.14', 'र् पछि र् — पहिलो र् को लोप।', () => { c.L.pop(); c.apart = true; });
    if (SHORT.includes(v) && ['अ', 'इ', 'उ'].includes(v)) {
      step(c, '6.3.111', `र् लोप भएकाले अघिको ${v} (अण्) दीर्घ — ${LONG_OF[v]}।`, () => setLast(c, LONG_OF[v]));
    }
    c.main = '8.3.14'; return;
  }
  c.main = ru ? '8.2.66' : null; // हरिरत्र, पुनरपि — र् joins the next word
}
