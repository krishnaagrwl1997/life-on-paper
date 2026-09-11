import type { KeptPage } from "@/components/system/memory-interview";
import { isoWeekKey, loadWeaveCache, pageTime } from "@/components/system/weekly-weave";
import { aggregateCast, type MemoryDecisions } from "@/components/system/people-intel";

/**
 * The first week's beats.
 *
 * The product's whole promise — the book, the threads, the woven chapter — is
 * invisible for the first days, and the brief rules out every usual retention
 * device (streaks, scores, guilt). What is left is the truth, said early: a
 * story really is forming, here is what has been noticed, and here is how close
 * the first chapter is.
 *
 * So this reports progress honestly and stops the moment the book is plainly
 * underway, rather than becoming a permanent fixture of the page.
 */

export const FIRST_WEEK_TARGET = 3;
/** Past this many pages the book speaks for itself; the nudge steps aside. */
const UNDERWAY_PAGES = 10;

export type StoryForming = {
  threads: Array<{ label: string; count: number }>;
  weekCount: number;
  momentsNeeded: number;
  chapterReady: boolean;
  totalPages: number;
};

export function storyForming(pages: KeptPage[], decisions: MemoryDecisions = {}): StoryForming | null {
  if (!pages.length) return null;

  const now = new Date();
  const weekKey = isoWeekKey(now);
  const weekCount = pages.filter((page) => {
    const time = pageTime(page)?.getTime();
    return typeof time === "number" && isoWeekKey(new Date(time)) === weekKey;
  }).length;

  // Threads: the people and groups the writing keeps returning to.
  const threads = aggregateCast(pages, decisions)
    .filter((character) => character.pageIds.length >= 2)
    .slice(0, 3)
    .map((character) => ({ label: character.label, count: character.pageIds.length }));

  const woven = Boolean(loadWeaveCache()[weekKey]);
  const chapterReady = weekCount >= FIRST_WEEK_TARGET && !woven;

  // Once the book is clearly underway there is nothing to explain, unless a
  // chapter has just become ready to read.
  if (pages.length >= UNDERWAY_PAGES && !chapterReady) return null;

  return {
    threads,
    weekCount,
    momentsNeeded: Math.max(0, FIRST_WEEK_TARGET - weekCount),
    chapterReady,
    totalPages: pages.length,
  };
}
