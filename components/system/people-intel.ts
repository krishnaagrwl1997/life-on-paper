import type { KeptPage } from "@/components/system/memory-interview";
import { groundMemory } from "@/lib/ai/editorial-guardrails";
import { pageTime } from "@/components/system/weekly-weave";

export type CastKind = "person" | "group";

export type MemoryDecisions = {
  split?: Record<string, string[]>;
  mergedInto?: Record<string, string>;
  groupMembers?: Record<string, string[]>;
  answered?: Record<string, "yes" | "no" | "not-sure">;
};

export const memoryDecisionsKey = "life-in-books-memory-decisions";
export const tutorWeekKey = "life-in-books-tutor-week";

export function loadMemoryDecisions(): MemoryDecisions {
  try {
    const stored = window.localStorage.getItem(memoryDecisionsKey);
    return stored ? (JSON.parse(stored) as MemoryDecisions) : {};
  } catch {
    return {};
  }
}

export function persistMemoryDecisions(decisions: MemoryDecisions) {
  try {
    window.localStorage.setItem(memoryDecisionsKey, JSON.stringify(decisions));
  } catch {
    // Best-effort.
  }
}

export function keyDash(value: string) {
  return (value || "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-") || (value || "x").toLocaleLowerCase();
}

const familyCanonical = new Set(["Mom", "Dad", "Grandma", "Grandpa", "Brother", "Sister", "Uncle", "Aunty"]);

export type CastCharacter = {
  key: string;
  label: string;
  kind: CastKind;
  aliases: string[];
  pageIds: string[];
  volumes: string[];
  firstAt: number | null;
  lastAt: number | null;
};

const aliasGroups: Array<{ canonical: string; keys: string[] }> = [
  { canonical: "Mom", keys: ["mom", "mum", "mummy", "amma", "mother", "maa", "mata", "ma"] },
  { canonical: "Dad", keys: ["dad", "daddy", "papa", "father", "pa", "abba", "pita"] },
  { canonical: "Grandma", keys: ["grandma", "granny", "dadi", "nani", "naniji", "grandmother"] },
  { canonical: "Grandpa", keys: ["grandpa", "dada", "nana", "nana ji", "grandfather"] },
  { canonical: "Brother", keys: ["bhai", "bhaiya", "bhaiyya", "brother", "bhau"] },
  { canonical: "Sister", keys: ["didi", "behen", "bahin", "sister"] },
  { canonical: "Uncle", keys: ["uncle", "chacha", "mama", "tau", "kaka"] },
  { canonical: "Aunty", keys: ["aunty", "auntyji", "bua", "chachi", "mausi"] },
];

