# Phase 4 Design Map — The memory tutor & self-healing

Scope per `implementation-roadmap.md` Phase 4 (memory tutor & intelligence):
the app stops guessing and starts *learning* — it asks only at genuine forks
(batched, weekly, optional), applies what you confirm immediately, and keeps
that knowledge privately so the cast gets truer over time. Era-volume *visual*
reorganization of the bookshelf is a deliberately separate next slice (so the
tutor can be built and proven first).

## 1. What already exists (Phase 3)

- Characters are detected and merged into a cast via `aggregateCast(pages)`
  (alias-merge for kinship, case-insensitive names, group phrases).
- Pages store `people`; older pages fall back to read-time detection.
- The People door shows the gallery + portraits.
- There is **no memory of "what the user confirmed"** — the cast is recomputed
  purely from page text each time.

## 2. The memory store (private, local-first)

A single persisted decisions object under `life-in-books-memory-decisions`:

```ts
type MemoryDecisions = {
  // "this canonical person is actually N distinct people"
  split?: Record<canonicalKey, string[]>;
  // "these canonical people are the same person (user said yes)"
  mergedInto?: Record<canonicalKey, string>;
  // "this person belongs to this group"
  groupMembers?: Record<groupKey, string[]>;
  // "already asked / not sure" markers so the tutor never repeats
  answered?: Record<questionKey, "yes" | "no" | "not-sure">;
};
```

`aggregateCast(pages, decisions?)` reads these overrides before/while grouping,
so a confirmed split (two Rahuls) or merge (amma/Amma = Mom) is applied
immediately and permanently. Everything stays local-first; the graph becomes a
cloud object only in a later phase.

## 3. The tutor: when it asks

Conservative and rare, as the vision demands. A question is generated only when
local heuristics find a **genuine fork**:

- **Same-name different world:** one canonical name appears across clearly
  different volumes/eras (e.g., "Rahul" in a Journeys volume *and* a People
  volume) → *"I've noticed two different Rahul's in your story — one from a
  journey, one from a conversation. Same person?"* (Yes / No / Not sure).
- **Group membership:** a named person appears both with a group phrase and
  without, across pages → *"Is Rahul part of your college friends?"* (Yes / No
  / Not sure).
- **Unresolved alias:** (only when detection is genuinely ambiguous — rare;
  otherwise silent).

The tutor **never asks about feelings**, never asks for organizing work, and
never asks when it's already confident. It holds questions and releases them
**at most once a week, in a batch of 2–3**, as a gentle in-app card on Today —
**never a push notification**. Silent weeks stay silent. "Not sure" is always
safe and is recorded so the question isn't repeated.

## 4. The tutor card (Today)

- Appears beneath the composer, calm and small: a warm line + 2–3 confirmations
  with **Yes / No / Not sure**, plus a subtle dismiss.
- If a question feels wrong, the user can dismiss freely; it stays recorded so
  it won't nag.
- Copy is factual and warm, never quiz-like: *"A quick memory check — to keep
  your story accurate."*

## 5. Self-healing

- Every answer is applied to `aggregateCast(pages, decisions)` **immediately**,
  so the People door updates in place (a "No" splits the character, a "Yes"
  merges or binds membership, "Not sure" pins it as unresolved and stops
  re-asking).
- New pages keep flowing in; the decision store only ever adds, so the cast
  gets *more* correct over time, not less.

## 6. Build shape

1. `people-intel.ts`: `aggregateCast(pages, decisions?)` honours
   `split` / `mergedInto` / `groupMembers`; plus `detectTutorQuestions(pages,
   decisions)` returning the ≤3 genuine forks; plus
   `loadMemoryDecisions()/persistMemoryDecisions()` and `answeredKey()`.
2. `home-experience.tsx`: own the decisions state (load once, pass into the
   People door and the Today tutor); a `applyTutorAnswer(question, answer)`
   that persists and bumps a refresh signal so both surfaces update instantly.
3. `today-experience.tsx`: render the tutor card (props: `tutorQuestions`,
   `onTutorAnswer`, `onTutorDismiss`); only when ≤3 real questions exist and
   the week hasn't been asked yet.
4. `people-experience.tsx`: accept `decisions` and pass through to
   `aggregateCast`; show a subtle "resolved" state when a question has been
   answered (optional polish).
5. CSS for the tutor card.
6. QA: seed two "Rahul" contexts across different volumes → tutor asks "same
   person?"; answering "No" splits into two Rahuls; "Yes" merges; "Not sure"
   suppresses repeat. Group-membership question same pattern.

## 7. Non-goals for Phase 4

- Bookshelf/era-volume **visual** reorganization → dedicated next slice
  (data for it — decisions, page dates — is now available).
- Tone/feeling arcs on portraits and kind curation → Phase 5.
- Cloud sync of the graph, and engine-only identity resolution (the engine's
  `signals` still feed base detection; the tutor resolves the rest).
- Layered care for sustained heaousness → Phase 6.

## 8. Decisions to ratify

1. **Scope:** Phase 4 = tutor + self-healing only, with era-volume
   reorganization as its own next slice (recommended — build & prove the tutor
   first, then reorganize the shelf) vs. bundle both into Phase 4.
2. **Tutor placement/cadence:** weekly in-app card on Today, batch ≤3, silent
   weeks silent, never a push (recommended) vs. show a question whenever one
   exists regardless of the week vs. also surface on the People door.
3. **Question types now:** same-name-across-volumes + group membership
   (recommended — the only forks local heuristics can detect reliably) vs.
   identity-merge questions only vs. also try era/place forks.

## 9. Ratified decisions and build status

Ratified: tutor + self-healing only (era-volume reorganization is its own next
slice); weekly in-app card on Today, batch ≤3, silent weeks; question types =
name split + group membership.

Implemented and verified:
- `people-intel.ts`: `MemoryDecisions` store (`split` / `mergedInto` /
  `groupMembers` / `answered`) with `loadMemoryDecisions` / `persistMemoryDecisions`;
  `aggregateCast(pages, decisions?)` now honours splits (a confirmed "different
  people" separates a canonical name per world/volume) and merges; plus
  `detectTutorQuestions(pages, decisions?)` returning the ≤3 genuine forks
  (name-across-volumes splits, and group-membership when a person's volume
  overlaps a group's), never for family aliases, honoring already-answered keys.
- `home-experience.tsx`: owns the decisions state, computes tutor questions for
  Today, gates the card to once per ISO week (`tutorWeekKey`), and applies
  answers (`tutorAnswer` / `tutorDismiss`) which persist decisions and bump the
  People door to update instantly.
- `today-experience.tsx`: renders the tutor card (Yes / No / Not sure +
  dismiss) beneath the composer.
- `people-experience.tsx`: accepts `decisions` and passes it to `aggregateCast`.
- QA (local CDP): a person "Rahul" appearing in two different volumes triggers
  the split question on Today; answering **No** splits it into two Rahul
  characters in People; "Not sure" and answered keys suppress re-asks; group
  membership candidates surface too. Zero console exceptions. Screenshots in
  `work/`: `p4-tutor.png`, `p4-split-people.png`; driver `work/cdp-phase4.mjs`.
- Known heuristic note (unchanged from Phase 3): the engine-free fallback can
  read a plural noun as a person (here surfaced as an extra "Is Team part of
  College friends?" candidate) — the tutor and identity resolution refine this
  over time, and is harmless because it's a question, not a conclusion.

Deferred as agreed: era-volume shelf reorganization (its own slice), tone/kind
curation (Phase 5), layered care (Phase 6), cloud graph sync (later).
