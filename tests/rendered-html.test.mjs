import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the guest Life on Paper home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Life on Paper/);
  assert.match(html, /Speak naturally\. Keep the page forever\./);
  assert.match(html, /Personal memoir/);
  assert.match(html, /See contents/);
  assert.match(html, /Write the (?:first|next) page/);
});

test("keeps the five-destination memoir shell and core flows explicit", async () => {
  const [home, memory, library, garden, nav, profile, transcription] = await Promise.all([
    readFile(new URL("../components/system/home-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/memory-interview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/library-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/garden-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/nav-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/profile-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/use-live-transcription.ts", import.meta.url), "utf8"),
  ]);

  for (const destination of ["Home", "Library", "Add Memory", "Garden", "Profile"]) {
    assert.match(nav, new RegExp(`label: \\\"${destination}\\\"`));
  }

  assert.match(home, /starterQuestions/);
  assert.match(home, /Another question/);
  assert.match(home, /A note from your life/);
  assert.match(home, /Write the next page/);
  assert.match(memory, /What&apos;s on your mind, buddy\?/);
  assert.match(memory, /Let’s talk about it/);
  assert.match(memory, /And how did that make you feel\?/);
  assert.match(memory, /Pick one, a few, or leave it for now/);
  assert.match(memory, /Turn this into a page/);
  assert.match(memory, /See exactly what changed\./);
  assert.match(memory, /Keep in my book/);
  assert.match(transcription, /interimResults = true/);
  assert.match(library, /Open book contents/);
  assert.match(library, /Scroll inside the paper to read/);
  assert.match(library, /Toggle reading by lamplight/);
  assert.match(garden, /Request to read/);
  assert.match(profile, /Google/);
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
