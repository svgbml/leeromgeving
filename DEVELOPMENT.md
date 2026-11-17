# Leeromgeving BML: development framework and roadmap

Based on a full read of `app.js` (845 lines), `index.html`, `style.css`, `sw.js`, `manifest.webmanifest`,
`data/modules.json`, the six module JSON files, `tools/*` and the Pages workflow (commit `2f61165`).

---

## 1. Where the project stands

**Strong points to keep**
- No build step, static hosting, PWA, works on any device. Keep this as a hard constraint.
- Good accessibility basics: skip link, ARIA live region, keyboard flashcards, 44px targets, focus ring, both themes.
- A quiz engine that mirrors the official Remindo exams (points, cases A–D, open questions with a rubric of key points).
- Every card carries its source (file + slide numbers).

**Structural limits**
- All logic lives in one IIFE in `app.js`. Views, the SRS algorithm, the quiz generator, storage and
  HTML templates are mixed. Each new feature makes the file harder to change safely.
- Views re-render with `innerHTML` and re-bind events every time, with inline `style="…"` scattered through the templates.
- Nothing is tested. The parts most likely to break quietly (SRS intervals, `kernpunten()`, `mask()`,
  `buildItems()`) are pure functions and easy to test.
- The data schema is implicit and not uniform across modules (see §3).
- The content tools are one-off scripts (`bouw_jaar1.py` hardcodes `/home/claude/repo-leeromgeving/tools`).

---

## 2. Bugs and inconsistencies found

| # | Where | Problem | Fix |
|---|---|---|---|
| 1 | `tick()` / `finishQuiz()` | The quiz timer keeps running after you leave the Oefentoets tab. When it runs out, `drawResult()` overwrites whatever page you are on (e.g. the Begrippen list). | Stop the interval in `route()` when leaving `toets`, and only render if the current route is `toets`. Recompute on return. |
| 2 | `viewToets()` mix help text | Says meerkeuze is "1 of 2 punten" and open is "3 of 4 punten", but `puntenVoor()` always returns 1 and open questions get 1–4 points (one per key point). | Change the copy to "1 punt" and "1–4 punten, één per kernpunt". Remove the unused `puntenVoor` arguments. |
| 3 | `sw.js` | `CORE` pre-caches only 2 of the 6 modules, so the other modules don't work offline until you have opened them once. It also caches error responses (no `r.ok` check). Fonts come from Google and are never cached (cross-origin requests are skipped). | Generate the cache list in CI from `modules.json`, check `r.ok`, and self-host IBM Plex in `fonts/`. |
| 4 | `today()` | Uses `toISOString()` (UTC), so the "new cards per day" limit resets at 01:00/02:00 Dutch time instead of midnight. | Use a local date: `new Date().toLocaleDateString("sv")`. |
| 5 | Import | `#imp` accepts any `prog` object without checking its shape, and doesn't reset `state.flash`, so the old session stays on screen. | Validate the shape, merge it into the defaults (`loadProg` logic), and reset `state.flash`/`state.quiz`. |
| 6 | Quiz MC on question cards | Options are cut to 150 chars with `kort()`. The correct answer is often the longest one or the one ending in "…", which gives it away. | Cut all options to the same length, or show the full text and let the layout handle it. |
| 7 | Quiz state | An unfinished quiz is lost on reload or when you switch modules. | Persist `state.quiz` to `sessionStorage`. |
| 8 | `.group-h` | Sticky `top:96px` is hardcoded and breaks when the header wraps. | Use a CSS variable set from the header's measured height, or `scroll-margin`. |
| 9 | README "Module toevoegen" | Still refers to `data/<id>.json` / `data/de-cel.json`. The real path is `data/jaar-<j>/periode-<p>/`. | Update the README. |
| 10 | `de-cel.json` | Missing `id`, `kaarttype` and `lessen` at the top, unlike the other modules, so lesson filters and case grouping by lesson don't work there. | Normalise it (see §3). |
| 11 | Source links | Four of six modules have an empty `slides` map, so "Bron" is never a link there. | Fill in `slides`, or show a "no link" state. |

---

## 3. Target architecture (still no build step)

Native ES modules work on GitHub Pages without a bundler. Proposed layout:

