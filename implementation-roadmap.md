# Implementation Roadmap — Evolving "Life on Paper" into the full vision

How to take the product vision in `product-brief.md` and implement it on the
existing codebase — including every design change — without a big-bang rewrite.

---

## 0. Where we start: what already exists

The current app already implements a meaningful slice of the vision:

- Capture flows: Write / Voice / Photo / Screenshot / File, with live
  transcription (`use-live-transcription.ts`) and speech languages
  `auto / en-IN / hi-IN`.
- A real AI memory engine (`lib/ai/memory-engine.ts`,
  `lib/ai/editorial-guardrails.ts`, `app/api/memory-engine/route.ts`) whose
  rules already match the vision's voice contract: fix don't rewrite, keep
  Hinglish as Hinglish, never invent, concrete titles, language detection.
- A book data model on Supabase: pages (memories) → chapters → volumes → book
  title, with raw text and transcripts preserved (the "raw beneath" principle
  is already true).
- A Library with shelf / book / reader / search surfaces — the seed of the
  Story door.
- Onboarding, Profile, and a "Garden" community layer (being retired).

**Design consequence:** this is an *evolution* of the app, not a rewrite. The
design changes concentrate in a few places; the roadmap migrates one door at a
time and keeps the app shippable throughout.

---

## 1. Locked product decisions (from the design sessions)

1. **One shell, two ways to add (Pattern A).** Calm three-door IA — Today,
   Story, People — plus a discreet search. One shared book of the user's life.
   The center action offers two capture intents as equals:
   - *Today's lines* — the fast daily journal (habit loop, 90-second entries).
   - *Craft a memory* — the guided memoir interview (existing Add Memory:
     starter questions, follow-ups, page layouts).
   Both feed the same book; a daily fragment can later be "crafted" into a full
   memoir page. Journal and memoir are two voices, not two apps.
2. **Private-first.** Garden and public book-sharing leave the main experience.
   (Revisit later as gift books.)
3. The full vision of `product-brief.md` applies: invisible polish with user
   touch, eras + characters (individuals and groups), weekly woven chapters,
   the memory tutor, kind curation, layered care, and the year-end book.

---

## 2. Target information architecture (the design delta map)

| Today (nav: Home / Library / +Add / Garden / Profile) | Target (nav: Today / Story / People + search) |
|---|---|
| Home shows book contents | **Today**: warm writing page first; faint daily question; fast daily lines; voice; media-only days |
| Center "+" opens capture flow | Center action offers two intents: "Today's lines" and "Craft a memory" |
| Add Memory modal = memoir interview | "Craft a memory" keeps the interview as-is (secondary intent) |
| Library shelf/book/reader/search | **Story**: renamed + evolved — era volumes on a shelf, weekly woven chapters, Story/As-written toggle, reading-lamp page view |
| — (missing) | **People**: brand-new cast gallery + character/group portraits |
| Garden (public books) | Removed from main IA |
| Profile | Kept, minimal (account, settings, privacy controls) |

**Design work per door is a first-class deliverable**, not an afterthought:
each slice ships a small screen map + visual QA before/with the code.

---

## 3. Working method for every slice

1. **Design delta first:** write the 1–2 screen changes for the slice (target
   sketch against the existing component). Approve before building.
2. **Build under a flag:** new behavior behind a feature flag or an internal
   state; existing flow stays live.
3. **Schema + engine together:** never design a screen the backend can't feed.
   Add Supabase migration and engine/prompt changes in the same slice.
4. **QA with real material:** the existing preview/QA loop
   (`design-qa.md`, 390×844 capture, compare to source visual) plus a fixed set
   of real Hinglish/Hindi/English test entries that exercise language, tone,
   and grouping.
5. **Ship per slice.** The app is always green; users always have a working
   product.

---

## 4. Phases

### Phase 0 — Foundations and design baseline
*Goal: the app's shell and data spine match the target IA before feature work.*

**Design changes**
- NavShell: 5 destinations → 3 doors (Today / Story / People) + center action
  with the two-intent menu + discreet search entry. This is the biggest single
  design change; do it first and alone.
- Remove Garden from nav; retire its code paths or park them behind a flag.
- Consolidate the design language (paper/warm tokens, typography, cover styles
  "coast/linen/ink") into one shared system so new screens inherit it.
