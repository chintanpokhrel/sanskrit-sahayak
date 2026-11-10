// अभ्यास — question generators. Every question: { topic, prompt, options, answer, explain }.
// Options are plain Devanagari text (escaped at render); prompt/explain are trusted HTML from our content.

import { sandhi, JASH, CAR, NASAL_OF, YAN } from './sandhi.js';
import { parse, render, isVowel, isConsonant, last, baseVowel, describe, savarna, STHANA, VOWELS, CONSONANTS, PRATYAHARAS, pratyaharaMembers, sutraNum } from './varna.js';
import { SUTRAS, ROLES } from './content/sutras.js';
import { LESSONS } from './content/lessons.js';
import { SHABDA, DHATU, VIBHAKTI, VACANA, PURUSHA, LAKARA } from './content/rupa.js';

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
export const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (arr) => [...new Set(arr)];

/** Correct answer + up to 3 distinct distractors, shuffled. */
function mcq(topic, prompt, correct, distractors, explain) {
  const wrong = shuffle(uniq(distractors).filter((d) => d && d !== correct)).slice(0, 3);
  if (wrong.length < 2) return null;
  const options = shuffle([correct, ...wrong]);
  return { topic, prompt, options, answer: options.indexOf(correct), explain };
}

const sref = (id) => `<button class="sref" data-sutra="${id}">${SUTRAS[id].t} <small>${sutraNum(id)}</small></button>`;
const exLabel = ([a, b, , o = {}]) => `<span class="skt">${a} + ${b}</span>${o.internal ? ' <small>(पदभित्र)</small>' : ''}${o.dual ? ' <small>(द्विवचन)</small>' : ''}`;

// ---- wrong-but-plausible sandhi results ---------------------------------------------------
const join = (L, R, apart) => (apart ? render(L) + ' ' + render(R) : render(L.concat(R)));
function wrongResults(a, b) {
  const L = parse(a.replace(/^लृ/, 'ऌ')), R = parse(b.replace(/^लृ/, 'ऌ'));
  const Lb = L.slice(0, -1), Rb = R.slice(1), x = last(L), y = R[0];
  const out = [];
  if (isVowel(x) && isVowel(y)) {
    for (const v of ['ए', 'ऐ', 'ओ', 'औ', 'आ', 'ई', 'ऊ']) out.push(join([...Lb, v], Rb));
    out.push(join(L, R, true));
    if (YAN[baseVowel(x)]) out.push(join([...Lb, YAN[baseVowel(x)]], R));
    out.push(join([...Lb, 'अ', 'य'], R));
  } else if (x === 'ः') {
    out.push(join(L, R, true), join([...Lb, 'र'], R), join([...Lb, 'स'], R), join(Lb, R, true), join([...Lb, 'श'], R));
    if (last(Lb) === 'अ') out.push(join([...Lb.slice(0, -1), 'ओ'], R, true), join([...Lb.slice(0, -1), 'आ'], R, true));
  } else if (isConsonant(x)) {
    for (const k of [x, JASH[x], CAR[JASH[x]], NASAL_OF[JASH[x]], 'ं']) if (k) out.push(join([...Lb, k], R));
    out.push(join([...Lb, x], R, true));
  } else out.push(join(L, R, true));
  return out;
}

// ---- generators ----------------------------------------------------------------------------
// Each takes a context { ex, sutras } and returns one question or null.
const SANDHI_POOL = ['6.1.77', '6.1.78', '6.1.87', '6.1.88', '6.1.101', '6.1.109', '6.1.125', '6.1.73', '8.2.39', '8.4.40', '8.4.41',
  '8.4.45', '8.4.55', '8.4.60', '8.4.62', '8.4.63', '8.3.23', '8.3.32', '8.3.7', '8.3.15', '8.3.34', '8.3.36', '6.1.113', '6.1.114', '8.3.17', '8.3.22', '8.3.14', '6.1.132'];

