# Phase 5 Design Map — Tone & kind curation (surfacing + feeling arcs)

Scope per `implementation-roadmap.md` Phase 5: the tone engine reads each
page's emotional register conservatively (never shown as a verdict), the kind
curator surfaces only warm/growth material and **learns boundaries from a soft
dismissal**, and the cast gains gentle feeling arcs. Layered care for crisis is
Phase 6 (out of scope here).

## 1. Ground truth in the code

- Feeling lexicons already exist: `feelingWords` (editorial-guardrails) and the
  `feelings` list in the capture flow ("Happy, Grateful, Proud, …").
- The cast (Phase 3) already aggregates each character's moments and dates.
- `pageTime` (weekly-weave) gives reliable page dates; `Today` already hosts
  the composer, whisper, and tutor card — a natural home for a surfacing card.
- Storage pattern: local-first keys (`life-in-books-*`) already the norm.

## 2. The tone engine (internal, conservative)

A client module computes, per page and per character, a soft register:

```
classifyTone(text) → { polarity: "warm" | "light" | "neutral" | "heavy",
                       score, cueWords }
```

- Lexicon-based (warm: happy, grateful, proud, laugh, achha, behtar…
  heavy: sad, tired, hurt, alone, miss, overwhelmed, akela, dard…) with a few
  negation/booster tweaks. Conservative: weak or absent evidence ⇒ `neutral`.
- **Never shown to the user as a label.** It only drives two quiet things:
  (a) whether a memory may be surfaced uninvited, and (b) the soft feeling arc
  on a portrait. Uncertainty is always treated as neutral (browse-only-safe).

## 3. Kind curation: safe-to-surface, with learned boundaries

- `surfaceable(page)` = page tone is `warm`/`light`/`neutral` and the page is
  not in the dismissed set. `heavy` pages are **browse-only** — never knocked.
- **Learned boundary:** a persistent dismissed set
  (`life-in-books-not-today`) of page ids. When the app surfaces a memory and
  the user taps **"Not today"**, that page (and same-day peers) is remembered
  and stays uninvited. The important edge: destructive/heavy moments are never
  surfaced in the first place, so learning only ever *tightens*, never widens.
- **Choose the moment kindly:** prefer a **"this day last year"** match (a
  page whose month/day is within a few days of today, from an earlier year, and
  surfaceable); otherwise the most recent surfaceable page older than a week
  with the strongest warm signal. Never a recent raw entry.

## 4. Surfacing card (Today)

- A calm card beneath the composer (and above the tutor card): *"A moment worth
  returning to."* with the title, a short excerpt, **Open** (into Story reader
  at that page) and **Not today** (teaches the boundary).
- Off by default; only appears when a kind candidate exists. At most a gentle
  pace (once per day is plenty; not a daily barrage). Never a push.

## 5. Feeling arcs on portraits

- For a character, reduce their moments' tone: counts of warm/light/neutral/
  heavy and the earliest heavy date (if any).
- Display only when there is confident signal, phrased softly and traceable:
  *"Your writing about Mom has been warm — with a heavier stretch around
  September 2026."* Never a verdict ("you were sad"), never a chart, never
  psychology. If evidence is thin, show nothing.

## 6. Build shape

1. New `components/system/tone.ts`: `classifyTone`, `pageTone`,
   `surfaceable(page, dismissed)`, `dismissedIds()` / `dismiss(id)`,
   `thisDayLastYear(pages, dismissed)`, `kindCandidate(pages, dismissed)`,
   and `characterFeelingArc(moments)`.
2. `home-experience.tsx`: hold dismissed state (load/save once), pick a kind
   candidate, pass to Today; and a `dismissNotToday(id)` handler.
3. `today-experience.tsx`: render the surfacing card with Open / Not today.
4. `people-experience.tsx`: add the feeling-arc line to the portrait (uses
   `characterFeelingArc`).
5. QA: a warm old page surfaces; **Not today** hides it and persists; a heavy
   page never surfaces; a character with warm + one heavy stretch shows a soft
   arc; zero console errors.

## 7. Non-goals for Phase 5

- Layered care / crisis resources → Phase 6.
- Monthly "your year so far" deep review (later; the weave layer already gives
  weekly chapters).
- Cloud sync of dismissed/tone state (local-first; graph cloud later).
- Any UI that labels an emotion or suggests a psychology.

## 8. Decisions to ratify

1. **Scope:** tone + kind surfacing + portrait feeling arcs (recommended) vs.
   tone + surfacing only (defer arcs) vs. tone only.
2. **Surfacing placement/cadence:** a gentle card on Today (once a day, with
   "Not today", never a push) (recommended) vs. also surface inside Story vs.
   also show a monthly card.
3. **Feeling-arc presentation:** a soft observed line when confident
   (recommended) vs. a small tone-over-time dots/bar vs. no arcs this phase.

## 9. Ratified decisions and build status

Ratified: tone + surfacing + arcs; surfacing as a Today card only; feeling arcs
as a soft line when confident.

Implemented and verified:
- New `tone.ts`: `classifyTone` (lexicon, warm/light/neutral/heavy, weighted
  score), `pageTone`, `surfaceable(page, dismissed)`, `thisDayLastYear`,
  `kindCandidate`, `characterFeelingArc`, and the `life-in-books-not-today`
  dismissed set (load/persist). Conservative — weak evidence ⇒ neutral;
  heavy pages are never surfaced; the tone is never shown as a label.
- `home-experience.tsx`: dismissed-state (load/save once), picks a kind
  candidate for Today, `dismissNotToday(id)` teaches the boundary.
- `today-experience.tsx`: the surfacing card
  (*"A moment worth returning to"* — Open / Not today), once a day, below the
  composer, above the tutor card.
- `people-experience.tsx`: portrait feeling arc (soft, traceable, confident-only
  line about how you wrote about them over time).
- QA (local CDP): a warm old page surfaces; a heavy page never does; **Not today**
  hides it and persists (`['warm']`); the portrait reads *"has felt warm — with
  a heavier stretch around <date>"*. Zero console exceptions. Screenshots in
  `work/`: `p5-surfacing.png`, `p5-arc.png`; driver `work/cdp-phase5.mjs`.
- Build (production) and ESLint pass.

Deferred as agreed: layered care / crisis resources (Phase 6), monthly "your
year so far" review, cloud sync of tone/dismissed state, any emotion
labeling.
