# Design Map — Redesigned onboarding (first-run)

The rich first-run from the vision, previously deferred in the Phase 0 map's
deferral list. Ratified scope: **full** (cinema intro + sample book + language +
title, landing on Today).

## Flow (one-screen on boarding shell)

1. **Intro (cinema):** a life forming into a book — three ordinary daily lines
   appear, then a chapter heading, then a woven sentence, then a book spine
   ("Volume One") grows. Staggered Framer-Motion; auto-advances (or **Skip**).
2. **Sample book glimpse:** a mock cover ("Book One / The Life I'm Becoming")
   beside a woven-page sample — *"This is what your words become."*
3. **Language:** *"What language do you write in?"* → English / Hindi / Hinglish
   (a natural mix). Stored to `life-in-books-writing-language`. Includes a quiet
   **Continue with Google** for account privacy.
4. **Book title:** a working title (default "My Life on Paper"), **Begin your
   book** → completes onboarding and lands on Today.

## Build status (implemented & verified)

- `onboarding-experience.tsx` rewritten as the 4-step flow with Framer-Motion
  transitions, reduced-motion aware autosteps, and persisted language.
- New CSS block (`.onboarding-new`, `.ob-*`).
- Interface unchanged (`onComplete(title)`, plus the auth props), so the host
  needed no change; `Today` is the landing surface.
- QA (local CDP): fresh state → intro shown → Skip → sample → Continue →
  language (Hinglish stored) → title ("Summer of Firsts" stored) → **Begin** →
  Today composer; onboarding-complete & book title persisted. Zero console
  exceptions. Screenshots in `work/`: `onb-intro.png`, `onb-glimpse.png`,
  `onb-language.png`; driver `work/cdp-onboarding.mjs`.
- `tsc`, ESLint, and the full production build pass.

## Related fixes in the same review round

- Avatar → full **Profile screen** (account, book, sign in/out, privacy) added.
- The one-time "before/after" reveal remains engine-driven (only meaningful
  when the AI is configured); typed daily lines use the light local shaping.

## Deferred / notes

- A character whisper ("I noticed amma — I'll remember them") after the first
  save is a small follow-up.
- The first-entry *before/after* reveal only appears when a transformation is
  dramatic (voice), consistent with the design.
