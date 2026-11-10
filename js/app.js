// संस्कृत सहायक — hash-routed single page app. No framework: views render HTML strings into #view,
// interaction goes through one delegated click handler (data-act) plus per-view handlers.

import { T } from './i18n.js';
import { sandhi } from './sandhi.js';
import { STHANA, VARGAS, VOWELS, ANTAHSTHA, USHMA, MAHESHVARA, SEQ, PRATYAHARAS, pratyaharaMembers, pratyaharaRange, pratyaharaName, describe, savarna, show, sutraNum, toDevDigits } from './varna.js';
import { SUTRAS, TYPES, ROLES } from './content/sutras.js';
import { UNITS, LESSONS, lessonById } from './content/lessons.js';
import { SHABDA, DHATU, SUP, TIN, LAKARA, VIBHAKTI, VACANA, PURUSHA, PRAKRIYA } from './content/rupa.js';
import { buildQuiz, examplesFor, shuffle } from './quiz.js';
import { store, requestPersistence } from './store.js';

const view = document.getElementById('view');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uid = 0;

// ============================================================================================
// Shared components
// ============================================================================================

const sutraChip = (id, cls = '') => SUTRAS[id]
  ? `<button class="sref ${cls}" data-sutra="${id}"><span class="skt">${SUTRAS[id].t}</span> <small>${sutraNum(id)}</small></button>` : '';

function sutraCard(id, { full = false } = {}) {
  const s = SUTRAS[id];
  if (!s) return '';
  const pc = s.pc ? `<ul class="pc">${s.pc.map(([w, r, n]) =>
    `<li class="r-${r}"><b class="skt">${w}</b><span class="role">${ROLES[r].label}</span>${full || r !== 'other' ? `<span class="pn">${n}</span>` : ''}</li>`).join('')}</ul>` : '';
  return `<article class="sutra" ${full ? '' : `data-sutra="${id}" tabindex="0" role="button"`}>
    <header><span class="snum">${sutraNum(id)}</span><span class="stype t-${s.ty}">${TYPES[s.ty]}</span></header>
    <div class="stext skt">${s.t}</div>
    ${pc}
    ${s.av ? `<div class="av"><b>${T.anuvritti}:</b> ${s.av}</div>` : ''}
    <p class="artha">${s.a}</p>
    ${s.s ? `<p class="saral">${s.s}</p>` : ''}
  </article>`;
}

function stepHtml(st) {
  const chips = (st.s ? sutraChip(st.s) : `<span class="chip muted">${T.note}</span>`) + st.also.map((a) => sutraChip(a, 'mini')).join('');
  const tx = st.from === st.to ? esc(st.from) : `${esc(st.from)} <span class="arrow">→</span> ${esc(st.to)}`;
  return `<li class="step"><div class="step-sutras">${chips}</div><div class="step-tx skt">${tx}</div><div class="step-note">${esc(st.note)}</div></li>`;
}

function sandhiCard(w1, w2, opts = {}, { open = false } = {}) {
  const r = sandhi(w1, w2, opts);
  if (!r.ok) return `<div class="sx warn">${esc(T.sandhiErr[r.reason] || T.sandhiErr.unsupported)}</div>`;
  const id = `sx${++uid}`;
  const tags = (opts.internal ? `<span class="tag">${T.internal}</span>` : '') + (opts.dual ? `<span class="tag">${T.dual}</span>` : '');
  const hasSteps = r.steps.length > 0;
  const reveal = open || !hasSteps;
  return `<div class="sx" id="${id}" data-shown="${reveal ? r.steps.length : 0}">
    <div class="sx-q"><span class="skt">${esc(w1)} + ${esc(w2)}</span> <span class="eq">=</span>
      <span class="sx-res skt" ${reveal ? '' : 'hidden'}>${esc(r.result)}</span><span class="sx-qm" ${reveal ? 'hidden' : ''}>?</span> ${tags}</div>
    ${hasSteps ? `<ol class="steps">${r.steps.map((s, i) => stepHtml(s).replace('<li class="step"', `<li class="step" ${reveal ? '' : 'hidden'}`)).join('')}</ol>` : `<p class="muted">${T.noSandhi}</p>`}
    ${r.alts.length ? `<div class="sx-alt" ${reveal ? '' : 'hidden'}>${T.alt}: <span class="skt">${esc(r.alts.join(', '))}</span></div>` : ''}
    ${reveal ? '' : `<div class="row gap"><button class="btn small" data-act="sx-next" data-id="${id}">${T.nextStep}</button><button class="btn small ghost" data-act="sx-all" data-id="${id}">${T.showAll}</button></div>`}
  </div>`;
}

