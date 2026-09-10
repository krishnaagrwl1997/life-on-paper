# Phase 6 Design Map — Layered care (sustained-heaviness check-in + acute resources)

Scope per `implementation-roadmap.md` Phase 6. This is safety-adjacent, so the
design is deliberately conservative: warm and human, never clinical, never
blocks writing, never diagnoses, never retained beyond local flags.

## 1. Ground truth in the code

- The **tone engine** (`tone.ts`, Phase 5) already classifies each page
  (`warm / light / neutral / heavy`) via a lexicon, client-side.
- Today already hosts the composer, surfacing card, tutor card, and profile —
  a natural home for care cards.
- Storage is local-first (`life-in-books-*`); no page content leaves the device
  (classification is entirely client-side).

## 2. Two layers

**Layer A — sustained-heaviness check-in (rare, warm, non-diagnosing):**
- When several recent pages read heavy (e.g., **≥ 3 heavy pages within the last
  14 days**), offer a gentle check-in on Today, at most once every couple of
  weeks. Copy stays human and unlabelled: *"I've noticed you've been writing
  about heavy things lately. I'm here for all of it — and sometimes, when it
  gets too heavy to carry alone, talking to someone real can help."* With a
  discreet **"see places that can help"** that opens the resources list.
- Never a diagnosis, never an alarm. Dismissible; not repeated for a while.

**Layer B — acute-signal response (immediate, gentle, real resources):**
- The tone layer scans for **strong, explicit crisis language** (self-harm /
  suicide intent phrasing) in a page's text. On a hit, Today shows a more
  direct, still gentle card: *"What you're carrying sounds like more than any
  one person should hold alone. Please reach out to someone who can be with you
  right now — here are real people who answer."* with **actual helplines listed
  plainly**.
- Conservative matching: only unambiguous phrases (e.g., "want to die",
  "end my life", "hurt myself", "no reason to live") — never "I miss you",
  "that hurt", "tired", or "alone" (those stay in Layer A or neutral).
- **Never blocks writing**, never lectures, never overstates certainty, never
  escalates externally. The user always stays in control.

## 3. Resources

- A curated, **region- and language-aware** helpline list in a small constant
  (clearly noted as needing periodic verification):
  - **India (primary, given Hinglish):** KIRAN 1800-599-0019; iCall
    (+91-9152987821); Vandrevala Foundation (+91-9999666555).
  - **Global:** 988 (US), Samaritans 116 123 (UK), plus a note to call local
    emergency services.
- Shown plainly, labelled, never as a wall of text; a quiet "sign out / close"
  is always available. The app never fabricates numbers and keeps the list
  maintainable (a single exported constant).

## 4. Privacy & safety boundaries

- Classification is **client-side only**; nothing about a page's tone is
  persisted beyond local flags (last check-in time, dismissed states). No cloud,
  no sharing.
- The app never attempts to diagnose, never claims urgency it can't know, never
  prevents the user from writing, and never contacts anyone automatically.
- If the user dismisses a care card, it stays away (same lesson as kind
  curation).

## 5. Build shape

1. `tone.ts`: add `detectSustainedHeaviness(pages, now)` →
   `{ active: boolean; lastCopyUsed: string }` gated by a
   `life-in-books-care-checkin` last-shown timestamp; and
   `detectAcuteSignal(text)` → boolean (explicit phrasing + negation-avoidance).
   Plus `careResources` constant and `lastCareShown()` / `markCareShown(kind)`.
2. `home-experience.tsx`: compute care state for Today (both layers, honoring
   cadence/dismissals), render care cards, and a `dismissCare(kind)` handler.
3. `today-experience.tsx`: render **check-in** and **acute** cards with the
   warm copy, a "see places that can help" → resources list, and a quiet
   dismiss. Resources shown as a plain, labelled list.
4. CSS for the two cards.
5. QA: 3 heavy recent pages → check-in appears (once); 1 acute-phrase page →
   acute card with resources appears; dismissing suppresses repeats; no console
   errors. (No real crisis content is used in tests — only neutral test
   fixtures.)

## 6. Non-goals

- No therapy, diagnosis, triage, or clinical claims.
- No retention of tone/crisis data beyond local flags.
- No automatic external notifications/alerts.
- Monthly "your year so far" review, and cloud graph → later.

## 7. Decisions to ratify

1. **Scope:** check-in + acute resources (recommended) vs. check-in only vs.
   acute only.
2. **Resource set:** region-aware (India + global) curated, with a verification
   note (recommended) vs. global-only vs. let the app prompt you to add one.
3. **Cadence/urgency:** check-in after ≥3 heavy pages in 14 days, at most every
   couple of weeks, once dismissed stays away; acute is immediate but
   non-blocking (recommended) vs. more frequent check-ins.

## 8. Ratified decisions and build status

Ratified: check-in + acute resources; region-aware curated list; conservative
cadence (≥3 heavy pages in 14 days; dismissal suppresses permanently; acute is
immediate but non-blocking).

Implemented and verified:
- `tone.ts`: `CareKind`, `careResources` (India: KIRAN 1800-599-0019, iCall,
  Vandrevala; Global: 988, Samaritans 116 123), `detectAcuteSignal` (only
  explicit phrasing), `detectSustainedHeaviness` (≥3 heavy pages in 14 days),
  and the care dismissed store.
- `home-experience.tsx`: computes the care card for Today (acute first), holds a
  dismissed set, `dismissCare(kind)` persists.
- `today-experience.tsx`: renders the **check-in** card ("I'm here." + "See
  places that can help" toggle) and the **acute** card ("You're not alone" with
  helplines listed plainly), each with a quiet dismiss. Never blocks writing,
  never diagnoses.
- QA (local CDP): 3 heavy recent pages → check-in appears; dismissing persists
  (`['checkin']`) and removes it; adding an acute-phrase page → acute card with
  5 resources (KIRAN present); dismissing persists. Zero console exceptions.
  Driver `work/cdp-phase6.mjs`.
- Note: gating is by dismissal only (no last-shown timestamp) so the card stays
  visible while the condition persists and only leaves on dismissal or when the
  content lightens — matching "once dismissed stays away".
- Build (production), `tsc`, and ESLint pass.

Deferred as agreed: monthly "your year so far" review, cloud graph. Resources
list is a single constant; verify numbers periodically (marked in code).
