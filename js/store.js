// प्रगति — progress, quiz stats and the sūtra review deck (Leitner boxes), kept in localStorage.
// Storage can be unavailable (private mode) — the app then works but forgets on reload.

const KEY = 'sanskrit-sahayak.v1';
const DAY = 86400000;
/** Days until next review after a card reaches box n (index = box). */
const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
const MAX_BOX = INTERVAL_DAYS.length - 1;

const empty = () => ({ v: 1, lessons: {}, quiz: {}, srs: {}, days: [] });

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && s.v === 1 ? { ...empty(), ...s } : empty();
  } catch { return empty(); }
}
let state = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }

export const localDay = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function markActive() {
  const d = localDay();
  if (!state.days.includes(d)) state.days = [...state.days, d].slice(-400);
}

export const store = {
  isDone: (id) => !!state.lessons[id],
  doneCount: (ids) => ids.filter((id) => state.lessons[id]).length,

  completeLesson(id, sutraIds) {
    state.lessons[id] = { done: Date.now() };
    for (const s of sutraIds) if (!state.srs[s]) state.srs[s] = { box: 1, due: Date.now() };
    markActive(); save();
  },
  undoLesson(id) { delete state.lessons[id]; save(); },

  recordAnswer(topic, correct) {
    const q = state.quiz[topic] || (state.quiz[topic] = { c: 0, t: 0 });
    q.t++; if (correct) q.c++;
    markActive(); save();
  },
  quizStats: () => state.quiz,

  deckSize: () => Object.keys(state.srs).length,
  dueCards(now = Date.now()) {
    return Object.entries(state.srs).filter(([, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due).map(([id]) => id);
  },
  boxCounts() {
    const counts = Array(MAX_BOX + 1).fill(0);
    for (const c of Object.values(state.srs)) counts[c.box]++;
    return counts.slice(1);
  },
  /** grade: 0 = बिर्सें, 1 = कठिन, 2 = याद छ */
  gradeCard(id, grade) {
    const c = state.srs[id]; if (!c) return;
    if (grade === 0) { c.box = 1; c.due = Date.now() + 10 * 60000; }
    else if (grade === 1) { c.due = Date.now() + Math.max(1, Math.ceil(INTERVAL_DAYS[c.box] / 2)) * DAY; }
    else { c.box = Math.min(MAX_BOX, c.box + 1); c.due = Date.now() + INTERVAL_DAYS[c.box] * DAY; }
    markActive(); save();
  },

  streak() {
    const set = new Set(state.days);
    let t = Date.now();
    if (!set.has(localDay(t))) t -= DAY; // today not yet active: streak still alive from yesterday
    let n = 0;
    while (set.has(localDay(t))) { n++; t -= DAY; }
    return n;
  },
  activeToday: () => state.days.includes(localDay()),

  exportJson: () => JSON.stringify(state, null, 1),
  importJson(text) {
    const s = JSON.parse(text);
    if (!s || s.v !== 1 || typeof s.lessons !== 'object') throw new Error('invalid');
    state = { ...empty(), ...s }; save();
  },
  reset() { state = empty(); save(); },
};

/** Ask the browser not to evict our data (installed PWA usually gets this). */
export function requestPersistence() {
  try { navigator.storage?.persist?.(); } catch { /* ignore */ }
}
