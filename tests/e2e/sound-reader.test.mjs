// Keeping a sound on Today, then reading and playing it back in the reader.
// Chrome's fake media device stands in for the microphone.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { BASE, launch, sleep } from "./cdp.mjs";

const RECT = (selector) =>
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; })()`;

describe("sound keepsake in the reader", () => {
  let s;
  let soundId;

  const openReader = async (pageId, [width, height, dpr, mobile]) => {
    await s.setViewport(width, height, { deviceScaleFactor: dpr, mobile });
    await s.go(`${BASE}/today?s=story&v=reader&p=${pageId}`);
    await s.waitFor(`!!document.querySelector('.reader-page')`, 15000);
  };

  before(async () => {
    s = await launch({
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
    });
    await s.send("Page.enable");
    await s.send("Runtime.enable");
    await s.setViewport(1000, 650, { deviceScaleFactor: 2 });
    await s.blockAI();
    await s.seed("sound");
  });

  after(async () => {
    await s?.close();
  });

  it("records a sound and saves it as a keepsake on a new page", async () => {
    await s.click(`document.querySelector('.today-record')`, { userGesture: true });
    const bar = await s.poll(`document.querySelector('.today-listening--record')?.innerText ?? null`, Boolean, { timeout: 5000 });
    const error = await s.ev(`document.querySelector('.today-mic-error')?.innerText ?? null`);
    assert.ok(bar, `recording did not start (mic error: ${error})`);
    await sleep(2600); // let the fake device record ~2.5s of audio
    await s.click(`document.querySelector('.today-record')`);
    soundId = await s.poll(
      `JSON.parse(localStorage.getItem('life-in-books-pages') || '[]').find(p => (p.keepsakes || []).length)?.id ?? null`,
      Boolean,
      { timeout: 10000 },
    );
    assert.ok(soundId, "no page with a keepsake was saved");
  });

  it("reader shows a play button for the sound", async () => {
    assert.ok(soundId, "needs the recorded page");
    await openReader(soundId, [1000, 650, 2, false]);
    assert.ok(await s.waitFor(`!!document.querySelector('.reader-page .keepsake__play')`, 8000));
  });

  it("playing shows progress like '1s / 2s'", async () => {
    await s.click(`document.querySelector('.reader-page .keepsake__play')`, { userGesture: true });
    const text = await s.poll(
      `document.querySelector('.reader-page .keepsake')?.innerText.replace(/\\n/g, ' | ') ?? null`,
      (v) => /\d+s \/ \d+s/.test(v ?? ""),
      { timeout: 6000, interval: 50 },
    );
    assert.match(text ?? "", /\d+s \/ \d+s/);
  });

  it("phone (390px): no horizontal overflow in the reader", async () => {
    await openReader(soundId, [390, 844, 2, true]);
    await s.waitFor(`!!document.querySelector('.reader-page .keepsake__play')`, 8000);
    const dims = await s.ev(`({ scrollWidth: document.documentElement.scrollWidth, innerWidth })`);
    assert.ok(dims.scrollWidth <= dims.innerWidth, JSON.stringify(dims));
  });

  it("desktop (1440px): reader top bar spans the full viewport width", async () => {
    await openReader(soundId, [1440, 900, 1, false]);
    const bar = await s.poll(RECT(".reader-kindle-bar"), (r) => r && r.width > 0, { timeout: 8000 });
    const vw = await s.ev(`document.documentElement.clientWidth`);
    assert.ok(bar, "no .reader-kindle-bar");
    assert.ok(bar.left <= 0.5 && bar.right >= vw - 0.5, JSON.stringify({ bar, vw }));
  });

  it("phone (390x844): footer sits inside the reader page on a short page", async () => {
    await openReader("day-c", [390, 844, 2, true]);
    const box = await s.poll(
      `({ page: ${RECT(".reader-page")}, footer: ${RECT(".reader-page > footer")} })`,
      (v) => v?.page && v.footer,
      { timeout: 8000 },
    );
    assert.ok(box.page && box.footer, JSON.stringify(box));
    assert.ok(box.footer.bottom <= box.page.bottom + 0.5 && box.footer.top >= box.page.top - 0.5, JSON.stringify(box));
  });
});
