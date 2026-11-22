# संस्कृत सहायक

An offline-first PWA, in Nepali, for learning Pāṇinian grammar. It started as a companion to
**लघुसिद्धान्तकौमुदी** and still follows LSK's prakaraṇa order on its "कौमुदी क्रम" path. A second path,
"पाठक क्रम", is for someone who reads Devanagari fluently and wants to reach the literature: it puts kāraka,
word forms, kṛdanta and samāsa before sandhi. Every sandhi and verb form is shown as a step-by-step derivation
that names the sūtra applied at each step.

## What's in it

| Area | Content |
|---|---|
| पाठ (33) | A: संज्ञा प्रकरण + व्याकरणको नक्सा (7), B–D: सन्धि (10), E: सुबन्त परिचय (2), F: तिङन्त परिचय (2), G: सहजबोध दृष्टि (6), H: कारक र विभक्ति (2), I: कृदन्त (2), J: समास (2). Two orders (`PATHS` in `lessons.js`), chosen on the पाठ screen |
| अष्टाध्यायी नक्सा | `#/map` — the grammar read like a large program, at six zoom levels: pipeline (architecture), 8 × 4 pādas (modules), अधिकार (scopes), sūtras as rewrite rules, prakriyā (trace), lab (experiments). Plus five key ideas, a Pāṇini ↔ programming glossary and the अनुबन्ध (flags) table. Prints cleanly (print CSS) |
| प्रयोगशाला | `#/lab` — mutation testing for the grammar. Switch sūtras off; both engines rerun every sandhi example (lessons + verses) and all 2,628 verb forms, list what changed, and name the sūtra that took over. A specific rule switched off lets its general rule fire, so the lab shows utsarga/apavāda pairs directly (अतो गुणे off → भवान्ति, अकः सवर्णे दीर्घः takes over) |
| श्लोक | `#/verses` — 8 well-known verses (स्तुति, गीता, उपनिषद्, हितोपदेश). Each has engine-checked पदच्छेद, a full analysis of every pada (prakṛti, form, kṛt, samāsa, role, sūtras), a guess-first mode, an अन्वय coloured by kāraka role, and the meaning |
| कारक, समास, कृदन्त | Interactive widgets: pick the role of each word in a sentence; pick the samāsa type and see the vigraha; kṛdanta table by dhātu or by suffix (22 dhātus × 8 kṛt) |
| अनुबन्ध | Decoder: pick a suffix, see its इत् letters as flags and what each one does (`js/content/anubandha.js`) |
| सूत्र (262) | Text, type, colour-coded पदच्छेद (षष्ठी = स्थानी, प्रथमा = आदेश, सप्तमी/पञ्चमी = निमित्त), a rewrite signature built from it (`इकः → यण् / __ अचि`), अनुवृत्ति, अर्थ, सरल व्याख्या. Each sheet also shows its अधिकार, its neighbours in Aṣṭādhyāyī order, and **सबै प्रयोग** (every junction/form where the engines apply it) |
| सन्धि इन्जिन | `js/sandhi.js` — अच्, common हल् (stop/म्/न् finals), विसर्ग. Every step cites its sūtra; optional (वा) rules return the alternative form |
| तिङन्त इन्जिन | `js/tinanta.js` + `js/content/dhatu.js` — first gaṇa group (भ्वादि, दिवादि, तुदादि, चुरादि), कर्तृवाच्य, लट् लोट् लङ् विधिलिङ्, both padas, 57 dhātus. Every step cites its sūtra |
| औजार | सन्धि गणक, धातुरूप गणक, माहेश्वर-सूत्र प्रत्याहार खोजी, वर्ण स्थान/प्रयत्न explorer, ८ शब्दरूप, भू (६ लकार), सूत्र सूची (पाठ वा अष्टाध्यायी क्रम) |
| अभ्यास | Generated MCQs (sandhi result, "which sūtra", sūtra↔artha, pada role, pratyāhāra, sthāna/savarṇa/guṇa-vṛddhi, rūpa, धातुरूप, अङ्ग, प्रत्यय वर्ग, join sūtra). For reading: recognise a form (form → vibhakti / lakāra), kāraka role, kṛdanta (form ↔ suffix), samāsa type, padas from the verses |
| प्रगति | Lessons done, accuracy per topic, Leitner review deck of sūtras from completed lessons, daily streak, JSON backup/restore |

The core teaching idea is lesson A6, «सूत्र कसरी पढ्ने». Most LSK vidhi-sūtras decode with one sentence
pattern: "सप्तमी पछि आउँदा षष्ठी को ठाउँमा प्रथमा हुन्छ". The app colours every pada by that role.

### Unit G — सहजबोध दृष्टि

Unit G follows the order and classification of Dr. Pushpa Dikshit's *Aṣṭādhyāyī Sahajabodha*, Vol. I
(सार्वधातुक खण्ड, lessons 3–5). The explanations and examples are new. They are not copied from the book.

1. Before attaching a pratyaya, ask: सार्वधातुक/आर्धधातुक? पित्/अपित्? हलादि/अजादि? Then ask what the aṅga is:
   अदन्त, आकारान्त, इगन्त, एजन्त, लघु इगुपध, or बाँकी हलन्त. The aṅga × pratyaya grid then gives the aṅgakārya.
2. Learn special (अपवाद) dhātus first, then the general rule.
3. In the first gaṇa group, धातु + विकरण always gives an अदन्त aṅga. The 74 ready-made endings then join it in
   one of six ways, decided only by the ending's first sound.
