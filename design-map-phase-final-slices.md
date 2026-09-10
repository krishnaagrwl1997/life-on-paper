# Design Map — Final slices (era-volume shelf, whisper/reveal, monthly, cloud graph)

The four remaining roadmap items, implemented & verified as far as the local
environment allows.

## 1. Era-volume shelf
- Library groups pages into **eras** derived from page dates: "This year",
  "Last year", "Earlier" (by year), shown as chips on the Story shelf.
- Tapping an era chip filters the existing reader to that era's pages → an
  honest era-volume reading experience (no true era *detection* yet — this is
  date-band approximation until the memory graph can cluster real eras).
- Verified: shelf shows era chips ("This year", "Last year"); clicking "Last
  year" opens the reader containing that era's page.

## 2. Character whisper + first-entry reveal
- The save whisper is now person-aware: *"Saved. I noticed {name} — I'll
  remember them."* using the saved page's detected people (falls back to
  "Saved to your book."). This doubles as the first-entry magic moment.
- Implemented in `today-experience.tsx` (whisper driven by `latestPage.people`).

## 3. Monthly "your year so far"
- A Today card appears once per month when ≥5 pages exist that month:
  *"You've written N moments this month — with {people}. Your book is taking
  shape."* + woven-weeks note. "Not now" marks the month done.
- Verified: shows with ≥5 this-month pages; dismiss hides it.

## 4. Cloud sync of the memory graph
- New Supabase **migration** (`supabase/migrations/20260901000000_user_graph.sql`)
  creates `user_graph(owner_id, payload, updated_at)` + `load_my_graph` /
  `save_my_graph` RPCs; new `lib/supabase/graph.ts` client.
- Host **rehydrates** the graph on sign-in (decisions, not-today dismissed,
  care dismissed, monthly shown) and **debounce-autosaves** it on change.
- **Verification caveat:** the cloud path is not exercisable locally (no live
  Supabase / account). It requires applying the migration and signing in to
  verify. Local-first behavior is unchanged when signed out.

## Build status
- `tsc --noEmit` clean, ESLint 0 errors, production build passes (exit 0).
- QA drivers: `work/cdp-final2.mjs` (monthly + era), plus earlier phase drivers.

## Deploy / run notes
- Set in the hosting env: `AI_MEMORY_PROVIDER=gemini`, `GEMINI_API_KEY=…`,
  `GEMINI_MEMORY_MODEL=gemini-3.5-flash`.
- Apply the new Supabase migration to enable cloud graph sync.
