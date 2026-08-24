# Life In Books UX/UI audit — 16 July 2026

## Audit scope

- Combined UX, visual-design, responsive, and screenshot-based accessibility audit.
- Primary viewport: 390 × 844.
- Desktop spot check: 1440 × 1000.
- Flow: Home → guided conversation → gathered memory → chapter placement → page generation → Library → book contents → reader → Garden → shared-book detail.

## User goal and accessibility target

Help someone turn an ordinary lived moment into a well-placed, beautifully readable memoir page without requiring them to think like a writer, while keeping the interface understandable at a glance on a phone.

## Overall verdict

The product already has a distinctive, premium editorial identity and a reader that feels calmer than a typical app. The main weakness is continuity: transitions sometimes open midway down the next screen, the new page does not appear in the Library after saving, and the fixed navigation obscures important mobile content. Those problems make a thoughtful experience feel less trustworthy and less smooth than its visual quality deserves.

## Captured flow

1. Home — healthy visual identity; important first-fold and freshness issues.
2. Guided conversation — good contextual entry; primary response action falls below the fold.
3. Contextual follow-up — functionally healthy; prompt is too long and dominates the screen.
4. Gathered memory — clear review concept; content is visually clipped and prototype language leaks into the product.
5. Chapter placement — strongest step in the flow; choice and rationale are clear.
6. Placement confirmation — redundant step and opens with the header cropped.
7. Page ready — clear actions; the layout explanation is duplicated.
8. Library — visually strong but low-density; the just-saved page is missing.
9. Book contents — understandable structure; opens partway down and omits the just-saved page.
10. Reader — strongest screen; focused, readable, and free of app navigation.
11. Garden — strong privacy positioning; book discovery is visually repetitive and the first card is obscured by navigation.
12. Desktop home — balanced editorial composition; stale composer content remains after completing the memory.
13. Shared-book detail — clear book identity; the permitted-preview action is below the first fold.

## Strengths

- The ivory, near-black, burnt-orange palette and editorial serif create a recognizable memoir product rather than a generic journal or dashboard.
- The first follow-up responds to the entered memory, and the second follow-up incorporates both the answer and selected feeling.
- Feeling selection is optional, clearly grouped, and exposes a pressed state.
- Chapter placement explains the recommendation and offers a clear alternative.
- Page-ready actions appear before the long page preview, solving the earlier dead-end feeling.
- The reader removes the app navigation and gives the page a focused, book-like surface.
- The Garden explains privacy and permission in reassuring plain language.
- Controls have useful accessible names and no browser console errors appeared during the audited flow.

## Big improvements

### P0 — preserve the user's saved work visibly

After keeping the generated page and opening the Library, the page count remains three and the new page is absent from both Recently Bound and Book Contents. This breaks the core promise of the product. Insert the saved page immediately, update page/chapter counts, scroll or highlight the new page, and show a durable saved confirmation.

### P1 — reset scroll position on every major transition

Placement confirmation and Book Contents opened midway down the next screen, with headers cropped. Reset to the top before or during every major state transition. Preserve scroll only when returning to the exact previous list state.

### P1 — stop the fixed navigation from covering content

The dock overlaps the conversation response area, Library cover, book contents, Garden card, and shared-book summary. Add a real bottom safe area equal to dock height plus device inset on every navigated screen. Place critical actions in a sticky action shelf immediately above the dock when necessary.

### P1 — streamline the memory flow

The current journey contains several confirmations: Gathered → Keep memory → Find its chapter → Place → Placement confirmed → Design page → Page ready → Keep page. Merge Gathered and placement into a single review step, then generate the page immediately after placement with an Undo/Reconsider option. Target: Capture → Explore → Review & Place → Page Ready.

### P1 — make contextual questions concise

The second prompt quotes the entire prior answer and consumes most of the phone viewport. Use only the meaningful clause or refer to it naturally: “What made those words feel especially meaningful?” Keep the original answer in a collapsed context strip.

### P1 — clear or deliberately preserve the completed draft

After completing the flow and returning Home, the original memory remains in the composer. Clear it after a successful save, or explicitly label it as a saved draft with Continue and Discard choices. Silent persistence risks duplicate memories.

### P1 — use real dates

Every audited screen still displays 13 July while the audit took place on 16 July. Use the device-local current date for chrome and preserve the real capture date on memoir pages.

## Small UI improvements

- Show the active destination's label beneath its icon, or reveal all four labels on first use. Accessible names do not solve visual ambiguity for sighted users.
- Reduce the five-step progress header on phones to the current step plus “2 of 5”; keep the full editorial timeline for wider screens.
- Raise feeling buttons to a minimum 44 px touch target and increase the smallest helper text.
- Keep the answer field and “Keep this answer” visible together; the user should never have to scroll just to discover how to continue.
- Remove prototype copy such as “the next step we build.” Use product-ready language throughout.
- Replace “The AI chose Reflection…” with a more human editorial voice: “Reflection suits this memory because…”
- Consolidate the repeated Reflection explanation on Page Ready into one layout note.
- Reduce border density in the conversation and summary screens; use whitespace and typographic grouping before adding another box.
- Give the Garden covers more individual art direction—photography, illustration, or expressive type—while keeping privacy metadata quiet.
- On desktop, widen the dock slightly and reveal labels on hover/focus so it feels intentional rather than like a mobile control floating in a large canvas.

## Kindle-like reader improvements

- Keep the excellent distraction-free reading surface.
- Add left/right tap zones and swipe for previous/next page.
- Let a center tap hide or reveal reading chrome.
- Add subtle page/location progress, such as “2 of 3” or a thin progress rule, without turning it into a toolbar-heavy app.
- Replace the single “A” cycle control with an explicit text-size sheet and line-spacing option.
- Use a clearer lamplight icon; the current icon resembles a notification bell.
- Offer Contents from the top and preserve the reader's current location when returning.

## Accessibility risks

- Several uppercase labels and helper lines appear below comfortable mobile reading size and at low contrast.
- The icon-only dock and tiny active dot create a visual recognition burden even though accessible names are present.
- Feeling controls appear shorter than the recommended 44 px touch target.
- Very large prompts leave little room for input and may break at 200% zoom or with longer localized copy.
- Fixed navigation overlay creates a reflow/zoom risk because important controls may become covered.
- Keyboard focus visibility, screen-reader announcements, reduced-motion behavior, and 200% zoom were not fully verified from screenshots alone.

## Recommended sequence

### Now

1. Fix saved-page continuity and counts.
2. Reset scroll on transitions.
3. Add consistent bottom safe areas and sticky primary actions.
4. Clear completed composer content.
5. Replace hard-coded dates and prototype copy.

### Next design pass

6. Compress the flow to four meaningful stages.
7. Redesign the phone conversation density and shorten follow-ups.
8. Improve nav recognition and progress-step readability.
9. Remove duplicated page-ready explanations.

### Later

10. Add Kindle-style tap/swipe/chrome behavior.
11. Give Garden books richer, distinct cover art and lightweight discovery tools.
12. Adapt the navigation treatment more deliberately for desktop.

## Evidence limits

- Voice, photo, screenshot upload, permission prompts, loading states, offline behavior, backend AI quality, and multi-device persistence were not exercised.
- This is not a full WCAG compliance claim; keyboard, screen-reader, zoom, and contrast measurements need dedicated testing.
- The audit used realistic sample content in the live published app and captured the rendered states shown in this folder.
