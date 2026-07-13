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

test("server-renders the Life In Books home experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Life In Books/);
  assert.match(html, /What part of today would you never want to forget\?/);
  assert.match(html, /Begin this memory/);
  assert.match(html, /Your book/);
  assert.match(html, /Recently placed/);
});

test("keeps the four-destination memoir shell explicit", async () => {
  const [home, interview, library, garden, nav, layout] = await Promise.all([
    readFile(new URL("../components/system/home-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/memory-interview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/library-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/garden-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/nav-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  for (const destination of ["Home", "Library", "Add Memory", "Garden"]) {
    assert.match(nav, new RegExp(`label: \\\"${destination}\\\"`));
  }
  assert.match(home, /Voice/);
  assert.match(home, /Photo/);
  assert.match(home, /Screenshot/);
  assert.match(home, /Write/);
  assert.match(interview, /File/);
  assert.match(interview, /Question \{questionIndex \+ 1\} of up to 3/);
  assert.match(interview, /Here&apos;s what I heard/);
  assert.match(interview, /This memory belongs here/);
  assert.match(interview, /Why this chapter/);
  assert.match(interview, /Change chapter/);
  assert.match(interview, /Create a new chapter/);
  assert.match(interview, /Place in this chapter/);
  assert.match(interview, /Design this page/);
  assert.match(interview, /Your page is taking shape/);
  assert.match(interview, /This is how your memory reads/);
  assert.match(interview, /Change layout/);
  assert.match(interview, /Keep this page/);
  assert.match(interview, /Page kept/);
  for (const layout of ["Story", "Quote", "Illustration", "Little Things", "Letter", "Timeline", "Travel", "People", "Reflection"]) {
    assert.match(interview, new RegExp(`name: \"${layout}\"`));
  }
  assert.match(home, /life-in-books-pages/);
  assert.match(library, /A library only you could have written/);
  assert.match(library, /Volume I/);
  assert.match(library, /Volume II/);
  assert.match(library, /Reading by lamplight/);
  assert.match(library, /Previous/);
  assert.match(library, /Next/);
  assert.match(interview, /Add a photo to this moment/);
  assert.match(interview, /Photo attached to this memory/);
  assert.match(garden, /Page Three/);
  assert.match(garden, /Lives &amp; Letters/);
  assert.match(garden, /This week in lives &amp; letters/);
  assert.match(garden, /Cover story/);
  assert.match(garden, /Editor&apos;s note/);
  assert.match(garden, /No likes, follower counts/);
  assert.match(garden, /Request to read/);
  assert.match(garden, /Request sent/);
  assert.match(garden, /Read permitted preview/);
  assert.match(garden, /Private book/);
  for (const author of ["Maya Sen", "Jon Bell", "Amina Yusuf", "Elias Hart", "Noor Patel"]) {
    assert.match(garden, new RegExp(author));
  }
  assert.equal((interview.match(/id: \"trust\"/g) ?? []).length, 1);
  assert.equal((interview.match(/const questions = \[/g) ?? []).length, 1);
  assert.match(layout, /Your life, beautifully remembered/);
  assert.doesNotMatch(`${home}\n${interview}`, /dashboard|sign in|log in/i);
});
