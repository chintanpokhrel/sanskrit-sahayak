// Reader-oriented screens and widgets: अष्टाध्यायी नक्सा (the grammar as a big program), श्लोक reader,
// कारक / समास / कृदन्त widgets, the अनुबन्ध decoder and the प्रयोगशाला (rule lab: switch a sūtra off and rerun
// every test the engines know). app.js routes to the views and forwards clicks to onReaderClick.

import { T } from './i18n.js';
import { sandhi, SANDHI_SWITCHABLE } from './sandhi.js';
import { sutraNum, toDevDigits } from './varna.js';
import { SUTRAS, ADHIKARAS, sutraKey } from './content/sutras.js';
import { LESSONS } from './content/lessons.js';
import { VIBHAKTI, VACANA, PURUSHA } from './content/rupa.js';
import { DHATUS, LAKARAS, PADA, derive, padasOf, dhatuById, TIN_SWITCHABLE } from './tinanta.js';
import { STAGES, PIPELINE, PADAS, LEVELS, CODE_MAP, IDEAS } from './content/map.js';
import { VERSES, verseById } from './content/verses.js';
import { ROLE, PICK_ROLES, KARAKA_KEYS, SENTENCES } from './content/karaka.js';
import { SAMASA_TYPES, SAMASAS } from './content/samasa.js';
import { KRT, KRIT_FORMS } from './content/krit.js';
import { TAGS, PRATYAYAS } from './content/anubandha.js';
import { store } from './store.js';
import { shuffle, wordQuestion } from './quiz.js';
import { esc, sutraChip, table, stepsHtml, sandhiCard, sandhiStepsHtml, header, supLabel, tinLabel, lakName, glossify } from './ui.js';

const view = () => document.getElementById('view');
const D = toDevDigits;
const chips = (ids, cls = 'mini') => [].concat(ids || []).map((s) => sutraChip(s, cls)).join('');
const lessonsWith = (ids) => LESSONS.filter((l) => l.sutras.some((s) => ids.includes(s)));

// ============================================================================================
// अष्टाध्यायी नक्सा
// ============================================================================================

const padaOf = (id) => (sutraKey(id) < 9e9 ? id.split('.').slice(0, 2).join('.') : null);
const PADA_STAGE = Object.fromEntries(PADAS.map(([p, st]) => [p, st]));
/** Stage of a sūtra. 1.4 holds both saṃjñās and the kāraka section (1.4.23–55). */
function stageOf(id) {
  const p = padaOf(id);
  if (!p) return null;
  if (p === '1.4') { const n = +id.split('.')[2]; return n >= 23 && n <= 55 ? 'karaka' : 'samjna'; }
  return PADA_STAGE[p];
}
const sutrasIn = (pred) => Object.keys(SUTRAS).filter(pred).sort((a, b) => sutraKey(a) - sutraKey(b));

function pipelineHtml() {
  const box = (k) => `<button class="stage st-${k}" data-act="map-stage" data-st="${k}"><b>${STAGES[k].name}</b><small>${STAGES[k].what}</small></button>`;
  return `<div class="pipe">
    <div class="pipe-end">${T.map.meaning}</div>
    ${PIPELINE.map((k) => `<div class="pipe-arrow">↓</div>${box(k)}`).join('')}
    <div class="pipe-arrow">↓</div><div class="pipe-end">${T.map.word}</div>
    <div class="pipe-side">${box('samjna')}<small class="muted">${T.map.toolbox}</small></div>
    <div class="pipe-side">${box('samasa')}<small class="muted">${T.map.loop}</small></div>
  </div><div class="map-panel" id="stage-panel" hidden></div>`;
}

function gridHtml() {
  const count = (p) => sutrasIn((id) => padaOf(id) === p).length;
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((a) => `<div class="g-row"><span class="g-a">${D(a)}</span>${[1, 2, 3, 4].map((q) => {
    const p = `${a}.${q}`, [, st, label] = PADAS.find((x) => x[0] === p), n = count(p);
    return `<button class="g-cell st-${st}" data-act="map-cell" data-p="${p}" title="${esc(label)}">
      <b>${D(a)}।${D(q)}</b>${n ? `<span class="g-n">${D(n)}</span>` : ''}<span class="g-label">${label}</span></button>`;
  }).join('')}</div>`).join('');
  const legend = Object.entries(STAGES).map(([k, s]) => `<span class="leg st-${k}">${s.name}</span>`).join('');
  return `<div class="grid8">${rows}</div><div class="legend">${legend}</div><div class="map-panel" id="cell-panel" hidden></div>`;
}

function scopesHtml() {
  return `<ul class="scopes">${ADHIKARAS.map((a, i) => `<li><span class="skt">${a.t}</span>
    <small class="muted">${sutraNum(a.from)} – ${sutraNum(a.to)}</small>
    ${SUTRAS[a.from] ? sutraChip(a.from, 'mini') : ''}
    <button class="chip small noprint" data-act="map-scope" data-i="${i}">${T.map.showOnGrid}</button></li>`).join('')}</ul>`;
}

