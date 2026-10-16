// Dictation on Today, driven by a fake SpeechRecognition so results are
// scripted and deterministic (headless Chrome has no real speech engine).
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { launch, typeInto } from "./cdp.mjs";

const FAKE_RECOGNITION = `
  window.__starts = 0;
  class FakeRec {
    constructor() { window.__rec = this; this.lang = ""; }
    start() { window.__starts++; window.__langs = (window.__langs || []).concat(this.lang); setTimeout(() => this.onstart && this.onstart(), 10); }
    stop() { setTimeout(() => this.onend && this.onend(), 10); }
    abort() { setTimeout(() => this.onend && this.onend(), 10); }
    emit(list) { const results = list.map(([t, f]) => ({ isFinal: f, 0: { transcript: t } })); this.onresult({ results }); }
    end() { this.onend(); }
  }
  window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
`;

const FIELD = `document.querySelector('#today-lines').value`;
const UI = `({
  mic: document.querySelector('.today-mic')?.innerText.trim(),
  bar: document.querySelector('.today-listening')?.innerText.replace(/\\s+/g, ' ').trim() ?? null,
  starts: window.__starts,
})`;
const MIC = `document.querySelector('.today-mic')`;

describe("dictation", () => {
  let s;

  const expectField = async (expected) => {
    const value = await s.poll(FIELD, (v) => v === expected, { timeout: 3000 });
    assert.equal(value, expected);
  };
  const expectUi = async (check, label) => {
    const u = await s.poll(UI, check, { timeout: 3000 });
    assert.ok(check(u), `${label}: ${JSON.stringify(u)}`);
    return u;
  };
  const isListening = (u) => u?.mic === "Stop" && /listening/i.test(u.bar ?? "");
  const isStopped = (u) => u?.mic === "Speak" && u.bar === null;

  before(async () => {
    s = await launch();
    await s.send("Page.enable");
    await s.send("Runtime.enable");
    await s.send("Page.addScriptToEvaluateOnNewDocument", { source: FAKE_RECOGNITION });
    await s.blockAI();
    await s.seed("fresh");
    await s.waitFor(`!!document.querySelector('#today-lines')`, 15000);
  });

  after(async () => {
    await s?.close();
  });

  it("no orange box on the writing field", async () => {
    await s.ev(`document.querySelector('#today-lines').focus()`);
    assert.equal(await s.ev(`getComputedStyle(document.querySelector('#today-lines')).outlineStyle`), "none");
  });

  it("Speak → listening bar right away", async () => {
    await s.click(MIC);
    await expectUi(isListening, "listening");
  });

  it("interim words appear, capitalised", async () => {
    await s.ev(`__rec.emit([["aaj office mein", false]])`);
    await expectField("Aaj office mein");
  });

  it("bar says Hearing you, no duplicate text", async () => {
    await expectUi((u) => /hearing you/i.test(u?.bar ?? "") && !/office/.test(u.bar), "hearing you");
  });

  it("spoken full stop becomes '.'", async () => {
    await s.ev(`__rec.emit([["aaj office mein bahut kaam tha full stop", true]])`);
    await expectField("Aaj office mein bahut kaam tha.");
  });

  it("pause: stays listening, restarts quietly", async () => {
    await s.ev(`__rec.end()`);
    await expectUi((u) => isListening(u) && u.starts === 2, "restarted once");
  });

  it("new sentence capitalised, comma", async () => {
    await s.ev(`__rec.emit([["phir hum chai pe gaye comma bahut maza aaya", true]])`);
    await expectField("Aaj office mein bahut kaam tha. Phir hum chai pe gaye, bahut maza aaya");
  });

  it("typing mid-dictation is kept, nothing repeated", async () => {
    await s.ev(typeInto("#today-lines", ". Riya bhi thi.", { append: true }));
    await s.poll(FIELD, (v) => v?.endsWith("Riya bhi thi."), { timeout: 2000 });
    await s.ev(`__rec.emit([["phir hum chai pe gaye comma bahut maza aaya", true], ["new paragraph ghar aake so gaya", false]])`);
    await expectField("Aaj office mein bahut kaam tha. Phir hum chai pe gaye, bahut maza aaya. Riya bhi thi.\n\nGhar aake so gaya");
  });

  it("switching to हिंदी mid-dictation restarts in hi-IN", async () => {
    await s.click(`[...document.querySelectorAll('.today-dictation__langs button')][1]`);
    const result = await s.poll(`({ mic: document.querySelector('.today-mic')?.innerText.trim(), lang: (window.__langs || []).at(-1) })`, (v) => v?.mic === "Stop" && v.lang === "hi-IN", { timeout: 3000 });
    assert.deepEqual(result, { mic: "Stop", lang: "hi-IN" });
  });

  it("Shape keeps the words still being spoken, and stops the mic", async () => {
    await s.ev(`__rec.emit([["बहुत अच्छा दिन था", false]])`);
    await s.poll(FIELD, (v) => v?.endsWith("बहुत अच्छा दिन था"), { timeout: 2000 });
    await s.click(`document.querySelector('.today-composer__action')`);
    const saved = await s.poll(
      `JSON.parse(localStorage.getItem('life-in-books-pages') || '[]').map(p => p.originalText)`,
      (v) => v?.length === 1,
      { timeout: 8000 },
    );
    assert.equal(saved.length, 1, JSON.stringify(saved));
    assert.ok(saved[0].endsWith("बहुत अच्छा दिन था"), JSON.stringify(saved));
    await expectUi(isStopped, "stopped after Shape");
  });

  it("Escape stops dictation", async () => {
    await s.click(MIC);
    await expectUi(isListening, "listening");
    await s.ev(`(() => { const t = document.querySelector('#today-lines'); t.focus(); t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`);
    await expectUi((u) => u?.mic === "Speak", "stopped by Escape");
  });

  it("Done button stops dictation", async () => {
    await s.click(MIC);
    await expectUi(isListening, "listening");
    await s.click(`document.querySelector('.today-listening__done')`);
    await expectUi(isStopped, "stopped by Done");
  });

  it("phone: no sideways scroll while listening", async () => {
    await s.setViewport(390, 844, { deviceScaleFactor: 2, mobile: true });
    await s.click(MIC);
    await expectUi(isListening, "listening");
    await s.ev(`__rec.emit([["testing on the phone", false]])`);
    await s.ev(`document.querySelector('.today-composer').scrollIntoView({ block: 'center' })`);
    await s.poll(`document.querySelector('.today-listening')?.innerText`, (v) => /hearing you/i.test(v ?? ""), { timeout: 2000 });
    const dims = await s.ev(`({ scrollWidth: document.documentElement.scrollWidth, innerWidth })`);
    assert.ok(dims.scrollWidth <= dims.innerWidth, JSON.stringify(dims));
  });
});
