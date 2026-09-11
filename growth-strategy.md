# Growth Strategy — from a working app to a scaled product

How Life on Paper gets users, keeps them, charges for itself, and launches.
This document **supersedes the ordering of `implementation-roadmap.md` §Phase 7**

- it pulls the printed book forward. Everything else in that roadmap stands.

Status: strategy decided; execution not yet started.

---

## 0. Decisions locked (from the strategy session)

| Decision | Choice | Consequence |
|---|---|---|
| Beachhead market | **English homepage + Hinglish/Hindi landing pages** | Wider net now; ~1 extra week of copy/design; two sample books to maintain |
| The printed book | **Pull a 30-day slim book forward, ship before the PH launch** | Rewrites roadmap ordering; becomes the acquisition engine, not just revenue |
| Launch assets | **Starting from zero — no list, no community** | Product Hunt is ~4 months out, not next month. List-building is the critical path |

The third decision is the one that governs the timeline. See §5.

---

## 1. The central problem this strategy solves

**The product's payoff is invisible for weeks, and the product philosophy forbids
every tool that would normally bridge that gap.**

A new user's day one is an empty page. The "book of your life" arrives, at the
earliest, after months of writing. Meanwhile the brief deliberately rules out
streaks, scores, guilt mechanics, and daily notifications (§11, §15 of
`product-brief.md`) — all correct decisions, and all of which remove the standard
retention toolkit.

This is not a flaw to be fixed by abandoning those principles. It is the
constraint every decision below is designed around. Concretely, three moves:

1. **Compress the payoff into 30 seconds** — the demo widget (§3.1). A stranger
   feels the product before signing up.
2. **Compress the payoff into 30 days** — the slim first book (§4.1). A real
   object, not a 12-month promise.
3. **Make the payoff portable and giftable** — the gift book (§4.2). The only
   growth loop that violates none of the product's principles, because the user
   chooses to share it.

---

## 2. Why a marketing site, and why *this* one

`app/page.tsx` currently renders `HomeExperience` for everyone. A stranger
arriving at lifeonpaper.app lands inside a journaling surface with no
explanation, no proof, and no reason to trust it with their inner life. The most
valuable URL the product owns is spent on a cold start.

The site is therefore **not a brochure and not a phase that follows the
product**. It is the acquisition and list-building machine, and it starts now.

### Anti-patterns to avoid explicitly

- A screenshot carousel of an app. Screenshots cannot show invisible magic.
- A feature grid ("AI polish! Era detection! People pages!"). Features are not
  the promise.
- Explaining the technology before the feeling.
- Anything that requires reading three paragraphs to understand what it is.

---

## 3. The site: demo-first, not brochure-first

### 3.1 The interactive demo widget (highest-leverage asset in this document)

A live, no-signup transformation at the top of the homepage. The visitor types
three messy lines — or picks a pre-filled sample — and immediately sees:

1. the polished page, with a **before → after** view,
2. *"I noticed 'amma' — I'll remember her,"*
3. the era/volume it filed into,
4. a woven chapter paragraph.

**Why this and not anything else:** it doubles as the Product Hunt gallery, the
ad creative, the onboarding, the viral surface, and the SEO hook. It is the
single artifact that proves the invisible-magic principle.

**It is mostly already built.** The pieces exist:

| Need | Existing source |
|---|---|
| Polish + title + placement + signals | `lib/ai/memory-engine.ts`, `lib/ai/editorial-guardrails.ts` |
| The API surface | `app/api/memory-engine/route.ts` (actions: `page`, `question`, `weave`) |
| Woven narrative | action `weave` in the same route; `components/system/weekly-weave.ts` |
| Language detection | `language` field, `English / Hindi / Hinglish / Mixed` |

**Two things must be built before it is public:**

- **Rate limiting and abuse protection.** `/api/memory-engine` currently has *no
  authentication and no rate limit* — any anonymous caller can POST to it in a
  loop and spend real AI credits. This is a live cost exposure today,
  independent of the marketing site. Ship an IP-based limiter (and a cheap
  per-session token) before the demo is announced anywhere.
