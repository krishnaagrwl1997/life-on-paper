// A tiny Chrome DevTools Protocol driver for the end-to-end suite.
//
// Uses only Node 22 built-ins (global WebSocket + fetch) so the suite adds no
// npm dependencies. Each test file launches its own headless Chrome with a
// throwaway profile, drives one page target, and kills Chrome in `close()`.
//
// Env:
//   E2E_BASE     server under test (default http://localhost:3124)
//   CHROME_PATH  Chrome binary (default: the macOS Google Chrome app)

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

export const BASE = (process.env.E2E_BASE || "http://localhost:3124").replace(/\/$/, "");
const CHROME_PATH = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Launch headless Chrome and connect to its first page.
 * Chrome picks a free debugging port itself (--remote-debugging-port=0) and
 * writes it to DevToolsActivePort in the profile dir, so parallel runs never
 * collide on a fixed port.
 */
export async function launch({ args = [], width = 1280, height = 900 } = {}) {
  const userDataDir = mkdtempSync(join(tmpdir(), "lop-e2e-"));
  const chrome = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      `--window-size=${width},${height}`,
      ...args,
      "about:blank",
    ],
    // Own process group, so close() can take down Chrome's helpers too.
    { stdio: "ignore", detached: true },
  );
  let exited = false;
  chrome.on("exit", () => {
    exited = true;
  });

  const close = async () => {
    try {
      ws?.close();
    } catch {}
    if (!exited) {
      try {
        process.kill(-chrome.pid, "SIGKILL");
      } catch {
        chrome.kill("SIGKILL");
      }
      await Promise.race([new Promise((r) => chrome.once("exit", r)), sleep(3000)]);
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  };

  let ws;
  try {
    const portFile = join(userDataDir, "DevToolsActivePort");
    let port;
    for (let i = 0; i < 100 && !port; i++) {
      if (exited) throw new Error(`Chrome exited early (CHROME_PATH=${CHROME_PATH})`);
      if (existsSync(portFile)) port = Number(readFileSync(portFile, "utf8").split("\n")[0]) || undefined;
      if (!port) await sleep(100);
    }
    if (!port) throw new Error("Chrome did not report a debugging port");

    let target;
    for (let i = 0; i < 50 && !target; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        target = list.find((t) => t.type === "page");
      } catch {}
      if (!target) await sleep(100);
    }
    if (!target) throw new Error("No page target found");

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
  } catch (error) {
    await close();
    throw error;
  }

  return createSession(ws, close, { width, height });
}

function createSession(ws, close, viewport) {
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
    }
  });

  /** Send a CDP command; resolves with its `result`, rejects on protocol error. */
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params }));
    });

  /** Subscribe to a CDP event. Returns an unsubscribe function. */
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, new Set());
    listeners.get(method).add(fn);
    return () => listeners.get(method).delete(fn);
  };

  const once = (method, timeout = 15000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off();
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      const off = on(method, (params) => {
        clearTimeout(timer);
        off();
        resolve(params);
      });
    });

  /** Evaluate an expression in the page and return its (JSON) value. Throws on page exceptions. */
  const ev = async (expression, { userGesture = false } = {}) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture,
    });
    if (exceptionDetails) {
      const text = exceptionDetails.exception?.description || exceptionDetails.text;
      throw new Error(`Page threw: ${text}\n  in: ${expression.slice(0, 200)}`);
    }
    return result?.value;
  };

  /**
   * Poll `expression` until `check(value)` is truthy or the timeout passes.
   * Returns the last value either way, so callers can assert on it and get a
   * useful message.
   */
  const poll = async (expression, check = Boolean, { timeout = 8000, interval = 100 } = {}) => {
    const deadline = Date.now() + timeout;
    let value;
    for (;;) {
      try {
        value = await ev(expression);
      } catch (error) {
        // Navigation can destroy the execution context mid-poll; keep trying.
        if (!/context|Cannot find|destroyed/i.test(String(error.message))) throw error;
      }
      if (check(value)) return value;
      if (Date.now() > deadline) return value;
      await sleep(interval);
    }
  };

  /** Like poll, but throws if the condition never holds. */
  const waitFor = async (expression, timeout = 8000) => {
    const value = await poll(expression, Boolean, { timeout });
    if (!value) throw new Error(`Timed out after ${timeout}ms waiting for: ${expression}`);
    return value;
  };

  /** Navigate and wait for the load event, then for React to hydrate the body. */
  const go = async (url, { hydrated = true } = {}) => {
    const loaded = once("Page.loadEventFired", 30000);
    await send("Page.navigate", { url });
    await loaded;
    if (hydrated) await waitForHydration();
  };

  /** Resolves when some element in the document carries React's props key. */
  const waitForHydration = (timeout = 15000) =>
    waitFor(
      `(() => { for (const el of document.querySelectorAll('button, a, textarea')) { if (Object.keys(el).some(k => k.startsWith('__reactProps'))) return true; } return false; })()`,
      timeout,
    );

  /**
   * Click the element produced by the JS expression `selectorJs` once it
   * exists and React has attached its handlers. Throws if it never appears.
   */
  const click = async (selectorJs, { timeout = 8000, userGesture = false } = {}) => {
    await waitFor(
      `(() => { const el = ${selectorJs}; return !!el && Object.keys(el).some(k => k.startsWith('__reactProps')); })()`,
      timeout,
    ).catch(() => {
      throw new Error(`Click target never appeared (or never hydrated): ${selectorJs}`);
    });
    return ev(`(() => { const el = ${selectorJs}; el.click(); return true; })()`, { userGesture });
  };

  const setViewport = (width, height, { deviceScaleFactor = 1, mobile = false } = {}) =>
    send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile });

  /**
   * Track in-flight requests so a test can wait for the page to go quiet
   * (e.g. for Next.js route prefetches to finish). Call once before use.
   */
  // requestId -> start time. Entries are dropped on main-frame navigation
  // (Chrome does not always report requests a navigation tore down) and
  // ignored after 5s, so a stuck long request cannot wedge the wait.
  const inflight = new Map();
  const trackNetwork = async () => {
    on("Network.requestWillBeSent", ({ requestId }) => inflight.set(requestId, Date.now()));
    on("Network.loadingFinished", ({ requestId }) => inflight.delete(requestId));
    on("Network.loadingFailed", ({ requestId }) => inflight.delete(requestId));
    on("Page.frameNavigated", ({ frame }) => {
      if (!frame.parentId) inflight.clear();
    });
    await send("Network.enable");
  };
  const busy = () => [...inflight.values()].some((t) => Date.now() - t < 5000);
  /** Resolve once no request has been in flight for `idleMs` (needs trackNetwork). */
  const networkIdle = async ({ idleMs = 300, timeout = 10000 } = {}) => {
    const deadline = Date.now() + timeout;
    let quietSince = Date.now();
    while (Date.now() < deadline) {
      if (busy()) quietSince = Date.now();
      else if (Date.now() - quietSince >= idleMs) return;
      await sleep(50);
    }
    throw new Error(`Network not idle after ${timeout}ms`);
  };

  /**
   * Fail every request to the AI endpoint so runs are deterministic and free;
   * the app falls back to its offline editor.
   */
  const blockAI = async () => {
    on("Fetch.requestPaused", ({ requestId }) => {
      send("Fetch.failRequest", { requestId, errorReason: "Failed" }).catch(() => {});
    });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*memory-engine*" }] });
  };

  /**
   * Seed localStorage on the app's origin, then open /today.
   * kind: "fresh" (no pages), "today" (three pages, one written today),
   *       "sound" (three pages, none today — so a recording starts a new day).
   */
  const seed = async (kind = "fresh") => {
    await go(`${BASE}/`, { hydrated: false });
    await ev(seedScript(kind));
    await go(`${BASE}/today`);
  };

  return {
    send,
    on,
    once,
    ev,
    poll,
    waitFor,
    go,
    click,
    setViewport,
    blockAI,
    trackNetwork,
    networkIdle,
    seed,
    viewport,
    close,
  };
}

