// अभ्यास — question generators. Every question: { topic, prompt, options, answer, explain }.
// Options are plain Devanagari text (escaped at render); prompt/explain are trusted HTML from our content.

import { sandhi, JASH, CAR, NASAL_OF, YAN } from './sandhi.js';
import { parse, render, isVowel, isConsonant, last, baseVowel, describe, savarna, STHANA, VOWELS, CONSONANTS, PRATYAHARAS, pratyaharaMembers, sutraNum } from './varna.js';
import { SUTRAS, ROLES } from './content/sutras.js';
import { LESSONS } from './content/lessons.js';
import { SHABDA, DHATU, VIBHAKTI, VACANA, PURUSHA, LAKARA } from './content/rupa.js';
import { DHATUS, GANAS, LAKARAS, PADA, ENDINGS, JOIN, joinClass, endingVarga, vargaName, buildAnga, derive, padasOf } from './tinanta.js';
import { T } from './i18n.js';
import { supLabel, tinLabel } from './ui.js';
import { VERSES } from './content/verses.js';
import { ROLE, PICK_ROLES, SENTENCES } from './content/karaka.js';
import { SAMASA_TYPES, SAMASAS } from './content/samasa.js';
import { KRT, KRIT_FORMS } from './content/krit.js';

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

  // ---- तिङन्त (सहजबोध) ----
  tinForm() {
    const dh = pick(DHATUS), L = pick(LAKARAS), pada = pick(padasOf(dh)), p = rand(3), n = rand(3);
    const r = derive(dh, L.key, pada, p, n);
    const sameTable = [0, 1, 2].flatMap((pp) => [0, 1, 2].map((nn) => derive(dh, L.key, pada, pp, nn).form));
    const otherLak = LAKARAS.filter((x) => x.key !== L.key).map((x) => derive(dh, x.key, pada, p, n).form);
    return mcq('tin', `<span class="skt">${dh.u} ${dh.a}</span> (${dh.ne}) — ${L.name}, ${PADA[pada]}, ${PURUSHA[p]} ${VACANA[n]}?`, r.form,
      [...shuffle(otherLak), ...shuffle(sameTable)].filter((f) => !r.alts.includes(f)),
      `अङ्ग <span class="skt">${r.anga}</span> → <span class="skt">${[r.form, ...r.alts].join(' / ')}</span>`);
  },
  angaOf() {
    const dh = pick(DHATUS);
    const correct = buildAnga(dh).angaStr;
    const wrong = ['bhvadi', 'divadi', 'tudadi', 'curadi'].filter((g) => g !== dh.g)
      .map((g) => buildAnga({ ...dh, g, sp: undefined, adanta: false, id: `${dh.id}~${g}` }).angaStr);
    return mcq('tin', `<span class="skt">${dh.u} ${dh.a}</span> — ${GANAS[dh.g].name} (${GANAS[dh.g].vik})। सार्वधातुक प्रत्ययका लागि अङ्ग के हुन्छ?`, correct, wrong,
      `${GANAS[dh.g].name}: <span class="skt">${dh.d} → ${correct}</span>`);
  },
  pratyayaVarga() {
    const L = pick(LAKARAS), pada = pick(['P', 'A']), p = rand(3), n = rand(3);
    const e = ENDINGS[L.key][pada][p][n].split('|').filter(Boolean)[0];
    const v = vargaName(endingVarga(L.key, pada, p, n, e));
    return mcq('tin', `${L.name}, ${PADA[pada]}, ${PURUSHA[p]} ${VACANA[n]} को तयार प्रत्यय "<span class="skt">${e}</span>" कुन वर्गको हो?`, v,
      ['हलादि पित्', 'अजादि पित्', 'हलादि अपित्', 'अजादि अपित्'],
      'पित्: लट्/लङ् परस्मैपद एकवचन (तिप्, सिप्, मिप् बाट), लोट् को तु र उत्तम पुरुष (आट् पित्)। बाँकी सबै अपित्।');
  },
  joinSutra() {
    const L = pick(LAKARAS), pada = pick(['P', 'A']), p = rand(3), n = rand(3);
    const e = ENDINGS[L.key][pada][p][n].split('|')[0];
    const j = joinClass(e);
    if (!JOIN[j].s) return null;
    const r = derive('ni', L.key, pada, p, n);
    const ids = [...new Set(Object.values(JOIN).map((x) => x.s).filter(Boolean))];
    return mcq('tin', `<span class="skt">${L.key === 'lan' ? 'अनय' : 'नय'} + ${e} = ${r.form}</span><br>अङ्ग र प्रत्यय कुन सूत्रले जोडिए?`, SUTRAS[JOIN[j].s].t,
      ids.filter((x) => x !== JOIN[j].s).map((x) => SUTRAS[x].t), `${sref(JOIN[j].s)} — ${JOIN[j].n}`);
  },
};

/**
 * Guess-first question for one analysed pada (verse reader and the श्लोक practice set).
 * The word's other readings (alt) are never offered as wrong answers.
 */
