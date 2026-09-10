import type { KeptPage } from "@/components/system/memory-interview";

export type WeekWeave = {
  weekKey: string;
  label: string;
  title?: string;
  narrative: string[];
  pageIds: string[];
  source: "fallback" | "ai";
  generatedAt: string;
};

export type WeaveCache = Record<string, WeekWeave>;

export const weaveCacheKey = "life-in-books-weaves";
export const weaveSurpriseKey = "life-in-books-weave-surprise-seen";

const months = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function parseEnGbDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = months.indexOf(match[2].toLocaleLowerCase());
  if (month < 0) return null;
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pageTime(page: KeptPage): Date | null {
  if (page.createdAt) {
    const date = new Date(page.createdAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (page.date) return parseEnGbDate(page.date);
  return null;
}

export function isoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (utc.getUTCDay() + 6) % 7; // Monday = 0
  utc.setUTCDate(utc.getUTCDate() - day);
  return utc.toISOString().slice(0, 10);
}

export type WeekGroup = { weekKey: string; label: string; pages: KeptPage[] };

const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
const monthYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

function spanLabel(pages: KeptPage[]): string {
  const times = pages.map(pageTime).filter((time): time is Date => time !== null).sort((a, b) => a.getTime() - b.getTime());
  if (!times.length) return "Your week";
  const first = times[0];
  const last = times[times.length - 1];
  if (first.toDateString() === last.toDateString()) return `${dayFormatter.format(first)} ${monthYearFormatter.format(first)}`;
  const sameMonth = first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear();
  const firstDay = dayFormatter.format(first).replace(/\s+\w+$/, "");
  return sameMonth
    ? `${firstDay}–${dayFormatter.format(last)} ${monthYearFormatter.format(last)}`
    : `${dayFormatter.format(first)} – ${dayFormatter.format(last)} ${monthYearFormatter.format(last)}`;
}

/** Pages grouped into qualifying ISO weeks (≥ 3 pages, each with a readable time). */
export function computeWeekGroups(pages: KeptPage[]): WeekGroup[] {
  const byWeek = new Map<string, KeptPage[]>();
  for (const page of pages) {
    const time = pageTime(page);
    if (!time) continue;
    const key = isoWeekKey(time);
    const list = byWeek.get(key) ?? [];
    list.push(page);
    byWeek.set(key, list);
  }
  const groups: WeekGroup[] = [];
  for (const [weekKey, weekPages] of byWeek) {
    if (weekPages.length < 3) continue;
    weekPages.sort((a, b) => (pageTime(a)?.getTime() ?? 0) - (pageTime(b)?.getTime() ?? 0));
    groups.push({ weekKey, label: spanLabel(weekPages), pages: weekPages });
  }
  groups.sort((a, b) => (b.weekKey > a.weekKey ? 1 : -1));
  return groups;
}

/** Honest fallback weave: the week's own words in order, lightly shaped. */
export function buildFallbackWeave(group: WeekGroup): WeekWeave {
  const seen = new Set<string>();
  const narrative: string[] = [];
  for (const page of group.pages) {
    const parts = [...(page.body ?? []), ...(page.reflection ? [page.reflection] : [])];
    for (const part of parts) {
      const text = part.trim();
      if (!text) continue;
      const normalized = text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      narrative.push(text);
    }
  }
  return {
    weekKey: group.weekKey,
    label: group.label,
    narrative: narrative.length ? narrative : [group.pages.map((page) => page.title).join(" · ")],
    pageIds: group.pages.map((page) => page.id),
    source: "fallback",
    generatedAt: new Date().toISOString(),
  };
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((id, index) => id === b[index]);
}

type AiWeave = { title?: string; narrative: string[] };

async function requestAiWeave(group: WeekGroup): Promise<AiWeave | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const memory = group.pages
      .map((page, index) => {
        const date = pageTime(page) ? dayFormatter.format(pageTime(page)!) : page.date;
        const body = [...(page.body ?? [])].join(" ");
        const reflection = page.reflection ? ` — ${page.reflection}` : "";
        return `${index + 1}. ${date}: ${body}${reflection}`;
      })
      .join("\n\n");
    const response = await fetch("/api/memory-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "weave", memory }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = (await response.json()) as { title?: string; narrative?: unknown; language?: string };
    const narrative = Array.isArray(result.narrative)
      ? (result.narrative as unknown[]).filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
      : [];
    if (!narrative.length) return null;
    return {
      title: typeof result.title === "string" && result.title.trim() ? result.title.trim() : undefined,
      narrative,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function loadWeaveCache(): WeaveCache {
  try {
    const stored = window.localStorage.getItem(weaveCacheKey);
    return stored ? (JSON.parse(stored) as WeaveCache) : {};
  } catch {
    return {};
  }
}

export function persistWeaveCache(cache: WeaveCache) {
  try {
    window.localStorage.setItem(weaveCacheKey, JSON.stringify(cache));
  } catch {
    // Best-effort cache.
  }
}

/**
 * Reconcile qualifying weeks against the cache (synchronous), then attempt a
 * silent AI upgrade for any weeks whose cached weave is missing, stale, or
 * still fallback. Returns the reconciled list plus a callback hook for the
 * async upgrade phase.
 */
export function reconcileWeaves(pages: KeptPage[]): { weaves: WeekWeave[]; upgrade: WeekGroup[] } {
  const groups = computeWeekGroups(pages);
  const cache = loadWeaveCache();
  const weaves: WeekWeave[] = [];
  const upgrade: WeekGroup[] = [];
  let changed = false;

  for (const group of groups) {
    const existing = cache[group.weekKey];
    if (existing && sameIds(existing.pageIds, group.pages.map((page) => page.id)) && existing.narrative.length) {
      weaves.push(existing);
      if (existing.source !== "ai") upgrade.push(group);
      continue;
    }
    const fallback = buildFallbackWeave(group);
    cache[group.weekKey] = fallback;
    weaves.push(fallback);
    upgrade.push(group);
    changed = true;
  }

  if (changed) persistWeaveCache(cache);
  return { weaves: [...weaves].sort((a, b) => (b.weekKey > a.weekKey ? 1 : -1)), upgrade };
}

export async function upgradeWeave(group: WeekGroup, current: WeekWeave): Promise<WeekWeave | null> {
  const ai = await requestAiWeave(group);
  if (!ai) return null;
  const upgraded: WeekWeave = {
    ...current,
    title: ai.title,
    narrative: ai.narrative,
    source: "ai",
    generatedAt: new Date().toISOString(),
  };
  const cache = loadWeaveCache();
  cache[group.weekKey] = upgraded;
  persistWeaveCache(cache);
  return upgraded;
}
