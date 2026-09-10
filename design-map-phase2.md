# Phase 2 Design Map — Story volumes & the weekly weave

Scope per `implementation-roadmap.md` Phase 2: bring the two-natures reading
experience to Story — a time-based "story" alongside the existing theme books —
with weekly woven chapters (surprise first, then a gentle rhythm; thin weeks
stay raw), and the As-written truth always beneath.

## 1. Ground truth in the current code

- Every saved page already carries `volume` / `chapter` / `chapterTitle`
  (theme placement: "Volume I · People", etc.) and a display `date`
  (en-GB, or a detected "when" like "2020").
- Story (`LibraryExperience`) derives everything from those fields:
  `libraryVolumes` = unique volumes; `orderedPages` = volume→pages; the reader
  walks pages in volume order.
- There is **no time-based spine and no woven-chapter entity today** — chapters
  are labels on pages, not content.
- A reading-lamp look already exists on the reader view (`lamplight`).

Consequence: weekly weaving needs (a) a reliable chronology on pages, and
(b) a new derived artifact — a woven chapter with its own narrative.

## 2. The structural decision (the core question)

The book has two natural organizations:
- **Theme books** (what exists): crafted volumes like "Volume I · People".
- **Time story** (the vision): a life in weeks — pages → woven weeks → eras.

Recommendation for Phase 2 (ratify in Section 7): **additive, time-based "Your
weeks" layer that coexists with the Bookshelf; full era-volume reorganization
waits for Phase 3** (when the memory graph can detect real eras instead of
guessing). Rationale: the weekly weave is the emotionally core "story" moment,
is safe to add without reshaping legacy volume semantics, and era detection is
a Phase 3 capability.

## 3. Chronology

- Add optional `createdAt` (ISO) to pages at save time:
  - `composeDailyEntry` (Phase 1) sets it now.
  - The interview's `keepPage` adds it (same slice).
  - Pages saved before Phase 2 without `createdAt`: best-effort parse of
    `date` when it is the en-GB form; otherwise the page is treated as
    untimed (it still appears in theme books; it simply can't join a weave).
- ISO week key (`YYYY-Www`) is the weave unit.

## 4. The weekly weave

**Generation rules (already ratified in the vision):**
- A week "earns" a weave when it has real substance: ≥ 3 pages in the same ISO
  week (first-chapter surprise happens the first time any week qualifies).
- Thin weeks produce no chapter; pages stay raw beneath. Spans do not merge in
  Phase 2 (merging/pooling can come with era detection in Phase 3).
- Generation is lazy + cached: computed when the user opens Story, keyed by
  week, refreshed when new pages join an already-woven week. No pushes, no
  background cron.

**Composition (voice contract from the brief):**
- Narrator is the user; their language(s); chronological with literary craft;
  nothing invented — every sentence traces to the week's pages; soft landing,
  no morals.
- The narrative is built from the week's page bodies (and their reflections),
  in order, de-duplicated by content.
- Titles only when earned — drawn from the week's own phrases if one clearly
  fits; otherwise the chapter keeps its date span ("18–24 May").

**Engine vs. fallback:**
- Preferred: a new engine action `weave` (extends `MemoryEngineAction` and the
  route's editorial instructions with a weekly-composition prompt; returns
  `{ language, title?: string, narrative: string[] }`).
- Fallback when the engine is unreachable (503/timeout): a client-side
  chronological weave using the existing voice-preserving helpers — ordered
  light-touch shaping of the week's pages joined as one narrative. Never
  blocks, never errors the UI.

## 5. Reading experience in Story

- The Bookshelf view gains a distinct entry: **"Your weeks"** (visible once the
  first weave exists; presented as a small, warm surprise the first time —
  "Your first week, woven together").
- The **weave reader**: one woven chapter at a time — the narrative as the
  primary text, with **"See the raw days"** beneath it (the week's actual pages
  in order, each opening into the existing reader). This is the
  Story/As-written toggle for Phase 2, delivered per-week rather than
  retrofitted across the whole Book.
- When a week has no weave, that week simply isn't listed; the raw days remain
  reachable via the theme books and (later) era volumes.
- Lamplight treatment reused for the weave reader.

## 6. Non-goals for Phase 2 (later phases)

- Reorganizing the shelf into era volumes / renaming volumes to eras →
  Phase 3 (with the memory graph).
- Backdating weaves for pre-Phase-2 content (only weeks with `createdAt`-dated
  pages participate).
- Cloud sync of weaves (local-first cache in Phase 2; sync design with the
  memory graph in Phase 3/4).
- Weaving by theme or thread (only time in Phase 2).
- Editing/re-generating controls for weaves (regeneration is automatic on new
  pages; no user-facing controls yet — invisible magic).

## 7. Decisions to ratify

1. **Structure:** additive "Your weeks" layer over the existing Bookshelf
   (recommended) vs. reorganize Story time-first now vs. weave cards embedded
   in the shelf only.
2. **Substance rule:** a week earns a weave at ≥ 3 pages in the same ISO week;
   first qualifying week is the surprise, later qualifying weeks form the
   gentle rhythm, thin weeks stay silent (recommended) — or always weave every
   week regardless of size.
3. **Inclusion:** every page (daily lines and crafted pages alike) belongs to
   its week's weave (recommended — all are moments of the life) vs. only
   daily-line pages.

## 8. Ratified decisions and build status

Ratified: additive "Your weeks" layer over the existing Bookshelf; a week earns
a weave at ≥ 3 pages in the same ISO week (first qualifying week is the
surprise, later weeks the gentle rhythm, thin weeks silent); all pages join
their week's weave.

Implemented and verified:
- Chronology: `KeptPage` gains optional `createdAt`; set by `composeDailyEntry`
  and the interview's `keepPage`; untimed legacy pages are best-effort parsed
  from their en-GB `date`, otherwise excluded from weaving.
- Engine: `MemoryEngineAction` extended with `weave`; the route accepts a
  `weaveSchema` (language, optional title, narrative), uses a weekly-composition
  instruction, and returns a `MemoryWeaveResult`-shaped payload.
- Client weave layer (`weekly-weave.ts`): ISO-week grouping with ≥3-page
  qualification, an honest fallback narrative (the week's own words, lightly
  shaped, deduped, chronological), a silent AI-upgrade attempt (falls back on
  503/timeout), and a localStorage cache.
- Story UI: the shelf gains a "Your weeks" entry when a qualifying week exists;
  a new `weaves` view (`weaves-experience.tsx`) lists woven weeks, opens a weave
  reader (narrative + optional earned title), and offers **"See the raw days"** —
  the week's actual pages, each opening into the existing reader (Phase 2's
  Story/As-written toggle, per-week).
- QA (local CDP at 390×844, engine unreachable): seeded three pages in one ISO
  week → shelf entry appears → woven week opens with the fallback narrative →
  raw days show all three → tapping a day opens the book reader. Zero console
  exceptions (expected 503/404 network logs only). Screenshots in `work/`:
  `p2-shelf-entry.png`, `p2-weaves-list.png`, `p2-weave-reader.png`,
  `p2-raw-days.png`; driver `work/cdp-phase2.mjs`. `tsc`, ESLint, and the full
  production build pass.

Non-goals deferred: era-volume reorganization (Phase 3), cloud weave sync,
theme-based weaving, regeneration controls, backdating weaves for pre-Phase-2
content.