const ideasHtml = () => `<div class="ideas">${IDEAS.map((x, i) => `<div class="card idea"><b>${D(i + 1)}. ${x.t}</b><p>${glossify(x.h)}</p>
  <div class="row wrap">${chips(x.s)}${x.link.startsWith('#/') ? `<a class="small noprint" href="${x.link}">${T.map.open}</a>`
    : `<button class="linkbtn small noprint" data-act="scroll" data-to="${x.link.slice(1)}">${T.map.open}</button>`}</div></div>`).join('')}</div>`;

const codeMapHtml = () => table(T.map.codeHead, CODE_MAP.map(([p, en, ne, s]) =>
  [`<b class="skt">${p}</b>`, `<code>${esc(en)}</code>`, `${ne} ${s ? sutraChip(s, 'mini') : ''}`]), 'codemap');

const levelsHtml = () => `<ol class="levels">${LEVELS.map((l, i) => `<li><span class="lv-n">L${i}</span><div><b>${l.ne}</b> <code>${l.en}</code>
  <div class="small muted">${l.what}</div></div>${l.link.startsWith('#/') ? `<a class="small noprint" href="${l.link}">${T.map.open}</a>`
  : `<button class="linkbtn small noprint" data-act="scroll" data-to="${l.link.slice(1)}">${T.map.open}</button>`}</li>`).join('')}</ol>`;

function stagePanel(k) {
  const ids = sutrasIn((id) => stageOf(id) === k);
  const ls = lessonsWith(ids);
  return `<b>${STAGES[k].name}</b><p class="small">${STAGES[k].what}</p>
    <p class="small muted">${T.map.inApp(D(ids.length))}</p><div class="chips">${ids.slice(0, 40).map((s) => sutraChip(s, 'mini')).join('')}</div>
    ${ls.length ? `<p class="small">${T.map.lessons}: ${ls.map((l) => `<a href="#/lesson/${l.id}">${l.title}</a>`).join(', ')}</p>` : ''}`;
}

function cellPanel(p) {
  const [, st, label] = PADAS.find((x) => x[0] === p);
  const ids = sutrasIn((id) => padaOf(id) === p);
  const k = sutraKey(`${p}.1`), kEnd = sutraKey(`${p}.999`);
  const adh = ADHIKARAS.filter((a) => sutraKey(a.from) <= kEnd && sutraKey(a.to) >= k);
  return `<b>${T.krama.pada(...p.split('.').map(D))}</b> · <span class="leg st-${st}">${STAGES[st].name}</span>
    <p>${label}</p>
    ${adh.length ? `<p class="small">${T.krama.under}: ${adh.map((a) => `<span class="skt">${a.t}</span>`).join(', ')}</p>` : ''}
    ${ids.length ? `<p class="small muted">${T.map.inApp(D(ids.length))}</p><div class="chips">${ids.map((s) => sutraChip(s, 'mini')).join('')}</div>` : `<p class="small muted">${T.map.none}</p>`}`;
}

function highlightCells(pred) {
  view().querySelectorAll('.g-cell').forEach((c) => c.classList.toggle('dim', !pred(c.dataset.p)));
}

export function anubandhaTableHtml() {
  return table(T.map.tagHead, Object.entries(TAGS).map(([l, t]) => [
    `<b class="skt">${l}</b> <small class="muted">${t.it.map(sutraNum).join(', ')}</small>`, t.name, t.on,
    t.fx.map(([f, s]) => `${f}${s ? ' ' + sutraChip(s, 'mini') : ''}`).join('<br>')]), 'tags');
}

export function anubandhaHtml(sel = 'शप्') {
  const P = PRATYAYAS.find((x) => x.up === sel) || PRATYAYAS[0];
  const its = P.tags.map((l) => `<span class="tagchip"><b class="skt">${l}</b> ${TAGS[l].name} <small>(${TAGS[l].it.map(sutraNum).join(' / ')})</small></span>`).join(' ');
  const fx = P.tags.flatMap((l) => TAGS[l].fx.map(([f, s]) => `<li><span class="skt">${l}</span> → ${f} ${s ? sutraChip(s, 'mini') : ''}</li>`)).join('');
  return `<div class="anu" data-sel="${esc(P.up)}">
    <div class="chips">${PRATYAYAS.map((x) => `<button class="chip skt ${x.up === P.up ? 'on' : ''}" data-act="anu" data-p="${esc(x.up)}">${x.up}</button>`).join('')}</div>
    <div class="card anu-out"><div class="anu-head"><b class="skt big">${P.up}</b> <span class="tag">${P.cls}</span></div>
      <dl><dt>${T.anubandha.it}</dt><dd>${its} <small class="muted">— ${T.anubandha.lopa}</small></dd>
      <dt>${T.anubandha.rem}</dt><dd class="skt">${P.rem}</dd>
      <dt>${T.anubandha.fx}</dt><dd><ul class="fx">${fx}</ul></dd>
      <dt>${T.anubandha.ex}</dt><dd class="skt">${P.ex}</dd></dl>
      ${P.x ? `<p class="small muted">${glossify(P.x)}</p>` : ''}</div></div>`;
}

