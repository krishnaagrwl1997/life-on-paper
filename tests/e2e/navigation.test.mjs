// Navigation: every screen has its own address, and Back/Forward walk the
// app's own steps instead of dropping the reader on the homepage.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { launch, sleep } from "./cdp.mjs";

const STATE = `(() => ({
  url: location.pathname + location.search,
  title: document.title,
  screen: document.querySelector('[aria-label="Write today\\'s lines"]') ? "today"
    : document.querySelector('.cast-back') ? "person"
    : document.querySelector('.library-experience, .library-intro, .book-detail-hero') && !document.querySelector('.reader-page, .reader-view') ? "story"
    : document.querySelector('.reader-page, .reader-view') ? "reader"
    : "unknown",
  sheet: !!document.querySelector('[role="dialog"]'),
}))()`;

const navButton = (label) =>
  `[...document.querySelectorAll('[aria-label="Primary navigation"] button, nav button')].find(b => b.innerText.trim() === ${JSON.stringify(label)})`;

const matches = (actual, expected) =>
  !!actual && Object.entries(expected).every(([k, v]) => (v instanceof RegExp ? v.test(actual[k]) : actual[k] === v));

/** Launch a browser seeded with three pages, open on /today. */
async function start() {
  const s = await launch();
  await s.send("Page.enable");
  await s.send("Runtime.enable");
  await s.blockAI();
  await s.trackNetwork();
  await s.seed("today");
  return s;
}

/** Wait (briefly) for the page to reach the expected state, then assert it. */
async function expectState(s, expected, timeout = 8000) {
  const actual = await s.poll(STATE, (v) => matches(v, expected), { timeout });
  assert.ok(matches(actual, expected), `expected ${JSON.stringify(expected, (_, v) => (v instanceof RegExp ? String(v) : v))}, got ${JSON.stringify(actual)}`);
}

/** The homepage has rendered and its route prefetches have settled. */
async function expectHomepage(s) {
  await expectState(s, { url: "/", title: /^Life on Paper/, screen: "unknown" }, 15000);
  await s.waitFor(`!document.querySelector('.today-wordmark')`, 15000);
  await s.networkIdle();
}

describe("navigation and the Back button", () => {
  let s;

  before(async () => {
    s = await start();
  });

  after(async () => {
    await s?.close();
  });

  it("lands on Today", async () => {
    await expectState(s, { url: "/today", screen: "today", title: /^Today/ }, 15000);
  });

  it("Story tab has its own address", async () => {
    await s.click(navButton("Story"));
    await expectState(s, { url: "/today?s=story", screen: "story", title: /Your book/ });
  });

  it("reader has its own address", async () => {
    await s.click(`document.querySelector('.library-recents button') || [...document.querySelectorAll('button')].find(b => /Continue reading|Read/.test(b.innerText))`);
    await expectState(s, { url: /\/today\?s=story&v=reader&p=day-/, screen: "reader" });
  });

  it("refresh keeps the reader", async () => {
    const loaded = s.once("Page.loadEventFired", 30000);
    await s.send("Page.reload");
    await loaded;
    await expectState(s, { url: /v=reader/, screen: "reader" }, 15000);
  });

  it("Back → Story shelf", async () => {
    await s.ev("history.back()");
    await expectState(s, { url: "/today?s=story", screen: "story" });
  });

  it("Back → Today (not the homepage)", async () => {
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today" });
  });

  it("Forward → Story again", async () => {
    await s.ev("history.forward()");
    await expectState(s, { url: "/today?s=story", screen: "story" });
  });

  it("People tab", async () => {
    await s.click(navButton("People"));
    await expectState(s, { url: "/today?s=people", title: /People/ });
  });

  it("Person opens as its own step", async () => {
    await s.click(`document.querySelector('.cast-card, [class*="cast-card"] button, [class*="cast"] button')`);
    await expectState(s, { url: /person=1/ });
  });

  it("Back closes the person", async () => {
    await s.ev("history.back()");
    await expectState(s, { url: "/today?s=people" });
  });

  it("Profile opens as its own step", async () => {
    await s.click(navButton("Today"));
    await expectState(s, { url: "/today", screen: "today" });
    await s.click(`document.querySelector('[aria-label="Profile"]')`);
    await expectState(s, { url: /profile=1/ });
  });

  it("Back closes profile → Today", async () => {
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today" });
  });

  it("Add sheet opens as its own step", async () => {
    await s.click(`document.querySelector('[aria-label="Add a moment"]')`);
    await expectState(s, { url: /add=1/ });
  });

  it("Back closes the Add sheet", async () => {
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today", sheet: false });
  });

  it("Wordmark goes to the homepage", async () => {
    await s.click(`document.querySelector('a.today-wordmark')`);
    await expectHomepage(s);
  });

  // Regression: after the reader was refreshed, Back from the homepage used to
  // change the address to /today but leave the homepage on screen (a stale
  // Next.js router snapshot). HistoryGuard in components/system/pwa.tsx fixes it.
  it("Back from homepage → app (after a reader refresh)", async () => {
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today" }, 10000);
  });

  it("Back from homepage → app", async () => {
    // A fresh session, so this checks the plain case independently of the bug above.
    await s.seed("today");
    await expectState(s, { url: "/today", screen: "today" }, 15000);
    await s.click(`document.querySelector('a.today-wordmark')`);
    await expectHomepage(s);
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today" }, 15000);
  });
});

describe("Back from the homepage after refreshing the reader", () => {
  let s;

  before(async () => {
    s = await start();
  });

  after(async () => {
    await s?.close();
  });

  it("refreshed reader → Back → Back → wordmark → Back returns to Today", async () => {
    await expectState(s, { url: "/today", screen: "today" }, 15000);
    await s.click(navButton("Story"));
    await expectState(s, { url: "/today?s=story", screen: "story" });
    await s.click(`document.querySelector('.library-recents button')`);
    await expectState(s, { url: /v=reader/, screen: "reader" });
    const loaded = s.once("Page.loadEventFired", 30000);
    await s.send("Page.reload");
    await loaded;
    await expectState(s, { url: /v=reader/, screen: "reader" }, 15000);
    // Human-ish pauses: the bug shows reliably with them, rarely without.
    await s.ev("history.back()");
    await expectState(s, { url: "/today?s=story", screen: "story" });
    await sleep(300);
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today" });
    await sleep(300);
    await s.click(`document.querySelector('a.today-wordmark')`);
    await expectHomepage(s);
    await sleep(1500);
    await s.ev("history.back()");
    await expectState(s, { url: "/today", screen: "today" }, 10000);
  });
});
