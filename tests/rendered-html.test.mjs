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
  const [home, nav, layout] = await Promise.all([
    readFile(new URL("../components/system/home-experience.tsx", import.meta.url), "utf8"),
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
  assert.match(layout, /Your life, beautifully remembered/);
  assert.doesNotMatch(home, /dashboard|sign in|log in/i);
});