export function mapView() {
  view().innerHTML = header(T.map.title, T.map.sub)
    + `<div class="row end noprint"><button class="btn small ghost" data-act="print">🖨 ${T.map.print}</button></div>`
    + `<section id="map-levels"><h3>${T.map.levels}</h3>${levelsHtml()}</section>`
    + `<section id="map-pipeline"><h3>${T.map.pipeline}</h3><p class="small muted noprint">${T.map.pipelineHint}</p>${pipelineHtml()}</section>`
    + `<section id="map-grid" class="pb"><h3>${T.map.grid}</h3><p class="small muted noprint">${T.map.gridHint}</p>${gridHtml()}</section>`
    + `<section id="map-scopes"><h3>${T.map.scopes}</h3><p class="small muted">${T.map.scopesHint}</p>${scopesHtml()}</section>`
    + `<section id="map-ideas" class="pb"><h3>${T.map.ideas}</h3>${ideasHtml()}</section>`
    + `<section id="map-code"><h3>${T.map.code}</h3>${codeMapHtml()}</section>`
    + `<section id="map-anubandha" class="pb"><h3>${T.map.anubandha}</h3>${anubandhaTableHtml()}
       <div class="noprint"><p class="small muted">${T.map.anubandhaHint}</p>${anubandhaHtml()}</div></section>`;
}

// ============================================================================================
// श्लोक
// ============================================================================================

export const gramLabel = (w) => (w.t === 'sup' ? [supLabel(w.v, w.n), ...(w.alt || []).map(([v, n]) => supLabel(v, n))].join(` ${T.verse.or} `)
  : w.t === 'tin' ? tinLabel(w) : T.verse.types.avy);
const roleChip = (r, extra = '') => `<span class="rchip k-${r}">${ROLE[r]?.name || r}${extra}</span>`;
const ENGINE_LK = new Set(LAKARAS.map((l) => l.key));

function wordDetail(w) {
  const link = w.dh && ENGINE_LK.has(w.lk) ? `<a class="small" href="#/tools/tin/${w.dh}/${w.lk}/${w.pada}/${w.p}${w.n}">${T.verse.derivation}</a>` : '';
  const R = ROLE[w.r];
  return `<div class="card wd"><div class="row between wrap"><b class="skt big">${esc(w.w)}</b><span class="tag">${T.verse.types[w.t]}</span></div>
    <dl>
      <dt>${T.verse.base}</dt><dd><span class="skt">${esc(w.base)}</span>${w.cls ? ` · ${w.cls}` : ''}${w.l ? ` · ${w.l}` : ''}</dd>
      ${w.t !== 'avy' ? `<dt>${T.verse.gram}</dt><dd>${gramLabel(w)}</dd>` : ''}
      ${w.krt ? `<dt>${T.verse.krt}</dt><dd class="skt">${w.krt}</dd>` : ''}
      ${w.sam ? `<dt>${T.verse.samasa}</dt><dd class="skt">${esc(w.sam)}</dd>` : ''}
      <dt>${T.verse.role}</dt><dd>${roleChip(w.r)} ${R?.s ? sutraChip(R.s, 'mini') : ''}${R?.vs ? sutraChip(R.vs, 'mini') : ''}</dd>
      <dt>${T.verse.meaning}</dt><dd>${esc(w.m)}</dd>
    </dl>
    ${w.x ? `<p class="small">${glossify(esc(w.x))}</p>` : ''}
    ${w.s?.length ? `<div class="chips">${chips(w.s)}</div>` : ''}${link}</div>`;
}

function anvayaHtml(v) {
  const used = new Set();
  const sent = v.anvaya.map((s) => `<p class="anv">${s.map((x) => {
    const w = typeof x === 'number' ? v.words[x] : x;
    used.add(w.r);
    return typeof x === 'number'
      ? `<button class="aw k-${w.r}" data-act="vw" data-i="${x}"><span class="skt">${esc(w.w)}</span><small>${ROLE[w.r]?.name || ''}</small></button>`
      : `<span class="aw implied k-${w.r}" title="${T.verse.implied}"><span class="skt">(${esc(w.w)})</span><small>${ROLE[w.r]?.name || ''}</small></span>`;
  }).join(' ')}</p>`).join('');
  return sent + `<div class="legend">${[...used].map((r) => roleChip(r)).join('')}</div>`;
}

