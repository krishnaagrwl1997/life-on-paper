# Life In Books — Easy First-Use UX Audit

Date: 16 July 2026  
Viewport tested: 390 × 844  
Scope: onboarding → first memory → guided reflection → chapter placement → generated page → library → reading → garden

## Executive conclusion

The visual direction is already distinctive, warm, and premium. The usability problem is structural: the app presents too many stages, labels, choices, and navigation options before the user experiences the core promise—speaking or writing one moment and seeing it become part of a book.

The strongest direction is a simplification pass, not a visual reinvention.

## Recommended product model

### Primary navigation

Use four balanced destinations:

1. Home
2. Library
3. Add Memory — elevated center action
4. Profile

Move Garden out of the primary navigation. It is a secondary discovery/community experience and can live inside Profile or Library as “Discover lives.”

Replace the top-right profile avatar with a clear “For you” entry that resurfaces short moments from the user’s own life. This should feel like a small personal note, not a notification center.

Example: “Two years ago, you wrote about choosing the longer road.”

### First-use flow

Reduce the core journey to three understandable beats:

1. Share a moment — type, speak, or add a photo.
2. Shape the memory — one or two contextual questions, with feeling asked only once.
3. Place and create — suggest one chapter, explain why in one sentence, then generate the page.

Ask for optional Google sign-in only after the first page is saved, when the benefit of keeping and syncing the book is concrete.

## Flow findings

| Step | Current state | Finding | Recommendation |
| --- | --- | --- | --- |
| 1. Welcome | Needs simplification | Strong visual tone, but five-step progress and long introduction signal work before value. | Let the user begin a memory immediately; keep onboarding to one short introduction. |
| 2. Capture preferences | Remove from onboarding | Users must predict how they will use the app before trying it. | Learn preferences in context through the composer. |
| 3. Optional account | Move later | Clear and honest, but still delays the first meaningful result. | Present after the first page is saved. |
| 4. Home | Strong | The reflection prompt and composer are clear. The book card and four-way nav still compete with the first task. | Prioritize one question, one composer, and one quiet “For you” note. |
| 5. First follow-up | Confusing | Multiple progress labels, repeated original text, feeling grid, answer box, and competing actions create form-like density. | Show one focused question. Collapse the original memory. Use “Continue” and a quiet “Finish here.” |
| 6. Second follow-up | Repetitive | The contextual question works, but the full feeling grid repeats. | Ask or confirm feeling once; use two follow-ups by default. |
| 7. Chapter placement | Needs compression | Too many headings and hierarchy details obscure a simple decision. | “I’d place this in [Chapter]” + one-sentence reason + “Place here” / “Choose another.” |
| 8. Page assembling | Strong | The physical page-building metaphor is distinctive and on-brand. | Preserve it; hide global navigation during the transition. |
| 9. Page ready | Confusing | The state opens at retained scroll position and presents several decisions around the preview. | Reset to the top. Use a focused preview with “Keep page” and a secondary layout option. |
| 10. Page saved | Mostly clear | Confirmation works, but repeats the full preview and continues the long page. | Show a compact completion card: “Read it” and “Add another memory.” |
| 11. Library | Strong visual, weak priority | The large book hero pushes the latest page and primary reading action below the fold. | Put “Continue reading” and the newest page above the fold. |
| 12. Book interior | Too much preamble | Book Studio and large headings delay the contents. | Lead with “Continue reading,” then contents. Move Studio into book settings. |
| 13. Reading view | Strongest screen | This is closest to the desired Kindle feeling; title truncation and control placement need polish. | Keep the reading canvas. Add tap zones, bottom progress, appearance controls, and lamplight mode. |
| 14. Garden | Good secondary feature | Visually appealing, but not part of the daily capture/read loop. | Move it under Profile or Library as a discovery feature. |

## Highest-priority issues

### P1 — blocks clarity or task completion

- The persistent bottom navigation covers controls and content during the guided flow, chapter placement, and page preview.
- Progress is expressed in conflicting ways: onboarding steps, “Explore 2 of 4,” “Prompt 1 of up to 3,” and page-generation stages.
- Onboarding asks for preferences and account setup before demonstrating the core value.
- Page-generation state changes retain the old scroll position, so the next screen can appear cropped or incomplete.
- Several screens present two or more equally prominent actions without a clear recommended path.

### P2 — adds friction and cognitive load

- The feeling selector repeats on every follow-up.
- Book → Volume → Chapter details appear before they are needed.
- Library and book screens prioritize decorative framing over the next reading action.
- The current top-right profile button has no visible result when activated.
- Garden occupies scarce primary navigation space despite being a secondary behavior.

## Accessibility and responsive risks

- The fixed bottom navigation obscures interactive controls and could also hide keyboard focus.
- Several all-caps labels and small metadata lines may be difficult to read against warm ivory.
- Multiple simultaneous progress labels make orientation harder for screen-reader users.
- Feeling buttons expose selected state, and most targets appear appropriately sized; keep these strengths.
- The reading page has a solid semantic article structure, but keyboard, screen-reader, zoom, and reduced-motion behavior still require dedicated testing.

## Recommended implementation order

1. Navigation simplification: Home, Library, centered Add Memory, Profile; add top-right “For you”; hide global nav in focused flows.
2. First-use simplification: one short welcome, immediate memory capture, optional account after first save.
3. Guided-flow simplification: one progress model, contextual questions, feeling once, compressed chapter placement.
4. Reading hierarchy: latest memory above the fold in Library; polish the Kindle-style reader.

This order fixes orientation first, then reduces effort, then polishes the reading experience without abandoning the existing visual direction.
