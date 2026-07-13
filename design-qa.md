# Design QA — Life In Books Memory Interview

- Source visual truth: `/Users/krishna/Downloads/(4) 主页 _ X.jpeg`
- Approved Home baseline: `/Users/krishna/Documents/Codex/2026-07-13/sites-plugin-sites-openai-bundled-build/work/qa/home-mobile-final.png`
- Mobile capture: `/Users/krishna/Documents/Codex/2026-07-13/sites-plugin-sites-openai-bundled-build/work/qa/interview-capture-mobile.png`
- Mobile summary: `/Users/krishna/Documents/Codex/2026-07-13/sites-plugin-sites-openai-bundled-build/work/qa/interview-summary-final-mobile.png`
- Desktop capture: `/Users/krishna/Documents/Codex/2026-07-13/sites-plugin-sites-openai-bundled-build/work/qa/interview-capture-desktop.png`
- Viewports: 390 × 844 mobile; 1280 × 900 desktop
- States tested: capture, voice recording, questions 1–3, early finish, summary, and saved confirmation

## Full-view comparison evidence

The source reference and the final mobile capture were opened together for direct comparison. The implementation carries forward the reference's bold mobile hierarchy, segmented controls, strong content card, and floating navigation while translating it into the approved warm, editorial memoir system. The dark social-feed treatment was intentionally not copied because this product is a private documentary interview rather than a public feed.

## Required fidelity surfaces

- Typography: Fraunces is reserved for the interview prompt and reading content; Inter is reserved for controls, labels, and progress. The headline remains dominant without crowding the capture controls at 390 px.
- Spacing and layout: The capture state fits the prompt, all five input modes, input surface, primary action, and fixed navigation in the first phone viewport. Measured document width equals the 390 px viewport, with no horizontal overflow.
- Color and tokens: Warm ivory, near-black, and burnt orange match the requested system. Burnt orange is used only for the selected mode and primary action. Gold is absent from the ordinary capture flow.
- Components and assets: Phosphor icons are used consistently. There are no emoji, generic spinners, placeholder graphics, handcrafted SVG icons, or default shadcn styling.
- Copy and state: The flow opens with raw capture, asks up to three documentary follow-ups, allows an early finish, reflects the memory back under “Here’s what I heard,” and explicitly stops before book/chapter placement.

## Focused region comparison

A separate crop was unnecessary because the native 390 px screenshots keep the prompt, mode selector, capture card, primary action, and navigation readable at inspection size. The desktop screenshot was separately checked for the asymmetric editorial composition and responsive scaling.

## Findings

No remaining P0, P1, or P2 findings.

## Comparison history

1. The first published summary exposed the encoded text `You&apos;ll` as literal UI copy, a P2 content defect.
2. The copy was corrected to a real apostrophe, rebuilt, republished, and verified in the final mobile summary.
3. Post-fix measurements place the capture CTA bottom at 619.33 px and the fixed navigation top at 761.38 px. The question CTA bottom is 656.30 px and the summary CTA bottom is 594.20 px, leaving clear separation in every tested mobile state.

## Interaction and runtime checks

- Entered a realistic written memory and completed all three follow-up questions.
- Verified the second and third documentary questions appear in sequence and that the flow never exceeds three follow-ups.
- Verified “I’ve said enough” can finish the interview early.
- Verified the reflection summary and “Memory kept” confirmation.
- Started and stopped the voice recorder; the captured voice state appeared without requesting device permission in this prototype.
- Verified Write, Voice, Photo, Screenshot, and File controls and the local file input contract for document, image, and audio types.
- Verified the 390 × 844 and 1280 × 900 layouts and found no horizontal overflow.
- Browser console errors checked in mobile and desktop states: none.
- Automated rendering tests, lint, and production build: passed.

## Follow-up polish

No blocking polish remains for this milestone. Chapter proposal and placement are intentionally deferred until this interview experience is approved. Uploaded files remain local to the browser because account storage and backend persistence are outside this milestone.

final result: passed
