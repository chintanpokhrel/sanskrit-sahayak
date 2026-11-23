// संस्कृत सहायक — hash-routed single page app. No framework: views render HTML strings into #view,
// interaction goes through one delegated click handler (data-act) plus per-view handlers.

import { T } from './i18n.js';
import { sandhi } from './sandhi.js';
import { STHANA, VARGAS, VOWELS, ANTAHSTHA, USHMA, MAHESHVARA, SEQ, PRATYAHARAS, pratyaharaMembers, pratyaharaRange, pratyaharaName, describe, savarna, show, sutraNum, toDevDigits } from './varna.js';
import { SUTRAS, TYPES, ROLES, sutraKey, adhikarasOf } from './content/sutras.js';
import { UNITS, LESSONS, lessonById, lessonsInPath, unitsInPath } from './content/lessons.js';
import { SHABDA, DHATU, SUP, TIN, LAKARA, VIBHAKTI, VACANA, PURUSHA, PRAKRIYA } from './content/rupa.js';
import { buildQuiz, examplesFor, shuffle } from './quiz.js';
import { store, requestPersistence } from './store.js';
import { DHATUS, GANAS, dhatuById, LAKARAS, PADA, ENDINGS, JOIN, JOIN_ORDER, joinClass, endingVarga, vargaName, ANGA_VARGA, angaVarga, buildAnga, derive, padasOf, tinSweep } from './tinanta.js';
import { sandhiSweep } from './sweep.js';
import { parse } from './varna.js';
import { esc, sutraChip, sutraCard, sandhiCard, revealSandhi, table, stepsHtml, header, glossify, glossLink } from './ui.js';
import { termHtml, glossaryView } from './gloss.js';
import { READER_WIDGETS, onReaderClick, mapView, versesView, verseView, labView, isSwitchable, kritHtml, kritHintsHtml, anubandhaHtml, anubandhaTableHtml, verseOfDay } from './reader.js';

const view = document.getElementById('view');
const prakriyaHtml = (key) => stepsHtml(PRAKRIYA[key].title, PRAKRIYA[key].steps);

const shabdaHtml = (key) => {
  const sh = SHABDA[key];
  return `<div class="shabda"><h4><span class="skt">${sh.name}</span> <small>${sh.desc}</small></h4>
    ${table(['', ...VACANA], sh.forms.map((r, i) => [VIBHAKTI[i], ...r.map((f) => `<span class="skt">${f}</span>`)]), 'rupa')}</div>`;
};

function dhatuHtml(key, lk = 'lat') {
  const dh = DHATU[key];
  const tabs = LAKARA.filter((l) => dh.forms[l.key]).map((l) =>
    `<button class="chip ${l.key === lk ? 'on' : ''}" data-act="dhatu-tab" data-dh="${key}" data-lk="${l.key}">${l.name}</button>`).join('');
  const lak = LAKARA.find((l) => l.key === lk);
  return `<div class="dhatu" data-dh="${key}"><h4><span class="skt">${dh.name}</span> <small>${dh.desc}</small></h4>
    <div class="chips">${tabs}</div><p class="muted">${lak.name}: ${lak.use}</p>
    ${table(['', ...VACANA], dh.forms[lk].map((r, i) => [PURUSHA[i], ...r.map((f) => `<span class="skt">${f}</span>`)]), 'rupa')}</div>`;
}

// ---- Widgets ------------------------------------------------------------------------------
function maheshvaraHtml(mode) {
  const rows = MAHESHVARA.map((row, s) => `<div class="mh-row"><span class="mh-n">${toDevDigits(s + 1)}</span>${row.map((l, k) => {
    const idx = SEQ.findIndex((e) => e.s === s && e.k === k);
    const it = k === row.length - 1;
    return `<button class="mh-l ${it ? 'it' : ''} skt" data-act="mh" data-i="${idx}">${it ? show(l) : l}</button>`;
  }).join('')}</div>`).join('');
  const chips = mode === 'explore'
    ? `<div class="chips">${PRATYAHARAS.map((p) => `<button class="chip skt" data-act="mh-p" data-p="${p}">${p}</button>`).join('')}</div>` : '';
  return `<div class="mh" data-start=""><div class="mh-grid">${rows}</div><div class="mh-out">${mode === 'explore' ? T.pickStart : ''}</div>${chips}</div>`;
}

function mhShow(root, name, start, end) {
  root.querySelectorAll('.mh-l').forEach((b) => {
    const i = +b.dataset.i;
    b.classList.toggle('in', i >= start && i <= end && !SEQ[i].it);
    b.classList.toggle('sel', i === start || i === end);
  });
  const m = pratyaharaMembers(name);
  root.querySelector('.mh-out').innerHTML = `<b class="skt">${name}</b> = <span class="skt">${m.join(' ')}</span> <small>(${T.members(toDevDigits(m.length))})</small>`;
}

function onMaheshvara(btn) {
  const root = btn.closest('.mh');
  const i = +btn.dataset.i, e = SEQ[i];
  const start = root.dataset.start;
  if (!e.it) {
    root.dataset.start = i;
    root.querySelectorAll('.mh-l').forEach((b) => b.classList.remove('in', 'sel'));
    btn.classList.add('sel');
    root.querySelector('.mh-out').textContent = T.pickIt(e.l);
    return;
  }
  if (start === '' || +start > i) return;
  const s = SEQ[+start];
  const name = pratyaharaName(s.l, e.l);
  // the explorer shows exactly the chosen range, which may differ from Pāṇini's convention for ण्
  const members = SEQ.slice(+start, i + 1).filter((x) => !x.it).map((x) => x.l).filter((l, k, a) => a.indexOf(l) === k);
  root.querySelectorAll('.mh-l').forEach((b) => { const j = +b.dataset.i; b.classList.toggle('in', j >= +start && j <= i && !SEQ[j].it); b.classList.toggle('sel', j === +start || j === i); });
  root.querySelector('.mh-out').innerHTML = `<b class="skt">${name}</b> = <span class="skt">${members.join(' ')}</span> <small>(${T.members(toDevDigits(members.length))})</small>`;
  root.dataset.start = '';
}

function varnaGridHtml() {
  const btn = (l) => `<button class="vg-l skt" data-act="varna" data-l="${l}">${l}</button>`;
  const rows = [VOWELS.filter((v) => v !== 'ॡ'), ...VARGAS, ANTAHSTHA, USHMA, ['ं', 'ः']];
  return `<div class="vg"><div class="vg-grid">${rows.map((r) => `<div class="vg-row">${r.map(btn).join('')}</div>`).join('')}</div><div class="vg-out muted">—</div></div>`;
}