export function wordQuestion(w) {
  if (w.t === 'sup') {
    const right = supLabel(w.v, w.n), ok = new Set([right, ...(w.alt || []).map(([v, n]) => supLabel(v, n))]);
    const pool = shuffle([0, 1, 2, 3, 4, 5, 6, 7].flatMap((v) => [0, 1, 2].map((n) => supLabel(v, n))).filter((x) => !ok.has(x)));
    const near = pool.filter((x) => x.endsWith(VACANA[w.n])).slice(0, 2);
    return { q: T.verse.askSup(w.w), opts: shuffle([right, ...near, ...pool.filter((x) => !near.includes(x)).slice(0, 3 - near.length)]), right };
  }
  if (w.t === 'tin') {
    const right = tinLabel(w);
    const same = [], pool = [];
    // One distractor in the same lakāra (other person/number) and two in other lakāras, so the lakāra alone never
    // gives the answer away.
    for (const L of LAKARA.filter((x) => x.key !== 'let')) for (let p = 0; p < 3; p++) for (let n = 0; n < 3; n++) {
      const x = tinLabel({ ...w, lk: L.key, p, n });
      if (x !== right) (L.key === w.lk ? same : pool).push(x);
    }
    const otherLak = shuffle(pool).filter((x, i, a) => a.findIndex((y) => y.split(',')[0] === x.split(',')[0]) === i);
    return { q: T.verse.askTin(w.w), opts: shuffle([right, ...shuffle(same).slice(0, 1), ...otherLak.slice(0, 2)]), right };
  }
  return null;
}

const krtPick = () => {
  const F = pick(KRIT_FORMS), K = pick(KRT.filter((k) => F.f[k.key] !== '—'));
  return { F, K, form: F.f[K.key].split(' / ')[0] };
};

Object.assign(GEN, {
  // ---- पढ्नका लागि: रूप देखेर चिन्ने ----
  rupaRecognize() {
    const sh = SHABDA[pick(Object.keys(SHABDA))], v = rand(8), n = rand(3), form = sh.forms[v][n];
    const ok = new Set();
    sh.forms.forEach((r, vi) => r.forEach((f, ni) => { if (f === form) ok.add(supLabel(vi, ni)); }));
    const right = supLabel(v, n);
    const rest = [0, 1, 2, 3, 4, 5, 6, 7].flatMap((vi) => [0, 1, 2].map((ni) => supLabel(vi, ni))).filter((x) => !ok.has(x));
    return mcq('recog', T.q.supWhich(form, `${sh.name}, ${sh.desc}`), right, [...shuffle(rest.filter((x) => x.endsWith(VACANA[n]))).slice(0, 2), ...shuffle(rest)],
      `<span class="skt">${form}</span> = ${[...ok].join(' / ')}`);
  },
  tinRecognize() {
    const dh = pick(DHATUS), L = pick(LAKARAS), pada = pick(padasOf(dh)), p = rand(3), n = rand(3);
    const r = derive(dh, L.key, pada, p, n);
    const label = (lk, pp, nn) => tinLabel({ lk, p: pp, n: nn });
    const ok = new Set(), rest = [];
    for (const X of LAKARAS) for (let pp = 0; pp < 3; pp++) for (let nn = 0; nn < 3; nn++) {
      const x = derive(dh, X.key, pada, pp, nn), l = label(X.key, pp, nn);
      if (x.form === r.form || x.alts.includes(r.form)) ok.add(l); else rest.push(l);
    }
    const sameLak = rest.filter((x) => x.startsWith(label(L.key, 0, 0).split(',')[0] + ','));
    return mcq('recog', T.q.tinWhich(r.form, `${dh.u} ${dh.a}`), label(L.key, p, n), [...shuffle(sameLak).slice(0, 1), ...shuffle(rest)],
      `<span class="skt">${r.form}</span> = ${[...ok].join(' / ')} · ${PADA[pada]}`);
  },
  // ---- कृदन्त ----
  kritForm() {
    const { F, K, form } = krtPick();
    const others = [...KRT.filter((k) => k !== K).map((k) => F.f[k.key]), ...KRIT_FORMS.filter((f) => f !== F).map((f) => f.f[K.key])]
      .filter((x) => x && x !== '—').map((x) => x.split(' / ')[0]);
    return mcq('krit', T.q.kritForm(F.d, F.ne, K.p), form, shuffle(others), `${K.p}: ${K.use}${F.n ? `<br>${F.n}` : ''}`);
  },
  kritRecognize() {
    const { F, K, form } = krtPick();
    return mcq('krit', T.q.kritWhich(form, F.d), K.p, KRT.filter((k) => k !== K && F.f[k.key].split(' / ')[0] !== form).map((k) => k.p), `${K.p}: ${K.use}`);
  },
  // ---- समास, कारक, श्लोक ----
  samasaType() {
    const x = pick(SAMASAS);
    return mcq('samasa', T.q.samasaWhich(x.sam), SAMASA_TYPES[x.ty].name, Object.values(SAMASA_TYPES).map((t) => t.name),
      `<span class="skt">${x.vig}</span> — ${x.m}${x.sub ? ` (${x.sub})` : ''}`);
  },
  karaka() {
    const S = pick(SENTENCES), w = pick(S.ws.filter((x) => x.r !== 'kriya'));
    const sent = S.ws.map((x) => (x === w ? `<b class="hl">${x.t}</b>` : x.t)).join(' ');
    return mcq('karaka', T.q.karakaWhich(sent, w.t, S.m), ROLE[w.r].name, PICK_ROLES.filter((r) => r !== w.r).map((r) => ROLE[r].name),
      `${ROLE[w.r].n}${w.x ? ` ${w.x}` : ''}`);
  },
  versePada() {
    const v = pick(VERSES), w = pick(v.words.filter((x) => x.t !== 'avy'));
    const q = wordQuestion(w);
    return { topic: 'verse', prompt: T.q.verseWhich(v.title, q.q), options: q.opts, answer: q.opts.indexOf(q.right),
      explain: `<a href="#/verse/${v.id}">${v.title}</a>: ${w.m}${w.x ? `<br>${w.x}` : ''}` };
  },
});

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
