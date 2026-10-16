// Pixel-compares two folders of screenshots using headless Chrome's canvas.
import { readdirSync, readFileSync, existsSync } from "node:fs";
// Visual regression: see tests/visual/README in AGENTS.md §10.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.env.E2E_BASE || "http://localhost:3124").replace(/\/$/, "");
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9334",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "navtest-"))}`, "--window-size=1280,900", "about:blank",
], { stdio: "ignore" });
const OUT = process.env.VISUAL_DIR || "tests/visual/.shots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch("http://127.0.0.1:9334/json")).json();
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

const [a, b] = process.argv.slice(2);
await connect(); await send("Runtime.enable");
const files = readdirSync(`${OUT}/${a}`).filter((f) => f.endsWith(".png")).sort();
const rows = [];
for (const f of files) {
  if (!existsSync(`${OUT}/${b}/${f}`)) { rows.push(`MISSING ${f}`); continue; }
  const x = readFileSync(`${OUT}/${a}/${f}`), y = readFileSync(`${OUT}/${b}/${f}`);
  if (x.equals(y)) continue;
  const res = await ev(`(async () => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [p, q] = await Promise.all([load("data:image/png;base64,${x.toString("base64")}"), load("data:image/png;base64,${y.toString("base64")}")]);
    if (p.width !== q.width || p.height !== q.height) return { size: [p.width, p.height, q.width, q.height] };
    const c = (img) => { const k = document.createElement("canvas"); k.width = img.width; k.height = img.height; const g = k.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
    const d1 = c(p), d2 = c(q); let diff = 0, minY = 1e9, maxY = 0;
    for (let i = 0; i < d1.length; i += 4) { if (Math.abs(d1[i]-d2[i]) + Math.abs(d1[i+1]-d2[i+1]) + Math.abs(d1[i+2]-d2[i+2]) > 24) { diff++; const yy = Math.floor(i / 4 / p.width); minY = Math.min(minY, yy); maxY = Math.max(maxY, yy); } }
    return { diff, pct: +(diff / (p.width * p.height) * 100).toFixed(3), rows: [minY, maxY] };
  })()`);
  rows.push(`DIFF ${f} ${JSON.stringify(res)}`);
}
console.log(`${files.length} compared\n` + (rows.join("\n") || "all identical"));
chrome.kill(); process.exit(0);