function revealSandhi(id, all) {
  const el = document.getElementById(id);
  if (!el) return;
  const steps = [...el.querySelectorAll('.step')];
  const shown = all ? steps.length : Math.min(steps.length, +el.dataset.shown + 1);
  steps.forEach((s, i) => { s.hidden = i >= shown; });
  el.dataset.shown = shown;
  if (shown >= steps.length) {
    el.querySelector('.sx-res').hidden = false;
    el.querySelector('.sx-qm').hidden = true;
    const alt = el.querySelector('.sx-alt'); if (alt) alt.hidden = false;
    el.querySelector('.row.gap')?.remove();
  }
}

const table = (head, rows, cls = '') => `<div class="tbl-wrap"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function prakriyaHtml(key) {
  const p = PRAKRIYA[key];
  return `<div class="prakriya"><h4 class="skt">${p.title}</h4><ol>${p.steps.map((st) =>
    `<li><div class="pf skt">${st.f}</div><div class="step-sutras">${[].concat(st.s).map((s) => sutraChip(s, 'mini')).join('')}</div><div class="step-note">${st.n}</div></li>`).join('')}</ol></div>`;
}

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
    <dl><dt>स्थान</dt><dd>${d.sthana.join(' + ') || '—'}</dd>
    <dt>आभ्यन्तर प्रयत्न</dt><dd>${d.abhyantara || '—'}</dd>
    ${d.ghosha ? `<dt>बाह्य प्रयत्न</dt><dd>${d.ghosha}, ${d.prana}</dd>` : ''}
    ${d.matra ? `<dt>मात्रा</dt><dd>${d.matra}</dd>` : ''}
    <dt>सवर्ण</dt><dd class="skt">${sav.join(' ') || '—'}</dd></dl>`;
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
};

