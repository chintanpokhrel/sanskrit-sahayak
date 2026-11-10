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
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  console.log('(content modules not present yet — skipped)');
}

console.log(fail ? `${fail} failure(s)` : `all ${CASES.length} engine cases + pratyāhāra + content checks pass`);
process.exit(fail ? 1 : 0);
