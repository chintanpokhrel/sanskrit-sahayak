// शब्दावली: the glossary page (#/glossary) and the entry shown in the bottom sheet. Terms in running text link
// here through ui.js `glossify`; app.js opens the sheet on any [data-gl] click.

import { T } from './i18n.js';
import { toDevDigits } from './varna.js';
import { LESSONS } from './content/lessons.js';
import { GLOSSARY, CATS } from './content/glossary.js';
import { esc, sutraChip, glossify, header } from './ui.js';

const termChip = (id) => `<a class="chip" href="#/glossary/${id}" data-gl="${id}">${GLOSSARY[id].t}</a>`;
const lessonLinks = (e) => e.l.map((id) => LESSONS.find((l) => l.id === id))
  .map((l) => `<a href="#/lesson/${l.id}" data-act="close-sheet">${l.title}</a>`).join(', ');

/** Body of one entry. The definition never links the entry's own headword. */
function entryBody(e) {
  return `<p>${glossify(e.d, e.id)}</p>
    ${e.s.length ? `<div class="gl-row"><small class="muted">${T.gloss.sutras}</small><div class="chips">${e.s.map((s) => sutraChip(s, 'mini')).join('')}</div></div>` : ''}
    ${e.see.length ? `<div class="gl-row"><small class="muted">${T.gloss.see}</small><div class="chips">${e.see.map(termChip).join('')}</div></div>` : ''}
    ${e.l.length ? `<p class="small muted">${T.inLesson}: ${lessonLinks(e)}</p>` : ''}`;
}

export function termHtml(id) {
  const e = GLOSSARY[id];
  if (!e) return '';
  return `<div class="gl-entry"><h2 class="skt-ish">${e.t}</h2><p class="small muted">${esc(e.en)} · ${CATS[e.c]}</p>${entryBody(e)}
    <p><a href="#/glossary/${id}" data-act="close-sheet">${T.gloss.open}</a></p></div>`;
}

const plain = (h) => h.replace(/<[^>]*>/g, '');

export function glossaryView(focus) {
  const view = document.getElementById('view');
  const all = Object.values(GLOSSARY);
  const sections = Object.entries(CATS).map(([c, title]) => {
    const list = all.filter((e) => e.c === c).sort((a, b) => a.t.localeCompare(b.t, 'ne'));
    return `<section class="gl-sec" data-c="${c}"><h3>${title}</h3>${list.map((e) => `<article class="card gl-item" id="gl-${e.id}"
      data-k="${esc([e.t, ...e.k, e.en, plain(e.d)].join(' ').toLowerCase())}">
      <div class="row between wrap"><b class="skt-ish big">${e.t}</b><small class="muted">${esc(e.en)}</small></div>${entryBody(e)}</article>`).join('')}</section>`;
  }).join('');
  view.innerHTML = header(T.gloss.title, T.gloss.sub(toDevDigits(all.length)), '#/tools')
    + `<input class="search" type="search" id="glq" placeholder="${esc(T.gloss.search)}">`
    + `<div class="chips gl-cats"><button class="chip on" data-c="">${T.gloss.all}</button>${Object.entries(CATS).map(([c, t]) => `<button class="chip" data-c="${c}">${t}</button>`).join('')}</div>`
    + `<div class="gl-list">${sections}</div><p class="muted" id="glnone" hidden>${T.gloss.none}</p>`;

  const q = document.getElementById('glq');
  let cat = '';
  const apply = () => {
    const s = q.value.trim().toLowerCase();
    let shown = 0;
    view.querySelectorAll('.gl-sec').forEach((sec) => {
      let n = 0;
      sec.querySelectorAll('.gl-item').forEach((it) => { it.hidden = (cat && sec.dataset.c !== cat) || (s && !it.dataset.k.includes(s)); n += !it.hidden; });
      sec.hidden = !n; shown += n;
    });
    document.getElementById('glnone').hidden = !!shown;
  };
  q.oninput = apply;
  view.querySelector('.gl-cats').onclick = (ev) => {
    const b = ev.target.closest('[data-c]'); if (!b) return;
    cat = b.dataset.c;
    view.querySelectorAll('.gl-cats .chip').forEach((x) => x.classList.toggle('on', x === b));
    apply();
  };
  const el = focus && document.getElementById(`gl-${focus}`);
  if (el) { el.classList.add('focus'); requestAnimationFrame(() => el.scrollIntoView({ block: 'center' })); }
}