function seedScript(kind) {
  return `(() => {
    localStorage.clear();
    const kind = ${JSON.stringify(kind)};
    if (kind !== "fresh") {
      const now = Date.now();
      const d = (n) => new Date(now - n * 864e5).toISOString();
      const fmt = (n) => new Date(now - n * 864e5).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
      const mk = (id, n, title, body, people, chapterTitle) => ({ id, title, excerpt: body[0], body, reflection: "", book: "Book One", volume: "The Present", chapter: "Chapter 1", chapterTitle, layout: "Story", date: fmt(n), createdAt: d(n), originalText: body.join(" ").toLowerCase(), people, writingVersion: 6, writingLanguage: "original", writingStyle: "almost-unchanged", artworkLevel: "subtle", photoTreatment: "painterly" });
      const firstDay = kind === "sound" ? 1 : 0;
      const pages = [
        mk("day-a", firstDay, "The Light in October", ["Today was so long. Work was just work. But then I walked home by the lake.", "Amma called later. She laughed at something I said, and I felt better."], ["Amma"], "October"),
        mk("day-b", 2, "Chai with Amma", ["Aaj Amma ke saath chai pi, bahut din baad."], ["Amma"], "October"),
        mk("day-c", 4, "Rahul's Message", ["Rahul texted out of nowhere. We talked about the hostel for an hour."], ["Rahul"], "October"),
      ];
      localStorage.setItem("life-in-books-pages", JSON.stringify(pages));
      localStorage.setItem("life-in-books-book-title", "The Long Way Home");
    }
    localStorage.setItem("life-in-books-onboarding-complete", "yes");
    localStorage.setItem("life-on-paper-clean-start-v1", "complete");
    return true;
  })()`;
}

/** Write a small valid RGB PNG (a gradient) to os.tmpdir() and return its path. */
export function makeTestPng(width = 96, height = 64) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = row + 1 + x * 3;
      raw[p] = Math.round((x / width) * 255);
      raw[p + 1] = Math.round((y / height) * 200);
      raw[p + 2] = 140;
    }
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const path = join(mkdtempSync(join(tmpdir(), "lop-e2e-png-")), "test-photo.png");
  writeFileSync(path, png);
  return path;
}

/** Set a textarea's value the way React notices (native setter + input event). */
export const typeInto = (selector, text, { append = false } = {}) => `(() => {
  const t = document.querySelector(${JSON.stringify(selector)});
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  set.call(t, ${append ? "t.value + " : ""}${JSON.stringify(text)});
  t.dispatchEvent(new Event('input', { bubbles: true }));
  return t.value;
})()`;