export function versesView() {
  view().innerHTML = header(T.verse.title, T.verse.sub)
    + VERSES.map((v) => `<a class="card link verse-item" href="#/verse/${v.id}"><b>${v.title}</b> <small class="muted">${v.src}</small>
      <div class="skt muted">${v.text.split('\n')[0]}</div><small class="muted">${T.verse.words(D(v.words.length))}</small></a>`).join('');
}

export function verseView(id, tab = 'join') {
  const v = verseById(id);
  if (!v) { location.hash = '#/verses'; return; }
  const i = VERSES.indexOf(v), prev = VERSES[i - 1], next = VERSES[i + 1];
  const joins = v.joins.map(([a, b, res, st]) => st
    ? `<div class="sx"><div class="sx-q"><span class="skt">${esc(a)} + ${esc(b)}</span> <span class="eq">=</span> <span class="sx-res skt">${esc(res)}</span> <span class="tag">${T.verse.staticJoin}</span></div>
       <div class="chips">${chips(st.s)}</div><p class="small muted">${esc(st.x)}</p></div>`
    : sandhiCard(a, b)).join('');
  const tabs = Object.entries(T.verse.tabs).map(([k, t]) => `<button class="chip ${k === tab ? 'on' : ''}" data-act="vt" data-tab="${k}">${t}</button>`).join('');
  view().innerHTML = header(v.title, v.src, '#/verses')
    + `<blockquote class="verse skt">${v.text.replace(/\n/g, '<br>')}</blockquote>`
    + `<div class="chips tabs">${tabs}</div>`
    + `<div class="vpane" data-pane="join" ${tab === 'join' ? '' : 'hidden'}><p class="skt pcd">${v.words.map((w) => esc(w.w)).join(' · ')}</p>
        <p class="small muted">${T.verse.joinsHint}</p>${joins}</div>`
    + `<div class="vpane" data-pane="pada" ${tab === 'pada' ? '' : 'hidden'}>
        <label class="check"><input type="checkbox" id="vguess"> ${T.verse.guess}</label>
        <div class="chips">${v.words.map((w, k) => `<button class="chip skt" data-act="vw" data-i="${k}">${esc(w.w)}</button>`).join('')}</div></div>`
    + `<div class="vpane" data-pane="anvaya" ${tab === 'anvaya' ? '' : 'hidden'}>${anvayaHtml(v)}</div>`
    + `<div class="vpane" data-pane="artha" ${tab === 'artha' ? '' : 'hidden'}><p class="artha-big">${v.artha}</p>
        <h4>${T.verse.learn}</h4><ul>${v.learn.map((x) => `<li>${glossify(x)}</li>`).join('')}</ul></div>`
    + `<div id="vdetail" data-verse="${v.id}"><p class="small muted">${T.verse.pickWord}</p></div>`
    + `<div class="row between verse-foot">${prev ? `<a href="#/verse/${prev.id}">${T.verse.prev}</a>` : '<span></span>'}${next ? `<a href="#/verse/${next.id}">${T.verse.next}</a>` : ''}</div>`;
  showDetailFor(tab);
}
const showDetailFor = (tab) => { const d = document.getElementById('vdetail'); if (d) d.hidden = !(tab === 'pada' || tab === 'anvaya'); };

