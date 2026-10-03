# Launch runbook — Life on Paper

Work top to bottom. Everything here is either a hard blocker or the thing you
will want open on the day.

---

## T‑minus: do these today (hard blockers)

### 1. Make the AI key durable ⚠️ the one that bites silently

| | |
|---|---|
| Where | https://openrouter.ai/settings/keys |
| Problem | The key carries `limit: $5` and **`expires_at: 2026-10-17`** |
| What happens | When it expires or runs out, **all AI stops** and the app quietly falls back to the offline editor. The site stays up, so nothing looks broken — but the product stops being itself. |
| Do | Remove the expiry (or set it far out) and raise the limit to ~$20. Check the account has credit. |

Verify afterwards:
```bash
curl -s https://openrouter.ai/api/v1/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | python3 -m json.tool
# want: expires_at far in the future, limit_remaining comfortably above 0
```

### 2. Publish the Google OAuth consent screen

| | |
|---|---|
| Where | https://console.cloud.google.com/apis/credentials/consent |
| Problem | If it is still in **Testing**: only 100 users can sign in, everyone sees an "unverified app" warning, and sessions die after 7 days. |
| Do | Fill in app name, logo, **Privacy URL `https://lifeonpaper.app/privacy`**, Terms URL, authorised domain `lifeonpaper.app` → **Publish**. Email/profile are non-sensitive scopes, so this is usually quick. |

### 3. Sign in for real, on a phone

The one path no one has tested. Fresh browser, iOS Safari **and** Android
Chrome:

- [ ] Sign in with Google works
- [ ] No "unverified app" warning
- [ ] Write a memory → it appears after signing in on a second device
- [ ] Sign out, sign back in, pages are still there

### 4. Decide how email signups behave

Email confirmation is **on** (`mailer_autoconfirm: false`) and Supabase's
default SMTP is rate-limited to a handful per hour — it is explicitly not for
production.

- [ ] Either configure custom SMTP (Resend/Postmark) in Supabase → Auth → SMTP,
- [ ] or offer **Google only** for launch and hide email signup.

### 5. Point a monitor at the app

- [ ] UptimeRobot / BetterStack → `https://lifeonpaper.app/api/health`, look for HTTP 200
- [ ] (Better) Add Sentry's free tier — you currently have no error reporting

---

## T‑minus: quick wins

- [ ] **Delete the stray waitlist probe row** (insert-only table, so it needs the dashboard):
  ```sql
  delete from public.waitlist where email like '%@example.invalid';
  ```
- [ ] **Add analytics** (Vercel Analytics is a one-liner) so you can see landing → signup → first entry
- [ ] **Pick one primary CTA.** The landing page currently offers both "Start your book — free" and the waitlist. Choose the one action you want.
- [ ] **Raise the AI circuit breaker** if you expect volume: set `MEMORY_ENGINE_DAILY_MAX` in Vercel (default `2000` per instance per day)

---

## Smoke test (run the night before and again on the morning)

```bash
for p in / /today /sample /privacy /terms /api/health; do
  printf '%-16s ' "$p"
  curl -s -o /dev/null -w '%{http_code}\n' "https://lifeonpaper.app$p"
done

# The editor must answer in a few seconds, not thirty
time curl -s -X POST https://lifeonpaper.app/api/memory-engine \
  -H 'Content-Type: application/json' \
  -d '{"action":"page","demo":true,"memory":"today was long but i walked home by the lake and felt okay","answers":[],"emotions":[],"questionIndex":0,"speechLanguage":"auto"}' \
  | head -c 200
```

Expect: every route `200`, and a JSON body with `"source":"ai"`. The demo path
should settle in **2–3s**, the full pass in **~8s**.

---

## Launch day loop

Check these in this order, roughly every hour:

| What | Where | Healthy looks like |
|---|---|---|
| Is it up? | monitor on `/api/health` | 200 |
| Is AI alive? | OpenRouter → Activity / usage | usage climbing, credit left |
| Is sign-in working? | Supabase → Authentication → Users | new users appearing |
| Are people writing? | Supabase → Table Editor → `memories` | rows appearing |
| Is the waitlist growing? | Supabase → Table Editor → `waitlist` | rows appearing |
| Any errors? | Vercel → project → Logs | nothing new screaming |
| Deploys | GitHub → Actions | green |

Then post, in the places that suit the product (see `LAUNCH-COPY.md`).

---

## Incident playbook

**The demo spins, or people say the editor doesn't work.**
Most likely the AI key expired or ran out.
1. `curl -s https://lifeonpaper.app/api/health` → check `ai.configured`
2. Check the key limits at https://openrouter.ai/settings/keys
3. Fix the key. If the key is dead and you can't fix it fast, the app still
   works — it falls back to the offline editor — so the site is not down.

**The site is down.**
1. Check Vercel → Deployments for a failed build
2. **Vercel can instantly roll back** to the last good deployment — do that first, diagnose second
3. Check `/api/health` from your phone (rules out your own network)

**Sign-in is broken but the site is up.**
This is almost always the Supabase free tier **pausing after inactivity** — the
hostname stops resolving, and it silently breaks Google sign-in and all cloud
saving. Restore the project in the Supabase dashboard. The `Keep Supabase
awake` workflow should prevent it; check it has been running.

**AI costs are spiking / someone is hammering the endpoint.**
1. OpenRouter → usage
2. Lower `MEMORY_ENGINE_DAILY_MAX` in Vercel and redeploy (the circuit breaker)
3. The per-IP limiter is per-instance, so it is a weak bound — the daily cap is the real brake

**A deploy broke something.**
Roll back in Vercel, then fix forward. Every push to `main` deploys, so keep
`main` green.

---

## What degrades gracefully (know this so you don't panic)

- **AI down** → the offline editor still shapes a page from the user's own words
  (`structureStoryDraft`). Quality drops; the product still works.
- **Supabase paused** → the app keeps working on the device; only sign-in and
  cross-device sync stop.
- **Google sign-in blocked** → people can still write without an account. The
  journal is device-first by design.

---

## Dashboards worth a bookmark

- App: https://lifeonpaper.app · health: https://lifeonpaper.app/api/health
- Vercel: https://vercel.com/krishnaagarwal/life-on-paper (Deployments, Logs)
- Supabase: https://supabase.com/dashboard/project/kikijstmgkvmbrvpzqdz (Auth, Table Editor)
- OpenRouter keys: https://openrouter.ai/settings/keys
- Google consent: https://console.cloud.google.com/apis/credentials/consent
- GitHub Actions: https://github.com/krishnaagrwl1997/life-on-paper/actions

---

## After launch

- [ ] Mail the waitlist by hand — export from Supabase (Table Editor → `waitlist`). There is no sending infrastructure, so batch one is manual.
- [ ] Read the first ten entries people actually write. That is your real product research.
- [ ] Watch for the `DATE TO CONFIRM`-class bugs: internal scaffolding leaking into a reader's page.
- [ ] The editorial rules in `AGENTS.md` §7 are the product's soul. Keep them.