function onVarna(btn) {
  const root = btn.closest('.vg');
  root.querySelectorAll('.vg-l').forEach((b) => b.classList.toggle('sel', b === btn));
  const l = btn.dataset.l, d = describe(l);
  const sav = [...VOWELS, ...VARGAS.flat(), ...ANTAHSTHA, ...USHMA].filter((x) => x !== l && savarna(l, x));
  root.querySelector('.vg-out').innerHTML = `<b class="skt big">${l}</b>
    <dl><dt>${glossLink('sthana')}</dt><dd>${d.sthana.join(' + ') || '—'}</dd>
    <dt>${glossLink('abhyantara')}</dt><dd>${d.abhyantara || '—'}</dd>
    ${d.ghosha ? `<dt>${glossLink('bahya')}</dt><dd>${d.ghosha}, ${d.prana}</dd>` : ''}
    ${d.matra ? `<dt>${T.matra}</dt><dd>${d.matra}</dd>` : ''}
    <dt>${glossLink('savarna')}</dt><dd class="skt">${sav.join(' ') || '—'}</dd></dl>`;
  root.querySelector('.vg-out').classList.remove('muted');
}

const VISARGA_ROWS = [
  ['जुनसुकै', 'क ख प फ', 'ः रहन्छ', ['रामः', 'करोति']],
  ['जुनसुकै', 'च छ', 'श्', ['रामः', 'चलति']],
  ['जुनसुकै', 'ट ठ', 'ष्', ['रामः', 'टीकते']],
  ['जुनसुकै', 'त थ', 'स्', ['विष्णुः', 'त्राता']],
  ['जुनसुकै', 'श ष स', 'ः (वा श्/ष्/स्)', ['हरिः', 'शेते']],
  ['अ', 'अ', 'ओऽ', ['शिवः', 'अर्च्यः']],
  ['अ', 'कोमल व्यञ्जन', 'ओ', ['रामः', 'गच्छति']],
  ['अ', 'अ बाहेक स्वर', 'लोप', ['रामः', 'इह']],
  ['आ', 'स्वर / कोमल व्यञ्जन', 'लोप', ['देवाः', 'गच्छन्ति']],
  ['इ उ ए…', 'स्वर / कोमल व्यञ्जन', 'र्', ['हरिः', 'अत्र']],
  ['इ उ ए…', 'र', 'लोप + दीर्घ', ['हरिः', 'रम्यः']],
];

// ---- तिङन्त (सहजबोध दृष्टि) widgets ------------------------------------------------------------
const lakName = (k) => LAKARAS.find((l) => l.key === k).name;
const forEachEnding = (fn) => LAKARAS.forEach(({ key: lk }) => ['P', 'A'].forEach((pada) => ENDINGS[lk][pada].forEach((row, p) => row.forEach((cell, n) =>
  cell.split('|').forEach((e, k) => fn({ lk, pada, p, n, e, k }))))));

/** चार वर्ग: which ready-made endings and vikaraṇas fall in each. */
function pratyayaVargaHtml() {
  const box = { 'हलादि पित्': new Set(), 'अजादि पित्': new Set(), 'हलादि अपित्': new Set(), 'अजादि अपित्': new Set() };
  forEachEnding(({ lk, pada, p, n, e }) => { if (e) box[vargaName(endingVarga(lk, pada, p, n, e))].add(e); });
  const vik = { 'अजादि पित्': 'शप्', 'अजादि अपित्': 'श, शानच्, शतृ', 'हलादि अपित्': 'श्यन्, श्नु, श्ना, श्नम्', 'हलादि पित्': '—' };
  const cell = (k) => `<div class="pv-cell"><b>${toDevDigits(box[k].size)}</b> <span class="skt">${[...box[k]].join(' · ')}</span>
    <div class="small muted">विकरण/कृत्: <span class="skt">${vik[k]}</span></div></div>`;
  return `<div class="tbl-wrap"><table class="pv"><thead><tr><th></th><th>हलादि (व्यञ्जनबाट सुरु)</th><th>अजादि (स्वरबाट सुरु)</th></tr></thead><tbody>
    <tr><th>पित् <small class="muted">— गुण हुन सक्छ</small></th><td>${cell('हलादि पित्')}</td><td>${cell('अजादि पित्')}</td></tr>
    <tr><th>अपित् <small class="muted">— ङिद्वत्, गुण हुँदैन</small></th><td>${cell('हलादि अपित्')}</td><td>${cell('अजादि अपित्')}</td></tr>
    </tbody></table></div><p class="small muted">प्रथम गणसमूहका ७४ तयार प्रत्यय (दोहोरिएका एक पटक मात्र गनिएका)।</p>`;
}

