# संस्कृत सहायक

An offline-first PWA, in Nepali, that works alongside **लघुसिद्धान्तकौमुदी**. It follows LSK's prakaraṇa
order but explains each sūtra in plain Nepali. Every sandhi is shown as a step-by-step derivation that names
the sūtra applied at each step.

## What's in it

| Area | Content |
|---|---|
| पाठ (20) | संज्ञा प्रकरण (6), अच् सन्धि (4), हल् सन्धि (3), विसर्ग सन्धि (3), सुबन्त परिचय (2), तिङन्त परिचय (2) |
| सूत्र (88) | Text, type, colour-coded पदच्छेद (षष्ठी = स्थानी, प्रथमा = आदेश, सप्तमी/पञ्चमी = निमित्त), अनुवृत्ति, अर्थ, सरल व्याख्या |
| सन्धि इन्जिन | `js/sandhi.js` — अच्, common हल् (stop/म्/न् finals), विसर्ग. Every step cites its sūtra; optional (वा) rules return the alternative form |
| औजार | सन्धि गणक, माहेश्वर-सूत्र प्रत्याहार खोजी, वर्ण स्थान/प्रयत्न explorer, ८ शब्दरूप, भू (६ लकार), सूत्र सूची with search |
| अभ्यास | Generated MCQs (sandhi result, "which sūtra", sūtra↔artha, pada role, pratyāhāra, sthāna/savarṇa/guṇa-vṛddhi, rūpa) |
| प्रगति | Lessons done, accuracy per topic, Leitner review deck of sūtras from completed lessons, daily streak, JSON backup/restore |

The core teaching idea is lesson A6, «सूत्र कसरी पढ्ने». Most LSK vidhi-sūtras decode with one sentence
pattern: "सप्तमी पछि आउँदा षष्ठी को ठाउँमा प्रथमा हुन्छ". The app colours every pada by that role.

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

`tests/engine-cases.js` holds ~64 hand-checked sandhi results and pratyāhāra sets. `tests/run.js` also checks
that:

- every lesson example gives its stated result;
- every sūtra cited by the engine, the lessons or a prakriyā exists in `sutras.js`.

Add a case there before changing a rule.

## Known limits / deliberate deferrals

- **Content review.** A teacher or the student should review it against their LSK edition. The sūtra
  texts, Aṣṭādhyāyī numbers and derivations were written from standard sources but not proofread by one.
  The Nepali was written by an AI and not proofread by a native speaker.
- **LSK serial numbers** are not shown. Editions number them differently, so cards use Aṣṭādhyāyī numbers (६।१।७७).
- **Engine scope.** The engine does not compute upasarga + dhātu rules (एङि पररूपम्, उपसर्गादृति धातौ), plus
  न् before श/ष/स, द्वित्व (अनचि च) and pada-internal hal sandhi. These are taught as static examples in the
  lessons. The tool says so when it cannot compute a pair.
- **Visarga from र्.** This is decided by a word list (पुनः, प्रातः, अन्तः, …) in `sandhi.js`.
- **Coverage.** Subanta and tiṅanta stop at the introduction (राम, भू). Next candidates in LSK order:
  अजन्त पुंलिङ्ग (हरि, गुरु derivations), then the remaining 9 gaṇas.
- **Progress storage.** Progress lives in the browser's localStorage on that one device. Backup/restore is
  manual (प्रगति → ब्याकअप). Sync across devices would need a backend and was left out on purpose.
- **Language.** The UI is Nepali only. A Hindi version means adding a sibling object to `js/i18n.js` and
  translating `js/content/*`.
