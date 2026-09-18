# AGENTS.md

Operational guide for AI coding agents working on **Life on Paper**.

Read this before making changes. It records the facts, conventions, and
hard-won gotchas that are not obvious from the code alone.

---

## 1. What this is

**Life on Paper** — an AI memoir app. The user speaks or types a memory; the
app asks a few grounded follow-up questions, lightly edits the words (never
inventing), files the page into eras/people/threads, and over time weaves the
entries into a book.

- **Production:** https://lifeonpaper.app
- **Repo:** https://github.com/krishnaagrwl1997/life-on-paper (branch `main`)
- **Product vision:** `product-brief.md` (the canonical "what and why")
- **Design history:** `design-map-phase*.md`, `design-qa.md`
- **Roadmap:** `implementation-roadmap.md`, `growth-strategy.md`

**The core editorial promise:** the app improves the user's words, it never
replaces them, and it never invents a scene, person, quote, date, feeling, or
lesson. Preserve this in every change — see §7.

---

## 2. Stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, RSC) |
| React | 19 |
| Styling | Tailwind CSS 4 + a large hand-written `app/globals.css` design system |
| Motion | framer-motion (respect `useReducedMotion`) |
| Icons | `@phosphor-icons/react` |
| Auth + DB | Supabase (`@supabase/ssr`) |
| AI | OpenRouter → DeepSeek V4 Flash (primary), Gemini + OpenAI as fallbacks |
| Hosting | Vercel (deployed by GitHub Actions) |
| Alternate target | Cloudflare `vinext` (scripts exist; Vercel is the live target) |

Node `>=22.13.0`.

---

## 3. Commands

```bash
npm run dev          # local dev → http://localhost:3000
npm run build        # production build (Next.js) — run before every commit
npm run start        # serve the production build
npm run lint         # eslint
npm test             # builds via vinext then runs node --test tests/
                     # NOTE: requires the Cloudflare/vinext path; npm run build
                     # is the reliable pre-commit check.

npm run dev:sites    # Cloudflare vinext dev (not the live target)
npm run build:sites  # Cloudflare vinext build
npm run db:generate  # drizzle-kit generate (legacy; Supabase owns the schema)
```

**Always run `npm run build` before committing.** It type-checks the whole app;
a missing identifier in a client component is a real build failure.

---

## 4. Repo map

```
app/
  page.tsx                 public marketing landing (also the live AI demo)
  sample/page.tsx          a finished sample book (marketing)
  today/page.tsx           THE APP: the journal (server component)
  layout.tsx               metadata + viewport (themeColor, viewport-fit)
  globals.css              the entire design system (~14k lines)
  api/memory-engine/route.ts   the AI editor endpoint (see §6)
  api/waitlist/route.ts        insert-only waitlist (see §8)
  auth/callback/route.ts       OAuth code exchange
  chatgpt-auth.ts          OpenAI-sites sign-in helpers

components/
  marketing/               landing/demo/sample/waitlist UI
  system/                  the product: today, add-moment, library, people,
                           weaves, keepsakes, onboarding, profile, nav
  ui/                      primitives (button, input)

lib/
  ai/memory-engine.ts      request/result types + editorial layout ids
  ai/editorial-guardrails.ts   grounding, fallbacks, output validation (§7)
  supabase/{client,server,proxy,config,account,memories,graph}.ts
  rate-limit.ts            in-memory fixed-window limiter (§6)
  demo-seed.ts             bridges the landing demo into a real first entry

supabase/migrations/       the source of truth for the database schema
tests/rendered-html.test.mjs
.github/workflows/         deploy.yml, keep-supabase-awake.yml
```

Route roles matter: **`/` is marketing, `/today` is the product.** Do not move
the journal back to `/`.

---

## 5. Environment variables

`.env` is **gitignored** (`.env*` with `!.env.example`). Never commit real keys.
`.env.example` is the committed template and should stay in sync with reality.

