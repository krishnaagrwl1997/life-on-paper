import type { KeptPage } from "@/components/system/memory-interview";
import { pageTime } from "@/components/system/weekly-weave";

export type TonePolarity = "warm" | "light" | "neutral" | "heavy";

export type Tone = { polarity: TonePolarity; score: number; cues: string[] };

const warmCues = [
  "happy", "joy", "joyful", "grateful", "thankful", "proud", "laugh", "laughed",
  "smiled", "smile", "loved", "love", "excited", "peaceful", "calm", "warm",
  "achha", "accha", "behtar", "khush", "khushi", "pyaar", "pyaara", "bahtar",
  "sunshine", "cozy", "blessed", "relief", "relieved", "comfort", "comfortable",
];
const lightCues = [
  "light", "easy", "fun", "dreamy", "quiet", "subtle", "small", "ordinary",
  "nice", "gentle", "sweet", "simple", "fine",
];
const heavyCues = [
  "sad", "unhappy", "hurt", "alone", "lonely", "tired", "exhausted", "overwhelmed",
  "anxious", "worried", "scared", "afraid", "cry", "cried", "tears", "miss",
  "missing", "lost", "stuck", "heavy", "dard", "akela", "thak", "dukhi",
  "pareshan", "tension", "bura", "grief", "heartbroken", "empty", "hopeless",
];

function cueHits(text: string, cues: string[]): { hits: number; matched: string[] } {
  const lower = text.toLocaleLowerCase();
  const matched: string[] = [];
  for (const cue of cues) {
    if (lower.includes(cue)) matched.push(cue);
  }
  return { hits: matched.length, matched };
}

export function classifyTone(text: string): Tone {
  const source = (text || "").trim();
  if (!source) return { polarity: "neutral", score: 0, cues: [] };
  const warm = cueHits(source, warmCues);
  const light = cueHits(source, lightCues);
  const heavy = cueHits(source, heavyCues);
  const score = warm.hits + light.hits * 0.5 - heavy.hits;
  let polarity: TonePolarity = "neutral";
  if (score <= -1) polarity = "heavy";
  else if (score >= 2) polarity = "warm";
  else if (score >= 0.5) polarity = "light";
  return { polarity, score, cues: [...warm.matched, ...light.matched, ...heavy.matched] };
}

export function pageTone(page: KeptPage): Tone {
  const text = [page.reflection, ...(page.body ?? []), page.originalText].filter(Boolean).join(" ");
  return classifyTone(text);
}

export function surfaceable(page: KeptPage, dismissed: Set<string>): boolean {
  if (dismissed.has(page.id)) return false;
  const tone = pageTone(page);
  return tone.polarity !== "heavy";
}

const dismissedKey = "life-in-books-not-today";

export function loadDismissed(): Set<string> {
  try {
    const stored = window.localStorage.getItem(dismissedKey);
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

export function persistDismissedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(dismissedKey, JSON.stringify([...ids]));
  } catch {
    // Best-effort.
  }
}

function sameMonthDay(date: Date, now: Date, toleranceDays = 3): boolean {
  const distance = Math.abs((date.getUTCMonth() * 31 + date.getUTCDate()) - (now.getUTCMonth() * 31 + now.getUTCDate()));
  return Math.min(distance, 372 - distance) <= toleranceDays;
}

export function thisDayLastYear(pages: KeptPage[], dismissed: Set<string>, now = new Date()): KeptPage | null {
  const candidates = pages
    .filter((page) => !dismissed.has(page.id))
    .map((page) => ({ page, time: pageTime(page) }))
    .filter((item): item is { page: KeptPage; time: Date } => item.time !== null)
    .filter((item) => item.time.getUTCFullYear() < now.getUTCFullYear() && sameMonthDay(item.time, now))
    .map((item) => ({ page: item.page, time: item.time, tone: pageTone(item.page) }))
    .filter((item) => item.tone.polarity !== "heavy")
    .sort((a, b) => b.time.getTime() - a.time.getTime());
  return candidates[0]?.page ?? null;
}

