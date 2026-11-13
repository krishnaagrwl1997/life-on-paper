"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { KeptPage } from "@/components/system/memory-interview";

/**
 * Search across every kept page.
 *
 * The box sits at the top and stays there, so results show above the phone
 * keyboard. Starting points come from the person's own book (the people in it,
 * its chapters, months and feelings) rather than themes we made up. Words match
 * from the start of a word, forgive one slip of the thumb ("hostle" finds
 * "hostel"), and each result shows the line the word was found in.
 */
export function MemorySearch({ pages, onOpenPage }: { pages: KeptPage[]; onOpenPage: (pageId: string) => void }) {
  const [query, setQuery] = useState(readStoredQuery);
  // Coming Back from a page to these results: don't focus the box, which would
  // bring the keyboard up over them.
  const [arrivedWithQuery] = useState(() => Boolean(readStoredQuery()));
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildIndex(pages), [pages]);
  const terms = useMemo(() => queryTerms(query), [query]);
  const results = useMemo(() => search(index, terms), [index, terms]);
  const startingPoints = useMemo(() => startingPointsFor(pages), [pages]);
  const suggestion = terms.length && !results.length ? closestWord(index, terms) : null;

  useEffect(() => {
    try {
      if (query.trim()) window.sessionStorage.setItem(QUERY_KEY, query);
      else window.sessionStorage.removeItem(QUERY_KEY);
    } catch {
      // Private browsing: search still works, it just isn't kept for Back.
    }
  }, [query]);

  useEffect(() => {
    if (!arrivedWithQuery) inputRef.current?.focus({ preventScroll: true });
  }, [arrivedWithQuery]);

  const choose = (text: string) => {
    setQuery(text);
    inputRef.current?.blur();
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="memory-search">
      <h1 className="memory-search__title">What are you trying to remember?</h1>

      <form
        className="memory-search__bar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          inputRef.current?.blur(); // the keyboard's Search key puts the keyboard away
        }}
      >
        <div className="memory-search__field">
          <MagnifyingGlass size={19} weight="bold" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Search your book"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="A name, a place, a word you used…"
          />
          {query ? (
            <button type="button" className="memory-search__clear" onClick={clear} aria-label="Clear search">
              <span><X size={13} weight="bold" aria-hidden="true" /></span>
            </button>
          ) : null}
        </div>
      </form>

      {!pages.length ? (
        <div className="memory-search__none">
          <p className="memory-search__none-title">Nothing to search yet.</p>
          <p>Every page you keep can be found here — by a name, a place, or a word you used.</p>
        </div>
      ) : !terms.length ? (
        <div className="memory-search__start">
          {startingPoints.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2>{group.label}</h2>
              <div className="memory-search__chips">
                {group.items.map((item) => (
                  <button key={item} type="button" onClick={() => choose(item)}>{item}</button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="memory-search__results" aria-label="Results">
          <p className="memory-search__count" role="status">
            {results.length
              ? `${results.length} ${results.length === 1 ? "page" : "pages"}`
              : `No pages mention “${query.trim()}”.`}
          </p>
          {results.length ? (
            <ol className="memory-search__list">
              {results.map((result) => (
                <li key={result.page.id}>
                  <button
                    type="button"
                    onClick={() => {
                      inputRef.current?.blur();
                      onOpenPage(result.page.id);
                    }}
                  >
                    <span className="memory-search__meta">
                      {[result.page.date, result.page.chapterTitle].filter(Boolean).join(" · ")}
                    </span>
                    <strong>{highlight(result.page.title, result.marks)}</strong>
                    {result.snippet ? <p>{highlight(result.snippet, result.marks)}</p> : null}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="memory-search__none">
              {suggestion ? (
                <button type="button" className="memory-search__suggest" onClick={() => choose(suggestion)}>
                  Did you mean <em>{suggestion}</em>?
                </button>
              ) : (
                <p>{terms.length > 1 ? "Try fewer words, or just one — a name, a place, or a month." : "Try another word — a name, a place, or a month."}</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ——— Matching ——— */

/** Kept for this browser session only, so Back to the results finds them as they were. */
const QUERY_KEY = "life-on-paper-search";

function readStoredQuery() {
  try {
    return typeof window === "undefined" ? "" : window.sessionStorage.getItem(QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

// Letters, combining marks (Hindi vowel signs) and digits make a word.
const WORD = /[\p{L}\p{M}\p{N}]+/gu;
const fold = (value: string) => value.toLocaleLowerCase();
const wordsIn = (value: string) => fold(value).match(WORD) ?? [];

type Doc = {
  page: KeptPage;
  words: string[];
  titleWords: string[];
  peopleWords: string[];
  chapterWords: string[];
  text: string;
  /** The page's own words, for the line shown under each result. */
  body: string;
  time: number;
};

type Result = { page: KeptPage; score: number; time: number; marks: string[]; snippet: string };

function buildIndex(pages: KeptPage[]): Doc[] {
  return pages.map((page) => {
    const body = (page.body.length ? page.body : [page.excerpt]).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    const people = page.people ?? [];
    const text = fold(
      [page.title, body, page.excerpt, page.reflection, page.chapterTitle, page.volume, page.date, ...people, ...(page.emotions ?? [])]
        .filter(Boolean)
        .join(" "),
    );
    return {
      page,
      words: [...new Set(text.match(WORD) ?? [])],
      titleWords: wordsIn(page.title),
      peopleWords: people.flatMap(wordsIn),
      chapterWords: wordsIn(page.chapterTitle ?? ""),
      text,
      body: body || page.reflection || "",
      time: pageTime(page),
    };
  });
}

function queryTerms(query: string) {
  const terms = [...new Set(wordsIn(query))];
  // "Amma's" splits into "amma" + "s"; a lone letter would match nearly everything.
  const meaningful = terms.filter((term) => term.length > 1);
  return meaningful.length ? meaningful : terms;
}

function search(index: Doc[], terms: string[]): Result[] {
  if (!terms.length) return [];
  const phrase = terms.join(" ");
  const results: Result[] = [];
  for (const doc of index) {
    let score = 0;
    const marks: string[] = [];
    let matchesAll = true;
    for (const term of terms) {
      const match = matchTerm(doc, term);
      if (!match) {
        matchesAll = false;
        break;
      }
      score += match.score;
      marks.push(...match.marks);
    }
    if (!matchesAll) continue;
    if (terms.length > 1 && doc.text.includes(phrase)) score += 4;
    const unique = [...new Set(marks)];
    results.push({ page: doc.page, score, time: doc.time, marks: unique, snippet: snippetFor(doc.body, unique) });
  }
  // Best match first; among equals, the most recent page.
  return results.sort((a, b) => b.score - a.score || b.time - a.time);
}

function matchTerm(doc: Doc, term: string): { score: number; marks: string[] } | null {
  const startsWith = (word: string) => word.startsWith(term);
  if (doc.words.some(startsWith)) {
    let score = 2;
    if (doc.titleWords.some(startsWith)) score += 6;
    if (doc.peopleWords.some(startsWith)) score += 5;
    if (doc.chapterWords.some(startsWith)) score += 3;
    return { score, marks: [term] };
  }
  const near = doc.words.filter((word) => isNear(term, word));
  return near.length ? { score: 1, marks: near } : null;
}

function isNear(term: string, word: string) {
  // Plurals and tenses: "hostels" finds "hostel", "walked" finds "walk".
  if (word.length >= 4 && term.startsWith(word) && term.length - word.length <= 3) return true;
  // One slip of the thumb: a wrong, missing, extra or swapped letter.
  if (term.length < 4 || Math.abs(term.length - word.length) > 1) return false;
  return typoDistance(term, word) <= 1;
}

/** Edit distance where swapping two neighbouring letters counts as one slip. */
function typoDistance(a: string, b: string) {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** "Did you mean…": the nearest word actually written in the book, for a one-word search. */
function closestWord(index: Doc[], terms: string[]) {
  if (terms.length !== 1 || terms[0].length < 3) return null;
  const term = terms[0];
  const counts = new Map<string, number>();
  for (const doc of index) for (const word of doc.words) counts.set(word, (counts.get(word) ?? 0) + 1);
  let best: { word: string; distance: number; count: number } | null = null;
  for (const [word, count] of counts) {
    if (word.length < 3 || Math.abs(word.length - term.length) > 2 || /^\d+$/.test(word)) continue;
    const distance = typoDistance(term, word);
    if (distance > 2) continue;
    if (!best || distance < best.distance || (distance === best.distance && count > best.count)) best = { word, distance, count };
  }
  if (!best) return null;
  // Show it the way the book spells it ("Rahul", not "rahul").
  const pattern = markPattern([best.word], true);
  for (const doc of index) {
    const source = [doc.page.title, doc.body, ...(doc.page.people ?? [])].join(" ");
    const found = pattern ? source.match(pattern) : null;
    if (found) return found[0];
  }
  return best.word;
}

/** The stretch of the page around the first matched word, cut at word boundaries. */
function snippetFor(body: string, marks: string[], max = 170) {
  if (!body) return "";
  if (body.length <= max) return body;
  const pattern = markPattern(marks);
  const hit = pattern ? body.search(pattern) : -1;
  const from = hit < 60 ? 0 : body.lastIndexOf(" ", hit - 50) + 1;
  let slice = body.slice(from, from + max);
  if (from + max < body.length) slice = `${slice.slice(0, Math.max(slice.lastIndexOf(" "), 1))}…`;
  return from > 0 ? `…${slice}` : slice;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches any of the marks at the start of a word (or as a whole word). */
function markPattern(marks: string[], whole = false) {
  if (!marks.length) return null;
  const alternatives = [...marks].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${alternatives})${whole ? "(?![\\p{L}\\p{M}\\p{N}])" : ""}`, "giu");
}

function highlight(text: string, marks: string[]): ReactNode {
  const pattern = markPattern(marks);
  if (!pattern || !text) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(<mark key={start}>{match[0]}</mark>);
    last = start + match[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* ——— Starting points, from the book itself ——— */

function pageTime(page: KeptPage) {
  const time = Date.parse(page.createdAt ?? "") || Date.parse(page.date);
  return Number.isNaN(time) ? 0 : time;
}

/** "12 November 2026" → "November 2026", matching how pages show their dates. */
function monthOf(page: KeptPage) {
  const written = page.date?.match(/([A-Za-z]+)\s+(\d{4})\s*$/);
  if (written) return `${written[1]} ${written[2]}`;
  const time = pageTime(page);
  return time ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(time) : "";
}

const capitalise = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);

/** Distinct values, ignoring case, keeping the first spelling seen. */
function distinct(values: string[]) {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed && !seen.has(fold(trimmed))) seen.set(fold(trimmed), trimmed);
  }
  return [...seen.values()];
}

function mostCommon(values: string[], limit: number) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const value of values) {
    const label = value.trim();
    if (!label) continue;
    const entry = counts.get(fold(label));
    if (entry) entry.count += 1;
    else counts.set(fold(label), { label, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit).map((entry) => entry.label);
}

function startingPointsFor(pages: KeptPage[]) {
  const newest = [...pages].sort((a, b) => pageTime(b) - pageTime(a));
  return [
    { label: "People", items: mostCommon(pages.flatMap((page) => page.people ?? []), 8) },
    { label: "Chapters", items: distinct(newest.map((page) => page.chapterTitle ?? "")).slice(0, 6) },
    { label: "Months", items: distinct(newest.map(monthOf)).slice(0, 6) },
    // Feelings are stored lower-case ("calm"); show them like the other chips.
    { label: "Feelings", items: mostCommon(pages.flatMap((page) => page.emotions ?? []), 6).map(capitalise) },
  ].filter((group) => group.items.length);
}