function renderBlock(b) {
  switch (b.t) {
    case 'p': return `<p>${b.h}</p>`;
    case 'h': return `<h3>${b.text}</h3>`;
    case 'tip': return `<div class="callout tip">${b.h}</div>`;
    case 'note': return `<div class="callout note">${b.h}</div>`;
    case 'verse': return `<blockquote class="verse skt">${b.text.replace(/\n/g, '<br>')}</blockquote>`;
    case 'sutra': return sutraCard(b.id);
    case 'sandhi': return sandhiCard(b.w1, b.w2, b.opts);
    case 'table': return table(b.head, b.rows.map((r) => r.map((c) => `<span class="skt-ish">${c}</span>`)));
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

function openSutra(id) {
  if (!SUTRAS[id]) return;
  const lessons = LESSONS.filter((l) => l.sutras.includes(id));
  const exs = ALL_EX.filter(([a, b, , o]) => sandhi(a, b, o || {}).steps.some((s) => s.s === id || s.also.includes(id))).slice(0, 4);
  sheet.querySelector('.sheet-body').innerHTML = sutraCard(id, { full: true })
    + (lessons.length ? `<p class="muted">${T.inLesson}: ${lessons.map((l) => `<a href="#/lesson/${l.id}" data-act="close-sheet">${l.title}</a>`).join(', ')}</p>` : '')
    + (exs.length ? `<h4>${T.examples}</h4>${exs.map(([a, b, , o]) => sandhiCard(a, b, o || {}, { open: true })).join('')}` : '');
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
      ex.innerHTML = `<b class="${ok ? 'ok' : 'bad'}">${ok ? T.correct : T.wrong}</b> ${q.explain || ''}
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

const header = (title, sub, back) => `<header class="vh">${back ? `<a class="back" href="${back}" aria-label="${T.back}">←</a>` : ''}
  <div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></header>`;
const nextLesson = () => LESSONS.find((l) => !store.isDone(l.id));
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
    <div class="card"><div class="row between"><b>${T.overall}</b><span>${T.lessonsDone(toDevDigits(done), toDevDigits(LESSONS.length))}</span></div>${bar(done / LESSONS.length)}</div>
    ${deferredInstall ? `<button class="btn wide" data-act="install">📲 ${T.install}</button>` : ''}
    <details class="card"><summary><b>${T.howTo}</b></summary><ol>${T.howToSteps.map((s) => `<li>${s}</li>`).join('')}</ol></details>`;
}

function lessonsView() {
  view.innerHTML = header(T.lessonsTitle, T.lessonsSub) + UNITS.map((u) => {
    const ls = LESSONS.filter((l) => l.unit === u.id);
    return `<section class="unit"><div class="row between"><h2>${u.title}</h2><small>${toDevDigits(store.doneCount(ls.map((l) => l.id)))}/${toDevDigits(ls.length)}</small></div>
      <p class="sub">${u.sub}</p>
      <ol class="lesson-list">${ls.map((l) => `<li><a class="lesson-item ${store.isDone(l.id) ? 'done' : ''}" href="#/lesson/${l.id}">
        <span class="tick">${store.isDone(l.id) ? '✓' : toDevDigits(LESSONS.indexOf(l) + 1)}</span><span>${l.title}</span></a></li>`).join('')}</ol></section>`;
  }).join('');
}

function lessonView(id) {
  const l = lessonById(id);
  if (!l) { location.hash = '#/lessons'; return; }
  const idx = LESSONS.indexOf(l), prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
  const unit = UNITS.find((u) => u.id === l.unit);
  const done = store.isDone(id);
  view.innerHTML = header(l.title, `${unit.title} · ${toDevDigits(idx + 1)}/${toDevDigits(LESSONS.length)}`, '#/lessons')
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

function toolsView() {
  view.innerHTML = header(T.toolsTitle) + `<div class="grid2">${Object.entries(T.tools).map(([k, [t, s]]) =>
    `<a class="card link" href="#/tools/${k}"><b>${t}</b><p class="muted small">${s}</p></a>`).join('')}</div>`;
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

function pratyaharaToolView() {
  view.innerHTML = header(T.tools.pratyahara[0], T.tools.pratyahara[1], '#/tools') + maheshvaraHtml('explore')
    + `<h3>${T.allPratyaharas}</h3>` + WIDGETS.pratyaharaTable({ list: PRATYAHARAS })
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

function sutraIndexView() {
  const order = [...new Set([...LESSONS.flatMap((l) => l.sutras), ...Object.keys(SUTRAS)])];
  view.innerHTML = header(T.tools.sutras[0], `${toDevDigits(order.length)} सूत्र`, '#/tools')
    + `<input class="search" type="search" id="sq" placeholder="${T.searchSutra}">`
    + `<ul class="sutra-index">${order.map((id) => `<li data-k="${esc(SUTRAS[id].t + ' ' + id + ' ' + sutraNum(id))}"><button class="sref wide" data-sutra="${id}">
        <span class="skt">${SUTRAS[id].t}</span><small>${sutraNum(id)} · ${TYPES[SUTRAS[id].ty]}</small></button></li>`).join('')}</ul>`;
  const q = document.getElementById('sq');
  q.oninput = () => {
    const s = q.value.trim().replace(/[।\.]/g, '');
    view.querySelectorAll('.sutra-index li').forEach((li) => { li.hidden = !!s && !li.dataset.k.replace(/[।\.]/g, '').includes(s); });
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
  [/^#\/tools\/sutras$/, sutraIndexView, 'tools'],
  [/^#\/progress$/, progressView, 'progress'],
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
  const s = e.target.closest('[data-sutra]');
  if (s && !e.target.closest('a')) { openSutra(s.dataset.sutra); return; }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  if (act === 'sx-next' || act === 'sx-all') revealSandhi(a.dataset.id, act === 'sx-all');
  else if (act === 'mh') onMaheshvara(a);
  else if (act === 'mh-p') { const root = a.closest('.mh'); const r = pratyaharaRange(a.dataset.p); if (r) mhShow(root, a.dataset.p, r.start, r.end); root.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  else if (act === 'varna') onVarna(a);
  else if (act === 'dhatu-tab') a.closest('.dhatu').outerHTML = dhatuHtml(a.dataset.dh, a.dataset.lk);
  else if (act === 'rupa') rupaToolView(a.dataset.k);
  else if (act === 'close-sheet') sheet.close();
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
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article.sutra[data-sutra]')) { e.preventDefault(); openSutra(e.target.dataset.sutra); }
});
sheet.querySelector('.sheet-close').onclick = () => sheet.close();


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

document.querySelectorAll('.tabbar a').forEach((a) => { a.querySelector('span').textContent = T.nav[a.dataset.tab]; });
requestPersistence();
route();
