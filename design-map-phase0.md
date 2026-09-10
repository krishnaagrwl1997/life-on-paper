# Phase 0 Design Map — Navigation, shell, and the two-intent action

Scope of Phase 0 (per `implementation-roadmap.md`): make the app's shell match
the target IA before any deeper feature work. Design map to ratify before
building.

Reference ground truth:
- Design tokens: paper `#f7f1e7`, paper-raised, sheet, ink, ink-muted, action
  terracotta, ceremonial gold, Fraunces (editorial) + Inter (interface),
  `--ease-paper` motion curve, paper shadows. All already in `globals.css`.
- Brand: **Life on Paper**.

---

## 1. Design principles carried into Phase 0

1. **Three calm doors, one action.** Reading and writing are the product; the
   shell must feel like a library, not a dashboard.
2. **The center action is a fork in the road, not a destination.** "+" opens a
   quiet choice between two voices — never a bare capture screen.
3. **Private-first.** Nothing in the shell advertises sharing or community.
4. **Warm voice everywhere.** Every label is a sentence a kind person would
   say; nothing reads like a system.
5. **Invisible magic, visible calm.** No badges, counts, streaks, or "tools" in
   the shell. The few functional affordances (search, media) stay discreet.
6. **Accessible and motion-kind.** Reduced-motion respected, aria-current on
   the active door, focus-visible rings, keyboard reachable throughout.

---

## 2. The bottom shell (the biggest single change)

**Today (five slots — three doors, the center action, and a Search utility;
Profile moves out of the bar):**

```
┌────────────────────────────────────────────┐
│                                            │
│              (Today's page)                │
│                                            │
├────────────────────────────────────────────┤
│  Today   Story   ( ＋ )   People  Search   │
└────────────────────────────────────────────┘
```

**Layout note (implementation):** the effective nav grid is five columns
(`repeat(5, 1fr)`), so the bar carries five slots. The fifth slot is the
Search utility (MagnifyingGlass) rather than an empty column — two doors
left, two slots right, and the raised action dead-center. This is a small
deviation from the earlier "search lives only in Story's header" note; it was
implemented for geometry and flagged for ratification (Section 10, item 4).

- **Today** — a "today/now" mark (paper page icon or
  wordmark glyph). This door is the daily writing surface (Section 3).
- **Story** — Books icon (exists). The renamed Library, presented for now with
  its current shelf/book/reader surfaces unchanged (deep evolution is
  Phase 2/3), plus its own header search affordance (the bottom Search slot
  opens the same overlay).
- **＋ (center, raised)** — the existing emphasized action slot, now opening the
  **two-intent menu** (Section 4) instead of a raw capture flow.
- **People** — new UsersThree-based door, present but shallow in Phase 0: the
  cast gallery surface exists as an empty/ready state only, since characters
  are detected in Phase 3. Keep it calm: "The people of your book appear here
  as you write." Do not build portraits yet.
- **Search (utility slot)** — MagnifyingGlass in the fifth slot; opens the
  existing Story search overlay directly (opens Story in its `search` view).
  See the layout note above.
- **Profile is removed from the bar.** Account, settings, sign-in/out, and the
  privacy statement live behind a small avatar in the Today header (Section 3).
  Rationale: Profile is not a *door of the book*; it is account furniture.
- **Garden is removed.** Its code is parked behind a flag or deleted per
  preference; nothing in the shell references it.

**Shell behavior:**
- Active door uses the existing `nav-destination--active` marker + layout
  animation (`layoutId`), already implemented — keep it.
- Door state persists per session (don't reset Story's scroll when switching
  Today → People → back).
- The center action is reachable from any door and opens the same menu.
- aria-current="page" moves with the active door; the action button announces
  "Add a moment".

---

## 3. Today — the writing surface (new minimal surface)

Phase 0 builds the *skeleton* of Today; habit features (faint question rotation,
media-only entries, autosave polish) land in Phase 1. Keep Phase 0 Today thin
but real:

**Header:** small wordmark left ("Life on Paper" set in Fraunces); avatar
button right (opens account sheet: account summary, privacy note, sign out).

**Body — two states:**
1. **Empty (first visit):** one warm line in editorial type — *"Your book
   begins with a few lines a day."* — plus a primary action "Write today's
   lines" and a quiet secondary "Craft a memory". A tasteful hint of the
   sample-book idea may appear here later; Phase 0 keeps it minimal.
2. **Has entries:** a simple list or "today" focus — quick recent moments +
   the writing surface at top. (The *current* Home contents view — "Continue
   reading", chapter teasers — moves under Story; keep the bookmark forward in
   Today only as a small card *below* the writing surface: "Back to your book".)

**Writing affordances present from Phase 0:** a plain warm text area
(paper-raised on paper), a quiet mic chip, and a subtle image attachment
affordance — wired to the existing capture machinery but *not* opening the full
interview by default.

**Copy notes (warm voice):**
- Empty state: *"Your book begins with a few lines a day."*
- After saving (future): *"Saved. I noticed [name] — I'll remember them."*

---

## 4. The two-intent action ("＋")

Tapping the center action opens a small, quiet sheet (bottom sheet on mobile
widths; centered dialog on wider) — not a full screen.

**Options, in editorial type, each with one supporting line:**

```
             ＋  Add a moment
   ┌────────────────────────────────────┐
   │  ✎ Today's lines                   │
   │  "A few lines about today — fast." │
   ├────────────────────────────────────┤
   │  ◈ Craft a memory                  │
   │  "Guide a memory into a page of    │
   │   your book — photos, voice,        │
   │   follow-up questions."             │
   └────────────────────────────────────┘
```

