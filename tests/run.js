// node tests/run.js — engine oracle + content integrity checks. Exit code 1 on any failure.
import { sandhi } from '../js/sandhi.js';
import { pratyaharaMembers } from '../js/varna.js';
import { CASES, PRATYAHARA_CASES } from './engine-cases.js';

let fail = 0;
const bad = (msg) => { fail++; console.log('FAIL', msg); };

for (const [a, b, e, o = {}, alt] of CASES) {
  const r = sandhi(a, b, o);
  if (!r.ok) { bad(`${a} + ${b}: ${r.reason}`); continue; }
  if (r.result !== e) bad(`${a} + ${b} = ${r.result} (expected ${e})`);
  if (alt && !r.alts.includes(alt)) bad(`${a} + ${b} alt ${r.alts.join(',') || '—'} (expected ${alt})`);
}
for (const [p, e] of Object.entries(PRATYAHARA_CASES)) {
  const got = pratyaharaMembers(p).join(' ');
  if (got !== e) bad(`${p} = ${got} (expected ${e})`);
}

// Content integrity (only once content modules exist).
try {
  const { SUTRAS } = await import('../js/content/sutras.js');
  const { LESSONS } = await import('../js/content/lessons.js');
  const { PRAKRIYA } = await import('../js/content/rupa.js');
  const ids = new Set(Object.keys(SUTRAS));
  const need = (id, where) => { if (id && !ids.has(id)) bad(`missing sūtra ${id} (${where})`); };
  for (const [a, b, , o = {}] of CASES) for (const st of sandhi(a, b, o).steps || []) { need(st.s, `engine ${a}+${b}`); st.also.forEach((x) => need(x, 'engine also')); }
  for (const l of LESSONS) {
    l.sutras.forEach((id) => need(id, l.id));
    for (const blk of l.blocks) if (blk.t === 'sutra') need(blk.id, l.id);
    for (const [a, b, e, o = {}] of l.ex || []) {
      const r = sandhi(a, b, o);
      if (!r.ok || r.result !== e) bad(`lesson ${l.id}: ${a} + ${b} = ${r.ok ? r.result : r.reason} (expected ${e})`);
    }
  }
  for (const [k, p] of Object.entries(PRAKRIYA)) p.steps.forEach((st) => [].concat(st.s || []).forEach((id) => need(id, `prakriya ${k}`)));
  for (const [id, s] of Object.entries(SUTRAS)) if (!s.a) bad(`sūtra ${id} has no artha`);

  // ---- tiṅanta engine ----
  const { derive, DHATUS, padasOf, tinSweep } = await import('../js/tinanta.js');
  const { DHATU } = await import('../js/content/rupa.js');
  const { LAT3, LAN3, NI } = await import('./tinanta-cases.js');
  const cell = (r) => [r.form, ...r.alts].join('/');
  for (const dh of DHATUS) if (!LAT3[dh.id]) bad(`tinanta: no LAT3 case for ${dh.id}`);
  for (const [id, e] of Object.entries(LAT3)) {
    const dh = DHATUS.find((d) => d.id === id);
    const got = derive(id, 'lat', padasOf(dh)[0], 0, 0).form;
    if (got !== e) bad(`tinanta ${id} लट् = ${got} (expected ${e})`);
  }
  for (const [id, e] of Object.entries(LAN3)) {
    const dh = DHATUS.find((d) => d.id === id);
    const got = derive(id, 'lan', padasOf(dh)[0], 0, 0).form;
    if (got !== e) bad(`tinanta ${id} लङ् = ${got} (expected ${e})`);
  }
  for (const [pada, lks] of Object.entries(NI)) for (const [lk, tbl] of Object.entries(lks)) tbl.forEach((row, p) => row.forEach((e, n) => {
    const got = cell(derive('ni', lk, pada, p, n));
    if (got !== e) bad(`tinanta नी ${lk} ${pada} [${p},${n}] = ${got} (expected ${e})`);
  }));
  // The static भू table in rupa.js must agree with the engine wherever the engine computes.
  for (const lk of ['lat', 'lot', 'lan', 'lin']) DHATU.bhu.forms[lk].forEach((row, p) => row.forEach((e, n) => {
    const got = cell(derive('bhu', lk, 'P', p, n));
    if (got !== e) bad(`tinanta भू ${lk} [${p},${n}] = ${got} (rupa.js has ${e})`);
  }));
  for (const id of tinSweep().keys()) need(id, 'tinanta engine');

  // ---- reader content: verses, kāraka, samāsa, kṛdanta, anubandha, map ----
  const { VERSES } = await import('../js/content/verses.js');
  const { ROLE, SENTENCES, PICK_ROLES } = await import('../js/content/karaka.js');
  const { SAMASA_TYPES, SAMASAS } = await import('../js/content/samasa.js');
  const { KRT, KRT_KEYS, KRIT_FORMS } = await import('../js/content/krit.js');
  const { TAGS, PRATYAYAS } = await import('../js/content/anubandha.js');
  const { STAGES, PIPELINE, PADAS, IDEAS, CODE_MAP } = await import('../js/content/map.js');
  const { ADHIKARAS, sutraKey } = await import('../js/content/sutras.js');
  const { UNITS, PATHS } = await import('../js/content/lessons.js');
  const { LAKARA } = await import('../js/content/rupa.js');
  const roleOk = (r, where) => { if (!ROLE[r]) bad(`unknown role ${r} (${where})`); };
  for (const r of Object.values(ROLE)) { need(r.s, 'karaka role'); need(r.vs, 'karaka role'); }
  PICK_ROLES.forEach((r) => roleOk(r, 'PICK_ROLES'));
  for (const v of VERSES) {
    for (const [a, b, e, st] of v.joins) {
      if (st) { st.s.forEach((id) => need(id, `verse ${v.id} static join`)); continue; }
      const r = sandhi(a, b);
      if (!r.ok || r.result !== e) bad(`verse ${v.id}: ${a} + ${b} = ${r.ok ? r.result : r.reason} (expected ${e})`);
    }
    v.words.forEach((w, i) => {
      const where = `verse ${v.id} [${i}] ${w.w}`;
      (w.s || []).forEach((id) => need(id, where));
      roleOk(w.r, where);
      if (w.t === 'sup' && !(w.v >= 0 && w.v <= 7 && w.n >= 0 && w.n <= 2)) bad(`${where}: sup needs v (0–7) and n (0–2)`);
      if (w.t === 'tin' && !(LAKARA.some((l) => l.key === w.lk) && w.p >= 0 && w.p <= 2 && w.n >= 0 && w.n <= 2)) bad(`${where}: tin needs lk, p, n`);
      if (w.dh) {
        const f = (w.pre || '') + derive(w.dh, w.lk, w.pada, w.p, w.n).form;
        if (f !== w.w) bad(`${where}: engine gives ${f}`);
      }
    });
    const used = new Set();
    for (const s of v.anvaya) for (const x of s) {
      if (typeof x === 'number') { if (!v.words[x]) bad(`verse ${v.id}: anvaya index ${x}`); used.add(x); } else roleOk(x.r, `verse ${v.id} anvaya`);
    }
    v.words.forEach((w, i) => { if (!used.has(i)) bad(`verse ${v.id}: word ${i} (${w.w}) missing from anvaya`); });
  }
  for (const S of SENTENCES) for (const w of S.ws) roleOk(w.r, `sentence ${S.m}`);
  for (const x of SAMASAS) { if (!SAMASA_TYPES[x.ty]) bad(`samāsa ${x.sam}: type ${x.ty}`); x.s.forEach((id) => need(id, `samāsa ${x.sam}`)); }
  Object.values(SAMASA_TYPES).forEach((t) => need(t.s, 'samāsa type'));
  KRT.forEach((k) => k.s.forEach((id) => need(id, `kṛt ${k.p}`)));
  for (const F of KRIT_FORMS) {
    KRT_KEYS.forEach((k) => { if (!F.f[k]) bad(`kṛdanta ${F.d}: no ${k}`); });
    F.s.forEach((id) => need(id, `kṛdanta ${F.d}`));
  }
  for (const [l, t] of Object.entries(TAGS)) { t.it.forEach((id) => need(id, `tag ${l}`)); t.fx.forEach(([, id]) => id && need(id, `tag ${l}`)); }
  for (const P of PRATYAYAS) P.tags.forEach((l) => { if (!TAGS[l]) bad(`pratyaya ${P.up}: unknown tag ${l}`); });
  if (PADAS.length !== 32 || new Set(PADAS.map((x) => x[0])).size !== 32) bad('map: PADAS must list 32 distinct pādas');
  PADAS.forEach(([p, st]) => { if (!STAGES[st]) bad(`map: pāda ${p} stage ${st}`); });
  PIPELINE.forEach((st) => { if (!STAGES[st]) bad(`map: pipeline stage ${st}`); });
  IDEAS.forEach((x) => x.s.forEach((id) => need(id, `idea ${x.t}`)));
  CODE_MAP.forEach(([p, , , id]) => id && need(id, `code map ${p}`));
  ADHIKARAS.forEach((a) => { if (sutraKey(a.from) > sutraKey(a.to)) bad(`adhikāra ${a.t}: from > to`); });
  for (const [k, units] of Object.entries(PATHS)) {
    if (units.length !== UNITS.length || UNITS.some((u) => !units.includes(u.id))) bad(`path ${k} must list every unit once`);
  }
  // Lesson widgets must exist: reader widgets are importable; app.js widget names are read from its source.
  const { READER_WIDGETS, runLab } = await import('../js/reader.js');
  const { readFileSync } = await import('node:fs');
  const appSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const appWidgets = new Set([...appSrc.slice(appSrc.indexOf('const WIDGETS = {')).split('\n};')[0].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]));
  for (const l of LESSONS) for (const b of l.blocks) if (b.t === 'widget' && !READER_WIDGETS[b.name] && !appWidgets.has(b.name)) bad(`lesson ${l.id}: unknown widget ${b.name}`);

  // ---- quiz generators and the rule lab ----
  const { buildQuiz } = await import('../js/quiz.js');
  for (const g of ['rupaRecognize', 'tinRecognize', 'kritForm', 'kritRecognize', 'samasaType', 'karaka', 'versePada']) {
    const qs = buildQuiz([g], {}, 6);
    if (qs.length < 5) bad(`quiz ${g}: only ${qs.length} questions`);
    qs.forEach((q) => { if (q.answer < 0 || new Set(q.options).size !== q.options.length) bad(`quiz ${g}: bad options ${q.options}`); });
  }
  const none = runLab(new Set());
  if (none.sandhi.changed.length || none.tin.changed.length) bad('lab: no sūtra off, yet forms changed');
  const pr = runLab(new Set(['6.1.97']));
  if (!pr.tin.changed.some((x) => x.form === 'भवन्ति' && x.after === 'भवान्ति')) bad('lab: अतो गुणे off should give भवान्ति');
  const { rewriteSig } = await import('../js/ui.js');
  if (!rewriteSig(SUTRAS['6.1.77'])) bad('rewriteSig(6.1.77) is empty');
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  console.log('(content modules not present yet — skipped)');
}

console.log(fail ? `${fail} failure(s)` : `all ${CASES.length} sandhi cases + pratyāhāra + tiṅanta + content checks pass`);
process.exit(fail ? 1 : 0);