4. See a sūtra in all its contexts at once (the sheet's सबै प्रयोग), and in Aṣṭādhyāyī order (सूत्र सूची → अष्टाध्यायी क्रम).

## Run

```sh
npm test                          # engine oracle + content integrity (node, no deps)
python -m http.server 8765        # then open http://127.0.0.1:8765
```

There is no build step and there are no dependencies. Plain ES modules.

## Deploy (so it installs on a phone)

The app needs HTTPS for the service worker and the install prompt. Any static host works. For example:

- **GitHub Pages**: push this folder to a repo → Settings → Pages → deploy from branch.
- **Cloudflare Pages / Netlify**: drag-and-drop the folder.

On Android Chrome, open the URL and tap "फोनमा एप राख्नुहोस्" (or ⋮ → Install app). After the first load
it works offline.

**On every deploy, bump `VERSION` in `sw.js`.** Otherwise installed copies keep serving the old cache.

## Tests

`tests/engine-cases.js` holds ~64 hand-checked sandhi results and pratyāhāra sets. `tests/tinanta-cases.js`
holds the लट् form of every dhātu, लङ् forms that need अट्/आट्, and the full नी paradigm (4 lakāras × 2 padas).
`tests/run.js` also checks that:

- every lesson example gives its stated result;
- every sūtra cited by either engine, the lessons or a prakriyā exists in `sutras.js`;
- the static भू table in `rupa.js` agrees with the tiṅanta engine for लट् लोट् लङ् विधिलिङ्.

Add a case there before changing a rule.

## Known limits / deliberate deferrals

- **Content review.** A teacher or the student should review it against their LSK edition. The sūtra
  texts, Aṣṭādhyāyī numbers and derivations were written from standard sources but not proofread by one.
  The Nepali was written by an AI and not proofread by a native speaker.
- **Reader content needs review.** The verse analyses (`js/content/verses.js`), the kṛdanta table
  (`krit.js`) and the 136 sūtras added for units H–J were written by an AI from standard sources. Tests check
  that they agree with the engines and that every cited sūtra exists, not that the grammar is right. Sūtras
  flagged as uncertain when they were written: 3.2.124 (artha covers only the sūtra's own condition), 6.4.110
  (no anuvṛtti given), 8.1.22 / 8.1.23 (anuvṛtti from memory), 1.1.53, 1.1.56, 6.4.51 (examples).
- **Kṛdanta is a table, not an engine.** Ārdhadhātuka suffixes need इट् (सेट्/अनिट्/वेट्) and many root-specific
  rules. The next engine step is ārdhadhātuka (इट् first), which would also unlock लिट्/लुट्/लृट्.
- **Rule lab scope.** Only the sūtras in `SANDHI_SWITCHABLE` / `TIN_SWITCHABLE` can be switched off. Switching
  off guards the rule's trigger; the cascade then falls through, and vowel junctions left over fall back to the
  sandhi engine. The lab says "no rule took over" where the system would need a rule the engines don't model.
- **Not yet covered:** तद्धित and स्त्री प्रत्यय units (they appear only in the map, the anubandha decoder and
  the verses); सन्महत्परमोत्तमोत्कृष्टाः पूज्यमानैः (२।१।६१), cited in a note for महेश्वरः but not in `sutras.js`.
- **LSK serial numbers** are not shown. Editions number them differently, so cards use Aṣṭādhyāyī numbers (६।१।७७).
- **Engine scope.** The engine does not compute upasarga + dhātu rules (एङि पररूपम्, उपसर्गादृति धातौ), plus
  न् before श/ष/स, द्वित्व (अनचि च) and pada-internal hal sandhi. These are taught as static examples in the
  lessons. The tool says so when it cannot compute a pair.
- **Visarga from र्.** This is decided by a word list (पुनः, प्रातः, अन्तः, …) in `sandhi.js`.
- **Coverage.** Subanta stops at the introduction (राम). Tiṅanta computes only the first gaṇa group, कर्तृवाच्य,
  and the four sārvadhātuka lakāras. Not computed yet:
  - the second gaṇa group (अदादि, जुहोत्यादि, स्वादि, रुधादि, तनादि, क्र्यादि). The aṅga × pratyaya grid already uses
    its examples, but the engine cannot derive those forms;
  - ārdhadhātuka lakāras (लिट्, लुट्, लृट्, लुङ्, आशीर्लिङ्, लृङ्);
  - लेट्, and कर्म/भाव वाच्य.
  
  The next step in Sahajabodha order is the second gaṇa group (Vol. I, lessons 5 and 7) plus hal sandhi with
  pratyayas (lesson 6).
- **Tiṅanta details.** The dhātu list (57) was chosen to cover every aṅga class. Pada is stored per dhātu. Upasarga-
  conditioned pada changes (e.g. सम् + गम् → आत्मनेपद) are not modelled. The ready-made endings are given as a table.
  The note in lesson G5 only names the sūtras that produce them; the engine does not derive them from तिप् etc.
  Sahajabodha says 26 endings start with इ/ई; this table has 25. Each row matches the book's printed table, so the book
  probably groups or counts them differently.
- **सबै प्रयोग sweep.** The grid comes from template junctions (क + ending). Optional rules whose primary form does not
  apply them (e.g. वा पदान्तस्य) do not show up, because only the primary derivation is indexed.
- **Progress storage.** Progress lives in the browser's localStorage on that one device. Backup/restore is
  manual (प्रगति → ब्याकअप). Sync across devices would need a backend and was left out on purpose.
- **Language.** The UI is Nepali only. A Hindi version means adding a sibling object to `js/i18n.js` and
  translating `js/content/*`.