- **Today's lines** → the Today writing surface, focused (the daily path).
- **Craft a memory** → the existing memory-interview capture flow, unchanged in
  Phase 0 (currently reached via the old center "+").
- Dismiss: tap outside, swipe down, or Esc. Keyboard accessible. No third
  option, no settings row, no "recent" strip — calm.
- Icons: PenNib for lines, BookOpenText/Sparkle for crafting — drawn from the
  Phosphor set already in use.

---

## 5. Story — minimal Phase 0 changes only

Phase 0 does **not** redesign reading. It only:
- Renames the door Library → Story (internal + visible label).
- Keeps the existing shelf/book/reader/studio surfaces working as-is under the
  new shell (they already carry the book language: covers, chapters, volumes).
- Adds the **search trigger** in the Story header (MagnifyingGlass, existing
  icon), opening the existing search surface (which currently filters by
  travel/people/work/feelings/lessons).
- Keeps Library's book "visibility" concepts out of sight for the private-first
  posture (they remain in the data model but are not presented as primary UI in
  Phase 0).

**Deferred to Phase 2/3:** era volumes on the shelf, weekly woven chapters,
Story/As-written toggle, reading-lamp page view.

---

## 6. People — shell + ready state only in Phase 0

- Door exists in the bar; opening it in Phase 0 shows a calm ready state:
  *"As you write, the people of your life appear here — your amma, your Rahul,
  the college group — and the app remembers them across everything you write."*
- No character data model queries yet (tables land in Phase 3); the door simply
  renders the ready state + empty illustration treatment consistent with the
  book language.
- Search within People is deferred.

---

## 7. Search — placement decision

One **search affordance** in the Story header (primary), opening a full-screen
overlay that searches people, places, phrases, and feelings later. Phase 0
reuses the existing Library search implementation behind the new trigger;
deep/feeling search is a later slice. A search affordance is not added to Today
(keeps the writing surface pure).

---

## 8. Deferral list (explicitly NOT in Phase 0)

- Journal habit features (faint question rotation, autosave semantics,
  media-only entries) → Phase 1
- Story volume/era redesign, weekly chapters, As-written toggle → Phase 2/3
- Character detection, memory graph, portraits → Phase 3
- Memory tutor, kind curation, surfacing, care → Phases 4–6
- Year-end book → Phase 7
- First-run animation & sample book → later onboarding slice

---

## 9. Build shape for Phase 0 (for the implementation slice)

1. `nav-shell.tsx`: destinations → Today / Story / People; center action opens
   the intent sheet (component `add-moment-sheet.tsx`); Profile/Garden removed
   from the bar.
2. New `today-experience.tsx` skeleton with header + empty/has-entries states +
   avatar account sheet; wire existing capture entry points behind the two
   intents.
3. `home-experience.tsx` becomes the Today host; Library content moves under
   Story's label; keep existing internals untouched behind the rename.
4. Search trigger in Story header reusing existing search UI.
5. QA slice on the existing preview at 390×844: all three doors, the action
   menu, Today empty state, Story rename, no Garden references.

---

## 10. Ratified decisions

1. **Profile placement:** avatar in the Today header. The bottom bar is Today /
   Story / ＋ / People; account, privacy, and sign-out live behind the avatar.
2. **Bookmark forward:** yes — once the user has written entries, Today shows a
   small "Back to your book" card beneath the writing surface.
3. **Story scope in Phase 0:** keep the existing Library shelf/book/reader
   surfaces working as-is under the Story label; the volume/era redesign lands
   in Phase 2/3.

These update the sections above where they conflict (Section 2 shell layout,
Section 3 Today body states, Section 5 Story).

### Build status (Phase 0, first slice — implemented and verified)

4. **Bottom Search slot ratified.** The fifth slot holds the Search utility
   (opens Story's existing search overlay); the bar is Today / Story / ＋ /
   People / Search. Two doors sit on each side of the raised action.
5. **Garden and Profile components retired.** `garden-experience.tsx` and
   `profile-experience.tsx` were removed (recoverable via git); account lives
   behind the Today-header avatar. Garden may return later as gift books.
6. **Verification so far:** `tsc --noEmit` clean, ESLint 0 errors, `npm run
   build` ✓, SSR smoke test shows the Today composer, all five shell slots,
   and no Garden references.

7. **Phase 0 visual QA (local CDP at 390 × 844):** the hosted public preview
   could not be republished from this environment (no OpenAI-side publish
   tooling/credentials), so QA ran against the local build with the repo's
   headless-Chrome/CDP harness instead. Programmatic layout audit: 29/29
   meaningful checks pass and zero console errors — nav slots perfectly
   symmetric with the raised action at the exact viewport center (cx=195),
   active-door markers track correctly, Today composer sits above the bar with
   paper-raised styling, the add-sheet card centers with both intents, People
   centers cleanly, Story reads "Your story", and Search opens from the bar.
   Screenshots: `work/p0-today-empty.png`, `p0-add-sheet.png`, `p0-people.png`,
   `p0-story-shelf.png`, `p0-search.png` (pixel review still worthwhile with a
   vision-capable reviewer; the current agent model cannot view images).
   Driver scripts kept in `work/`: `cdp-phase0.mjs`, `cdp-phase0-audit.mjs`.

Changed/added: `nav-shell.tsx`, `add-moment-sheet.tsx`, `today-experience.tsx`,
`account-popover.tsx`, `people-experience.tsx`, `home-experience.tsx`,
`library-experience.tsx`, `app/globals.css`.
