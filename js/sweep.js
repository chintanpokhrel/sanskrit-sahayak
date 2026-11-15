// "सबै प्रयोग एकैचोटि" — run the sandhi engine over a grid of junctions once, and index which
// sūtra fires where. A sūtra sheet then shows every junction the sūtra touches, not one example.
// Template words are 'क' + ending so the grid shows only the junction (the 'क' is stripped).

import { sandhi } from './sandhi.js';
import { parse, render, VARGAS, ANTAHSTHA, USHMA } from './varna.js';

const VOW = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'];
const CONS = [...VARGAS.flat(), ...ANTAHSTHA, ...USHMA];
const asWord = (c) => render([c, 'अ']);

const SECTIONS = [
  { title: 'स्वर + स्वर', rows: VOW.map((v) => [v, render(['क', v])]), cols: VOW.map((v) => [v, v]) },
  { title: 'व्यञ्जन + वर्ण', rows: ['क', 'ट', 'त', 'प', 'म', 'न'].map((f) => [render(['अ', f]), render(['क', 'अ', f])]),
    cols: [['अ', 'अ'], ...CONS.map((c) => [asWord(c), asWord(c)])] },
  { title: 'विसर्ग + वर्ण', rows: [['अः', 'कः'], ['आः', 'काः'], ['इः', 'किः']],
    cols: [...['अ', 'आ', 'इ', 'उ'].map((v) => [v, v]), ...CONS.map((c) => [asWord(c), asWord(c)])] },
];

let index = null;
function build() {
  index = SECTIONS.map((sec) => sec.rows.map(([rl, w1]) => sec.cols.map(([cl, w2]) => {
    const r = sandhi(w1, w2);
    if (!r.ok) return null;
    const ids = new Set(r.steps.flatMap((s) => [s.s, ...s.also]).filter(Boolean));
    return { txt: render(parse(r.result).slice(1)), ids };
  })));
}

/** → [{ title, cols:[label], rows:[{ label, cells:[{ txt, hit }] }] }] with empty rows/cols pruned. */
export function sandhiSweep(id) {
  if (!index) build();
  const out = [];
  SECTIONS.forEach((sec, si) => {
    const grid = index[si];
    const rowsHit = grid.map((row) => row.some((c) => c?.ids.has(id)));
    const colsHit = sec.cols.map((_, j) => grid.some((row) => row[j]?.ids.has(id)));
    if (!rowsHit.some(Boolean)) return;
    const cj = colsHit.flatMap((h, j) => (h ? [j] : []));
    out.push({
      title: sec.title,
      cols: cj.map((j) => sec.cols[j][0]),
      rows: grid.flatMap((row, i) => (rowsHit[i] ? [{ label: sec.rows[i][0], cells: cj.map((j) => ({ txt: row[j]?.txt ?? '', hit: !!row[j]?.ids.has(id) })) }] : [])),
    });
  });
  return out;
}