```
NEXT_PUBLIC_SUPABASE_URL=              # public, shipped to the browser
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # public (sb_publishable_…)
AI_MEMORY_PROVIDER=openrouter          # openrouter | gemini | openai
OPENROUTER_API_KEY=                    # sk-or-v1-…
OPENROUTER_MEMORY_MODEL=deepseek/deepseek-v4-flash
GEMINI_API_KEY=
GEMINI_MEMORY_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MEMORY_MODEL=gpt-5.6-terra
```

Local values live in `.env`; production values live in **Vercel project env
vars**. Changing `.env` does nothing for production and vice versa.

---

## 6. The AI memory engine

`app/api/memory-engine/route.ts` handles three actions: `question`, `page`,
and `weave`. It is **unauthenticated** (the landing demo uses it), so it is
rate-limited in `lib/rate-limit.ts`.

**Provider selection** — the order depends on `AI_MEMORY_PROVIDER`, then the
loop **skips any provider whose key is missing** and falls through:

```
openrouter → gemini → openai   (when AI_MEMORY_PROVIDER=openrouter)
gemini     → openrouter → openai   (default)
openai     → gemini → openrouter
```

If every provider fails or is unkeyed, the route returns `502 AI_UNAVAILABLE`
(or `503 AI_NOT_CONFIGURED` when *no* key exists). The client treats a non-OK
response as "fall back to the offline editor", so the app still works.

**Model choice.** `openrouter/free` is a *random* free-model router — output
varies per call. Use a concrete model id instead (currently
`deepseek/deepseek-v4-flash`, the fast V4 Flash tier). Note the
`~deepseek/…-latest` aliases are **not** directly callable (400).

**OpenRouter request shape matters.** The call sends a strict
`response_format.json_schema` plus `provider: { require_parameters: true,
data_collection: "deny", sort: "throughput" }`. Only models that support JSON
schema survive that filter, and `sort: "throughput"` avoids slow providers
timing out (the client aborts at 24s and would otherwise silently fall back to
a different model).

**The offline path is a first-class citizen.** `structureStoryDraft()` in
`components/system/memory-interview.tsx` arranges the user's own words into a
narrative (scene lead → sequence → reflective close) when no AI is available.
Keep it working; many users run without a key.

---

## 7. Editorial rules (do not break these)

`lib/ai/editorial-guardrails.ts` validates every AI result. The philosophy:

1. **Never invent** — no new scene, quote, sensory detail, person, date, place,
   interpretation, or lesson. Only reorder, lightly clean, and close with the
   user's own words.
2. **Preserve the user's language.** English stays English, Hindi stays Hindi,
   Hinglish stays Hinglish. Never translate.
3. **Preserve voice** — the user's vocabulary, order of events, uncertainty,
   and emotional temperature.
4. **Guardrails are load-bearing.** `guardPageResult` / `guardQuestionResult`
   reject low lexical-coverage output and fall back to conservative cleaning.
   If you change prompts or schemas, keep the guardrails passing.

**Titles are a known hazard.** A dictated memory whose sentences begin with
discourse words ("Actually…", "Honestly…", "Once…") has repeatedly produced
nonsense titles like `New York with actually`. The defence is layered:
an ignore list in `detectPersonName` / `detectPerson`, case-insensitive
matching, a plausibility check in `titleForMemory` / `fallbackTitle`, and a
rejection in `isBadGeneratedTitle`. **Add new discourse words to both
implementations** (`memory-interview.tsx` and `editorial-guardrails.ts`) —
they are separate copies and drift easily.

Avoid AI-slop phrasing: "what feels most alive", "a testament to", "a tapestry",
"a reminder that", "the kind of person I was becoming".

---

## 8. Supabase

**Project:** `kikijstmgkvmbrvpzqdz` (Life on Paper, `ap-southeast-2`), on the
free tier.