export function kindCandidate(pages: KeptPage[], dismissed: Set<string>, now = new Date()): KeptPage | null {
  const byYear = thisDayLastYear(pages, dismissed, now);
  if (byYear) return byYear;

  const weekAgo = now.getTime() - 7 * 86_400_000;
  const warmOld = pages
    .filter((page) => !dismissed.has(page.id))
    .map((page) => ({ page, time: pageTime(page), tone: pageTone(page) }))
    .filter((item) => item.time !== null && item.time.getTime() < weekAgo && item.tone.polarity !== "heavy" && item.tone.polarity !== "neutral")
    .sort((a, b) => (b.tone?.score ?? 0) - (a.tone?.score ?? 0) || (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));
  return warmOld[0]?.page ?? null;
}

export type FeelingArc = {
  warm: number;
  light: number;
  neutral: number;
  heavy: number;
  heavyDate: string | null;
  confident: boolean;
};

const arcDay = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" });

export function characterFeelingArc(moments: KeptPage[]): FeelingArc {
  const counts = { warm: 0, light: 0, neutral: 0, heavy: 0 };
  let heavyDate: string | null = null;
  for (const moment of moments) {
    const tone = pageTone(moment);
    counts[tone.polarity] += 1;
    if (tone.polarity === "heavy" && !heavyDate) {
      const time = pageTime(moment)?.getTime();
      if (typeof time === "number" && !Number.isNaN(time)) heavyDate = arcDay.format(new Date(time));
    }
  }
  return { ...counts, heavyDate, confident: counts.warm > 0 || counts.heavy > 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// Phase 6 — Layered care (sustained-heaviness check-in + acute resources)
// Client-side only; never diagnoses, never blocks writing, never escalates.
// ────────────────────────────────────────────────────────────────────────────

export type CareKind = "checkin" | "acute";

export const careCheckinKey = "life-in-books-care-checkin";
export const careDismissedKey = "life-in-books-care-dismissed";

export const careResources = [
  { region: "India", name: "KIRAN Mental Health Helpline", number: "1800-599-0019" },
  { region: "India", name: "iCall", number: "+91-91529-87821" },
  { region: "India", name: "Vandrevala Foundation", number: "+91-99996-66555" },
  { region: "Global", name: "Crisis line (US & Canada)", number: "988" },
  { region: "Global", name: "Samaritans (UK & ROI)", number: "116 123" },
] as const;

// Unambiguous, explicit crisis phrasing. Deliberately conservative — common
// heavy or ambiguous wording ("tired", "alone", "I miss you", "that hurt")
// is NOT included; those feed the sustained check-in instead.
const acutePhrases = [
  "want to die", "wanna die", "end my life", "end it all", "kill myself",
  "suicide", "hurt myself", "harm myself", "no reason to live",
  "don't want to live", "dont want to live", "better off dead",
  "take my own life", "khud ko maar", "marna chahta", "khatam karna",
];

export function detectAcuteSignal(text: string): boolean {
  const source = (text || "").toLocaleLowerCase();
  return acutePhrases.some((phrase) => source.includes(phrase));
}

export function loadCareDismissed(): Set<string> {
  try {
    const stored = window.localStorage.getItem(careDismissedKey);
    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

export function persistCareDismissed(kinds: Set<string>) {
  try {
    window.localStorage.setItem(careDismissedKey, JSON.stringify([...kinds]));
  } catch {
    // Best-effort.
  }
}

/** Sustained heaviness: ≥3 heavy pages in the last 14 days, and it's been a while since the last check-in. */
export function detectSustainedHeaviness(pages: KeptPage[], now = new Date()): boolean {
  const cutoff = now.getTime() - 14 * 86_400_000;
  const heavyRecent = pages.filter((page) => {
    const time = pageTime(page)?.getTime();
    return typeof time === "number" && time >= cutoff && pageTone(page).polarity === "heavy";
  }).length;
  return heavyRecent >= 3;
}

export function markCareShown(kind: CareKind) {
  if (kind === "checkin") {
    try { window.localStorage.setItem(careCheckinKey, String(Date.now())); } catch { /* best-effort */ }
  }
}
