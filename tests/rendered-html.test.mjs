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

