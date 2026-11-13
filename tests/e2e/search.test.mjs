// Search: starting points come from the book, typos still find the page,
// and a result opened from search comes back to the same results.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { BASE, launch } from "./cdp.mjs";

const PAGES = `(() => {
  const now = Date.now(), d = (n) => new Date(now - n * 864e5).toISOString(), fmt = (n) => new Date(now - n * 864e5).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const mk = (id, n, title, body, chapterTitle, people = [], emotions = []) => ({ id, title, excerpt: body[0], body, reflection: "", book: "Book One", volume: "Volume I · The Present", chapter: "Chapter 1", chapterTitle, layout: "Story", date: fmt(n), createdAt: d(n), originalText: body.join(" "), people, emotions, writingVersion: 6, writingLanguage: "original", writingStyle: "almost-unchanged", artworkLevel: "subtle", photoTreatment: "painterly", aiPolished: true });
  localStorage.clear();
  localStorage.setItem("life-in-books-pages", JSON.stringify([
    mk("p1", 1, "The Light in October", ["I walked home by the lake. Amma called later and laughed."], "October", ["Amma"], ["calm"]),
    mk("p2", 3, "Chai with Amma", ["Aaj Amma ke saath chai pi, bahut din baad."], "October", ["Amma"]),
    mk("p3", 9, "Rahul's Message", ["Rahul texted. We talked about the hostel for an hour."], "Hostel", ["Rahul"], ["happy"]),
    mk("p4", 20, "पहली बारिश", ["आज पहली बारिश हुई। चाय ठंडी हो गई।"], "Monsoon"),
  ]));
  localStorage.setItem("life-in-books-onboarding-complete", "yes");
  localStorage.setItem("life-on-paper-clean-start-v1", "complete");
  localStorage.setItem("life-on-paper-habit-dismissed", String(Date.now()));
  sessionStorage.clear();
})()`;

const STATE = `({
  query: document.querySelector('.memory-search__field input')?.value ?? null,
  count: document.querySelector('.memory-search__count')?.textContent ?? null,
  results: [...document.querySelectorAll('.memory-search__list strong')].map((n) => n.textContent),
  suggest: document.querySelector('.memory-search__suggest')?.textContent ?? null,
})`;

const search = (text) => `(() => {
  const input = document.querySelector('.memory-search__field input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(text)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return input.value;
})()`;

describe("search", () => {
  let s;

  before(async () => {
    s = await launch();
    await s.send("Page.enable");
    await s.send("Runtime.enable");
    await s.setViewport(390, 844, { deviceScaleFactor: 2, mobile: true });
    await s.blockAI();
    await s.go(`${BASE}/`, { hydrated: false });
    await s.ev(PAGES);
    await s.go(`${BASE}/today?s=story&v=search`);
    await s.waitFor(`!!document.querySelector('.memory-search__field input')`);
  });

  after(async () => {
    await s?.close();
  });

  it("the Search tab is the one lit, not Story", async () => {
    const lit = await s.ev(`[...document.querySelectorAll('[aria-current="page"]')].map((n) => n.getAttribute('aria-label') || n.textContent.trim())`);
    assert.deepEqual(lit, ["Search your life"]);
  });

  it("starting points are the book's own people, chapters and feelings", async () => {
    const groups = await s.ev(`[...document.querySelectorAll('.memory-search__start section')].map((g) => g.querySelector('h2').textContent + ': ' + [...g.querySelectorAll('button')].map((b) => b.textContent).join(', '))`);
    assert.deepEqual(groups.filter((g) => !g.startsWith("Months")), ["People: Amma, Rahul", "Chapters: October, Hostel, Monsoon", "Feelings: Calm, Happy"]);
  });

  it("a person's chip finds their pages, title matches first", async () => {
    await s.click(`[...document.querySelectorAll('.memory-search__chips button')].find((b) => b.textContent === 'Amma')`);
    const state = await s.poll(STATE, (v) => v.results.length === 2);
    assert.equal(state.query, "Amma");
    assert.deepEqual(state.results, ["Chai with Amma", "The Light in October"]);
  });

  it("swapped letters still find the page", async () => {
    await s.ev(search("hostle"));
    const state = await s.poll(STATE, (v) => v.count === "1 page");
    assert.deepEqual(state.results, ["Rahul's Message"]);
  });

  it("Hindi words match, with a typo too", async () => {
    await s.ev(search("बारिस"));
    const state = await s.poll(STATE, (v) => v.results.length === 1);
    assert.deepEqual(state.results, ["पहली बारिश"]);
  });

  it("offers the nearest word from the book when nothing matches", async () => {
    await s.ev(search("rahool"));
    const state = await s.poll(STATE, (v) => Boolean(v.suggest));
    assert.equal(state.count, "No pages mention “rahool”.");
    assert.equal(state.suggest, "Did you mean Rahul?");
    await s.click(`document.querySelector('.memory-search__suggest')`);
    assert.deepEqual((await s.poll(STATE, (v) => v.query === "Rahul")).results, ["Rahul's Message"]);
  });

  it("a result opens in the reader, and Results comes back to the same search", async () => {
    await s.ev(search("amma"));
    await s.poll(STATE, (v) => v.results.length === 2);
    await s.click(`document.querySelector('.memory-search__list button')`);
    await s.waitFor(`location.search.includes('v=reader')`);
    await s.click(`document.querySelector('[aria-label="Close reader and return to search results"]')`);
    const state = await s.poll(STATE, (v) => v.results.length === 2);
    assert.equal(state.query, "amma");
  });

  it("Back from the reader keeps the search too", async () => {
    await s.click(`document.querySelector('.memory-search__list button')`);
    await s.waitFor(`location.search.includes('v=reader')`);
    await s.ev(`history.back()`);
    const state = await s.poll(STATE, (v) => v.results.length === 2, { timeout: 8000 });
    assert.equal(state.query, "amma");
  });
});
