// Adding a photo on Today: the picker opens without leaving the page, the
// photo shows in the writing card, and it is saved with the page.
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { dirname } from "node:path";
import { after, before, describe, it } from "node:test";
import { launch, makeTestPng, typeInto } from "./cdp.mjs";

describe("photo on Today", () => {
  let s;
  let png;

  before(async () => {
    png = makeTestPng();
    s = await launch();
    await s.send("Page.enable");
    await s.send("Runtime.enable");
    await s.send("DOM.enable");
    await s.setViewport(390, 844, { deviceScaleFactor: 2, mobile: true });
    await s.blockAI();
    await s.seed("fresh");
    await s.send("Page.setInterceptFileChooserDialog", { enabled: true });
  });

  after(async () => {
    await s?.close();
    if (png) rmSync(dirname(png), { recursive: true, force: true });
  });

  it("Photo opens the picker and stays on Today", async () => {
    const chooser = s.once("Page.fileChooserOpened", 5000).then(() => true, () => false);
    // A file chooser only opens from a user gesture.
    await s.click(`document.querySelector('[aria-label="Add a photo"]')`, { userGesture: true });
    assert.equal(await chooser, true, "file chooser did not open");
    assert.equal(await s.ev(`location.pathname + location.search`), "/today");
  });

  it("photo shows in the writing card", async () => {
    const { root } = await s.send("DOM.getDocument");
    const { nodeId } = await s.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".today-composer input[type=file]" });
    assert.ok(nodeId, "no file input in the composer");
    await s.send("DOM.setFileInputFiles", { nodeId, files: [png] });
    const thumb = await s.poll(
      `(() => { const i = document.querySelector('.today-photo img'); return i && i.complete && i.naturalWidth ? { w: i.naturalWidth, h: i.naturalHeight, jpeg: i.src.startsWith('data:image/jpeg') } : null })()`,
      Boolean,
      { timeout: 8000 },
    );
    assert.ok(thumb?.jpeg, JSON.stringify(thumb));
  });

  it("placeholder asks about the photo", async () => {
    assert.equal(await s.ev(`document.querySelector('#today-lines').placeholder`), "What's the story behind this photo?");
  });

  it("page saved with the photo", async () => {
    await s.ev(typeInto("#today-lines", "Evening walk by the lake with Amma. The sky went pink."));
    await s.click(`document.querySelector('.today-composer__action')`);
    const saved = await s.poll(
      `JSON.parse(localStorage.getItem('life-in-books-pages') || '[]').map(p => (p.photo || '').slice(0, 22))`,
      (v) => v?.length === 1,
      { timeout: 8000 },
    );
    assert.equal(saved.length, 1, JSON.stringify(saved));
    assert.ok(saved[0].startsWith("data:image/jpeg"), JSON.stringify(saved));
  });

  it("composer cleared, new page shows photo", async () => {
    const state = await s.poll(
      `({ composerPhoto: !!document.querySelector('.today-photo'), newPagePhoto: !!document.querySelector('.today-new-page__photo') })`,
      (v) => v && !v.composerPhoto && v.newPagePhoto,
      { timeout: 5000 },
    );
    assert.deepEqual(state, { composerPhoto: false, newPagePhoto: true });
  });
});