- Library renames to Story internally; Profile trims to account + privacy.
- Onboarding: align copy to the two-voice model ("a few lines a day, a book of
  your life") while still letting users set their book title.

**Data changes**
- Supabase migration: introduce entry kinds (`journal` vs `crafted`) and the
  concept of "owned by a daily moment" vs "part of a curated memoir page".
- Add empty-but-designed tables ready for later phases: `characters`,
  `character_links`, `eras`, `memory_character_links`, `memory_era_links` so
  the schema grows without churn.

**Acceptance:** new nav works, Garden gone, app builds and passes preview QA.

### Phase 1 — Today: the daily journal loop
*Goal: the 90-second daily habit works end to end.*

**Design changes**
- Home becomes Today: writing surface first, faint daily question that changes,
  continuous autosave, mic quiet at the bottom, "spark" only when stuck.
- Media-only moments: a photo or voice keepsake can be a complete entry; the
  app may add one factual contextual line, never writing for the user.
- The two capture intents in the center action: "Today's lines" (fast) and
  "Craft a memory" (existing interview, unchanged for now).

**Engine changes**
- Journal entry polish reuses existing editorial guardrails with a lighter,
  "keep almost unchanged" default register for daily lines.

**Acceptance:** write 5 Hinglish daily lines across 3 days; all save, autosave
works offline-first, media-only day saves, nothing lost.

### Phase 2 — Story: volumes, weekly weave, and the two natures
*Goal: reading becomes the book of the vision.*

**Design changes**
- Library → Story: shelf shows era volumes ("School Years", "College", "The
  Present" — current volume slightly open). Books remain for crafted memoir
  collections until eras are detected (Phase 4), then volumes reconcile.
- Weekly woven chapter presentation: surprise first chapter, then a gentle
  weekly rhythm; thin weeks produce no chapter (raw stays beneath).
- Story/As-written toggle inside a volume; reading-lamp page view.

**Engine changes**
- Weekly composition prompt (from the voice contract in the brief): first
  person, user's language, chronological with literary craft, titles only when
  earned from the user's own words, soft landings.
- Chapter only when the week has substance; pooled spans for quiet stretches.

**Acceptance:** 2 weeks of daily lines produce honest chapters; toggle shows
raw words; thin week yields no hollow chapter.

### Phase 3 — People and the memory graph
*Goal: the original promise — the app remembers characters and eras.*

**Design changes (largest new surface)**
- People door: cast gallery of individuals and groups (learned, never managed).
- Character portrait pages: where they appear; how you wrote about them across
  time; their moments; quiet milestones; group membership shifts.
- Cross-links: a character's moment jumps into the Story volume at that spot.

**Data + engine changes**
- Detection pipeline in the memory engine: per entry, extract people (with the
  existing stop-word/name hygiene), groups, places, eras; update the graph.
- Identity resolution with confidence; silent merge at high confidence; leave
  genuine forks unresolved (the tutor asks about them in Phase 5).

**Acceptance:** 10+ entries over two eras produce correct character cards and
era volumes; a Hinglish entry naming "amma" links to prior "mom" mentions.

### Phase 4 — The memory tutor and self-healing
*Goal: intelligence that learns privately.*

**Design changes**
- In-app tutor card on Today (never a push): appears only when real questions
  exist, at most weekly, batch of 2–3, Yes / No / Not sure.
- Visible reward: answering visibly heals a character page or grouping.

**Engine changes**
- Confidence-driven question selection (identity/eras/places/groups forks).
- Self-healing applies answers and later evidence to the graph continuously.

**Acceptance:** a deliberately planted wrong grouping (two "Rahul"s merged)
gets flagged as a genuine fork and heals after a Yes/No answer.

### Phase 5 — Tone, kind curation, and gentle surfacing
*Goal: the app knocks only with warmth.*

**Engine changes**
- Conservative tone engine: register per entry, never shown as labels to the
  user; uncertainty treated as neutral.
- Safe-to-surface classification (browse-only bias) + learning from soft
  dismissals ("not today").

**Design changes**
- Rare, well-timed surfacing: "this day last year" (a couple of times a week),
  monthly "your year so far" — warm/growth material only; browse-only is always
  reachable through the doors.

**Acceptance:** a joyful memory surfaces on the right cadence; a tender memory
never arrives uninvited; one "not today" teaches the app the boundary.

### Phase 6 — Layered care
*Goal: brave as well as gentle.*

- Sustained-heaviness check-in: rare, warm, non-diagnosing, with discreet
  helpline access.
- Acute-signal response: gentle, non-clinical, real region- and
  language-appropriate crisis resources shown plainly; never blocking, never
  alarmist.
- QA responsibility: keep resource lists current and local.

### Phase 7 — The year-end book
*Goal: the destination that rewards the habit.*

- Digital keepsake first: the year assembled from chapters, characters, learnings,
  and good memories; beautiful, downloadable, shareable.
- Physical print later; gift books ("a book about your father") after that.
- Built on data every earlier phase produces — which is why it is last.

### Phase 8 — Cross-cutting hardening
- Notifications: only the warm gap-nudge exists (never daily pings); quiet
  forever in one tap.
- Privacy posture: keep the app local-first in feel; be honest in UI about what
  the AI touches; never use user writing for training.
- Multilingual QA at every phase: the fixed Hinglish/Hindi/English fixture set
  must keep passing (polish, tone, grouping, tutor, care).
- Performance: long libraries, media (photos + audio keepsakes), offline-first
  saves.

---

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Design churn from migrating one door at a time | Phase 0 locks IA first; flags keep old flow alive; per-slice screen maps |
| Two capture intents confuse users | Center action wording + onboarding copy; observe which intent wins and simplify later |
| Memory graph accuracy disappoints | Conservative confidence; tutor only at real forks; visible healing; browse-only default |
| Hinglish quality regressions | Fixed multilingual fixture set run in QA at every phase |
| Feature creep on care/curation | Curation and care ship behind the same guardrails as everything else: rare, warm, private |
| Cloud-vs-local trust story | Honest UI about processing; keep "never train on user writing" as a hard line |

---

## 6. Suggested immediate next steps

1. **Ratify this roadmap** (adjust phases or order if you disagree).
2. **Phase 0 kickoff** — smallest first slice: the nav change (5 → 3 doors +
   two-intent center action) with its screen map, under a flag, then preview QA.
   This is the single highest-leverage design change and everything else hangs
   off it.
3. Work slices in order; revisit the plan after Phase 2 with real usage.