- **A model tier split.** The demo must not call the same model as paid weaving.
  Polish/extraction on the cheapest capable model; reserve the expensive model
  for real weaving. See §4.4.

**The carry-over:** when a visitor signs up, their demo words become their first
entry. The demo *is* onboarding; there is no cold start, and entry #1 is already
written. This is the highest-value engineering detail in the whole plan.

**A principled share affordance:** the demo text is throwaway text someone typed
to try the product, not their journal. A "share this transformation" card is
therefore fair game — and it is a clean viral loop that never touches private
writing.

### 3.2 Route map

| Route | Job | Priority |
|---|---|---|
| `/` | Demo widget, the promise, one CTA | 1 |
| `/sample` | **A fully readable demo book**, EN edition | 2 |
| `/trust` | Plain-language privacy page — a first-class page, not a footer link | 3 |
| `/pricing` | Free forever vs. paid; the book included | with Stripe |
| `/hinglish`, `/hindi` | Re-cut for those readers, **not translations** | 4 |
| `/gift` | "A book about your father" | with gift flow |

### 3.3 Architecture change

The app moves off `/`. Marketing owns the root; the journal lives at `/today`.

- **Root domain, not a subdomain.** Consolidates domain authority for SEO, and
  the root is what gets pasted into chats and indexed.
- This is cheap to do: the app is a client-side SPA with state-based doors
  (`components/system/nav-shell.tsx`), not a route tree. It is a rendering
  branch plus a redirect for signed-in users, not a restructure.
- Signed-in users should land on `/today` directly; anonymous visitors get `/`.

### 3.4 Fixes that are small and disproportionate

- **`public/og.png` is 2.1 MB** and declared in `app/layout.tsx` as 1732×909
  while the file is 1731×909. Too heavy for link previews — platforms will drop
  or slow it. Target ~1200×630, under ~300 KB. This affects *every share, every
  channel, forever*.
- **The metadata description undersells the product.** It currently reads
  "Speak, share, and shape the moments of your life into a memoir you will want
  to return to." The strongest hook is the physical book. Lead with it.
- **The Hinglish/Hindi landing pages must be re-cut, not translated.** A
  translated Western homepage reads as a Western app in a costume.

---

## 4. Monetization

### 4.1 The slim first book — move the payoff from 12 months to 30

Do not wait for the year-end book. Ship **"your first book, any time":** ~30 days
of entries assembled into a printable slim volume.

This converts a 12-month promise into a 30-day one and is the most valuable item
in `implementation-roadmap.md` to pull forward. Digital keepsake first (fast,
cheap, shareable), print immediately after.

### 4.2 Revenue streams, in order of strategic value

**1. The physical book — gifting-led.**

