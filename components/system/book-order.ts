import type { KeptPage } from "@/components/system/memory-interview";
import { pageTime } from "@/components/system/weekly-weave";

/**
 * The order a book reads in: from the beginning of a life. Parts named for a
 * life stage go in life order (childhood, school, college, work, the present);
 * other parts by when they began. Pages are oldest first within a part.
 * Shared by the reader and the printable book so both agree.
 */
const lifeStages: Array<[RegExp, number]> = [
  [/\b(early|childhood|bachpan|growing up|little|kid|child)\b/i, 0],
  [/\b(school)\b/i, 1],
  [/\b(college|university|campus|hostel)\b/i, 2],
  [/\b(first job|working|work|career|office)\b/i, 3],
  [/\b(present|now|today|these days|this year)\b/i, 9],
];

function lifeStageRank(volume: string) {
  const found = lifeStages.find(([pattern]) => pattern.test(volume));
  return found ? found[1] : 5;
}

export function pageMillis(page: KeptPage) {
  return pageTime(page)?.getTime() ?? 0;
}

export function oldestFirst(pages: KeptPage[]) {
  return [...pages].sort((a, b) => pageMillis(a) - pageMillis(b));
}

export function orderVolumes(pages: KeptPage[]) {
  const volumes = [...new Set(pages.map((page) => page.volume).filter(Boolean))];
  const began = new Map(volumes.map((volume) => [volume, Math.min(...pages.filter((page) => page.volume === volume).map(pageMillis))]));
  return volumes.sort((a, b) => lifeStageRank(a) - lifeStageRank(b) || (began.get(a) ?? 0) - (began.get(b) ?? 0));
}