const groupLabels: Array<{ phrase: string; label: string }> = [
  { phrase: "college friends", label: "College friends" },
  { phrase: "school friends", label: "School friends" },
  { phrase: "office friends", label: "Office friends" },
  { phrase: "work friends", label: "Work friends" },
  { phrase: "batchmates", label: "Batchmates" },
  { phrase: "classmates", label: "Classmates" },
  { phrase: "teammates", label: "Teammates" },
  { phrase: "roommates", label: "Roommates" },
  { phrase: "flatmates", label: "Flatmates" },
  { phrase: "my cousins", label: "My cousins" },
  { phrase: "the cousins", label: "The cousins" },
  { phrase: "cousins", label: "My cousins" },
  { phrase: "siblings", label: "Siblings" },
  { phrase: "the team", label: "The team" },
  { phrase: "the gang", label: "The gang" },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const aliasPattern = new RegExp(
  `\\b(?:${aliasGroups.flatMap((group) => group.keys).sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})\\b`,
  "gi",
);

/** Canonical people labels for any kinship alias words present in free text. */
export function aliasPeopleFromText(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const matches = (text || "").match(aliasPattern) ?? [];
  for (const match of matches) {
    const lower = match.toLocaleLowerCase();
    const group = aliasGroups.find((candidate) => candidate.keys.includes(lower));
    if (!group || seen.has(group.canonical)) continue;
    seen.add(group.canonical);
    found.push(group.canonical);
  }
  return found;
}


// Words that look like names (capitalised) but are never people. This is the
// single safety net used by every path that can introduce a person: the local
// detector, the engine's signals.people, and page-level stored people.
const implausibleNames = new Set([
  // question words & pronouns
  "which","what","who","whom","whose","when","where","why","how","that","this","these","those",
  "there","then","than","they","them","their","theirs","she","her","hers","he","him","his","it","its",
  "we","us","our","ours","you","your","yours","i","me","my","mine","myself","yourself","himself","herself",
  // connectives & adverbs
  "and","or","but","so","yet","for","nor","if","because","although","though","while","during","before",
  "after","since","until","about","with","without","from","into","onto","over","under","between","among",
  "also","too","very","just","only","even","still","again","always","never","often","sometimes","usually",
  "really","actually","basically","honestly","anyway","anyways","plus","okay","ok","yes","no","not","maybe",
  "perhaps","probably","definitely","sure","well","meanwhile","however","instead","finally","suddenly",
  // time words & calendar
  "today","tomorrow","yesterday","tonight","morning","evening","night","afternoon","now","later",
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  "january","february","march","april","may","june","july","august","september","october","november","december",
  // common non-person nouns the engine may guess
  "life","things","thing","something","someone","everyone","everything","nothing","nobody","anyone","everybody",
  "day","days","week","weeks","month","months","year","years","time","times","home","house","work","office",
  "school","college","city","town","village","place","places","memory","memories","story","book","page",
  // greetings & pleasantries
  "hey","hi","hello","hullo","yo","hmm","hmmm","hm","test","testing","check","checking",
  "thanks","thank","thankyou","bye","goodbye","lol","haha","hahaha","wow","cool","nice",
  "great","good","nothing","stuff","things","ok","okay","k",
  // Hinglish / Hindi discourse words
  "aaj","kal","abhi","phir","lekin","par","aur","bhi","toh","to","bas","kya","kaun","kab","kahan","kyun","kaise",
  "hai","hain","tha","thi","the","main","hum","tum","aap","wo","vo","ye","yeh","usne","maine","mera","meri",
  "mere","mujhe","hamara","hamari","sab","kuch","koi","nahi","haan","achha","accha","bahut","thoda","matlab",
]);

export function isPlausiblePersonName(name: string): boolean {
  const cleaned = (name || "").trim().replace(/\s+/g, " ");
  if (cleaned.length < 2) return false;
  if (/[0-9]/.test(cleaned)) return false;
  const lower = cleaned.toLocaleLowerCase();
  if (implausibleNames.has(lower)) return false;
  const first = lower.split(/\s+/)[0];
  return !implausibleNames.has(first);
}

export function canonicalizePerson(name: string): { label: string; variant: string } {
  const cleaned = (name || "").trim().replace(/\s+/g, " ");
  const lower = cleaned.toLocaleLowerCase();
  if (!lower) return { label: "", variant: "" };
  const group = aliasGroups.find((candidate) => candidate.keys.includes(lower));
  if (group) return { label: group.canonical, variant: cleaned };
  return { label: cleaned.charAt(0).toUpperCase() + cleaned.slice(1), variant: cleaned };
}

export function groupLabelFromText(text: string): string | null {
  const lower = (text || "").toLocaleLowerCase();
  const found = groupLabels.find((candidate) => lower.includes(candidate.phrase));
  return found?.label ?? null;
}

/** People on a page: persisted engine/local names first, read-time fallback otherwise. */
export function peopleForPage(page: KeptPage): string[] {
  if (Array.isArray(page.people) && page.people.length) {
    return page.people.filter(
      (person) => typeof person === "string" && person.trim() && (isPlausiblePersonName(person) || aliasPeopleFromText(person).length > 0),
    );
  }
  const text = page.originalText?.trim() || page.body.join(" ");
  if (!text) return [];
  const labels = aliasPeopleFromText(text);
  const grounding = groundMemory(text);
  const person = grounding.person?.trim();
  if (person && person !== "Someone" && person !== "I" && isPlausiblePersonName(person)) {
    const canonical = canonicalizePerson(person).label;
    if (canonical && !labels.includes(canonical)) labels.push(canonical);
  }
  return labels;
}

export function aggregateCast(pages: KeptPage[], decisions: MemoryDecisions = {}): CastCharacter[] {
  const byKey = new Map<string, CastCharacter>();
  const splitBy = new Map(Object.entries(decisions.split ?? {}).map(([key, worlds]) => [key, worlds]));
  const mergedBy = new Map(Object.entries(decisions.mergedInto ?? {}));

  const add = (page: KeptPage, label: string, kind: CastKind, variant?: string) => {
    if (kind === "person" && !isPlausiblePersonName(label) && aliasPeopleFromText(label).length === 0) return;
    let canonical = canonicalizePerson(label);
    let lower = canonical.label.toLocaleLowerCase();
    if (mergedBy.has(lower)) {
      const target = mergedBy.get(lower) as string;
      canonical = canonicalizePerson(target);
      lower = canonical.label.toLocaleLowerCase();
    }
    const canonicalKey = keyDash(canonical.label);
    let mapKey = `${kind}:${canonicalKey}`;
    if (kind === "person" && splitBy.has(canonicalKey)) {
      const world = page.volume || "The story so far";
      mapKey = `${kind}:${canonicalKey}:${keyDash(world)}`;
    }
    const entry = byKey.get(mapKey) ?? {
      key: mapKey,
      label: canonical.label,
      kind,
      aliases: [] as string[],
      pageIds: [] as string[],
      volumes: [] as string[],
      firstAt: null as number | null,
      lastAt: null as number | null,
    };
    if (kind === "person") {
      if (variant && !entry.aliases.includes(variant)) entry.aliases.push(variant);
      const time = pageTime(page)?.getTime() ?? null;
      if (time !== null) {
        entry.firstAt = entry.firstAt === null ? time : Math.min(entry.firstAt, time);
        entry.lastAt = entry.lastAt === null ? time : Math.max(entry.lastAt, time);
      }
    }
    if (!entry.pageIds.includes(page.id)) entry.pageIds.push(page.id);
    if (page.volume && !entry.volumes.includes(page.volume)) entry.volumes.push(page.volume);
    byKey.set(mapKey, entry);
  };

  const timeById = new Map(pages.map((page) => [page.id, pageTime(page)?.getTime() ?? 0]));
  for (const page of pages) {
    const text = page.originalText?.trim() || page.body.join(" ");
    const group = groupLabelFromText(text);
    if (group) add(page, group, "group");
    for (const raw of peopleForPage(page)) {
      const { label, variant } = canonicalizePerson(raw);
      if (label) add(page, label, "person", variant);
    }
  }

  const ordered = [...byKey.values()].sort((a, b) => {
    const aLast = a.lastAt ?? 0;
    const bLast = b.lastAt ?? 0;
    if (aLast !== bLast) return bLast - aLast;
    return a.pageIds.length - b.pageIds.length;
  });
  // Newest moment first within each character.
  for (const character of ordered) {
    character.pageIds.sort((left, right) => (timeById.get(right) ?? 0) - (timeById.get(left) ?? 0));
  }
  return ordered;
}

export function sortMoments(pages: KeptPage[]): KeptPage[] {
  return [...pages].sort((a, b) => (pageTime(b)?.getTime() ?? 0) - (pageTime(a)?.getTime() ?? 0));
}

export type TutorQuestion = {
  key: string;
  kind: "split" | "membership";
  prompt: string;
  meta: { personKey?: string; groupKey?: string; volumes?: string[] };
};

/** Conservative tutor questions: only genuine forks trustable from local signals. */
export function detectTutorQuestions(pages: KeptPage[], decisions: MemoryDecisions = {}): TutorQuestion[] {
  const answered = decisions.answered ?? {};
  const cast = aggregateCast(pages, decisions);
  const persons = cast.filter((character) => character.kind === "person");
  const groups = cast.filter((character) => character.kind === "group");
  const out: TutorQuestion[] = [];

  for (const person of persons) {
    const rawKey = keyDash(person.label);
    if (familyCanonical.has(person.label)) continue;
    if (answered[`split-${rawKey}`] || decisions.split?.[rawKey]) continue;
    if (person.volumes.length >= 2) {
      out.push({
        key: `split-${rawKey}`,
        kind: "split",
        prompt: `I\u2019ve noticed ${person.label} appears in more than one part of your story. Could there be two different people with the same name?`,
        meta: { personKey: person.key, volumes: person.volumes },
      });
    }
  }

  for (const group of groups) {
    for (const person of persons) {
      if (out.length >= 3) break;
      if (familyCanonical.has(person.label)) continue;
      const questionKey = `member-${group.key}:${person.key}`;
      if (answered[questionKey]) continue;
      const overlaps = person.volumes.some((volume) => group.volumes.includes(volume));
      if (!overlaps) continue;
      out.push({
        key: questionKey,
        kind: "membership",
        prompt: `Is ${person.label} part of ${group.label}?`,
        meta: { personKey: person.key, groupKey: group.key },
      });
    }
    if (out.length >= 3) break;
  }

  return out.slice(0, 3);
}
