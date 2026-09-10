# Phase 3 Design Map — People & the memory of characters

Scope per `implementation-roadmap.md` Phase 3 (People door and the memory
graph), scoped as: characters are detected and remembered on every page, the
People door becomes a real cast gallery with portraits, and identity is grouped
sensibly — with era-volume *reorganization* of the Bookshelf still deferred to
the era slice (Phase 4+) as agreed in the Phase 2 map.

## 1. Ground truth in the code

- Pages (`KeptPage`) carry no person data today. The engine's
  `MemoryPageResult.signals.people` exists but is discarded on save.
- Solid extraction helpers already exist: `detectPersonName` (private to
  `memory-interview.tsx`, usable where pages are composed) and the exported
  `groundMemory(memory, answers, emotions)` in `editorial-guardrails.ts`
  (usable anywhere, engine-free).
- The People door is a static ready-state (`people-experience.tsx`); the host
  already has `openLibraryAt("reader", pageId)` to open any page in the reader.

## 2. The model (local-first, honest)

A **person remembered on a page** is a first-class, persisted thing:
- `KeptPage` gains optional `people?: string[]` (and the compose/upgrade paths
  fill it — engine signals when available, local detection otherwise). No
  migration needed: older pages fall back to read-time detection.
- The People door **derives the cast from the pages on open** (like the weave
  layer): no new database in this phase; identities become durable objects only
  when the tutor formalizes them (Phase 4/5).

## 3. Detection

- **Primary (engine):** `signals.people` from the page action is persisted.
- **Fallback (engine-free):** local detection on `originalText`/body using the
  existing name hygiene (never a discourse opener, never a bare weekday/place,
  case-aware) — runs in `composeDailyEntry` at save and at read time for older
  pages.
- **Identity grouping (Phase 3 approximation):**
  - Family-role aliases merge into one character: *mom / mummy / amma /
    mother / maa*, *dad / papa / father*, *bhaiya / brother*, *didi / sister*,
    etc.
  - A proper name matches case-insensitively across entries ("Rahul" in school
    entries and work entries is treated as one Rahul until the tutor can tell
    them apart — Phase 4/5 asks at real forks).
  - Distinct two-Rahuls, alias ambiguity, and group membership become **tutor
    questions later**; Phase 3 records them as low-confidence but never asks.
- **Groups:** phrases like "college friends", "the cousins", "the team" are
  recognized as group characters of their own (engine-free list + engine
  `themes` when available).

## 4. The People door (UI)

- Gallery (individuals and groups together): each character card shows the name
  the app has learned, mention count, the era/volume where they appear, and
  when they were last written about; new-ish mentions are marked softly. No
  management controls.
- Portrait (tap a character): name (+ alias hint like "also mom"), the volumes
  they appear in, **Their moments** (newest first, each opening the exact page
  in the Story reader), and **quiet notes** — first mention date, longest
  silence, return — computed from the pages. Group portraits show the same
  shape plus the pages that mention the group.
- Cross-link principle: a character's moment opens Story at that page — the
  doors stay connected.
- Empty states keep the current calm copy; when pages exist but no people have
  been noticed yet, the door gently explains that people appear as you write.

## 5. Non-goals for Phase 3 (later phases)

- Era detection and Bookshelf volume reorganization → era slice (Phase 4+).
- The memory tutor, confidence-driven identity questions, and permanent
  identity objects → Phase 4/5.
- Tone/feeling arcs on portraits ("how you wrote about them") → tone slice
  (Phase 5/6).
- Backend persistence of a character graph (cloud) → after the local model
  proves itself.

## 6. Build shape

1. `memory-interview.tsx`: `KeptPage.people?`; `composeDailyEntry` detects and
   stores; `upgradeKeptPageWithAi` persists `signals.people`; interview
   `keepPage` stores them too.
2. New `components/system/people-intel.ts`: shared extraction/aggregation —
   normalize + alias-merge identities, detect groups, aggregate cast + portrait
   data (moments, volumes, first/last dates, gaps) from pages.
3. `people-experience.tsx`: upgraded from ready-state to gallery + portrait with
   internal navigation; new props `pages` and `onOpenPage`.
4. `home-experience.tsx`: pass `savedPages` and `onOpenPage` →
   `openLibraryAt("reader", pageId)`.
5. CSS for the gallery and portrait surfaces (existing paper palette).
6. QA: pages mentioning "amma"/"mom" and "Rahul" across entries render one
   merged character; tapping a moment opens the correct page in the reader;
   engine-unreachable path uses fallback detection with zero errors.

## 7. Decisions to ratify

1. **Detection trust:** engine-first with local fallback persisted on each page
   (recommended) vs. local-only detection for this phase.
2. **Identity grouping:** alias-merge family roles + case-insensitive names now,
   with real identity resolution left to the tutor (recommended) vs. exact-name
   grouping only (never merges "amma"/"mom").
3. **Groups:** recognize group phrases as characters now (recommended) vs.
   individuals only until the engine can name groups reliably.

## 8. Ratified decisions and build status

Ratified: engine-first + local fallback; alias-merge + name matching; groups
recognized as characters now.

Implemented and verified:
- Pages remember people: `KeptPage.people?` is set by `composeDailyEntry`
  (local detection), the interview's `keepPage` (engine signals + local), and
  the silent AI upgrade (persists `signals.people`, cleaned of discourse
  words). Older pages fall back to read-time extraction via `groundMemory`.
- New `people-intel.ts`: alias normalization (amma/mom/mummy/mother, etc.),
  group-phrase recognition, cast aggregation (moments, volumes, first/last
  dates) with merge-on-repeat identity grouping.
- People door (`people-experience.tsx`) is now a real surface: cast gallery
  (People + Groups) with alias hints, and portraits showing where they appear,
  their moments (each opening the exact page in the Story reader via the host),
  and quiet notes (first written, last written, longest quiet stretch).
- QA (local CDP at 390×844): seeded pages mentioning "Amma" and "Mom" render
  one **Mom** character (alias "also Amma", 2 moments, 3 quiet notes), "Rahul"
  as a person, "College friends" as a group; tapping a moment opens the right
  page in the reader. Zero console exceptions. Screenshots in `work/`:
  `p3-cast.png`, `p3-portrait.png`; driver `work/cdp-phase3.mjs`. Known
  heuristic quirk: `groundMemory` can occasionally read a plural noun (e.g.,
  "the whole team") as a person name — the tutor's identity resolution
  (Phase 4/5) is where these get refined. `tsc`, ESLint, and the full
  production build pass.

Known deviation note: two Mom-canonical pages each push their own raw variant,
so the alias list may include the canonical name itself; the UI filters it
when showing the "also …" hint. Era-volume reorganization remains deferred as
planned (era slice, Phase 4+).
