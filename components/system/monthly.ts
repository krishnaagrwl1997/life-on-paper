import type { KeptPage } from "@/components/system/memory-interview";
import { pageTime } from "@/components/system/weekly-weave";
import { isoWeekKey } from "@/components/system/weekly-weave";
import { canonicalizePerson, peopleForPage } from "@/components/system/people-intel";

export const monthlyShownKey = "life-in-books-monthly-shown";

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

export type MonthlySummary = {
  count: number;
  people: string[];
  weeks: number;
  label: string;
};

export function thisMonthSummary(pages: KeptPage[], now = new Date()): MonthlySummary | null {
  const key = monthKey(now);
  const inMonth = pages.filter((page) => {
    const time = pageTime(page)?.getTime();
    return typeof time === "number" && monthKey(new Date(time)) === key;
  });
  if (!inMonth.length) return null;

  const people = new Set<string>();
  const weeks = new Set<string>();
  for (const page of inMonth) {
    for (const name of peopleForPage(page)) people.add(canonicalizePerson(name).label);
    const time = pageTime(page)?.getTime();
    if (typeof time === "number") weeks.add(isoWeekKey(new Date(time)));
  }
  return { count: inMonth.length, people: [...people], weeks: weeks.size, label: monthLabel(now) };
}

export function shouldShowMonthly(pages: KeptPage[], now = new Date()): boolean {
  const summary = thisMonthSummary(pages, now);
  if (!summary) return false;
  const shown = window.localStorage.getItem(monthlyShownKey);
  return summary.count >= 5 && shown !== monthKey(now);
}

export function markMonthlyShown(now = new Date()) {
  try {
    window.localStorage.setItem(monthlyShownKey, monthKey(now));
  } catch {
    // Best-effort.
  }
}
