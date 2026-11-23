// Shared HTML builders used by app.js and reader.js. Views render HTML strings; interaction goes through the
// delegated click handler in app.js (data-act / data-sutra).

import { T } from './i18n.js';
import { sandhi } from './sandhi.js';
import { sutraNum } from './varna.js';
import { SUTRAS, TYPES, ROLES } from './content/sutras.js';
import { VIBHAKTI, VACANA, PURUSHA, LAKARA } from './content/rupa.js';
import { PADA } from './tinanta.js';
import { GLOSSARY } from './content/glossary.js';

/** Grammar labels shared by the verse reader and the quizzes. */
export const supLabel = (v, n) => `${VIBHAKTI[v]} ${VACANA[n]}`;
export const lakName = (k) => LAKARA.find((l) => l.key === k)?.name || k;
export const tinLabel = (w) => `${lakName(w.lk)}, ${PURUSHA[w.p]} ${VACANA[w.n]}${w.pada ? `, ${PADA[w.pada]}` : ''}`;

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uid = 0;
export const nextId = (p) => `${p}${++uid}`;

// ---- glossary links ---------------------------------------------------------------------------
// A term links only at a word start, and only when it ends the word or is followed by a Nepali postposition.
// That keeps स्थान out of स्थानी, अच् out of अच्छा and गण out of गणना. Longest form wins (आभ्यन्तर प्रयत्न before प्रयत्न).
const GL_FORMS = Object.values(GLOSSARY).flatMap((e) => e.k.map((f) => [f, e.id])).sort((a, b) => b[0].length - a[0].length);
const GL_ID = new Map(GL_FORMS);
const GL_POST = 'हरू|को|का|की|कै|मा|ले|लाई|बाट|देखि|सम्म|भन्दा|सँग|तिर|द्वारा|नै|पछि|अघि|जस्तै|वाला';
const GL_RE = new RegExp(`(?<![\\p{L}\\p{M}])(${GL_FORMS.map(([f]) => f).join('|')})(?=$|[^\\p{L}\\p{M}]|${GL_POST})`, 'gu');
const GL_SKIP_TAG = new Set(['a', 'button', 'select', 'option', 'textarea', 'code', 'h1', 'h2', 'h3', 'h4', 'dt']);
const GL_SKIP_CLASS = /\bclass="(?:[^"]*\s)?(?:skt|sref|chip|stext)(?:\s[^"]*)?"/;
const GL_VOID = new Set(['br', 'hr', 'img', 'input', 'wbr', 'meta', 'link']);

export const glossLink = (id, text = GLOSSARY[id]?.t) => GLOSSARY[id]
  ? `<a class="gl" href="#/glossary/${id}" data-gl="${id}">${text}</a>` : (text ?? '');

/**
 * Links the first use of each glossary term in an HTML fragment. Text inside links, buttons, headings, code and
 * Sanskrit-text elements (.skt) is left alone. `skip` = an entry id never to link (the entry being shown).
 */
export function glossify(html, skip) {
  if (!html) return html ?? '';
  const done = new Set(skip ? [skip] : []);
  const stack = [];
  let depth = 0;
  return String(html).split(/(<[^>]*>)/).map((part) => {
    if (part[0] === '<') {
      const m = part.match(/^<(\/?)([a-zA-Z][\w-]*)([^>]*)>$/);
      if (!m) return part;
      const [, close, tag, attrs] = m, t = tag.toLowerCase();
      if (GL_VOID.has(t) || attrs.endsWith('/')) return part;
      if (close) { if (stack.pop()) depth--; }
      else { const sk = GL_SKIP_TAG.has(t) || GL_SKIP_CLASS.test(attrs); stack.push(sk); if (sk) depth++; }
      return part;
    }
    if (depth || !part) return part;
    return part.replace(GL_RE, (f) => {
      const id = GL_ID.get(f);
      if (done.has(id)) return f;
      done.add(id);
      return glossLink(id, f);
    });
  }).join('');
}

export const sutraChip = (id, cls = '') => SUTRAS[id]
  ? `<button class="sref ${cls}" data-sutra="${id}"><span class="skt">${SUTRAS[id].t}</span> <small>${sutraNum(id)}</small></button>` : '';

/**
 * A vidhi sūtra read as a context-sensitive rewrite rule: A → B / C __ D
 * (षष्ठी = A, the sthānī; प्रथमा = B, the ādeśa; पञ्चमी = C, left context; सप्तमी = D, right context).
 * Built from the padaccheda roles, so it needs no extra data. Empty when the sūtra has no ādeśa in its own words.
 */
export function rewriteSig(s) {
  if (!s?.pc) return '';
  const pick = (r) => s.pc.filter(([, x]) => x === r).map(([w]) => w).join(' ');
  const A = pick('sthani'), B = pick('adesha'), C = pick('purva'), D = pick('para');
  if (!B) return '';
  const ctx = C || D ? ` / ${C ? C + ' ' : ''}__${D ? ' ' + D : ''}` : '';
  return `${A || '∅'} → ${B}${ctx}`;
}

export function sutraCard(id, { full = false } = {}) {
  const s = SUTRAS[id];
  if (!s) return '';
  const pc = s.pc ? `<ul class="pc">${s.pc.map(([w, r, n]) =>
    `<li class="r-${r}"><b class="skt">${w}</b><span class="role">${ROLES[r].label}</span>${full || r !== 'other' ? `<span class="pn">${n}</span>` : ''}</li>`).join('')}</ul>` : '';
  const sig = rewriteSig(s);
  return `<article class="sutra" ${full ? '' : `data-sutra="${id}" tabindex="0" role="button"`}>
    <header><span class="snum">${sutraNum(id)}</span><span class="stype t-${s.ty}">${TYPES[s.ty]}</span></header>
    <div class="stext skt">${s.t}</div>
    ${pc}
    ${sig ? `<div class="sig" title="${esc(T.code.sigHint)}"><span>${T.code.sig}</span><code class="skt">${esc(sig)}</code></div>` : ''}
    ${s.av ? `<div class="av"><b>${T.anuvritti}:</b> ${s.av}</div>` : ''}
    ${glossify(`<p class="artha">${s.a}</p>${s.s ? `<p class="saral">${s.s}</p>` : ''}`)}
  </article>`;
}

function stepHtml(st) {
  const chips = (st.s ? sutraChip(st.s) : `<span class="chip muted">${T.note}</span>`) + st.also.map((a) => sutraChip(a, 'mini')).join('');
  const tx = st.from === st.to ? esc(st.from) : `${esc(st.from)} <span class="arrow">→</span> ${esc(st.to)}`;
  return `<li class="step"><div class="step-sutras">${chips}</div><div class="step-tx skt">${tx}</div><div class="step-note">${esc(st.note)}</div></li>`;
}
export const sandhiStepsHtml = (steps) => `<ol class="steps">${steps.map(stepHtml).join('')}</ol>`;

export function sandhiCard(w1, w2, opts = {}, { open = false } = {}) {
  const r = sandhi(w1, w2, opts);
  if (!r.ok) return `<div class="sx warn">${esc(T.sandhiErr[r.reason] || T.sandhiErr.unsupported)}</div>`;
  const id = nextId('sx');
  const tags = (opts.internal ? `<span class="tag">${T.internal}</span>` : '') + (opts.dual ? `<span class="tag">${T.dual}</span>` : '');
  const hasSteps = r.steps.length > 0;
  const reveal = open || !hasSteps;
  return `<div class="sx" id="${id}" data-shown="${reveal ? r.steps.length : 0}">
    <div class="sx-q"><span class="skt">${esc(w1)} + ${esc(w2)}</span> <span class="eq">=</span>
      <span class="sx-res skt" ${reveal ? '' : 'hidden'}>${esc(r.result)}</span><span class="sx-qm" ${reveal ? 'hidden' : ''}>?</span> ${tags}</div>
    ${hasSteps ? `<ol class="steps">${r.steps.map((s) => stepHtml(s).replace('<li class="step"', `<li class="step" ${reveal ? '' : 'hidden'}`)).join('')}</ol>` : `<p class="muted">${T.noSandhi}</p>`}
    ${r.alts.length ? `<div class="sx-alt" ${reveal ? '' : 'hidden'}>${T.alt}: <span class="skt">${esc(r.alts.join(', '))}</span></div>` : ''}
    ${reveal ? '' : `<div class="row gap"><button class="btn small" data-act="sx-next" data-id="${id}">${T.nextStep}</button><button class="btn small ghost" data-act="sx-all" data-id="${id}">${T.showAll}</button></div>`}
  </div>`;
}

export function revealSandhi(id, all) {
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

export const table = (head, rows, cls = '') => `<div class="tbl-wrap"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

/** Ordered derivation: steps [{ f: form, s: sūtra id(s), n: note }]. */
export const stepsHtml = (title, steps) => `<div class="prakriya">${title ? `<h4 class="skt">${title}</h4>` : ''}<ol>${steps.map((st) =>
  `<li><div class="pf skt">${esc(st.f)}</div><div class="step-sutras">${[].concat(st.s || []).map((s) => sutraChip(s, 'mini')).join('')}</div><div class="step-note">${esc(st.n)}</div></li>`).join('')}</ol></div>`;

export const header = (title, sub, back) => `<header class="vh">${back ? `<a class="back" href="${back}" aria-label="${T.back}">←</a>` : ''}
  <div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div></header>`;
