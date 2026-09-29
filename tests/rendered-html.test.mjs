import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function send(pathname, body) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `post-${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the public landing page at /", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Life on Paper/);
  assert.match(html, /Write ninety seconds a day/);
  assert.match(html, /Three quiet doors/);
  assert.match(html, /See what the editor does/);
});

test("keeps the three-door memoir shell and core flows explicit", async () => {
  const [home, memory, library, nav, profile, transcription] = await Promise.all([
    readFile(new URL("../components/system/home-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/memory-interview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/library-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/nav-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/profile-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/use-live-transcription.ts", import.meta.url), "utf8"),
  ]);

  for (const destination of ["Today", "Story", "People"]) {
    assert.match(nav, new RegExp(`label: \\"${destination}\\"`));
  }

  assert.match(home, /starterQuestions/);
  assert.match(memory, /Turn this into a page/);
  assert.match(memory, /See exactly what changed\./);
  assert.match(memory, /Keep in my book/);
  assert.match(transcription, /interimResults = true/);
  assert.match(library, /Open book contents/);
  assert.match(library, /Scroll inside the paper to read/);
  assert.match(library, /Toggle reading by lamplight/);
  assert.match(profile, /Google/);
});

test("carries the marketing demo's words into the first real entry", async () => {
  const [seed, widget, home] = await Promise.all([
    readFile(new URL("../lib/demo-seed.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/marketing/demo-widget.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/home-experience.tsx", import.meta.url), "utf8"),
  ]);

  // The key is defined once and shared, never duplicated as a literal.
  assert.match(seed, /export const DEMO_SEED_KEY/);
  assert.match(widget, /DEMO_SEED_KEY/);
  assert.match(home, /DEMO_SEED_KEY/);
  assert.match(home, /saveDailyEntry\(seed\)/);
});

test("guards Hinglish memories with named people against generic questions and titles", async () => {
  const guardrails = await readFile(new URL("../lib/ai/editorial-guardrails.ts", import.meta.url), "utf8");
  const memory = await readFile(new URL("../components/system/memory-interview.tsx", import.meta.url), "utf8");

  assert.match(guardrails, /ne\|ney/);
  assert.match(guardrails, /bola\|boli\|kaha/);
  assert.match(guardrails, /ne tumhare kaam ke baare mein exactly kya kaha tha/);
  assert.match(guardrails, /What \$\{grounding\.person\} Noticed in My Work/);
  assert.match(guardrails, /I was like/);
  assert.match(guardrails, /matlab/);
  assert.match(memory, /What \$\{personName\} Noticed in My Work/);
});

test("server-renders the readable sample book at /sample", async () => {
  const response = await render("/sample");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /A whole book/);
  assert.match(html, /The Long Way Home/);
  assert.match(html, /School Years/);
  // The promise the product makes is checkable on this page, so the control
  // that lets a reader see the raw entries must exist.
  assert.match(html, /As written/);
});

test("rejects a malformed waitlist email before touching storage", async () => {
  const response = await send("/api/waitlist", { email: "not-an-email" });
  assert.equal(response.status, 400);

  const payload = await response.json();
  assert.equal(payload.error, "INVALID_EMAIL");
});

/**
 * The waitlist holds real people's email addresses and is written with the
 * public key, so "nobody can read it back" is a security property, not a
 * preference. This test fails loudly if anyone ever adds a read path.
 */
test("the waitlist migration stays insert-only", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260920000000_waitlist.sql", import.meta.url),
    "utf8",
  );

  assert.match(sql, /for insert/i);
  assert.match(sql, /enable row level security/i);
  assert.doesNotMatch(sql, /for select/i);
  assert.doesNotMatch(sql, /for update/i);
  assert.doesNotMatch(sql, /for delete/i);
});


/**
 * Titles and placement both key off "who is this memory about". Two bugs made
 * it into production from that one seam:
 *
 *   1. the person regex carried /i, so it matched a lowercase common noun
 *      before a verb — "the chain came off" turned "chain" into a person and
 *      titled a Mysore bicycle memory "Mysore with chain";
 *   2. family words (Amma, Ajji, Appa) were not recognised as people at all, so
 *      a memory about a mother was filed under Places and titled after the
 *      market she happened to be standing in.
 *
 * These assertions are deliberately source-level: they fail if the /i creeps
 * back onto the name group, or if family anchors stop being consulted.
 */
test("never reads a lowercase common noun as a person", async () => {
  const [guardrails, interview] = await Promise.all([
    readFile(new URL("../lib/ai/editorial-guardrails.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/system/memory-interview.tsx", import.meta.url), "utf8"),
  ]);

  for (const source of [guardrails, interview]) {
    // The buggy shape: a capital-only name class made case-insensitive by /i.
    assert.doesNotMatch(
      source,
      /\(\[A-Z\]\[a-z\]\{1,24\}\)\\s\+\(\?\(\(\?:ne\|ney\)/,
      "the acting-person regex must not be /i over a capital-only class",
    );
    // The fix: match loosely, then require a real capital.
    assert.match(source, /\^\[A-Z\]\$|\[\^A-Z\]|\/\^\[A-Z\]\//);
  }
});

test("knows a family word is a person", async () => {
  const guardrails = await readFile(
    new URL("../lib/ai/editorial-guardrails.ts", import.meta.url),
    "utf8",
  );

  assert.match(guardrails, /detectFamilyAnchor/);
  assert.match(guardrails, /familyAnchorPattern/);
  // A family anchor must outrank a bare place mention.
  assert.match(guardrails, /isFamilyAnchorWord\(grounding\.person\)/);
  // And it must never be titled after the place:
  assert.match(guardrails, /return grounding\.person;/);
});

/**
 * Launch readiness: the pages and crawler files a public app is expected to
 * serve. A missing privacy policy is not just a polish gap — Google OAuth
 * verification wants a policy URL, and people writing about their families
 * deserve to know where their words go.
 */
test("serves the legal pages and crawler files", async () => {
  for (const path of ["/privacy", "/terms"]) {
    const response = await render(path);
    assert.equal(response.status, 200, `${path} should render`);
    const html = await response.text();
    assert.match(html, /Life on Paper/);
  }

  const privacy = await render("/privacy");
  assert.match(await privacy.text(), /your writing is yours/i);

  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = await render(path);
    assert.equal(response.status, 200, `${path} should be served`);
  }

  const health = await render("/api/health");
  assert.equal(health.status, 200);
  const body = await health.json();
  assert.equal(body.ok, true);
});
