"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Microphone, PencilSimpleLine, X } from "@phosphor-icons/react";

import {
  SAMPLE_BOOK_AUTHOR,
  SAMPLE_BOOK_TITLE,
  SAMPLE_CAST,
  SAMPLE_CHAPTERS,
  SAMPLE_VOLUMES,
  type SampleChapter,
  type SampleMoment,
} from "@/components/marketing/sample-book-data";
import { TrackedLink } from "@/components/marketing/tracked-link";
import { track } from "@/lib/analytics";

type Mode = "story" | "raw" | "side";

const MODES: { id: Mode; label: string }[] = [
  { id: "story", label: "Story" },
  { id: "raw", label: "As written" },
  { id: "side", label: "Side by side" },
];

/**
 * A readable sample book.
 *
 * The point of this page is that a visitor can *read a finished book* rather
 * than look at screenshots of one — and that the Story / As written / Side by
 * side views let them check the app's central claim for themselves: the woven
 * story is made only from the raw entries, and the raw is always still there.
 */
export function SampleBook() {
  const [chapterId, setChapterId] = useState(SAMPLE_CHAPTERS[0].chapter.id);
  const [mode, setMode] = useState<Mode>("story");
  const [person, setPerson] = useState<string | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const index = SAMPLE_CHAPTERS.findIndex((item) => item.chapter.id === chapterId);
  const { volume, chapter } = SAMPLE_CHAPTERS[index];
  const previous = SAMPLE_CHAPTERS[index - 1];
  const next = SAMPLE_CHAPTERS[index + 1];
  const lastInVolume = volume.chapters[volume.chapters.length - 1].id === chapter.id;

  const bringReaderIntoView = () => {
    const top = readerRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) readerRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const openChapter = (id: string) => {
    setChapterId(id);
    setPerson(null);
    track("sample_chapter_view", { chapter: id });
    bringReaderIntoView();
  };

  const chooseMode = (id: Mode) => {
    setMode(id);
    track("sample_mode", { mode: id });
  };

  const openPerson = (name: string) => {
    setPerson((current) => (current === name ? null : name));
    track("sample_person", { person: name });
    bringReaderIntoView();
  };

  const contents = (
    <ol className="space-y-6">
      {SAMPLE_VOLUMES.map((item) => (
        <li key={item.id}>
          <p className="font-interface text-xs uppercase tracking-[0.16em] text-ink-muted">
            {item.title} · {item.years}
          </p>
          <ol className="mt-2 space-y-0.5">
            {item.chapters.map((entry) => {
              const active = !person && entry.id === chapterId;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => openChapter(entry.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 w-full items-center rounded-book border-l-2 px-3 text-left font-editorial text-base transition-colors ${
                      active
                        ? "border-action-deep bg-paper-raised text-ink"
                        : "border-transparent text-ink-muted hover:text-ink"
                    }`}
                  >
                    {entry.title}
                  </button>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );

  const cast = (
    <div>
      <p className="font-interface text-xs uppercase tracking-[0.16em] text-ink-muted">
        People in this book
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SAMPLE_CAST.map((name) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => openPerson(name)}
              aria-pressed={person === name}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 font-interface text-sm transition-colors ${
                person === name
                  ? "border-action-deep bg-action-deep text-paper"
                  : "border-[var(--rule)] bg-paper-raised text-ink hover:border-action-deep"
              }`}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-interface text-sm leading-relaxed text-ink-muted">
        In the app, the people you write about are found for you — nobody tags anything.
      </p>
    </div>
  );

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.25, ease: [0.22, 0.72, 0.26, 1] as const },
      };

  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
      {/* ---- Sidebar: cover, contents, people ---- */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center gap-4 lg:block">
          <div className="flex shrink-0 items-stretch lg:mb-8">
            <div aria-hidden className="w-2.5 rounded-l-[3px] bg-[#8a3a1b] lg:w-3.5" />
            <div className="flex h-24 w-[4.5rem] flex-col justify-between rounded-r-[4px] bg-action-deep p-2.5 shadow-paper-md lg:h-56 lg:w-44 lg:p-5">
              <p className="font-editorial text-xs leading-tight text-paper lg:text-2xl">{SAMPLE_BOOK_TITLE}</p>
              <span className="h-px w-6 bg-[var(--ceremonial)] lg:w-10" />
            </div>
          </div>
          <div className="lg:hidden">
            <p className="font-editorial text-xl text-ink">{SAMPLE_BOOK_TITLE}</p>
            <p className="font-interface text-sm text-ink-muted">
              {SAMPLE_BOOK_AUTHOR} · {SAMPLE_CHAPTERS.length} chapters
            </p>
          </div>
        </div>

        {/* Contents: collapsible on phones, always open on desktop */}
        <details className="group mt-6 rounded-book border border-[var(--rule)] bg-paper-raised lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-interface text-sm text-ink">
            <span>
              Contents · <span className="text-ink-muted">{chapter.title}</span>
            </span>
            <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="border-t border-[var(--rule)] p-4">{contents}</div>
        </details>
        <nav aria-label="Contents" className="hidden lg:block">
          {contents}
        </nav>

        <div className="mt-8 hidden lg:block">{cast}</div>
      </aside>

      {/* ---- The reader ---- */}
      <div ref={readerRef} className="min-w-0 scroll-mt-6">
        <AnimatePresence mode="wait" initial={false}>
          {person ? (
            <motion.div key={`person-${person}`} {...motionProps}>
              <PersonThread
                name={person}
                onClose={() => setPerson(null)}
                onOpenChapter={openChapter}
              />
            </motion.div>
          ) : (
            <motion.article key={`chapter-${chapter.id}`} {...motionProps}>
              <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">
                {volume.title} · Chapter {index + 1}
              </p>
              <h2 className="mt-2 font-editorial text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
                {chapter.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 font-interface text-sm text-ink-muted">
                <span>{chapter.dates}</span>
                <span aria-hidden>·</span>
                <span>
                  Woven from {chapter.moments.length} {chapter.moments.length === 1 ? "entry" : "entries"}
                </span>
                {chapter.language === "Hinglish" ? (
                  <span className="rounded-full border border-[var(--rule)] px-2.5 py-0.5 text-xs text-ink">
                    Written in Hinglish — kept in Hinglish
                  </span>
                ) : null}
              </div>

              {/* The toggle — the permanent check on the weave. */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className="inline-flex w-fit gap-1 rounded-full border border-[var(--rule)] bg-paper p-1"
                  role="group"
                  aria-label="Read the woven story, the original entries, or both"
                >
                  {MODES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => chooseMode(option.id)}
                      aria-pressed={mode === option.id}
                      className={
                        mode === option.id
                          ? "inline-flex min-h-11 items-center rounded-full bg-action-deep px-4 font-interface text-sm text-paper"
                          : "inline-flex min-h-11 items-center rounded-full px-4 font-interface text-sm text-ink-muted hover:text-ink"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="font-interface text-sm text-ink-muted">
                  Every line of the story comes from the entries. Check it.
                </p>
              </div>

              <div className="mt-8">
                {mode === "story" ? <StoryPage chapter={chapter} /> : null}
                {mode === "raw" ? <Entries moments={chapter.moments} /> : null}
                {mode === "side" ? (
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div>
                      <p className="mb-3 font-interface text-xs uppercase tracking-[0.16em] text-ink-muted">
                        What was written
                      </p>
                      <Entries moments={chapter.moments} />
                    </div>
                    <div>
                      <p className="mb-3 font-interface text-xs uppercase tracking-[0.16em] text-ink-muted">
                        What went in the book
                      </p>
                      <StoryPage chapter={chapter} compact />
                    </div>
                  </div>
                ) : null}
              </div>

              {chapter.people.length ? (
                <p className="mt-6 font-interface text-sm text-ink-muted">
                  In this chapter:{" "}
                  {chapter.people.map((name, position) => (
                    <span key={name}>
                      {position ? ", " : null}
                      <button
                        type="button"
                        onClick={() => openPerson(name)}
                        className="inline-flex min-h-11 items-center text-ink underline underline-offset-4 hover:text-action-deep"
                      >
                        {name}
                      </button>
                    </span>
                  ))}
                </p>
              ) : null}

              {lastInVolume ? <VolumeEnd volumeTitle={volume.title} final={!next} /> : null}

              {/* Prev / next */}
              <nav aria-label="Chapters" className="mt-10 grid grid-cols-2 gap-3 border-t border-[var(--rule)] pt-6">
                <div>
                  {previous ? (
                    <button
                      type="button"
                      onClick={() => openChapter(previous.chapter.id)}
                      className="flex min-h-11 w-full flex-col items-start rounded-book p-2 text-left hover:bg-paper-raised"
                    >
                      <span className="flex items-center gap-1 font-interface text-xs text-ink-muted">
                        <ArrowLeft size={14} /> Previous
                      </span>
                      <span className="mt-1 font-editorial text-base text-ink">{previous.chapter.title}</span>
                    </button>
                  ) : null}
                </div>
                <div>
                  {next ? (
                    <button
                      type="button"
                      onClick={() => openChapter(next.chapter.id)}
                      className="flex min-h-11 w-full flex-col items-end rounded-book p-2 text-right hover:bg-paper-raised"
                    >
                      <span className="flex items-center gap-1 font-interface text-xs text-ink-muted">
                        Next <ArrowRight size={14} />
                      </span>
                      <span className="mt-1 font-editorial text-base text-ink">{next.chapter.title}</span>
                    </button>
                  ) : null}
                </div>
              </nav>
            </motion.article>
          )}
        </AnimatePresence>

        <div className="mt-12 lg:hidden">{cast}</div>
      </div>
    </div>
  );
}

function StoryPage({ chapter, compact = false }: { chapter: SampleChapter; compact?: boolean }) {
  return (
    <div
      className={`relative rounded-[6px] border border-[var(--rule)] bg-paper-raised shadow-paper-md ${
        compact ? "p-6" : "px-6 py-8 sm:px-12 sm:py-12"
      }`}
    >
      <div className={compact ? "space-y-4" : "mx-auto max-w-[36rem] space-y-5"}>
        {chapter.story.map((paragraph, index) => (
          <p
            key={index}
            className={`font-editorial leading-relaxed text-ink ${compact ? "text-lg" : "text-lg sm:text-xl"} ${
              index === 0 && !compact
                ? "first-letter:float-left first-letter:mr-2 first-letter:font-editorial first-letter:text-[3.4rem] first-letter:leading-[0.85] first-letter:text-action-deep"
                : ""
            }`}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

function Entries({ moments }: { moments: SampleMoment[] }) {
  return (
    <ol className="space-y-3">
      {moments.map((moment) => (
        <li
          key={moment.id}
          className="rounded-book border border-dashed border-[var(--rule)] bg-paper p-4 sm:p-5"
        >
          <p className="flex items-center gap-2 font-interface text-xs text-ink-muted">
            {moment.via === "voice" ? <Microphone size={14} /> : <PencilSimpleLine size={14} />}
            {moment.via === "voice" ? "Voice note" : "Typed"} · {moment.date}
          </p>
          <p className="mt-2 font-interface text-base leading-relaxed text-ink">{moment.raw}</p>
        </li>
      ))}
    </ol>
  );
}

function PersonThread({
  name,
  onClose,
  onOpenChapter,
}: {
  name: string;
  onClose: () => void;
  onOpenChapter: (id: string) => void;
}) {
  const appearances = SAMPLE_CHAPTERS.filter(({ chapter }) => chapter.people.includes(name));
  const lower = name.toLowerCase();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">A person in this book</p>
          <h2 className="mt-2 font-editorial text-3xl leading-tight tracking-tight text-ink sm:text-4xl">{name}</h2>
          <p className="mt-2 font-interface text-sm text-ink-muted">
            In {appearances.length} {appearances.length === 1 ? "chapter" : "chapters"}, across{" "}
            {new Set(appearances.map(({ volume }) => volume.id)).size === 1 ? "one part" : "the years"} of
            this life.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the book"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--rule)] text-ink-muted hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>

      <ol className="mt-8 space-y-4">
        {appearances.map(({ volume, chapter }) => {
          const line =
            chapter.story.find((paragraph) => paragraph.toLowerCase().includes(lower)) ?? chapter.story[0];
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => onOpenChapter(chapter.id)}
                className="w-full rounded-book border border-[var(--rule)] bg-paper-raised p-5 text-left shadow-paper-sm transition-colors hover:border-action-deep"
              >
                <p className="font-interface text-xs text-ink-muted">
                  {volume.title} · {chapter.dates}
                </p>
                <p className="mt-1 font-editorial text-xl text-ink">{chapter.title}</p>
                <p className="mt-2 font-editorial text-base leading-relaxed text-ink-muted">{line}</p>
                <p className="mt-3 flex items-center gap-1 font-interface text-sm text-action-deep">
                  Read the chapter <ArrowRight size={14} />
                </p>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function VolumeEnd({ volumeTitle, final }: { volumeTitle: string; final: boolean }) {
  return (
    <div className="mt-10 rounded-book border border-[var(--rule)] bg-sheet/60 p-6 sm:p-8">
      <p className="font-interface text-xs uppercase tracking-[0.16em] text-ink-muted">
        End of {volumeTitle}
      </p>
      <p className="mt-2 font-editorial text-2xl leading-snug text-ink">
        {final ? "That’s the book so far. Yours starts with one line." : "Your first chapter starts with one line."}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <TrackedLink
          href="/today"
          event="sample_cta"
          where={`volume-end-${volumeTitle}`}
          className="inline-flex min-h-11 items-center rounded-full bg-action-deep px-6 font-interface text-base text-paper transition-colors hover:bg-ink"
        >
          Start your book — free
        </TrackedLink>
        <TrackedLink
          href="/#try"
          event="sample_cta"
          where="volume-end-demo"
          className="font-interface text-base text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          Try it with your own words
        </TrackedLink>
      </div>
    </div>
  );
}
