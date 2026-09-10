# Phase 1 Design Map — The daily writing moment (Today habit loop)

Scope per `implementation-roadmap.md` Phase 1: make Today the place where a
daily line becomes a page of the book *directly and quietly* — no guided
interview in the middle — with the polish applied as invisible magic, and a
graceful fallback when the AI engine is unavailable (it currently returns 503
without an API key).

## 1. The change in one sentence

Today: you type a few lines, press **Shape into a page**, and the page simply
*exists* in your book — lightly shaped, in your voice, saved on device (and
account), with the deeper AI polish arriving quietly in the background.

## 2. Behavior today vs. Phase 1 target

| | Today (Phase 0) | Phase 1 target |
|---|---|---|
| Typed lines in the composer | "Shape into a page" drops you into the guided interview | Saved instantly as a page of the book; no interview screen |
| Polish | Happens interactively in the interview | Light local shaping first (voice kept, almost-unchanged); AI title/reflection/layout/placement upgrade applied silently after save when the engine is available |
| Engine down (503 / timeout) | Interview falls back after waiting | Composer save never blocks: local shaping is the primary path; upgrade is best-effort and invisible |
| Feedback after save | Full capture screen | Quiet whisper + composer clears; latest-page card refreshes ("Back to your book") |
| Voice / photo days | Chips route to the existing capture flow | Unchanged for Phase 1 (both already produce pages; inline dictation and media-only *daily* semantics are later slices) |
| Where the page lives | Book with chapters/volumes from placement | Same — one book, same placement machinery; no new "kind" field in Phase 1 (journal and crafted pages coexist as pages) |

## 3. The pipeline (reusing existing seams)

All of the shaping machinery already exists privately in
`memory-interview.tsx`: `structureStoryDraft`, `shapeVoice`,
`titleForMemory`, `recommendPlacement`, `recommendLayout`,
`requestMemoryEngine`, and `refineKeptPageWriting`. Phase 1 exports a small,
focused API from that module and drives it from Today:

1. **`composeDailyEntry(text)`** → returns a `KeptPage` synchronously-ish,
   built from the user's own words:
   - Body = structured paragraphs from the daily lines (light,
     almost-unchanged shaping; single-line days stay honest rather than being
     inflated).
   - Reflection = the closing line in the user's voice (or empty when the day
     is just a line).
   - Title = from the lines via the existing `titleForMemory` rules (concrete,
     never a bare discourse word).
   - Placement = current book, via existing `recommendPlacement` rules.
   - Layout = `story`/`little-things` style default chosen by the existing
     `recommendLayout`.
2. **Save immediately** to the host (device list + cloud upsert via existing
   `saveCloudPage`), mirroring `keepPage` today.
3. **Whisper**: *"Saved to your book."* — plus a gentle second beat when the AI
   upgrade later names a person or places it: *(future whisper hooks, Phase 4)*.
4. **`upgradeKeptPageWithAi(page)`** (background, non-interactive): calls the
   engine's `page` action once with the lines; on success maps the result onto
   the saved page (title/reflection/clean body/layout/placement) and updates it
   in place through the host. On failure/timeout: nothing changes — the local
   version stands. Never blocks the user; never shows an error for this.
5. Composer clears on save; **Back to your book** card reflects the newest
   page; draft autosave continues for the next write.

## 4. Design notes (feel)

- The save must feel like *closing a diary*, not submitting — no spinner
  gate; the whisper is the only acknowledgement.
- If the day is one honest line, the resulting page is small and true — no
  padding to make it "chapter-worthy" (same thin-week honesty principle).
- Hinglish/Hindi/English detection rides the existing language rules; shaping
  never translates.

## 5. Non-goals for Phase 1 (later slices)

- Inline voice-to-text *inside* the composer (voice still routes to the
  existing flow).
- A separate "journal entry" object model / kind field and distinct diary
  reading (Phase 1 keeps one book; weekly weave arrives in Phase 2 and can
  treat all pages by date).
- Media-only *daily* moments as first-class (photo/voice days already exist via
  the capture flow; "photo with one contextual line" semantics is a later
  slice).
- People/timeline detection wiring into saved pages (Phase 3).

## 6. Build shape

1. `memory-interview.tsx`: export `composeDailyEntry` + `upgradeKeptPageWithAi`
   (thin wrappers over existing private helpers; no behavior change to the
   interview).
2. `home-experience.tsx`: Today's `onShapeIntoPage` now calls the composer API
   and saves via the existing `keepPageInLibrary` path; add an in-place update
   helper (like `commitLibraryPages` but single-page, no full-list round trip)
   for the background AI upgrade; keep whisper state reusable.
3. `today-experience.tsx`: post-save behavior (clear + whisper surface +
   latest-card refresh); loading-free save affordance wording stays "Shape into
   a page".
4. QA slice: composer save with engine unreachable (503) → page saved, readable
   in Story; with engine reachable → page silently upgraded. Real Hinglish
   lines fixture.

---

## 7. Ratified decisions and build status

Ratified: instant save + silent AI upgrade; soft whisper + refresh; very short
days save as small pages (single line is a valid page).

Implemented and verified:
- `memory-interview.tsx` now exports `composeDailyEntry(memory)` (builds a
  `KeptPage` with light almost-unchanged shaping, concrete title rules,
  existing placement/layout logic, version 6) and
  `upgradeKeptPageWithAi(page)` (best-effort engine `page` call; maps title /
  reflection / body / layout / placement onto the saved page; returns null on
  failure or timeout — never throws).
- `home-experience.tsx`: `saveDailyEntry` composes → adds to the book silently
  (device + cloud upsert, no notices) → fires the background AI upgrade that
  patches the page in place.
- `today-experience.tsx`: "Shape into a page" now saves instantly, clears the
  draft, and shows a soft "Saved to your book." whisper (`role="status"`).

QA (local CDP at 390×844, engine unreachable): typed Hinglish lines → saved
page in one step with 3 paragraphs, concrete title, placement, original text
preserved; no capture screen; whisper shown; page intact after the silent
engine-failure window; zero console exceptions (expected network 503/404 logs
only). Screenshot: `work/p1-saved-daily.png`; driver `work/cdp-phase1.mjs`.
Pixel review with a vision-capable reviewer is still worthwhile.