const GEN = {
  sandhiResult({ ex }) {
    if (!ex?.length) return null;
    const e = pick(ex); const r = sandhi(e[0], e[1], e[3] || {});
    if (!r.ok) return null;
    const wrong = wrongResults(e[0], e[1]).filter((w) => !r.alts.includes(w));
    const explain = r.main ? `मुख्य सूत्र: ${sref(r.main)}` : '';
    return mcq(`sandhi-${r.kind}`, `${exLabel(e)} = ?`, r.result, wrong, explain + (r.alts.length ? `<br>विकल्प रूप: <span class="skt">${r.alts.join(', ')}</span>` : ''));
  },
  sandhiSutra({ ex }) {
    const usable = (ex || []).map((e) => [e, sandhi(e[0], e[1], e[3] || {})]).filter(([, r]) => r.ok && r.main);
    if (!usable.length) return null;
    const [e, r] = pick(usable);
    const used = new Set(r.steps.flatMap((s) => [s.s, ...s.also]));
    const wrong = SANDHI_POOL.filter((id) => !used.has(id)).map((id) => SUTRAS[id].t);
    return mcq(`sandhi-${r.kind}`, `${exLabel(e)} = <span class="skt">${r.result}</span><br>यहाँ मुख्य सूत्र कुन हो?`, SUTRAS[r.main].t, wrong,
      `${sref(r.main)}<br>${SUTRAS[r.main].a}`);
  },
  sutraArtha({ sutras }) {
    const ids = (sutras || []).filter((id) => SUTRAS[id]?.a);
    if (!ids.length) return null;
    const id = pick(ids), s = SUTRAS[id];
    const pool = Object.values(SUTRAS).filter((x) => x.id !== id && x.ty === s.ty).map((x) => x.t);
    const near = (sutras || []).filter((x) => x !== id).map((x) => SUTRAS[x].t);
    return mcq('sutra', `यो अर्थ कुन सूत्रको हो?<div class="quote">${s.a}</div>`, s.t, [...shuffle(near).slice(0, 2), ...shuffle(pool)], sref(id));
  },
  padaRole({ sutras }) {
    const roles = ['sthani', 'adesha', 'para', 'purva'];
    const ids = (sutras?.length ? sutras : Object.keys(SUTRAS)).concat(['6.1.77', '6.1.101', '8.3.23', '8.4.55', '6.1.109', '8.2.39'])
      .filter((id) => SUTRAS[id]?.pc?.some(([, r]) => roles.includes(r)));
    if (!ids.length) return null;
    const id = pick(ids);
    const [pada, role, n] = pick(SUTRAS[id].pc.filter(([, r]) => roles.includes(r)));
    const label = (r) => `${ROLES[r].label} (${ROLES[r].hint})`;
    return mcq('sutra', `<span class="skt">${SUTRAS[id].t}</span><br>यस सूत्रमा "<b class="skt">${pada}</b>" को भूमिका के हो?`, label(role),
      roles.filter((r) => r !== role).map(label), `${sref(id)}<br><b>${pada}</b>: ${n}`);
  },
  pratyahara() {
    const kind = rand(3);
    const small = PRATYAHARAS.filter((p) => pratyaharaMembers(p).length <= 10);
    if (kind === 0) {
      const pr = pick(small);
      return mcq('pratyahara', `<span class="skt">${pr}</span> प्रत्याहारमा कुन कुन वर्ण पर्छन्?`, pratyaharaMembers(pr).join(' '),
        small.filter((x) => x !== pr).map((x) => pratyaharaMembers(x).join(' ')), `${pr} = ${pratyaharaMembers(pr).join(' ')}`);
    }
    if (kind === 1) {
      const pr = pick(small);
      return mcq('pratyahara', `यी वर्णहरूको प्रत्याहार कुन हो?<div class="quote skt">${pratyaharaMembers(pr).join(' ')}</div>`, pr,
        small.filter((x) => pratyaharaMembers(x).join() !== pratyaharaMembers(pr).join()), `${pr} = ${pratyaharaMembers(pr).join(' ')}`);
    }
    const letter = pick(CONSONANTS.concat(['अ', 'इ', 'उ', 'ए', 'औ']));
    const yes = PRATYAHARAS.filter((p) => pratyaharaMembers(p).includes(letter));
    const no = PRATYAHARAS.filter((p) => !pratyaharaMembers(p).includes(letter));
    if (!yes.length) return null;
    const right = pick(yes);
    return mcq('pratyahara', `"<span class="skt">${letter}</span>" कुन प्रत्याहारमा पर्छ?`, right, no, `${right} = ${pratyaharaMembers(right).join(' ')}`);
  },
  varna() {
    const letter = pick(VOWELS.concat(CONSONANTS).filter((l) => !['ॡ'].includes(l)));
    const d = describe(letter);
    const correct = d.sthana.filter((s) => s !== 'नासिका').join(' + ') || d.sthana[0];
    const names = STHANA.map((s) => s.name).filter((n) => n !== 'नासिका');
    return mcq('varna', `"<span class="skt">${letter}</span>" को उच्चारण स्थान कुन हो?`, correct, names,
      `<span class="skt">${letter}</span>: ${d.sthana.join(', ')} · ${d.abhyantara}${d.ghosha ? ` · ${d.ghosha} · ${d.prana}` : ''}`);
  },
  savarna() {
    const letter = pick(['अ', 'इ', 'उ', 'ऋ', 'आ', 'ई', 'ऊ', 'क', 'च', 'ट', 'त', 'प', 'ग', 'द', 'ब']);
    const all = VOWELS.concat(CONSONANTS).filter((x) => x !== letter);
    const yes = all.filter((x) => savarna(letter, x));
    const sameSthana = all.filter((x) => !savarna(letter, x) && describe(x).sthana.some((s) => describe(letter).sthana.includes(s)));
    return mcq('varna', `"<span class="skt">${letter}</span>" को सवर्ण कुन हो?`, pick(yes), sameSthana.length >= 3 ? sameSthana : all.filter((x) => !savarna(letter, x)),
      `सवर्ण = स्थान र आभ्यन्तर प्रयत्न दुवै उस्तै (१।१।९)। स्वर र व्यञ्जन कहिल्यै सवर्ण हुँदैनन् (१।१।१०)।`);
  },
  gunaVrddhi() {
    const TABLE = { 'इ': ['ए', 'ऐ'], 'ई': ['ए', 'ऐ'], 'उ': ['ओ', 'औ'], 'ऊ': ['ओ', 'औ'], 'ऋ': ['अर्', 'आर्'], 'ॠ': ['अर्', 'आर्'], 'ऌ': ['अल्', 'आल्'] };
    const v = pick(Object.keys(TABLE)), which = rand(2);
    const all = ['ए', 'ऐ', 'ओ', 'औ', 'अर्', 'आर्', 'अल्', 'आल्', 'आ', 'य्'];
    return mcq('varna', `"<span class="skt">${v}</span>" को ${which ? 'वृद्धि' : 'गुण'} के हो?`, TABLE[v][which], all,
      `गुण = अ ए ओ; वृद्धि = आ ऐ औ। ऋ/ऌ मा र्/ल् जोडिन्छ (उरण् रपरः)।`);
  },
  rupa() {
    const key = pick(Object.keys(SHABDA)), sh = SHABDA[key];
    const v = rand(8), n = rand(3);
    const correct = sh.forms[v][n];
    const others = sh.forms.flat().filter((f) => f !== correct);
    return mcq('rupa', `<span class="skt">${sh.name}</span> (${sh.desc}) — ${VIBHAKTI[v]} ${VACANA[n]}?`, correct, others, `${sh.name}: ${VIBHAKTI[v]} ${VACANA[n]} = <span class="skt">${correct}</span>`);
  },
  dhatu() {
    const dh = DHATU.bhu, lk = pick(Object.keys(dh.forms));
    const p = rand(3), n = rand(3);
    const correct = dh.forms[lk][p][n];
    const others = Object.values(dh.forms).flat(2).filter((f) => f !== correct);
    const lname = LAKARA.find((l) => l.key === lk).name;
    return mcq('dhatu', `<span class="skt">${dh.name}</span> — ${lname}, ${PURUSHA[p]} ${VACANA[n]}?`, correct, others, `<span class="skt">${correct}</span>`);
  },
};

/** Build up to n questions cycling through the generator names. */
export function buildQuiz(gens, ctx, n = 6) {
  const out = [], seen = new Set();
  let tries = 0;
  while (out.length < n && tries < n * 12) {
    const q = GEN[gens[tries % gens.length]]?.(ctx);
    tries++;
    if (q && !seen.has(q.prompt)) { seen.add(q.prompt); out.push(q); }
  }
  return out;
}

/** All examples from all lessons of the given units (used by practice). */
export const examplesFor = (units) => LESSONS.filter((l) => units.includes(l.unit)).flatMap((l) => l.ex || []);