/** अङ्ग × प्रत्यय: what the aṅga undergoes before each class of sārvadhātuka pratyaya. */
const ANGA_MATRIX = [
  ['adanta', [['सन्धि मात्र; व/म भए अ दीर्घ', '7.3.101', 'भव + मि = भवामि'], ['सन्धि मात्र', '6.1.101', 'भव + आनि = भवानि'],
    ['सन्धि मात्र; व/म भए अ दीर्घ', '7.3.101', 'भव + वः = भवावः'], ['सन्धि मात्र (अ/ए भए पररूप)', '6.1.97', 'भव + अन्ति = भवन्ति']]],
  ['akaranta', [['केही हुँदैन', null, 'या + ति = याति'], ['केही हुँदैन; सवर्ण दीर्घ', '6.1.101', 'या + आनि = यानि'],
    ['श्ना/अभ्यस्त भए आ → ई', '6.4.113', 'क्रीणा + तः = क्रीणीतः'], ['श्ना/अभ्यस्त भए आ लोप', '6.4.112', 'क्रीणा + अन्ति = क्रीणन्ति']]],
  ['igant', [['अन्तिम इक् गुण', '7.3.84', 'चिनु + ति = चिनोति'], ['गुण, अनि अयादि', '7.3.84', 'जि + अ (शप्) = जय'],
    ['गुण निषेध', '1.1.5', 'चिनु + तः = चिनुतः'], ['गुण निषेध; इयङ्/उवङ्', '6.4.77', 'रि + अ (श) = रिय']]],
  ['ejanta', [['—', null, ''], ['अयादि', '6.1.78', 'ग्लै + अ (शप्) = ग्लाय'], ['—', null, ''], ['—', null, '']]],
  ['laghu', [['उपधा गुण', '7.3.86', 'विद् + ति = वेत्ति'], ['उपधा गुण', '7.3.86', 'बुध् + अ (शप्) = बोध'],
    ['गुण निषेध', '1.1.5', 'विद् + तः = वित्तः'], ['गुण निषेध', '1.1.5', 'तुद् + अ (श) = तुद']]],
  ['shesha', [['केही हुँदैन', null, 'अद् + ति = अत्ति'], ['केही हुँदैन', null, 'वद् + अ (शप्) = वद'],
    ['केही हुँदैन', null, 'अद् + तः = अत्तः'], ['केही हुँदैन', null, 'अद् + अन्ति = अदन्ति']]],
];
const angaMatrixHtml = () => `<div class="tbl-wrap"><table class="am"><thead><tr><th>अङ्ग ↓ · प्रत्यय →</th><th>हलादि पित्</th><th>अजादि पित्</th><th>हलादि अपित्</th><th>अजादि अपित्</th></tr></thead><tbody>
  ${ANGA_MATRIX.map(([k, cells]) => `<tr><th>${ANGA_VARGA[k]}</th>${cells.map(([what, s, ex]) =>
    `<td><div>${what}</div>${s ? sutraChip(s, 'mini') : ''}${ex ? `<div class="skt small">${ex}</div>` : ''}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;

const dhatuLabel = (dh) => `${dh.u} ${dh.a}`;
const dhatuChips = (act, sel) => Object.entries(GANAS).map(([g, G]) => `<div class="gana-row"><small class="muted">${G.name}</small><div class="chips">${DHATUS.filter((d) => d.g === g).map((d) =>
  `<button class="chip skt ${d.id === sel ? 'on' : ''}" data-act="${act}" data-dh="${d.id}" title="${esc(d.ne)}">${d.d}</button>`).join('')}</div></div>`).join('');

function angaBuilderHtml(sel = 'ni') {
  const dh = dhatuById(sel), A = buildAnga(dh);
  return `<div class="ab" data-dh="${sel}">${dhatuChips('ab', sel)}
    ${stepsHtml(`${dhatuLabel(dh)} (${dh.ne}) — ${GANAS[dh.g].name}`, [...A.pre, ...A.steps])}
    <p class="ab-out">अङ्ग: <b class="skt">${A.angaStr}</b> <span class="tag">${ANGA_VARGA[angaVarga(parse(A.angaStr))]}</span></p></div>`;
}

/** The 74 endings, coloured by how they join an अदन्त अङ्ग; पित् endings in bold (as in सहजबोध). */
function endingsTableHtml() {
  const cell = (lk, pada, p, n) => ENDINGS[lk][pada][p][n].split('|').map((e, k) => {
    const pit = endingVarga(lk, pada, p, n, e).pit;
    return `<span class="end j-${joinClass(e)} ${pit ? 'pit' : ''}">${e || '०'}</span>`;
  }).join(' / ');
  const legend = `<div class="chips">${JOIN_ORDER.map((j) => `<span class="end j-${j}">${JOIN[j].label}</span>`).join('')}<span class="end pit">गाढा = पित्</span></div>`;
  const head = ['', ...['P', 'A'].flatMap((x) => VACANA.map((v) => `${x === 'P' ? 'पर.' : 'आत्मने.'} ${v.replace('वचन', '')}`))];
  return legend + LAKARAS.map(({ key: lk, name }) => `<h4>${name}</h4>` + table(head,
    [0, 1, 2].map((p) => [PURUSHA[p], ...[0, 1, 2].map((n) => cell(lk, 'P', p, n)), ...[0, 1, 2].map((n) => cell(lk, 'A', p, n))]), 'rupa ends')).join('');
}

/** सबै ७४ प्रत्यय नय मा जोडेर, join class अनुसार — one sūtra, all its applications at once. */
function joinClassesHtml() {
  const by = Object.fromEntries(JOIN_ORDER.map((j) => [j, []]));
  forEachEnding(({ lk, pada, p, n, e, k }) => {
    const r = derive('ni', lk, pada, p, n);
    by[joinClass(e)].push(`${lk === 'lan' ? 'अनय' : 'नय'} + ${e || '०'} = ${k ? r.alts[k - 1] : r.form}`);
  });
  return JOIN_ORDER.map((j) => `<div class="jc card"><div class="row between wrap"><b>${JOIN[j].label}</b>${JOIN[j].s ? sutraChip(JOIN[j].s, 'mini') : ''}</div>
    <p class="small muted">${JOIN[j].n}</p><div class="jc-list skt">${by[j].map((x) => `<span>${x}</span>`).join('')}</div>
    <small class="muted">${toDevDigits(by[j].length)} रूप</small></div>`).join('');
}

/** धातुरूप गणक: dhātu, lakāra, pada → 3×3 table; the chosen cell's derivation below. */
function tinToolHtml({ dh = 'ni', lk = 'lat', pada, c = '00' } = {}) {
  const D = dhatuById(dh) || dhatuById('ni');
  const padas = padasOf(D);
  const pd = padas.includes(pada) ? pada : padas[0];
  const [cp, cn] = [+c[0], +c[1]];
  const st = { dh: D.id, lk, pada: pd, c };
  const btn = (k, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="tt" data-k="${k}" data-v="${v}" data-st='${JSON.stringify(st)}'>${label}</button>`;
  const r = derive(D.id, lk, pd, cp, cn);
  const opts = Object.entries(GANAS).map(([g, G]) => `<optgroup label="${G.name}">${DHATUS.filter((d) => d.g === g).map((d) =>
    `<option value="${d.id}" ${d.id === D.id ? 'selected' : ''}>${d.d} — ${esc(d.ne)}</option>`).join('')}</optgroup>`).join('');
  const grid = [0, 1, 2].map((p) => [PURUSHA[p], ...[0, 1, 2].map((n) => {
    const x = derive(D.id, lk, pd, p, n);
    return `<button class="cellbtn skt ${p === cp && n === cn ? 'on' : ''}" data-act="tt" data-k="c" data-v="${p}${n}" data-st='${JSON.stringify(st)}'>${x.form}${x.alts.length ? `<small>/${x.alts.join('/')}</small>` : ''}</button>`;
  })]);
  return `<div class="tt">
    <label class="tt-sel"><span>${T.tin.dhatu}</span><select class="skt" data-tt-st='${JSON.stringify(st)}'>${opts}</select></label>
    <p class="small muted"><span class="skt">${dhatuLabel(D)}</span> · ${D.ne} · ${GANAS[D.g].name} (${GANAS[D.g].vik}) · ${T.tin.anga}: <b class="skt">${buildAnga(D, pd).angaStr}</b></p>
    <div class="chips">${LAKARAS.map((L) => btn('lk', L.key, L.name, L.key === lk)).join('')}</div>
    ${padas.length > 1 ? `<div class="chips">${padas.map((x) => btn('pada', x, PADA[x], x === pd)).join('')}</div>` : `<p class="small muted">${PADA[pd]}</p>`}
    ${table(['', ...VACANA], grid, 'rupa tt-grid')}
    ${stepsHtml(`${r.form}${r.alts.length ? ` / ${r.alts.join(' / ')}` : ''} — ${lakName(lk)}, ${PURUSHA[cp]} ${VACANA[cn]}`, r.steps)}
  </div>`;
}

const WIDGETS = {
  sthana: () => table(['स्थान', 'वर्ण', 'शिक्षा वचन'], STHANA.map((s) => [s.name, `<span class="skt">${s.letters.join(' ')}</span>`, `<span class="skt small">${s.rule}</span>`])),
  varna: varnaGridHtml,
  varga: () => table(['', 'अघोष अल्पप्राण', 'अघोष महाप्राण', 'घोष अल्पप्राण', 'घोष महाप्राण', 'घोष अनुनासिक'],
    VARGAS.map((v, i) => [['कवर्ग', 'चवर्ग', 'टवर्ग', 'तवर्ग', 'पवर्ग'][i], ...v.map((l) => `<span class="skt">${l}</span>`)]), 'center'),
  maheshvara: (a = {}) => maheshvaraHtml(a.mode),
  pratyaharaTable: (a) => table(['नाम', 'वर्ण', 'सङ्ख्या'], a.list.map((p) => {
    const m = pratyaharaMembers(p);
    return [`<b class="skt">${p}</b>`, `<span class="skt">${m.join(' ')}</span>`, toDevDigits(m.length)];
  })),
  roles: () => table(['विभक्ति', 'भूमिका', 'प्रश्न', 'परिभाषा'], [
    ['<span class="pill r-sthani">षष्ठी</span>', 'स्थानी', 'कसको ठाउँमा?', sutraChip('1.1.49', 'mini')],
    ['<span class="pill r-adesha">प्रथमा</span>', 'आदेश', 'के आउँछ?', '—'],
    ['<span class="pill r-para">सप्तमी</span>', 'पछिको निमित्त', 'के पछि आउँदा?', sutraChip('1.1.66', 'mini')],
    ['<span class="pill r-purva">पञ्चमी</span>', 'अघिको निमित्त', 'के अघि हुँदा?', sutraChip('1.1.67', 'mini')],
  ]),
  visargaChart: () => table(['विसर्ग अघि', 'पछि आउने', 'परिणाम', 'उदाहरण'], VISARGA_ROWS.map(([a, b, c, [w1, w2]]) => {
    const r = sandhi(w1, w2);
    return [a, `<span class="skt">${b}</span>`, c, `<span class="skt">${w1} + ${w2} = ${r.result}</span>`];
  })),
  sup: () => table(['विभक्ति', ...VACANA], SUP.map((r, i) => [VIBHAKTI[i], ...r.map((x) => `<span class="skt">${x}</span>`)]), 'rupa'),
  tin: () => table(['पुरुष', ...VACANA], TIN.parasmai.map((r, i) => [PURUSHA[i], ...r.map((x, j) => `<span class="skt">${x}</span> · <span class="skt muted">${TIN.atmane[i][j]}</span>`)]), 'rupa')
    + '<p class="muted small">पहिलो: परस्मैपद · दोस्रो (खैरो): आत्मनेपद</p>',
  lakara: () => table(['लकार', 'प्रयोग'], LAKARA.map((l) => [`<b class="skt">${l.name}</b>`, l.use])),
  pratyayaVarga: pratyayaVargaHtml,
  angaMatrix: angaMatrixHtml,
  angaBuilder: (a = {}) => angaBuilderHtml(a.dh),
  endingsTable: endingsTableHtml,
  joinClasses: joinClassesHtml,
  tinTool: (a = {}) => tinToolHtml(a),
  ...READER_WIDGETS,
};

function renderBlock(b) {
  switch (b.t) {
    case 'p': return `<p>${glossify(b.h)}</p>`;
    case 'h': return `<h3>${b.text}</h3>`;
    case 'tip': return `<div class="callout tip">${glossify(b.h)}</div>`;
    case 'note': return `<div class="callout note">${glossify(b.h)}</div>`;
    case 'verse': return `<blockquote class="verse skt">${b.text.replace(/\n/g, '<br>')}</blockquote>`;
    case 'sutra': return sutraCard(b.id);
    case 'sandhi': return sandhiCard(b.w1, b.w2, b.opts);
    case 'table': return glossify(table(b.head, b.rows.map((r) => r.map((c) => `<span class="skt-ish">${c}</span>`))));
    case 'widget': return WIDGETS[b.name](b.args);
    case 'prakriya': return prakriyaHtml(b.id);
    case 'shabda': return shabdaHtml(b.id);
    case 'dhatu': return dhatuHtml(b.id);
    default: return '';
  }
}

// ---- Bottom sheet for a sūtra -------------------------------------------------------------
const sheet = document.getElementById('sheet');
const ALL_EX = LESSONS.flatMap((l) => l.ex || []);

const SUTRA_ORDER = Object.keys(SUTRAS).sort((a, b) => sutraKey(a) - sutraKey(b));

/** Where the sūtra sits in the Aṣṭādhyāyī: governing headings and its neighbours in this app. */
function kramaHtml(id) {
  const adh = adhikarasOf(id);
  const i = SUTRA_ORDER.indexOf(id), prev = SUTRA_ORDER[i - 1], next = SUTRA_ORDER[i + 1];
  if (sutraKey(id) >= 9e9) return '';
  return `<div class="krama"><b>${T.krama.where}</b>
    ${adh.length ? `<div>${T.krama.under}: ${adh.map((a) => SUTRAS[a.from] ? sutraChip(a.from, 'mini') : `<span class="chip muted skt">${a.t} <small>${sutraNum(a.from)}–${sutraNum(a.to)}</small></span>`).join(' ')}</div>` : ''}
    <div class="row between small">${prev && sutraKey(prev) < 9e9 ? `<span>← ${sutraChip(prev, 'mini')}</span>` : '<span></span>'}${next && sutraKey(next) < 9e9 ? `<span>${sutraChip(next, 'mini')} →</span>` : ''}</div>
    <p class="small muted">${T.krama.gap}</p></div>`;
}

/** सबै प्रयोग: every junction (sandhi) or form (tiṅanta) where the engines apply this sūtra. */
function sweepHtml(id) {
  const grids = sandhiSweep(id).map((g) => `<p class="small"><b>${g.title}</b></p><div class="tbl-wrap"><table class="sweep"><thead><tr><th></th>${g.cols.map((c) => `<th class="skt">${c}</th>`).join('')}</tr></thead>
    <tbody>${g.rows.map((r) => `<tr><th class="skt">${r.label}</th>${r.cells.map((c) => `<td class="skt ${c.hit ? 'hit' : ''}">${esc(c.txt) || '·'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
  const forms = tinSweep().get(id) || [];
  const seen = new Set(), pick = [];
  for (const f of forms) if (!seen.has(f.dh) && pick.length < 12) { seen.add(f.dh); pick.push(f); }
  const tin = forms.length ? `<p class="small">${T.sweep.forms(toDevDigits(forms.length), toDevDigits(new Set(forms.map((f) => f.dh)).size))}</p>
    <div class="chips">${pick.map((f) => `<a class="chip" href="#/tools/tin/${f.dh}/${f.lk}/${f.pada}/${f.p}${f.n}"><span class="skt">${f.form}</span> <small class="muted">${dhatuById(f.dh).d} · ${lakName(f.lk)}</small></a>`).join('')}</div>` : '';
  if (!grids && !tin) return '';
  return `<h4>${T.sweep.title}</h4><p class="small muted">${T.sweep.sub}</p>${grids}${tin}`;
}

function openSutra(id) {
  if (!SUTRAS[id]) return;
  const lessons = LESSONS.filter((l) => l.sutras.includes(id));
  const exs = ALL_EX.filter(([a, b, , o]) => sandhi(a, b, o || {}).steps.some((s) => s.s === id || s.also.includes(id))).slice(0, 4);
  sheet.querySelector('.sheet-body').innerHTML = sutraCard(id, { full: true })
    + (lessons.length ? `<p class="muted">${T.inLesson}: ${lessons.map((l) => `<a href="#/lesson/${l.id}" data-act="close-sheet">${l.title}</a>`).join(', ')}</p>` : '')
    + kramaHtml(id)
    + (isSwitchable(id) ? `<p><a href="#/lab/${id}" data-act="close-sheet">🧪 ${T.lab.open}</a></p>` : '')
    + (exs.length ? `<h4>${T.examples}</h4>${exs.map(([a, b, , o]) => sandhiCard(a, b, o || {}, { open: true })).join('')}` : '')
    + sweepHtml(id);
  showSheet(T.sheet.sutra, () => openSutra(id));
}

/** Glossary entry in the sheet; a term opened from inside the sheet can go back (see showSheet). */
function openTerm(id) {
  const html = termHtml(id);
  if (!html) return;
  sheet.querySelector('.sheet-body').innerHTML = html;
  showSheet(T.gloss.sheet, () => openTerm(id));
}

/** Opens over the current page, so a lesson or quiz keeps its place. */
function openMaheshvara() {
  sheet.querySelector('.sheet-body').innerHTML = `<h2>${T.sheet.mh}</h2>` + maheshvaraRefHtml();
  showSheet(T.sheet.mh, openMaheshvara);
}

// Opening something from inside the open sheet stacks it, so ← पछाडि returns to the previous term or sūtra.
let sheetHist = [];
// Built here, not in index.html, so a stale cached index.html cannot break startup.
const sheetBack = Object.assign(document.createElement('button'), { className: 'sheet-back', hidden: true });
sheet.querySelector('.sheet-head').prepend(sheetBack);
function showSheet(label, reopen) {
  if (!sheet.open) sheetHist = [];
  sheetHist.push(reopen);
  sheetBack.hidden = sheetHist.length < 2;
  sheet.setAttribute('aria-label', label);
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('.sheet-body').scrollTop = 0;
}
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

// ---- Quiz runner ---------------------------------------------------------------------------
function runQuiz(el, make, { onDone } = {}) {
  let qs = make(), i = 0, score = 0, answered = false;
  const draw = () => {
    if (!qs.length) { el.innerHTML = `<p class="muted">${T.noQuestions}</p>`; return; }
    if (i >= qs.length) {
      el.innerHTML = `<div class="card center"><div class="big-score">${toDevDigits(score)}/${toDevDigits(qs.length)}</div>
        <p>${T.score(toDevDigits(score), toDevDigits(qs.length))}</p>
        <div class="row gap center"><button class="btn" data-q="retry">${T.retry}</button><button class="btn ghost" data-q="back">${T.back}</button></div></div>`;
      onDone?.(score, qs.length);
      return;
    }
    const q = qs[i];
    el.innerHTML = `<div class="quiz"><div class="qbar"><span>${T.question(toDevDigits(i + 1), toDevDigits(qs.length))}</span>
      <span class="qprog"><span style="width:${(i / qs.length) * 100}%"></span></span></div>
      <div class="qprompt">${q.prompt}</div>
      <div class="opts">${q.options.map((o, k) => `<button class="opt skt" data-opt="${k}">${esc(o)}</button>`).join('')}</div>
      <div class="qexp" hidden></div></div>`;
  };
  el.onclick = (e) => {
    const o = e.target.closest('[data-opt]');
    if (o && !answered) {
      answered = true;
      const q = qs[i], k = +o.dataset.opt, ok = k === q.answer;
      if (ok) score++;
      store.recordAnswer(q.topic, ok);
      el.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; b.classList.toggle('right', j === q.answer); b.classList.toggle('wrongpick', j === k && !ok); });
      const ex = el.querySelector('.qexp');
      ex.innerHTML = `<b class="${ok ? 'ok' : 'bad'}">${ok ? T.correct : T.wrong}</b> ${glossify(q.explain)}
        <div class="row end"><button class="btn" data-q="next">${i + 1 < qs.length ? T.next : T.finish}</button></div>`;
      ex.hidden = false;
      ex.querySelector('[data-q="next"]').focus({ preventScroll: true });
      ex.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    const a = e.target.closest('[data-q]')?.dataset.q;
    if (a === 'next') { i++; answered = false; draw(); el.scrollIntoView({ block: 'start' }); }
    if (a === 'retry') { qs = make(); i = 0; score = 0; answered = false; draw(); }
    if (a === 'back') history.back();
  };
  draw();
}

// ============================================================================================
// Views
// ============================================================================================

const pathLessons = () => lessonsInPath(store.path());
const nextLesson = () => pathLessons().find((l) => !store.isDone(l.id));
const bar = (frac) => `<span class="bar"><span style="width:${Math.round(frac * 100)}%"></span></span>`;

let deferredInstall = null;

function homeView() {
  const nl = nextLesson();
  const due = store.dueCards().length;
  const done = store.doneCount(LESSONS.map((l) => l.id));
  const unit = nl && UNITS.find((u) => u.id === nl.unit);
  view.innerHTML = `
    <section class="hero"><h1>${T.appName}</h1><p>${T.tagline}</p></section>
    <div class="grid2">
      <div class="card stat"><div class="stat-n">🔥 ${toDevDigits(store.streak())}</div><div>${store.streak() ? T.streak(toDevDigits(store.streak())) : T.streak(0)}</div><small class="muted">${T.streakSub(store.activeToday())}</small></div>
      <a class="card stat link" href="#/review"><div class="stat-n">🔁 ${toDevDigits(due)}</div><div>${T.dueReviews(toDevDigits(due))}</div><small class="muted">${T.startReview} →</small></a>
    </div>
    ${nl ? `<a class="card next link" href="#/lesson/${nl.id}"><small class="muted">${T.continueLesson} · ${unit.title}</small>
      <div class="next-title">${nl.title}</div><p class="muted">${nl.goal}</p></a>` : `<div class="card">${T.allLessonsDone}</div>`}
    <div class="grid2">
      <a class="card link" href="#/map"><b>🗺 ${T.home.map[0]}</b><p class="muted small">${T.home.map[1]}</p></a>
      <a class="card link" href="#/lab"><b>🧪 ${T.home.lab[0]}</b><p class="muted small">${T.home.lab[1]}</p></a>
    </div>
    ${(() => { const v = verseOfDay(); return `<a class="card link" href="#/verse/${v.id}"><small class="muted">📜 ${T.home.verseToday} · ${v.src}</small><div class="skt verse-line">${v.text.split('\n')[0]}</div></a>`; })()}
    <div class="card"><div class="row between"><b>${T.overall}</b><span>${T.lessonsDone(toDevDigits(done), toDevDigits(LESSONS.length))}</span></div>${bar(done / LESSONS.length)}</div>
    ${deferredInstall ? `<button class="btn wide" data-act="install">📲 ${T.install}</button>` : ''}
    <details class="card"><summary><b>${T.howTo}</b></summary><ol>${T.howToSteps.map((s) => `<li>${s}</li>`).join('')}</ol></details>`;
}

function lessonsView() {
  const path = store.path(), order = pathLessons();
  const pathChips = `<div class="card"><b>${T.paths.label}</b><div class="chips">${['lsk', 'reader'].map((k) =>
    `<button class="chip ${k === path ? 'on' : ''}" data-act="path" data-p="${k}">${T.paths[k][0]}</button>`).join('')}</div>
    <p class="small muted">${T.paths[path][1]}</p></div>`;
  view.innerHTML = header(T.lessonsTitle, T.lessonsSub) + pathChips + unitsInPath(path).map((u) => {
    const ls = LESSONS.filter((l) => l.unit === u.id);
    return `<section class="unit"><div class="row between"><h2>${u.title}</h2><small>${toDevDigits(store.doneCount(ls.map((l) => l.id)))}/${toDevDigits(ls.length)}</small></div>
      <p class="sub">${u.sub}</p>
      <ol class="lesson-list">${ls.map((l) => `<li><a class="lesson-item ${store.isDone(l.id) ? 'done' : ''}" href="#/lesson/${l.id}">
        <span class="tick">${store.isDone(l.id) ? '✓' : toDevDigits(order.indexOf(l) + 1)}</span><span>${l.title}</span></a></li>`).join('')}</ol></section>`;
  }).join('');
}

function lessonView(id) {
  const l = lessonById(id);
  if (!l) { location.hash = '#/lessons'; return; }
  const order = pathLessons(), idx = order.indexOf(l), prev = order[idx - 1], next = order[idx + 1];
  const unit = UNITS.find((u) => u.id === l.unit);
  const done = store.isDone(id);
  view.innerHTML = header(l.title, `${unit.title} · ${toDevDigits(idx + 1)}/${toDevDigits(order.length)}`, '#/lessons')
    + `<div class="callout goal"><b>${T.goal}:</b> ${l.goal}</div>`
    + `<div class="lesson-body">${l.blocks.map(renderBlock).join('')}</div>`
    + `<div class="lesson-foot">
        <div class="row gap wrap">
          ${done ? `<span class="chip on">✓ ${T.done}</span><button class="btn ghost small" data-act="undo-lesson" data-id="${id}">${T.undo}</button>`
                 : `<button class="btn" data-act="done-lesson" data-id="${id}">${T.markDone}</button>`}
          ${l.quiz?.length ? `<a class="btn ghost" href="#/lesson/${id}/quiz">${T.takeQuiz}</a>` : ''}
        </div>
        <p class="muted small" id="deck-msg"></p>
        <div class="row between">${prev ? `<a href="#/lesson/${prev.id}">${T.prevLesson}</a>` : '<span></span>'}${next ? `<a href="#/lesson/${next.id}">${T.nextLesson}</a>` : ''}</div>
      </div>`;
}

function lessonQuizView(id) {
  const l = lessonById(id);
  if (!l) { location.hash = '#/lessons'; return; }
  view.innerHTML = header(T.takeQuiz, l.title, `#/lesson/${id}`) + '<div id="quiz"></div>';
  runQuiz(document.getElementById('quiz'), () => buildQuiz(l.quiz, { ex: l.ex, sutras: l.sutras }, 6), {
    onDone: (c, n) => { if (!store.isDone(id) && c / n >= 0.6) store.completeLesson(id, l.sutras); },
  });
}

const doneSutras = () => LESSONS.filter((l) => store.isDone(l.id)).flatMap((l) => l.sutras);
const PRACTICE = {
  ac: () => buildQuiz(['sandhiResult', 'sandhiResult', 'sandhiSutra'], { ex: examplesFor(['B']) }, 10),
  hal: () => buildQuiz(['sandhiResult', 'sandhiResult', 'sandhiSutra'], { ex: examplesFor(['C']) }, 10),
  visarga: () => buildQuiz(['sandhiResult', 'sandhiResult', 'sandhiSutra'], { ex: examplesFor(['D']) }, 10),
  sandhiSutra: () => buildQuiz(['sandhiSutra'], { ex: examplesFor(['B', 'C', 'D']) }, 10),
  pratyahara: () => buildQuiz(['pratyahara'], {}, 10),
  varna: () => buildQuiz(['varna', 'savarna', 'gunaVrddhi'], {}, 10),
  sutra: () => buildQuiz(['sutraArtha', 'padaRole'], { sutras: doneSutras().length >= 4 ? doneSutras() : Object.keys(SUTRAS) }, 10),
  rupa: () => buildQuiz(['rupa'], {}, 10),
  dhatu: () => buildQuiz(['dhatu'], {}, 10),
  tin: () => buildQuiz(['tinForm', 'angaOf', 'pratyayaVarga', 'joinSutra'], {}, 10),
  recog: () => buildQuiz(['rupaRecognize', 'tinRecognize'], {}, 10),
  karaka: () => buildQuiz(['karaka'], {}, 10),
  krit: () => buildQuiz(['kritRecognize', 'kritForm'], {}, 10),
  samasa: () => buildQuiz(['samasaType'], {}, 10),
  verse: () => buildQuiz(['versePada'], {}, 10),
};

function practiceView() {
  const due = store.dueCards().length, deck = store.deckSize();
  view.innerHTML = header(T.practiceTitle, T.practiceSub)
    + `<a class="card link review-card" href="#/review"><b>🔁 ${T.review}</b><p class="muted">${T.reviewSub(toDevDigits(due), toDevDigits(deck))}</p></a>`
    + `<div class="grid2">${Object.entries(T.practiceSets).map(([k, [t, s]]) => `<a class="card link" href="#/quiz/${k}"><b>${t}</b><p class="muted small">${s}</p></a>`).join('')}</div>`;
}

function topicQuizView(key) {
  if (!PRACTICE[key]) { location.hash = '#/practice'; return; }
  view.innerHTML = header(T.practiceSets[key][0], T.practiceSets[key][1], '#/practice') + '<div id="quiz"></div>';
  runQuiz(document.getElementById('quiz'), PRACTICE[key]);
}

function reviewView() {
  view.innerHTML = header(T.review, '', '#/practice') + '<div id="rv"></div>';
  const el = document.getElementById('rv');
  const queue = store.dueCards();
  let revealed = false, count = 0;
  const draw = () => {
    if (!queue.length) { el.innerHTML = `<div class="card center"><p>${count ? T.reviewDone : T.reviewEmpty}</p><a class="btn" href="#/">${T.back}</a></div>`; return; }
    const id = queue[0], s = SUTRAS[id];
    el.innerHTML = `<p class="muted small">${toDevDigits(queue.length)} बाँकी</p>
      ${revealed ? sutraCard(id, { full: true }) : `<div class="card flash"><div class="snum">${sutraNum(id)} · ${TYPES[s.ty]}</div><div class="stext skt">${s.t}</div><p class="muted">यसको अर्थ के हो? मनमनै भन्नुहोस्।</p></div>`}
      <div class="row gap center">${revealed
        ? T.grade.map((g, k) => `<button class="btn grade g${k}" data-grade="${k}">${g}</button>`).join('')
        : `<button class="btn wide" data-reveal>${T.showAnswer}</button>`}</div>`;
  };
  el.onclick = (e) => {
    if (e.target.closest('[data-reveal]')) { revealed = true; draw(); return; }
    const g = e.target.closest('[data-grade]');
    if (g) {
      const id = queue.shift(), grade = +g.dataset.grade;
      store.gradeCard(id, grade);
      if (grade === 0) queue.push(id);
      count++; revealed = false; draw();
    }
  };
  draw();
}

const TOOL_HREF = { map: '#/map', lab: '#/lab', verses: '#/verses', glossary: '#/glossary' };
function toolsView() {
  view.innerHTML = header(T.toolsTitle) + `<div class="grid2">${Object.entries(T.tools).map(([k, [t, s]]) =>
    `<a class="card link" href="${TOOL_HREF[k] || `#/tools/${k}`}"><b>${t}</b><p class="muted small">${s}</p></a>`).join('')}</div>`;
}

function sandhiToolView() {
  const pool = shuffle(ALL_EX).slice(0, 10);
  view.innerHTML = header(T.tools.sandhi[0], T.sandhiToolHint, '#/tools') + `
    <form class="card sform" id="sform" autocomplete="off">
      <div class="row gap"><label><span>${T.word1}</span><input class="skt" name="a" lang="sa" required></label>
      <span class="plus">+</span><label><span>${T.word2}</span><input class="skt" name="b" lang="sa" required></label></div>
      <label class="check"><input type="checkbox" name="internal"> ${T.internal}</label>
      <label class="check"><input type="checkbox" name="dual"> ${T.dual}</label>
      <button class="btn wide">${T.join}</button>
    </form>
    <div id="sout"></div>
    <h3>${T.tryThese}</h3><div class="chips">${pool.map(([a, b, , o = {}]) =>
      `<button class="chip skt" data-act="try" data-a="${a}" data-b="${b}" data-i="${o.internal ? 1 : 0}" data-d="${o.dual ? 1 : 0}">${a} + ${b}</button>`).join('')}</div>`;
  const f = document.getElementById('sform');
  const run = () => {
    document.getElementById('sout').innerHTML = sandhiCard(f.a.value, f.b.value, { internal: f.internal.checked, dual: f.dual.checked }, { open: true });
  };
  f.onsubmit = (e) => { e.preventDefault(); run(); };
  view.querySelector('.chips').onclick = (e) => {
    const c = e.target.closest('[data-act="try"]'); if (!c) return;
    f.a.value = c.dataset.a; f.b.value = c.dataset.b; f.internal.checked = c.dataset.i === '1'; f.dual.checked = c.dataset.d === '1';
    run(); document.getElementById('sout').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
}

/** माहेश्वर सूत्र explorer + all 41 pratyāhāras. Shared by the tool page and the tab-bar quick sheet. */
function maheshvaraRefHtml() {
  return maheshvaraHtml('explore') + `<h3>${T.allPratyaharas}</h3>` + WIDGETS.pratyaharaTable({ list: PRATYAHARAS });
}

function pratyaharaToolView() {
  view.innerHTML = header(T.tools.pratyahara[0], T.tools.pratyahara[1], '#/tools') + maheshvaraRefHtml()
    + `<div class="callout note">${LESSONS.find((l) => l.id === 'pratyahara').blocks.find((b) => b.t === 'note').h}</div>`;
}

function rupaToolView(sel = 'rama') {
  view.innerHTML = header(T.tools.rupa[0], T.tools.rupa[1], '#/tools')
    + `<div class="chips">${Object.entries(SHABDA).map(([k, s]) => `<button class="chip skt ${k === sel ? 'on' : ''}" data-act="rupa" data-k="${k}">${s.name}</button>`).join('')}</div>`
    + shabdaHtml(sel);
}

function dhatuToolView() {
  view.innerHTML = header(T.tools.dhatu[0], T.tools.dhatu[1], '#/tools') + dhatuHtml('bhu');
}

function tinToolView(dh, lk, pada, c) {
  view.innerHTML = header(T.tools.tin[0], T.tools.tin[1], '#/tools') + tinToolHtml({ dh, lk, pada, c });
}

function kritToolView() {
  view.innerHTML = header(T.tools.krit[0], T.tools.krit[1], '#/tools') + kritHtml() + `<h3>${T.krit.hints[1]}</h3>` + kritHintsHtml();
}

function anubandhaToolView() {
  view.innerHTML = header(T.tools.anubandha[0], T.tools.anubandha[1], '#/tools') + anubandhaHtml() + anubandhaTableHtml();
}

function sutraIndexView(mode) {
  const krama = mode === 'krama';
  const order = krama ? SUTRA_ORDER : [...new Set([...LESSONS.flatMap((l) => l.sutras), ...Object.keys(SUTRAS)])];
  const pada = (id) => (sutraKey(id) < 9e9 ? id.split('.').slice(0, 2).join('.') : 'v');
  const item = (id) => `<li data-k="${esc(SUTRAS[id].t + ' ' + id + ' ' + sutraNum(id))}"><button class="sref wide" data-sutra="${id}">
        <span class="skt">${SUTRAS[id].t}</span><small>${sutraNum(id)} · ${TYPES[SUTRAS[id].ty]}</small></button></li>`;
  const body = krama
    ? order.map((id, i) => (i === 0 || pada(id) !== pada(order[i - 1])
      ? `<li class="pada-h">${pada(id) === 'v' ? 'वार्त्तिक' : T.krama.pada(...pada(id).split('.').map(toDevDigits))}</li>` : '') + item(id)).join('')
    : order.map(item).join('');
  view.innerHTML = header(T.tools.sutras[0], `${toDevDigits(order.length)} सूत्र`, '#/tools')
    + `<div class="chips"><a class="chip ${krama ? '' : 'on'}" href="#/tools/sutras">${T.krama.lessonOrder}</a><a class="chip ${krama ? 'on' : ''}" href="#/tools/sutras/krama">${T.krama.astOrder}</a></div>`
    + (krama ? `<p class="small muted">${T.krama.hint}</p>` : '')
    + `<input class="search" type="search" id="sq" placeholder="${T.searchSutra}">`
    + `<ul class="sutra-index">${body}</ul>`;
  const q = document.getElementById('sq');
  q.oninput = () => {
    const s = q.value.trim().replace(/[।\.]/g, '');
    view.querySelectorAll('.sutra-index li[data-k]').forEach((li) => { li.hidden = !!s && !li.dataset.k.replace(/[।\.]/g, '').includes(s); });
    view.querySelectorAll('.sutra-index .pada-h').forEach((h) => { h.hidden = !!s; });
  };
}

function progressView() {
  const stats = store.quizStats();
  const boxes = store.boxCounts();
  const maxBox = Math.max(1, ...boxes);
  view.innerHTML = header(T.progressTitle)
    + `<div class="card"><b>${T.lessonsByUnit}</b>${UNITS.map((u) => {
      const ids = LESSONS.filter((l) => l.unit === u.id).map((l) => l.id), d = store.doneCount(ids);
      return `<div class="prow"><span>${u.title}</span><small>${toDevDigits(d)}/${toDevDigits(ids.length)}</small>${bar(d / ids.length)}</div>`;
    }).join('')}</div>`
    + `<div class="card"><b>${T.quizAccuracy}</b>${Object.keys(stats).length ? Object.entries(stats).map(([k, v]) =>
      `<div class="prow"><span>${T.topics[k] || k}</span><small>${toDevDigits(v.c)}/${toDevDigits(v.t)} · ${toDevDigits(Math.round((v.c / v.t) * 100))}%</small>${bar(v.c / v.t)}</div>`).join('')
      : `<p class="muted">${T.noQuizYet}</p>`}</div>`
    + `<div class="card"><b>${T.deck}</b><div class="boxes">${boxes.map((n, i) =>
      `<div class="box"><span class="boxbar" style="height:${(n / maxBox) * 100}%"></span><small>${toDevDigits(n)}</small><span>${T.deckBoxes[i]}</span></div>`).join('')}</div>
      <p class="muted small">${T.deckHint}</p></div>`
    + `<div class="card"><b>${T.backup}</b><p class="muted small">${T.backupHint}</p>
      <div class="row gap wrap"><button class="btn small" data-act="export">${T.exportBtn}</button>
      <label class="btn small ghost">${T.importBtn}<input type="file" accept="application/json,.json" id="imp" hidden></label>
      <button class="btn small danger" data-act="reset">${T.reset}</button></div><p class="small" id="bmsg"></p></div>`;
  document.getElementById('imp').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { store.importJson(await file.text()); progressView(); toast(T.importOk); } catch { document.getElementById('bmsg').textContent = T.importBad; }
  };
}

// ============================================================================================
// Router, global events, PWA
// ============================================================================================

const ROUTES = [
  [/^#?\/?$/, homeView, 'home'],
  [/^#\/lessons$/, lessonsView, 'lessons'],
  [/^#\/lesson\/([\w-]+)$/, lessonView, 'lessons'],
  [/^#\/lesson\/([\w-]+)\/quiz$/, lessonQuizView, 'lessons'],
  [/^#\/practice$/, practiceView, 'practice'],
  [/^#\/quiz\/(\w+)$/, topicQuizView, 'practice'],
  [/^#\/review$/, reviewView, 'practice'],
  [/^#\/tools$/, toolsView, 'tools'],
  [/^#\/tools\/sandhi$/, sandhiToolView, 'tools'],
  [/^#\/tools\/pratyahara$/, pratyaharaToolView, 'tools'],
  [/^#\/tools\/rupa$/, () => rupaToolView(), 'tools'],
  [/^#\/tools\/dhatu$/, dhatuToolView, 'tools'],
  [/^#\/tools\/sutras(?:\/(krama))?$/, sutraIndexView, 'tools'],
  [/^#\/tools\/tin(?:\/(\w+)\/(\w+)\/([PA])\/([0-2][0-2]))?$/, tinToolView, 'tools'],
  [/^#\/progress$/, progressView, 'progress'],
  [/^#\/map$/, mapView, 'tools'],
  [/^#\/verses$/, versesView, 'lessons'],
  [/^#\/verse\/([\w-]+)$/, (id) => verseView(id), 'lessons'],
  [/^#\/lab(?:\/([\w.]+))?$/, (id) => labView(id), 'tools'],
  [/^#\/tools\/krit$/, kritToolView, 'tools'],
  [/^#\/tools\/anubandha$/, anubandhaToolView, 'tools'],
  [/^#\/glossary(?:\/([\w-]+))?$/, (id) => glossaryView(id), 'tools'],
];

function route() {
  if (sheet.open) sheet.close();
  const hash = location.hash || '#/';
  for (const [re, fn, tab] of ROUTES) {
    const m = hash.match(re);
    if (m) {
      document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
      fn(...m.slice(1));
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = '#/';
}

function toast(msg, action) {
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${msg}</span>${action ? `<button class="btn small" id="toast-act">${action.label}</button>` : ''}`;
  t.hidden = false;
  if (action) document.getElementById('toast-act').onclick = action.run;
  else setTimeout(() => { t.hidden = true; }, 2500);
}

let resetArmed = false;
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-gl]');
  if (g && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openTerm(g.dataset.gl); return; }
  const s = e.target.closest('[data-sutra]');
  if (s && !e.target.closest('a')) { openSutra(s.dataset.sutra); return; }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  if (onReaderClick(a)) return;
  const act = a.dataset.act;
  if (act === 'path') { store.setPath(a.dataset.p); lessonsView(); return; }
  if (act === 'sx-next' || act === 'sx-all') revealSandhi(a.dataset.id, act === 'sx-all');
  else if (act === 'mh') onMaheshvara(a);
  else if (act === 'mh-p') { const root = a.closest('.mh'); const r = pratyaharaRange(a.dataset.p); if (r) mhShow(root, a.dataset.p, r.start, r.end); root.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  else if (act === 'varna') onVarna(a);
  else if (act === 'dhatu-tab') a.closest('.dhatu').outerHTML = dhatuHtml(a.dataset.dh, a.dataset.lk);
  else if (act === 'rupa') rupaToolView(a.dataset.k);
  else if (act === 'ab') a.closest('.ab').outerHTML = angaBuilderHtml(a.dataset.dh);
  else if (act === 'tt') {
    const st = { ...JSON.parse(a.dataset.st), [a.dataset.k]: a.dataset.v };
    const root = a.closest('.tt');
    root.outerHTML = tinToolHtml(st);
    if (a.dataset.k === 'c') document.querySelector('.tt .prakriya')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  else if (act === 'close-sheet') sheet.close();
  else if (act === 'mh-sheet') openMaheshvara();
  else if (act === 'done-lesson') {
    const l = lessonById(a.dataset.id);
    const before = store.deckSize();
    store.completeLesson(l.id, l.sutras);
    const added = store.deckSize() - before;
    lessonView(l.id);
    document.getElementById('deck-msg').textContent = T.addedToDeck(toDevDigits(added));
    document.querySelector('.lesson-foot').scrollIntoView({ block: 'nearest' });
  } else if (act === 'undo-lesson') { store.undoLesson(a.dataset.id); lessonView(a.dataset.id); }
  else if (act === 'export') {
    const url = URL.createObjectURL(new Blob([store.exportJson()], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `sanskrit-sahayak-${new Date().toISOString().slice(0, 10)}.json` });
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else if (act === 'reset') {
    if (!resetArmed) { resetArmed = true; a.textContent = T.resetConfirm; setTimeout(() => { resetArmed = false; if (a.isConnected) a.textContent = T.reset; }, 4000); }
    else { resetArmed = false; store.reset(); progressView(); }
  } else if (act === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; a.remove(); }
});
document.addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-tt-st]');
  if (sel) sel.closest('.tt').outerHTML = tinToolHtml({ ...JSON.parse(sel.dataset.ttSt), dh: sel.value, c: '00' });
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article.sutra[data-sutra]')) { e.preventDefault(); openSutra(e.target.dataset.sutra); }
});
sheet.querySelector('.sheet-close').onclick = () => sheet.close();
sheetBack.textContent = T.sheet.back;
sheetBack.onclick = () => { sheetHist.pop(); sheetHist.pop()?.(); };


window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if ((location.hash || '#/') === '#/') homeView(); });
window.addEventListener('hashchange', route);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed') {
          if (navigator.serviceWorker.controller) toast(T.update, { label: T.reload, run: () => nw.postMessage('skipWaiting') });
          else toast(T.offlineReady);
        }
      });
    });
  }).catch(() => { /* offline support unavailable; app still works online */ });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
}

document.querySelectorAll('.tabbar [data-tab]').forEach((a) => { a.querySelector('span').textContent = T.nav[a.dataset.tab]; });
requestPersistence();
route();