**Migrations are the source of truth** — `supabase/migrations/*.sql`, applied in
filename order. Never edit an applied migration; add a new one.

| Migration | Purpose |
|---|---|
| `20260722163000_initial_life_on_paper.sql` | profiles, books, volumes, chapters, memories, memory_emotions, media_assets, pages, book_access_requests |
| `20260901000000_user_graph.sql` | multi-device memory graph (`user_graph`) |
| `20260917000000_secure_user_graph.sql` | **security fix** — RLS + owner-only policies, `SECURITY INVOKER`, revoke `anon` |
| `20260920000000_waitlist.sql` | insert-only waitlist |

### Security rules for new tables and RPCs

The publishable key is **public** (it ships to browsers). Treat every client as
untrusted. Learn from the bug fixed in `20260917000000`:

- **Every new table gets `alter table … enable row level security`** plus
  explicit policies scoped to `auth.uid()`. No RLS = public data.
- **Never write an RPC that takes an owner id as a parameter and runs
  `SECURITY DEFINER`.** That combination lets anyone act as anyone. Use
  `SECURITY INVOKER` and derive the owner from `auth.uid()` inside the
  function.
- **Do not `grant execute … to anon`** unless the operation is deliberately
  public. Prefer `to authenticated`.
- The waitlist is the one deliberate exception: **insert-only for `anon`, with
  no select/update/delete policy at all**, so nobody can read the list back.
  Do not add a select policy to `waitlist`.

### Applying schema changes to the live database

There is **no service-role key and no DB password** in the working
environment, and the publishable key cannot run DDL. To apply a migration you
need one of:

1. **Supabase personal access token** (`sbp_…`, from
   https://supabase.com/dashboard/account/tokens) — then run SQL via the
   Management API:
   ```bash
   curl -sS -X POST \
     "https://api.supabase.com/v1/projects/kikijstmgkvmbrvpzqdz/database/query" \
     -H "Authorization: Bearer $SBP" -H "Content-Type: application/json" \
     -d "{\"query\": \"$(cat supabase/migrations/<file>.sql | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read())[1:-1])')\"}"
   ```
2. **Database password** (Project Settings → Database) + a Postgres client.
3. **The Supabase dashboard SQL editor** (ask the human to paste and run).

Ask the human; do not attempt to work around it. **After using a personal
access token, tell the human to revoke it.**

### Verifying access control

Use the publishable key to prove `anon` is denied (expect `401` /
`42501 permission denied` for RPCs, and `[]` for RLS-protected tables):

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  "$SUPABASE_URL/rest/v1/rpc/load_my_graph" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"p_owner_id":"11111111-1111-1111-1111-111111111111"}'
```

To test the **authenticated** path without a real session, simulate it in SQL
and roll back (there are real users in `auth.users`):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<a real user id>","role":"authenticated"}';
select public.load_my_graph('<same id>');   -- expect the payload
select public.load_my_graph('<other id>');  -- expect null
rollback;
```

**Free tier pauses after inactivity**, which makes the hostname stop resolving
and silently breaks sign-in. `.github/workflows/keep-supabase-awake.yml` runs a
real query daily to prevent that. Don't remove it.

---

## 9. Deployment

Production deploys are triggered by **pushing to `main`**. The workflow
(`.github/workflows/deploy.yml`) calls the **Vercel REST API** (no CLI, no login
scopes) and needs `secrets.VERCEL_TOKEN`.

```
GitHub push to main
  → workflow creates a Vercel deployment from gitSource
  → Vercel builds with the project's env vars
  → aliased to lifeonpaper.app
```

Known IDs (safe, they are in the workflow):

```
VERCEL_ORG_ID     = team_ZwqcatAquvcaHPsyfe2pINuD
VERCEL_PROJECT_ID = prj_ePUg3nGNY7fCfTkCX6NtxBGkX294
VERCEL_REPO_ID    = 1348203015
```

**Gotchas that have actually bitten us:**

