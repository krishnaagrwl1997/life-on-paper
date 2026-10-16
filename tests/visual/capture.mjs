// Visual regression: see tests/visual/README in AGENTS.md §10.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.env.E2E_BASE || "http://localhost:3124").replace(/\/$/, "");
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9333",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "navtest-"))}`, "--window-size=1280,900", "about:blank",
], { stdio: "ignore" });
const OUT = process.env.VISUAL_DIR || "tests/visual/.shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch("http://127.0.0.1:9333/json")).json();
      const page = list.find((t) => t.type === "page");
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch {}
    await sleep(250);
  }
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (url) => { await send("Page.navigate", { url }); await sleep(3500); };

import { writeFileSync, mkdirSync } from "node:fs";
const tag = process.argv[2];
mkdirSync(`${OUT}/${tag}`, { recursive: true });
const click = (js) => ev(`(() => { const el = ${js}; if (!el) return "MISSING"; el.click(); return "ok"; })()`);
await connect(); await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Fetch.enable", { patterns: [{ urlPattern: "*memory-engine*" }, { urlPattern: "*posthog*" }] });
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.method === "Fetch.requestPaused") send("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "Failed" }); });
const FIXED_NOW = Date.parse("2026-10-16T10:00:00Z");
const seed = (opts = {}) => ev(`(() => {
  const now = ${FIXED_NOW}, d = (n) => new Date(now - n * 864e5).toISOString(), fmt = (n) => new Date(now - n * 864e5).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const mk = (id, n, title, body, volume, chapterTitle, people = []) => ({ id, title, excerpt: body[0], body, reflection: "", book: "Book One", volume, chapter: "Chapter 1", chapterTitle, layout: "Story", date: fmt(n), createdAt: d(n), originalText: body.join(" "), people, writingVersion: 6, writingLanguage: "original", writingStyle: "almost-unchanged", artworkLevel: "subtle", photoTreatment: "painterly", aiPolished: true });
  const pages = [
    mk("p1", 1, "The Light in October", ["Today was so long. Work was just work. But then I walked home by the lake.", "Amma called later. She laughed at something I said, and I felt better."], "Volume I · The Present", "October", ["Amma"]),
    mk("p2", 3, "Chai with Amma", ["Aaj Amma ke saath chai pi, bahut din baad."], "Volume I · The Present", "October", ["Amma"]),
    mk("p3", 6, "Nani's Courtyard", ["Summers at Nani's house when I was eight. The courtyard smelled of wet earth."], "Volume II · Early Years", "Summers", ["Nani"]),
    mk("p4", 8, "Rahul's Message", ["Rahul texted out of nowhere. We talked about the hostel for an hour."], "Volume III · College", "Hostel", ["Rahul"]),
  ];
  localStorage.clear();
  localStorage.setItem("life-in-books-pages", JSON.stringify(pages));
  localStorage.setItem("life-in-books-onboarding-complete", "yes");
  localStorage.setItem("life-on-paper-clean-start-v1", "complete");
  localStorage.setItem("life-in-books-book-title", "The Long Way Home");
  ${opts.habit ? "" : 'localStorage.setItem("life-on-paper-habit-dismissed", String(Date.now()));'}
})()`);
// Freeze the clock so dates are identical between runs.
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const real = Date; const offset = ${FIXED_NOW} - real.now(); class FakeDate extends real { constructor(...a) { if (a.length) super(...a); else super(real.now() + offset); } static now() { return real.now() + offset; } } window.Date = FakeDate; })();` });
let n = 0;
const snap = async (name, full = false) => {
  await sleep(900);
  await ev(`document.fonts.ready.then(() => true)`);
  let params = { format: "png" };
  if (full) {
    const m = await send("Page.getLayoutMetrics");
    const h = Math.min(12000, Math.ceil(m.result.cssContentSize.height));
    params = { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: m.result.cssLayoutViewport.clientWidth, height: h, scale: 1 } };
  }
  const r = await send("Page.captureScreenshot", params);
  writeFileSync(`${OUT}/${tag}/${String(++n).padStart(2, "0")}-${name}.png`, Buffer.from(r.result.data, "base64"));
};
for (const [label, w, h, mobile] of [["desk", 1280, 860, false], ["phone", 390, 844, true]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  for (const path of ["/", "/sample", "/gift", "/gift?from=Riya", "/privacy"]) { await go(`${BASE}${path}`); await snap(`${label}-page${path.replace(/[/?=]/g, "_")}`, true); }
  await go(`${BASE}/`); await ev(`localStorage.clear()`); await go(`${BASE}/today`); await sleep(2500); await snap(`${label}-onboarding`);
  await go(`${BASE}/`); await seed({ habit: true }); await go(`${BASE}/today`); await snap(`${label}-today-habit`, true);
  await go(`${BASE}/`); await seed(); await go(`${BASE}/today`); await snap(`${label}-today`, true);
  await click(`document.querySelector('[aria-label="Profile"]')`); await snap(`${label}-profile`, true);
  await go(`${BASE}/today?s=story`); await snap(`${label}-story`, true);
  await go(`${BASE}/today?s=story&v=book`); await snap(`${label}-book`, true);
  await go(`${BASE}/today?s=story&v=search`); await snap(`${label}-search`, true);
  await go(`${BASE}/today?s=story&v=weaves`); await snap(`${label}-weaves`, true);
  await go(`${BASE}/today?s=story&v=studio`); await snap(`${label}-studio`, true);
  await go(`${BASE}/today?s=people`); await snap(`${label}-people`, true);
  await click(`document.querySelector('.cast-card, [class*="cast-card"] button, [class*="cast"] button')`); await snap(`${label}-person`, true);
  await go(`${BASE}/today?s=write&m=Write`); await snap(`${label}-write`);
  await go(`${BASE}/today?s=story&v=reader&p=p1`); await snap(`${label}-reader`);
  await click(`document.querySelector('[aria-label="Open book contents"]')`); await snap(`${label}-reader-contents`);
  await go(`${BASE}/today?s=story&v=reader&p=p1`); await click(`document.querySelector('[aria-label="Open reading settings"]')`); await snap(`${label}-reader-settings`);
  await go(`${BASE}/today?s=story&v=reader&p=p1`); await click(`document.querySelector('[aria-label="Page options"]')`); await snap(`${label}-reader-menu`);
  await click(`[...document.querySelectorAll('.reader-page-menu button')][1]`); await snap(`${label}-reader-move`);
  await go(`${BASE}/today?s=story&v=reader&p=p1`); await click(`document.querySelector('[aria-label="Page options"]')`); await sleep(300); await click(`[...document.querySelectorAll('.reader-page-menu button')][0]`); await snap(`${label}-reader-edit`);
  await go(`${BASE}/today?s=story&v=reader&p=p1`); await click(`document.querySelector('[aria-label="Toggle reading by lamplight"]')`); await snap(`${label}-reader-lamp`);
  await go(`${BASE}/today`); await click(`document.querySelector('[aria-label="Add a moment"]')`); await snap(`${label}-add-sheet`);
}
console.log("shots:", n);
chrome.kill(); process.exit(0);