```
index.html                 <script type="module" src="src/main.js">
src/
  main.js                  init, module loading, service-worker registration
  core/
    dom.js                 $, esc, rich, plain, say(), html`` tagged template
    router.js              hash router with params: #/toets?les=3 ; enter/leave hooks
    store.js               progress storage: versioned schema, migrations, export/import, per-module + global
    theme.js
  domain/                  pure logic, no DOM  ← unit-tested
    srs.js                 scheduler (SM-2 now, FSRS later) behind one interface
    quiz/
      generate.js          buildItems, pickWeighted
      mc.js                makeMC + variants (behalve, geen-van, invul, omschrijving)
      open.js              kernpunten, makeOpen
      casus.js             casusGroepen, achtergrondBij
    stats.js               typeVoorraad, per-group stats, grade formula
  views/
    begrippen.js  flashcards.js  toets.js  voortgang.js  dashboard.js
  components/              small render helpers: card, tag, meter, table, puntBadge
styles/
  tokens.css  base.css  components.css  views/*.css
data/
  schema/module.schema.json
tests/                     node --test, runs on the domain/ folder
tools/
  pipeline.py              one entry point: pptx → extract → cards → validate
```

**Conventions**
- `domain/` never touches `document` or `localStorage`, so it can be imported in Node tests.
- Each view exports `{ mount(params), unmount() }`. The router calls `unmount` (this fixes bug #1 structurally).
- Use one `html\`\`` tagged template that escapes by default and `raw()` for trusted rich text. This replaces the mix of `esc()`/`rich()` calls at each call site.
- Move inline `style="…"` into classes.
- Progress schema gets a `v` field plus migration functions (the current `??=` defaults become migration 1).
- Keep Dutch identifiers in the code, as now, to stay consistent.

**Data schema (`module.schema.json`)**: one shape for all modules:
```jsonc
{ "id", "titel", "jaar", "periode_nr", "kaarttype": "begrip" | "vraag",
  "lessen": [{ "nr", "titel", "bronnen": [], "aantal" }],
  "slides": { "<bestand>": "<drive-url>" },
  "casussen": [],
  "begrippen": [{ "id", "onderwerp", "les"?, "begrip", "uitleg", "aanvulling"?,
                  "bron_bestand", "bron_slides": [], "tags"?: [], "afbeelding"? }] }
```
Drop the per-card `module` field, which repeats on every card and inflates the files by about 10%.

**CI (extend `pages.yml`)**
1. `node --test tests/`
2. Validate every module against the schema, and check that ids are unique and every `casussen[].vragen` id exists.
3. Generate `sw.js`'s precache list plus a cache version (from the commit hash) from `modules.json`. This removes the manual step 3 in the README.
4. Optional: Lighthouse/axe accessibility check on the built page.

**Migration order** (each step ships on its own, and the site keeps working after each):
1. Add tests around the current functions (copy them into `domain/` first).
2. Extract `core/` + `domain/`, keeping `app.js` as a thin shell.
3. Split the views one at a time.
4. Add the schema, CI validation and the generated SW.

---

## 4. Improvements to existing features

**Begrippen**
- Highlight matches in the search results; debounce input (400-card modules re-render every keystroke).
- Put the filters in the URL (`#/begrippen?les=3&q=dna`) so they survive reload and can be shared.
- Add a deep link per card (`#/begrippen?id=cel-003`) with a copy-link button.
- Auto-link terms: when a card's `uitleg` mentions another card's `begrip`, make it a link.
- Add a compact list/table view and a print stylesheet so students can print a clean begrippenlijst.

**Flashcards**
- Reverse direction (uitleg → begrip) as an option. This uses the existing data and gives twice the practice.
- Typed-answer mode with a fuzzy match against `begrip`.
- Swap SM-2 for **FSRS** behind the `srs.js` interface. It needs fewer reviews for the same retention and is the modern Anki default.
- Undo the last grade (`z` key).
- Let students star cards, and add a "Gemarkeerd" filter.
- Show "X due today" on the tab itself (a badge).

**Oefentoets**
- **Examensimulatie mode**: no feedback until the end, free navigation between questions, a "flag for review" option, and one total timer. This matches the real Remindo experience better than instant feedback.
- Better distractors: prefer cards with similar length and the same `les`, and avoid cards whose `begrip` shares a word with the correct answer.
- Choose the pass mark (default 5,5 at 55% vs. a custom norm), since the note already says the official norm can differ.
- Make the "Nog eens bekijken" list actionable: a button that adds those cards to today's flashcard queue.

**Voortgang**
- Add charts: grade trend over the last tests (sparkline), plus a review heatmap (calendar) with a streak.
- Export/import **all modules** at once (one file), not one module at a time.
- Show a forecast: "kaarten due komende 7 dagen".

**UI / design**
- On mobile the header (module select + theme button + tabs) takes about 30% of the screen and isn't sticky. Use a bottom tab bar on phones and move the module picker into a sheet.
- Flashcards: add a card flip transition (under `prefers-reduced-motion: no-preference`) and make the card bigger on mobile, with swipe gestures for grading.
- Add a keyboard shortcut help overlay (`?`).
- Add PNG + maskable icons (iOS ignores SVG manifest icons) and an `apple-touch-icon`.
- Add an empty/loading state per view, and show an error when a module JSON fails to load (now it throws silently).

---

## 5. New features (ranked by value ÷ effort)

| Priority | Feature | Why |
|---|---|---|
| ★★★ | **Vandaag dashboard** (`#/` home): due cards and new cards per module, the weakest topics from recent quizzes, exam countdown | One place to start each study session; uses data that already exists |
| ★★★ | **Exam dates + study planner**: set a date per module and it spreads the new cards over the remaining days | Fits how students actually prepare for exams |
| ★★★ | **"Meld een fout"** per card → prefilled GitHub issue URL (card id, module, text) | The auto-generated cards from slides will contain errors; makes fixing them cheap |
| ★★☆ | **Cross-module review**: one flashcard session over all due cards | Year-2 material builds on year-1 material |
| ★★☆ | **Cloze cards** (`{{c1::…}}` in `uitleg`) and **image cards** (own figures in `img/`) | More card types than term → definition, which suits lab procedures |
| ★★☆ | **Anki/CSV export** of a module | Students who already use Anki can bring the content there |
| ★★☆ | **Sync without a backend**: an optional GitHub Gist or file-system-access sync | Progress currently lives only in one browser |
| ★☆☆ | **Mind map / topic graph** per lesson built from the auto-links | Visual overview of how concepts connect |
| ★☆☆ | **Open-question self-check helper**: highlight which key-point keywords appear in your typed answer before you tick the rubric | Faster and more honest self-grading; works fully client-side |
| ★☆☆ | **Teacher/peer mode**: a shareable quiz link with a fixed seed (`#/toets?seed=…`) so a study group gets the same quiz | Lets a study group compare scores on identical questions |

---

## 6. Content pipeline

- One command: `python tools/pipeline.py "<map met pptx>" --module dna-ontrafeld`, which runs extract → build cards → merge any manual edits → validate the schema.
- Keep **manual edits as overrides** (`data/.../<module>.overrides.json`, keyed by card id). Regenerating from slides then doesn't wipe hand-written `aanvulling` text or fixes.
- Add a quality report per module: cards with a very short `uitleg`, duplicate `begrip`, cards without an `onderwerp`, and topics with fewer than 4 cards (too few for good MC distractors).
- Remove `tools/__pycache__` from git and add a `.gitignore`.

---

## 7. Sprint 1 — done (branch `sprint-1/bugfixes-tests-dashboard`)

- Bugs #1 (timer), #2 (points copy), #3 (offline: generated `sw.js`, `r.ok`, self-hosted font), #4 (local day),
  #5 (import validation), #6 (MC answers no longer truncated; similar-length distractors), #9 (README), #10 (`de-cel.json`).
- `src/domain/` (text, srs, quiz, progress, stats) + 49 tests (`npm test`); `tools/validate-data.js` + schema; CI runs both and builds `sw.js`.
- **Lesinfo**: 84 organisational cards (lesson count, exam dates, homework, Brightspace/Knowingo…) flagged by
  `tools/markeer_lesinfo.py`; excluded from quiz, distractors, case background, flashcards and progress stats.
- Vandaag dashboard (`src/views/vandaag.js`) is the new start page.

Still open from §2: #7 (persist an unfinished quiz), #8 (sticky group header offset), #11 (empty `slides` links in four modules).

### Original sprint-1 plan

1. Fix bugs #1, #2, #4, #5 and #9 (small, isolated changes).
2. Add `tests/` with Node's built-in runner for `grade/preview`, `kernpunten`, `mask` and `buildItems`.
3. Add the module schema and a CI validation step; normalise `de-cel.json`.
4. Generate the SW precache list in CI and self-host the font (fixes offline mode completely).
5. Build the Vandaag dashboard as the first view in the new `views/` structure, as a test of the architecture.