- **`VERCEL_TOKEN` expires.** When deploys fail with
  `The token provided via --token argument is not valid`, re-authenticate
  (`vercel login`, device flow) and refresh the GitHub secret with
  `gh secret set VERCEL_TOKEN -R krishnaagrwl1997/life-on-paper`.
- **`git push` may need a token.** The `origin` remote is HTTPS. Push with
  `gh auth git-credential` or an `x-access-token:<token>@github.com` URL. Pushing
  changes under `.github/workflows/` requires the `workflow` OAuth scope.
- **The local `origin/main` tracking ref goes stale** when pushing via a token
  URL. Confirm the real remote state with `git ls-remote origin main`; the
  "ahead by N commits" warning may be a lie.
- **Changing an env var requires a new deployment** to take effect.
- **Vercel env vars of type `sensitive` hide their values** from API reads
  (`value: null`) — they are not empty. `encrypted` values can be read with
  `?decrypt=true` when you need a `NEXT_PUBLIC_` value.

---

## 10. Testing and verification

There is no meaningful unit-test suite for the product UI; verify by running
the app.

1. **Build** — `npm run build` (always).
2. **API checks** — `curl` the endpoints against `http://localhost:3000` or
   production. `/api/memory-engine` returns `{…, source: "ai"}` when a provider
   answered; a `502`/`503` means it fell back.
3. **Prove which provider ran.** Add a deliberately invalid
   `OPENROUTER_MEMORY_MODEL` and check the server log for
   `Memory engine openrouter attempt failed OPENROUTER_400` — that confirms the
   provider is being attempted. Restore afterwards.
4. **Browser flow.** For UI work, drive a real browser over the Chrome
   DevTools Protocol (the repo has throwaway `work/cdp-*.mjs` scripts; `work/`
   is gitignored). Launch headless Chrome with `--remote-debugging-port`, then
   navigate, click, and `Page.captureScreenshot`.
   - **Headless Chrome must reach the dev server.** A `chrome-error://` or a
     `localStorage` `SecurityError` almost always means **the dev server isn't
     running**, not a bug in the page.
   - Seed state with `localStorage.setItem('life-in-books-onboarding-complete','yes')`
     *before* navigating.
5. **Slow first compile.** This project sits on a slow filesystem; the first
   request to a route can take a minute or more. Wait it out (and warm
   `/today`) before concluding something is broken.

---

## 11. Code conventions

- Client components: `"use client"` at the top; keep server components as the
  default.
- Respect `useReducedMotion()` for every animation.
- Accessibility is expected: `aria-label` on icon-only buttons, `aria-pressed`
  on toggles, `role="status"`/`role="alert"` for async feedback, and visible
  `:focus-visible` styles.
- Touch targets should be at least 44px (`2.75rem`).
- Honour mobile safe areas: `env(safe-area-inset-bottom)` on fixed bars;
  prefer `100svh`/`100dvh` over `100vh`.
- Store `NEXT_PUBLIC_*` values only when they are genuinely public.
- Prefer the existing design tokens (`var(--ink)`, `var(--action)`,
  `var(--paper-ease)`, `var(--font-fraunces)`) over raw values, and keep the
  warm-ivory/paper editorial look.
- Write user-facing copy in the app's plain, warm, non-salesy voice.
- Long-form rationale belongs in code comments only where the *why* is not
  obvious (the codebase already does this well — match that style).

---

## 12. Definition of done

- [ ] `npm run build` passes.
- [ ] Behaviour verified in a browser or with `curl` (evidence, not assumption).
- [ ] No secrets added to git; `.env.example` updated if env vars changed.
- [ ] New tables have RLS + policies; new RPCs are `SECURITY INVOKER` and use
      `auth.uid()`.
- [ ] Editorial rules in §7 preserved.
- [ ] Committed with a message explaining *why*, pushed to `main`, and the
      deploy run watched to success.
