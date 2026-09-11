import type { KeptPage } from "@/components/system/memory-interview";
import { pageTime } from "@/components/system/weekly-weave";

/**
 * Era detection — the parts of a life, as the book's volumes.
 *
 * The earlier shelf grouped by calendar band ("This year", "Last year"), which
 * is a date filter, not a life. A life moves in eras that calendar years do not
 * respect: school ends in the middle of a year, a job starts in another.
 *
 * This groups pages into eras using two honest signals that need no AI:
 *   1. **Time gaps** — a long silence between entries is usually a boundary
 *      (leaving a place, a chapter closing).
 *   2. **Life-stage language** — words the writer actually used (school,
 *      college, office) outweigh the calendar when they clearly change.
 *
 * When neither signal is present the pages stay together rather than being
 * chopped into arbitrary pieces, and every era is labelled from evidence: the
 * writer's own vocabulary where it is decisive, otherwise an honest span of
 * years. Nothing is invented, and an era's label never claims more than the
 * pages support.
 */

export type Era = {
  key: string;
  label: string;
  /** Human span, e.g. "2023–2025" or "March–November 2026". */
  span: string;
  stage: Stage | null;
  pages: KeptPage[];
  /** The era the writer is living in now. */
  current: boolean;
  lastAt: number;
};

type Stage = "school" | "college" | "work";

const stageWords: Array<{ stage: Stage; words: RegExp }> = [
  { stage: "school", words: /\b(?:school|class\s*\d|childhood|bachpan|bachche|uniform|teacher|exam|standard\s*\d|std\s*\d)\b/i },
  { stage: "college", words: /\b(?:college|university|hostel|campus|btech|b\.?tech|degree|semester|batch|fresher|graduation)\b/i },
  { stage: "work", words: /\b(?:office|job|work|manager|client|company|team|project|promotion|salary|kaam|naukri|internship)\b/i },
];

const stageLabels: Record<Stage, string> = {
  school: "School years",
  college: "College days",
  work: "Working life",
};

/** Every day between entries longer than this reads as a boundary. */
const GAP_MONTHS = 8;
/** A stage change only splits an era if there was some distance around it. */
const STAGE_GAP_MONTHS = 3;

function pageText(page: KeptPage): string {
  return [page.title, page.chapterTitle, page.volume, page.originalText, ...(page.body ?? [])]
    .filter(Boolean)
    .join(" ");
}

function stageOf(page: KeptPage): Stage | null {
  const text = pageText(page);
  const hits = stageWords
    .map(({ stage, words }) => ({ stage, count: (text.match(new RegExp(words.source, "gi")) ?? []).length }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);
  return hits[0]?.stage ?? null;
}

function dominantStage(pages: KeptPage[]): Stage | null {
  const tally = new Map<Stage, number>();
  for (const page of pages) {
    const stage = stageOf(page);
    if (stage) tally.set(stage, (tally.get(stage) ?? 0) + 1);
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const [stage, count] = ranked[0];
  // Only claim a stage when it clearly characterises the era.
  return count / pages.length >= 0.5 ? stage : null;
}

function monthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

function spanLabel(pages: KeptPage[], times: number[]): string {
  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  const sameYear = first.getUTCFullYear() === last.getUTCFullYear();
  const sameMonth = sameYear && first.getUTCMonth() === last.getUTCMonth();
  if (sameMonth) return monthYear(last);
  if (sameYear) {
    const months = new Intl.DateTimeFormat("en-GB", { month: "long" });
    return `${months.format(first)}–${months.format(last)} ${last.getUTCFullYear()}`;
  }
  return `${first.getUTCFullYear()}–${last.getUTCFullYear()}`;
}

export function detectEras(pages: KeptPage[]): Era[] {
  const dated = pages
    .map((page) => ({ page, time: pageTime(page)?.getTime() ?? null }))
    .filter((entry): entry is { page: KeptPage; time: number } => entry.time !== null)
    .sort((a, b) => a.time - b.time);

  if (!dated.length) return [];

  const groups: Array<{ page: KeptPage; time: number }[]> = [];
  let current: Array<{ page: KeptPage; time: number }> = [dated[0]];

  for (let index = 1; index < dated.length; index += 1) {
    const entry = dated[index];
    const previous = dated[index - 1];
    const gapMonths = (entry.time - previous.time) / (1000 * 60 * 60 * 24 * 30.44);
    const stageChanged = stageOf(entry.page) !== null
      && stageOf(previous.page) !== null
      && stageOf(entry.page) !== stageOf(previous.page);
    const boundary = gapMonths >= GAP_MONTHS || (stageChanged && gapMonths >= STAGE_GAP_MONTHS);
    if (boundary) {
      groups.push(current);
      current = [];
    }
    current.push(entry);
  }
  groups.push(current);

  // A gap alone is not an era boundary: school in 2011 and school in 2013 are
  // one era with a quiet stretch in it, not two "School years". Adjacent groups
  // that share a decisive life stage are merged back together, so a stage is
  // never split in two just because the writer paused.
  const merged: Array<Array<{ page: KeptPage; time: number }>> = [];
  for (const group of groups) {
    const previous = merged[merged.length - 1];
    const previousStage = previous ? dominantStage(previous.map((entry) => entry.page)) : null;
    const groupStage = dominantStage(group.map((entry) => entry.page));
    if (previous && previousStage && groupStage && previousStage === groupStage) {
      previous.push(...group);
      continue;
    }
    merged.push([...group]);
  }

  const now = Date.now();
  const latestTime = dated[dated.length - 1].time;
  const currentYear = new Date().getUTCFullYear();

  return merged.map((group, index) => {
    const times = group.map((entry) => entry.time);
    const eraPages = group.map((entry) => entry.page);
    const stage = dominantStage(eraPages);
    const span = spanLabel(eraPages, times);
    const isCurrent = index === merged.length - 1 && (now - latestTime) < 1000 * 60 * 60 * 24 * 120;
    const label = stage
      ? stageLabels[stage]
      : isCurrent && new Date(times[times.length - 1]).getUTCFullYear() === currentYear
        ? "The present"
        : span;

    return {
      key: `era-${times[0]}`,
      label,
      span,
      stage,
      pages: eraPages,
      current: isCurrent,
      lastAt: times[times.length - 1],
    };
  });
}