function onVerseWord(btn) {
  const d = document.getElementById('vdetail'), v = verseById(d.dataset.verse), w = v.words[+btn.dataset.i];
  view().querySelectorAll('[data-act="vw"]').forEach((b) => b.classList.toggle('on', b === btn && b.classList.contains('chip')));
  const guess = document.getElementById('vguess')?.checked && !btn.classList.contains('aw');
  const q = guess && wordQuestion(w);
  if (!q) { d.innerHTML = wordDetail(w); d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
  d.innerHTML = `<div class="card"><p>${esc(q.q)}</p><div class="opts">${q.opts.map((o) =>
    `<button class="opt" data-act="vq" data-i="${btn.dataset.i}" data-ok="${o === q.right ? 1 : 0}">${esc(o)}</button>`).join('')}</div></div>`;
  d.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function onVerseAnswer(btn) {
  const d = document.getElementById('vdetail'), v = verseById(d.dataset.verse), w = v.words[+btn.dataset.i];
  const ok = btn.dataset.ok === '1';
  store.recordAnswer('verse', ok);
  d.querySelectorAll('.opt').forEach((b) => { b.disabled = true; b.classList.toggle('right', b.dataset.ok === '1'); });
  if (!ok) btn.classList.add('wrongpick');
  d.insertAdjacentHTML('beforeend', `<p><b class="${ok ? 'ok' : 'bad'}">${ok ? T.correct : T.wrong}</b></p>${wordDetail(w)}`);
}

/** Verse of the day for the home screen. */
export function verseOfDay() {
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  return VERSES[day % VERSES.length];
}

// ============================================================================================
// कारक
// ============================================================================================

export const karakaTableHtml = () => table(T.karaka.head, KARAKA_KEYS.map((k) => {
  const r = ROLE[k];
  return [roleChip(k), r.q, VIBHAKTI[r.vib], `${sutraChip(r.s, 'mini')}${sutraChip(r.vs, 'mini')}`];
}));

export function karakaPickHtml(i = 0, all = false) {
  const S = SENTENCES[(i + SENTENCES.length) % SENTENCES.length], idx = SENTENCES.indexOf(S);
  return `<div class="kp card" data-i="${idx}">
    <p class="small muted">${T.karaka.pick} (${D(idx + 1)}/${D(SENTENCES.length)})</p>
    <p class="kp-sent">${S.ws.map((w, k) => `<button class="aw ${all ? `k-${w.r}` : ''}" data-act="kp-word" data-k="${k}"><span class="skt">${esc(w.t)}</span>${all ? `<small>${ROLE[w.r].name}</small>` : ''}</button>`).join(' ')}</p>
    <p class="small muted">${esc(S.m)}</p>
    <div class="kp-out"></div>
    <div class="row between wrap"><button class="btn small ghost" data-act="kp-go" data-to="${idx - 1}">${T.karaka.prev}</button>
      <button class="btn small ghost" data-act="kp-all" data-to="${idx}">${T.karaka.showAll}</button>
      <button class="btn small" data-act="kp-go" data-to="${idx + 1}">${T.karaka.next}</button></div></div>`;
}

function karakaExplain(w) {
  const R = ROLE[w.r];
  return `${roleChip(w.r)} ${w.v !== null ? `<span class="tag">${VIBHAKTI[w.v]} ${VACANA[w.n]}</span>` : ''}
    <p class="small">${glossify(`${R.n}${w.x ? ` ${esc(w.x)}` : ''}`)}</p><div class="chips">${chips([R.s, R.vs].filter(Boolean))}</div>`;
}

// ============================================================================================
// समास
// ============================================================================================

export const samasaTypesHtml = () => table(T.samasa.head, Object.entries(SAMASA_TYPES).map(([k, t]) => [
  `<b>${t.name}</b> ${sutraChip(t.s, 'mini')}`, t.head,
  `<span class="skt">${SAMASAS.filter((x) => x.ty === k).slice(0, 3).map((x) => x.sam).join(', ')}</span>`]));

let smOrder = [], smPos = 0;
export function samasaPickHtml() {
  if (!smOrder.length || smPos >= smOrder.length) { smOrder = shuffle(SAMASAS.map((_, k) => k)); smPos = 0; }
  const x = SAMASAS[smOrder[smPos]];
  return `<div class="sm card"><p class="small muted">${T.samasa.pick}</p><div class="skt big center">${x.sam}</div>
    <div class="opts">${Object.entries(SAMASA_TYPES).map(([k, t]) => `<button class="opt" data-act="sm-pick" data-ty="${k}">${t.name}</button>`).join('')}</div>
    <div class="sm-out"></div></div>`;
}
function samasaAnswer(btn) {
  const root = btn.closest('.sm'), x = SAMASAS[smOrder[smPos]], ok = btn.dataset.ty === x.ty;
  store.recordAnswer('samasa', ok);
  root.querySelectorAll('.opt').forEach((b) => { b.disabled = true; b.classList.toggle('right', b.dataset.ty === x.ty); });
  if (!ok) btn.classList.add('wrongpick');
  root.querySelector('.sm-out').innerHTML = `<p><b class="${ok ? 'ok' : 'bad'}">${ok ? T.correct : T.wrong}</b> ${SAMASA_TYPES[x.ty].name}${x.sub ? ` — ${x.sub}` : ''}</p>
    <p><b>${T.samasa.vig}:</b> <span class="skt">${x.vig}</span> — ${x.m}</p>${x.x ? `<p class="small">${x.x}</p>` : ''}
    <div class="chips">${chips(x.s)}</div><div class="row end"><button class="btn small" data-act="sm-next">${T.samasa.next}</button></div>`;
}

// ============================================================================================
// कृदन्त
// ============================================================================================

export function kritHtml({ mode = 'dhatu', sel } = {}) {
  const st = (o) => esc(JSON.stringify(o));
  const modes = ['dhatu', 'pratyaya'].map((m) => `<button class="chip ${m === mode ? 'on' : ''}" data-act="krit" data-st="${st({ mode: m })}">${m === 'dhatu' ? T.krit.byDhatu : T.krit.byPratyaya}</button>`).join('');
  let body;
  if (mode === 'dhatu') {
    const F = KRIT_FORMS.find((f) => f.d === sel) || KRIT_FORMS[0];
    body = `<div class="chips">${KRIT_FORMS.map((f) => `<button class="chip skt ${f === F ? 'on' : ''}" data-act="krit" data-st="${st({ mode, sel: f.d })}" title="${esc(f.ne)}">${f.d}</button>`).join('')}</div>
      <p><b class="skt">${F.d}</b> (${F.ne}) <span class="tag">${F.it}</span></p>
      ${table(['', '', ''], KRT.map((k) => [`<b class="skt">${k.p}</b>`, `<span class="skt">${F.f[k.key]}</span>`, `<small>${k.use}</small>`]), 'krit')}
      ${F.n ? `<p class="small">${F.n} ${chips(F.s)}</p>` : ''}`;
  } else {
    const K = KRT.find((k) => k.key === sel) || KRT[0];
    body = `<div class="chips">${KRT.map((k) => `<button class="chip skt ${k === K ? 'on' : ''}" data-act="krit" data-st="${st({ mode, sel: k.key })}">${k.p}</button>`).join('')}</div>
      <p><b class="skt">${K.p}</b> — ${K.use} ${chips(K.s)}</p>
      ${table(['', T.krit.it, ''], KRIT_FORMS.map((f) => [`<span class="skt">${f.d}</span> <small class="muted">${f.ne}</small>`, `<span class="tag">${f.it}</span>`, `<b class="skt">${f.f[K.key]}</b>`]), 'krit')}`;
  }
  return `<div class="kr">${`<div class="chips">${modes}</div>`}${body}<p class="small muted">${T.krit.note} ${T.krit.handmade}</p></div>`;
}
export const kritHintsHtml = () => table(T.krit.hints, KRT.map((k) => [`<span class="skt">${k.end}</span>`, `<b class="skt">${k.p}</b>`, `<small>${k.use}</small>`]));

// ============================================================================================
// प्रयोगशाला — mutation testing for the grammar
// ============================================================================================

const SANDHI_SET = new Set(SANDHI_SWITCHABLE), TIN_SET = new Set(TIN_SWITCHABLE);
const SWITCHABLE = [...new Set([...SANDHI_SWITCHABLE, ...TIN_SWITCHABLE])].filter((id) => SUTRAS[id]).sort((a, b) => sutraKey(a) - sutraKey(b));
let labOff = new Set();

/** Every sandhi example the app knows: lesson examples + verse junctions. */
function sandhiCorpus() {
  const seen = new Set(), out = [];
  const add = (a, b, o = {}) => { const k = `${a}|${b}|${o.internal ? 1 : 0}|${o.dual ? 1 : 0}`; if (!seen.has(k)) { seen.add(k); out.push([a, b, o]); } };
  LESSONS.forEach((l) => (l.ex || []).forEach(([a, b, , o]) => add(a, b, o || {})));
  VERSES.forEach((v) => v.joins.forEach(([a, b, , st]) => { if (!st) add(a, b); }));
  return out;
}
let tinBase = null;
function tinCorpus() {
  if (tinBase) return tinBase;
  tinBase = [];
  for (const dh of DHATUS) for (const L of LAKARAS) for (const pada of padasOf(dh)) for (let p = 0; p < 3; p++) for (let n = 0; n < 3; n++) {
    const r = derive(dh, L.key, pada, p, n);
    tinBase.push({ dh: dh.id, lk: L.key, pada, p, n, form: r.form, ids: new Set(r.steps.flatMap((s) => s.s)) });
  }
  return tinBase;
}

export function runLab(off) {
  const take = new Map();
  const bump = (id) => id && take.set(id, (take.get(id) || 0) + 1);
  const sc = sandhiCorpus(), sChanged = [];
  sc.forEach(([a, b, o], i) => {
    const base = sandhi(a, b, o), abl = sandhi(a, b, { ...o, off });
    const before = base.ok ? base.result : '—', after = abl.ok ? abl.result : '—';
    if (before !== after) { sChanged.push({ i, a, b, o, before, after, take: abl.main && abl.main !== base.main ? abl.main : null }); bump(sChanged.at(-1).take); }
  });
  const tc = tinCorpus(), tChanged = [];
  tc.forEach((x, i) => {
    const r = derive(x.dh, x.lk, x.pada, x.p, x.n, off);
    if (r.form !== x.form) {
      const nw = r.steps.flatMap((s) => s.s).find((id) => !x.ids.has(id) && !off.has(id)) || null;
      tChanged.push({ i, ...x, after: r.form, take: nw }); bump(nw);
    }
  });
  return { sandhi: { total: sc.length, changed: sChanged }, tin: { total: tc.length, changed: tChanged }, take: [...take.entries()].sort((a, b) => b[1] - a[1]) };
}

const LAB_SHOW = 30;
function labRowsHtml(kind, rows, limit) {
  return rows.slice(0, limit).map((r, k) => {
    const label = kind === 's' ? `${esc(r.a)} + ${esc(r.b)}` : `${dhatuById(r.dh).d} · ${lakName(r.lk)} · ${PURUSHA[r.p]} ${VACANA[r.n]}`;
    const before = kind === 's' ? r.before : r.form;
    return `<li><button class="labrow" data-act="lab-row" data-kind="${kind}" data-k="${k}">
      <span class="small">${label}</span><span class="skt"><span class="ok">${esc(before)}</span> → <span class="bad">${esc(r.after)}</span></span>
      ${r.take ? `<small class="muted">${sutraNum(r.take)}</small>` : ''}</button><div class="lab-trace" hidden></div></li>`;
  }).join('') + (rows.length > limit ? `<li><button class="btn small ghost" data-act="lab-more" data-kind="${kind}">${T.lab.more(D(rows.length - limit))}</button></li>` : '');
}

let labLast = null;
function labResultsHtml() {
  if (!labOff.size) return `<p class="muted">${T.lab.none}</p>`;
  const R = labLast = runLab(labOff);
  const name = (id) => `<span class="skt">${SUTRAS[id]?.t || id}</span>`;
  const top = R.take[0], total = R.sandhi.changed.length + R.tin.changed.length;
  const loose = [...R.sandhi.changed, ...R.tin.changed].filter((r) => !r.take).length;
  const offNames = [...labOff].map(name).join(', ');
  const verdict = !total ? `<p class="muted">${T.lab.unchanged}</p>`
    : (top ? `<div class="callout tip">${T.lab.apavada(offNames, name(top[0]), D(top[1]))}</div>` : '')
      + (loose ? `<div class="callout note">${T.lab.noTake(D(loose))}</div>` : '');
  const sec = (kind, title, part) => `<h4>${title}: ${T.lab.summary(D(part.changed.length), D(part.total))}</h4>
    ${part.changed.length ? `<ul class="labrows" data-kind="${kind}">${labRowsHtml(kind, part.changed, LAB_SHOW)}</ul>` : ''}`;
  return verdict
    + (R.take.length ? `<p class="small"><b>${T.lab.take}:</b> ${R.take.map(([id, n]) => `${sutraChip(id, 'mini')}<small>×${D(n)}</small>`).join(' ')}</p>` : '')
    + sec('s', T.lab.sandhi, R.sandhi) + sec('t', T.lab.tin, R.tin);
}

function labTraceHtml(kind, r) {
  if (kind === 's') {
    const base = sandhi(r.a, r.b, r.o), abl = sandhi(r.a, r.b, { ...r.o, off: labOff });
    return `<div class="diff"><div><b>${T.lab.before}</b>${sandhiStepsHtml(base.steps)}</div><div><b>${T.lab.after}</b>${abl.ok ? sandhiStepsHtml(abl.steps) : '—'}</div></div>`;
  }
  const base = derive(r.dh, r.lk, r.pada, r.p, r.n), abl = derive(r.dh, r.lk, r.pada, r.p, r.n, labOff);
  const common = base.steps.findIndex((s, k) => !abl.steps[k] || s.f !== abl.steps[k].f || s.n !== abl.steps[k].n);
  const from = Math.max(0, common === -1 ? base.steps.length : common);
  return `<div class="diff"><div>${stepsHtml(T.lab.before, base.steps.slice(from))}</div><div>${stepsHtml(T.lab.after, abl.steps.slice(from))}</div></div>`;
}

export function labView(id) {
  labOff = new Set(id && SUTRAS[id] ? [id] : []);
  const chip = (s) => `<button class="chip ${labOff.has(s) ? 'on' : ''}" data-act="lab-toggle" data-s="${s}"><span class="skt">${SUTRAS[s].t}</span> <small>${sutraNum(s)}</small></button>`;
  const group = (title, ids) => `<p class="small muted">${title}</p><div class="chips">${ids.map(chip).join('')}</div>`;
  view().innerHTML = header(T.lab.title, T.lab.sub, '#/tools')
    + `<p>${T.lab.intro}</p><h4>${T.lab.pick}</h4>`
    + group(T.lab.sandhi, SWITCHABLE.filter((s) => SANDHI_SET.has(s)))
    + group(T.lab.tin, SWITCHABLE.filter((s) => TIN_SET.has(s) && !SANDHI_SET.has(s)))
    + `<div class="row end"><button class="btn small ghost" data-act="lab-clear">${T.lab.clear}</button></div>`
    + `<div id="lab-out">${labResultsHtml()}</div>`;
}
const labRefresh = () => {
  view().querySelectorAll('[data-act="lab-toggle"]').forEach((b) => b.classList.toggle('on', labOff.has(b.dataset.s)));
  document.getElementById('lab-out').innerHTML = labResultsHtml();
};
export const isSwitchable = (id) => SANDHI_SET.has(id) || TIN_SET.has(id);

// ============================================================================================
// Widgets for lessons, and the click handler
// ============================================================================================

export const READER_WIDGETS = {
  karakaTable: karakaTableHtml,
  karakaPick: () => karakaPickHtml(0),
  samasaTypes: samasaTypesHtml,
  samasaPick: samasaPickHtml,
  kritTable: (a = {}) => kritHtml(a),
  kritHints: kritHintsHtml,
  anubandha: (a = {}) => anubandhaHtml(a.sel),
  anubandhaTable: anubandhaTableHtml,
  ideas: ideasHtml,
  codeMap: codeMapHtml,
  levels: levelsHtml,
};

/** Delegated clicks for reader screens. Returns true when handled. */
export function onReaderClick(a) {
  const act = a.dataset.act;
  switch (act) {
    case 'print': window.print(); return true;
    case 'scroll': document.getElementById(a.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true;
    case 'map-stage': {
      const k = a.dataset.st, p = document.getElementById('stage-panel');
      view().querySelectorAll('.stage').forEach((b) => b.classList.toggle('on', b === a));
      p.innerHTML = stagePanel(k); p.hidden = false;
      highlightCells((pd) => PADA_STAGE[pd] === k || (k === 'karaka' && pd === '1.4'));
      return true;
    }
    case 'map-cell': {
      const p = document.getElementById('cell-panel');
      view().querySelectorAll('.g-cell').forEach((c) => c.classList.toggle('sel', c === a));
      p.innerHTML = cellPanel(a.dataset.p); p.hidden = false; p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return true;
    }
    case 'map-scope': {
      const A = ADHIKARAS[+a.dataset.i], lo = sutraKey(A.from), hi = sutraKey(A.to);
      highlightCells((pd) => sutraKey(`${pd}.999`) >= lo && sutraKey(`${pd}.1`) <= hi);
      document.getElementById('map-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    case 'anu': a.closest('.anu').outerHTML = anubandhaHtml(a.dataset.p); return true;
    case 'vt': {
      view().querySelectorAll('[data-act="vt"]').forEach((b) => b.classList.toggle('on', b === a));
      view().querySelectorAll('.vpane').forEach((p) => { p.hidden = p.dataset.pane !== a.dataset.tab; });
      showDetailFor(a.dataset.tab);
      return true;
    }
    case 'vw': onVerseWord(a); return true;
    case 'vq': onVerseAnswer(a); return true;
    case 'kp-go': a.closest('.kp').outerHTML = karakaPickHtml(+a.dataset.to); return true;
    case 'kp-all': a.closest('.kp').outerHTML = karakaPickHtml(+a.dataset.to, true); return true;
    case 'kp-word': {
      const root = a.closest('.kp'), S = SENTENCES[+root.dataset.i], w = S.ws[+a.dataset.k];
      root.querySelectorAll('.aw').forEach((b) => b.classList.toggle('sel', b === a));
      root.querySelector('.kp-out').innerHTML = `<p>${esc(T.karaka.which(w.t))}</p><div class="chips">${PICK_ROLES.map((r) =>
        `<button class="chip" data-act="kp-role" data-k="${a.dataset.k}" data-r="${r}">${ROLE[r].name}</button>`).join('')}</div>`;
      return true;
    }
    case 'kp-role': {
      const root = a.closest('.kp'), S = SENTENCES[+root.dataset.i], w = S.ws[+a.dataset.k];
      const ok = a.dataset.r === w.r;
      store.recordAnswer('karaka', ok);
      const word = root.querySelectorAll('.aw')[+a.dataset.k];
      word.classList.add(`k-${w.r}`);
      word.innerHTML = `<span class="skt">${esc(w.t)}</span><small>${ROLE[w.r].name}</small>`;
      root.querySelector('.kp-out').innerHTML = `<p><b class="${ok ? 'ok' : 'bad'}">${ok ? T.correct : T.wrong}</b></p>${karakaExplain(w)}`;
      return true;
    }
    case 'sm-pick': samasaAnswer(a); return true;
    case 'sm-next': smPos++; a.closest('.sm').outerHTML = samasaPickHtml(); return true;
    case 'krit': a.closest('.kr').outerHTML = kritHtml(JSON.parse(a.dataset.st)); return true;
    case 'lab-toggle': { const s = a.dataset.s; labOff.has(s) ? labOff.delete(s) : labOff.add(s); labRefresh(); return true; }
    case 'lab-clear': labOff.clear(); labRefresh(); return true;
    case 'lab-more': {
      const kind = a.dataset.kind, part = kind === 's' ? labLast.sandhi : labLast.tin;
      a.closest('.labrows').innerHTML = labRowsHtml(kind, part.changed, part.changed.length);
      return true;
    }
    case 'lab-row': {
      const tr = a.nextElementSibling, part = a.dataset.kind === 's' ? labLast.sandhi : labLast.tin;
      if (tr.hidden) tr.innerHTML = labTraceHtml(a.dataset.kind, part.changed[+a.dataset.k]);
      tr.hidden = !tr.hidden;
      return true;
    }
    default: return false;
  }
}