Day One starts printed books at [$19.99](https://dayoneapp.com/book-printing/);
POD unit costs for a text-heavy ~200pp hardcover sit in the low-to-mid teens
([Lulu pricing](https://www.lulu.com/pricing)).

- **Include the first book in the annual plan.** This turns a ~$20 commodity
  into the anchor that justifies $79–99/yr and makes the subscription feel like
  an artifact rather than another app.
- **Gift books are the growth engine.** Every gift book targets exactly this
  market ("A book about Amma") and is *inherently send-to-someone*. It is the
  one viral loop that costs the product nothing philosophically: the user
  chooses to share it.
- **Use a POD partner** (Lulu / Bookvault / Peecho). Printing is operations, not
  software — shipping, returns, international, damage. Do not build it.

**2. Subscription.**

- The free tier must be **generous and permanent**. The writing surface is
  sacred; an expiring trial on a journal is a betrayal of the product promise.
- Gate the *magic*: weaving, the tutor, People portraits, the year-end book,
  cross-language search.
- Anchor: Day One ~$35–50/yr, Rosebud ~$100+/yr. With the book included,
  $79–99/yr is defensible; without it, $49–59.

**3. The Family / Legacy plan.**

The underrated one. People pay for their parents in a way they will not pay for
themselves. Higher price tolerance, a natural gifting motion, and nobody owns
the niche.

**Refused deliberately:** lifetime deals and AppSumo-style discounts. They
convert "keepsake" into "gadget" and attract people who will never print a book.
For launch urgency, offer *"first book free for launch supporters"* — never 50%
off forever.

### 4.3 The free-rider fix is the book, not a paywall

Rather than crippling the free tier, make the free tier's natural *destination*
a paid artifact. Free users write forever; the moment they want the thing the
product is actually for, it costs money. This aligns monetization with the
promise instead of fighting it.

### 4.4 Unit economics — the risk most likely to quietly kill this

Every entry currently hits an LLM for polish, extraction, tone, and weaving. A
free user who never converts still costs real money, forever.

- **Tier the models now, before the free tier is popular:** cheap model for
  polish/extraction/tone; expensive model only for weaving and the book.
- **Cache aggressively** — the week's weave is deterministic given its entries.
- `.env.example` already lists Gemini / OpenRouter / OpenAI with fallback
  ordering in the route. Keep that provider flexibility; it is real leverage.
- **Instrument cost per active user per month** from day one. If it is not
  measured, it will not be managed, and this is the number that decides whether
  the free tier can stay generous.

---

## 5. The Product Hunt launch

### 5.1 The honest strategic read

PH is a **spike, not scaling**, and for a journaling app it is a *weak* spike:
day-30 retention of PH signups will be poor precisely because the payoff takes
weeks. Go for the badge, the backlinks, the SEO, and the ~30 power users. Do not
confuse it with growth.

The stated goal "top of Product Hunt" is better restated as **"a credibility
event on the way to a growth engine."**

### 5.2 Why the timeline is ~4 months out, not next month

Rankings are decided in the **first 6 hours**, and momentum depends on a network
that already exists. With no list, a launch today lands around #20.

The arithmetic that makes this tractable:

> **~2,000 engaged emails × 10–15% launch-day conversion ≈ 200–300 upvotes in
> the first wave.**

That is top-5 territory, and #1 on a moderate day. **~2,000 emails is the number
to put on the wall.** It is the critical path, and it is the reason the site
ships now.

### 5.3 The book is what builds the list

Give **50–100 real beta users a real hardcover book** and you get:

- photos of a physical book — the best gallery asset and press hook available
  ("here's a book someone's mother cried over"),
- real testimonials from people who are not the founder,
- a launch-day wave that actually shows up, because they were given something.

**Treat the first 100 print runs as a marketing budget line, not a revenue
line.** The book pays for its own acquisition.

### 5.4 Mechanics, once the list exists

- Launch **Tuesday–Thursday**, at **12:01am PT** (PH days run midnight-to-midnight PT).
- **First 6 hours decide everything.** Target 100+ upvotes by 6am PT.
- Notify the network in **three waves** — midnight / 6am / 6pm PT. A steady climb
  beats a spike that dies; the evening wave is where rankings actually shift.
- **Respond to every comment within ~5 minutes.** Long, specific replies get
  upvoted and convert; "thanks!" does not. Prepare 5–10 response templates.
- Assets: 240×240 thumbnail, 1270×760 gallery images, **sub-60s demo video**,
  60-char tagline. Most PH traffic is mobile — test there.
- **Expect 3–5% conversion.** ~10K visitors → ~300 signups is a good launch.
- A top-5 badge lifts trial signups 10–20%. Put it on the site, deck, and profile.

Source: [Product Hunt 2026 launch guide](https://www.teract.ai/resources/launch-product-hunt-2026).

### 5.5 Positioning for the launch

**Lead with the artifact, not the AI.** PH in 2026 is saturated with AI apps, and
the predictable comment is *"how is this different from Rosebud / Day One?"* —
which per the guide is itself a signal that positioning is unclear.

Lead with: **"Write 90 seconds a day. Get a hardcover book of your life."**

The differentiation *is* the invisible-magic principle. That alignment between
"what is unique" and "what is good marketing" is rare — exploit it. The existing
tagline is already ~52 characters: a ready-made PH tagline.

### 5.6 Do a practice launch first

Ship the free demo or the `/sample` book as its own small launch to learn the
mechanics, then launch the real thing. The guide also advises waiting 6+ months
between launches.

### 5.7 Sequencing gate

> Slim book exists → 4–6 weeks of real users holding real books → **then** PH.

Launching on a promise burns the one shot.

---

## 6. Scale beyond Product Hunt

Where the actual growth is, in rough order of expected return:

- **The Hinglish/Hindi wedge — uncontested.** Rosebud and Day One are
  English/Western. "The only journal that keeps your Hinglish as Hinglish" is
  ownable, defensible, and nobody is competing for it.
- **Community:** r/Journaling, r/Hindi, r/india, family-history and genealogy
  communities. r/privacy is worth a genuine post — the local-first posture is
  novel there and will earn real respect.
- **Long-tail SEO with real intent:** "Hinglish journal," "gift for parents who
  have everything," "memory book for grandparents," "how to write your life
  story."
- **Founder-led content:** the book-printing journey, the Hinglish engineering
  problem, honest build-in-public numbers.
- **The gift loop:** each gift book reaches a new family.

---

## 7. Revised roadmap ordering

Supersedes `implementation-roadmap.md` §Phase 7 ordering. Phases 0–6 there are
complete and stand as-is.

| Phase | Weeks | Focus | Gate to exit |
|---|---|---|---|
| **0. Foundation** | 1–2 | Marketing shell at `/`, demo widget on existing engine, rate limiting, `/sample` (EN), `/trust`, OG fix, metadata rewrite | A stranger understands the product in 10s and the demo works |
| **1. Convert** | 3–6 | Demo words carry into signup, email capture everywhere, Stripe + pricing, free-tier limits, funnel analytics | First paying subscribers; cost/user measured |
| **2. Artifact** | 6–10 | Slim 30-day book via POD partner, gift flow MVP, Hinglish/Hindi landing pages | A real user holds a real book |
| **3. Audience** | 8–16 | Founder content, communities, SEO compounding, **first 100 beta books shipped** | ~2,000 emails |
| **4. Launch** | ~18–20 | Product Hunt, Tue–Thu, three waves, every comment answered | Badge + power users converted |

Phases 0–1 and 3 run in parallel: list-building does not wait for the product to
be finished.

---

## 8. Metrics that matter

- **Entry #7** — the habit threshold. Instrument it from day one; it is the
  leading indicator of everything else.
- **Cost per active user per month** — §4.4. Decides whether the free tier
  survives.
- **Email list size** — the critical path to launch (§5.2).
- **Demo → signup conversion** — the site's only real job.
- **Books printed** — the leading indicator of willingness to pay.

---

## 9. Open risks

| Risk | Severity | Mitigation |
|---|---|---|
| `/api/memory-engine` is unauthenticated and unrate-limited | **High — live now** | IP limiter + session token before the demo ships |
| AI cost per free user | **High** | Model tiering, caching, cost instrumentation (§4.4) |
| Hinglish quality regression | **High** | The fixture set in `implementation-roadmap.md` §Phase 8 is a hard gate. A bad weave in someone's mother tongue is an unrecoverable trust failure |
| Printing is operations, not software | Medium | POD partner; never build it |
| PH spike with poor D30 retention | Medium | Treat as credibility, not growth; the book drives retention |
| "Never train on my writing" is the #1 PH comment | Medium | Have a contractual, verifiable answer — not a marketing sentence |
| Building two sample books + two landing pages dilutes focus | Medium | Ship English first, prove the demo converts, *then* cut Hinglish |

---

## 10. Immediate next actions

1. **Rate-limit `/api/memory-engine`.** Live cost exposure, independent of
   everything else here. Do it first.
2. **Build the demo widget** and put it at `/` (§3.1). Highest leverage per hour
   of work in this document.
3. **Fix `public/og.png`** and rewrite the metadata description (§3.4).
4. **Draft `/sample`** — the readable demo book. It is the press, investor, and
   PH asset.
5. **Start the email list now**, before the site is beautiful.
