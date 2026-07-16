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
  const [home, interview, library, garden, nav, layout, transcription] = await Promise.all([
    readFile(new URL("../components/system/home-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/memory-interview.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/library-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/garden-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/nav-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/system/use-live-transcription.ts", import.meta.url), "utf8"),
  ]);

  for (const destination of ["Home", "Library", "Add Memory", "Garden"]) {
    assert.match(nav, new RegExp(`label: \\\"${destination}\\\"`));
  }
  assert.match(home, /Add a photo/);
  assert.match(home, /Add a screenshot/);
  assert.match(home, /Speak and transcribe/);
  assert.match(home, /Type or speak\. Your words stay editable/);
  assert.match(interview, /Speak and transcribe this answer/);
  assert.match(interview, /Speak and transcribe this memory/);
  assert.match(transcription, /SpeechRecognition/);
  assert.match(transcription, /interimResults = true/);
  assert.match(interview, /File/);
  assert.match(interview, /Prompt \{questionIndex \+ 1\} of up to 3/);
  assert.match(interview, /function contextualQuestion/);
  assert.match(interview, /Who noticed this about you/);
  assert.match(interview, /How did this moment feel/);
  assert.match(interview, /Review what I heard/);
  assert.match(interview, /Return to conversation/);
  assert.match(interview, /This memory belongs here/);
  assert.match(interview, /Why this chapter/);
  assert.match(interview, /Change chapter/);
  assert.match(interview, /Create a new chapter/);
  assert.match(interview, /Place &amp; design this page/);
  assert.match(interview, /Your page is taking shape/);
  assert.match(interview, /This is how your memory reads/);
  assert.match(interview, /Try another layout/);
  assert.match(interview, /Keep this page/);
  assert.match(interview, /Your page is ready/);
  assert.match(interview, /Open in Library/);
  assert.match(interview, /Page kept/);
  for (const layout of ["Story", "Quote", "Illustration", "Little Things", "Letter", "Timeline", "Travel", "People", "Reflection"]) {
    assert.match(interview, new RegExp(`name: \"${layout}\"`));
  }
  assert.match(home, /life-in-books-pages/);
  assert.match(library, /A library only you could have written/);
  assert.match(library, /Volume I/);
  assert.match(library, /Volume II/);
  assert.match(library, /Toggle reading by lamplight/);
  assert.match(library, /About 2 minutes left in this page/);
  assert.match(library, /reader-type-controls/);
  assert.match(library, /Previous/);
  assert.match(library, /Next/);
  assert.match(library, /Open Book Studio/);
  assert.match(library, /Shape the book, without losing the life behind it/);
  assert.match(library, /Preview complete book/);
  assert.match(library, /Original memory remains attached/);
  assert.match(library, /Request-only/);
  assert.match(library, /Selected previews/);
  assert.match(library, /Restore/);
  assert.match(library, /Keep these edits/);
  assert.match(interview, /Add a photo to this moment/);
  assert.match(interview, /Photo attached to this memory/);
  assert.match(garden, /Other lives, opened carefully/);
  assert.match(garden, /No audience metrics/);
  assert.match(garden, /Request to read/);
  assert.match(garden, /Request sent/);
  assert.match(garden, /Read permitted preview/);
  assert.match(garden, /Private book/);
  for (const author of ["Maya Sen", "Jon Bell", "Amina Yusuf", "Elias Hart", "Noor Patel"]) {
    assert.match(garden, new RegExp(author));
  }
  assert.equal((interview.match(/id: \"trust\"/g) ?? []).length, 1);
  assert.equal((interview.match(/const feelings = \[/g) ?? []).length, 1);
  assert.match(layout, /Your life, beautifully remembered/);
  assert.doesNotMatch(`${home}\n${interview}`, /dashboard|sign in|log in/i);
});
