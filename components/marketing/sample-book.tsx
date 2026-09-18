"use client";

import { useState } from "react";
import {
  SAMPLE_BOOK_AUTHOR,
  SAMPLE_BOOK_TITLE,
  SAMPLE_CAST,
  SAMPLE_VOLUMES,
} from "@/components/marketing/sample-book-data";

type Mode = "story" | "raw";

/**
 * A readable sample book.
 *
 * The point of this page is that a visitor can *read a finished book* rather
 * than look at screenshots of one — and that the "Story / As written" toggle
 * lets them check the app's central claim for themselves: the woven story is
 * made only from the raw entries, and the raw is always still there.
 */
export function SampleBook() {
  const [volumeId, setVolumeId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("story");
  const [openMoments, setOpenMoments] = useState<Set<string>>(new Set());

  const volume = SAMPLE_VOLUMES.find((item) => item.id === volumeId) ?? null;

  const toggleMoments = (chapterId: string) => {
    setOpenMoments((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const openVolume = (id: string) => {
    setVolumeId(id);
    setMode("story");
    setOpenMoments(new Set());
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* ---- The shelf ---- */}
      {!volume ? (
        <div>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
            {/* Cover */}
            <div className="w-full max-w-[15rem] shrink-0">
              <div className="rounded-book border border-[var(--rule)] border-l-4 border-l-sheet-deep bg-sheet px-6 py-10 shadow-paper-md">
                <p className="font-interface text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {SAMPLE_BOOK_AUTHOR}
                </p>
                <h2 className="mt-4 font-editorial text-3xl leading-tight text-ink">
                  {SAMPLE_BOOK_TITLE}
                </h2>
              </div>
              <p className="mt-4 font-interface text-sm text-ink-muted">
                A sample. Nobody’s real life — and every word of it written the way people actually
                write.
              </p>
            </div>

            {/* Volumes */}
            <div className="flex-1">
              <p className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">
                The shelf
              </p>
              <ul className="mt-4 space-y-3">
                {SAMPLE_VOLUMES.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openVolume(item.id)}
                      className="w-full rounded-book border border-[var(--rule)] bg-paper-raised p-5 text-left transition-colors hover:border-action"
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-editorial text-xl text-ink">{item.title}</span>
                        <span className="font-interface text-sm text-ink-muted">{item.years}</span>
                      </span>
                      <span className="mt-2 block font-interface text-base text-ink-muted">
                        {item.note}
                      </span>
                      <span className="mt-3 block font-interface text-sm text-ink-muted">
                        {item.chapters.length}{" "}
                        {item.chapters.length === 1 ? "chapter" : "chapters"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <p className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">
                  The people who keep appearing
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {SAMPLE_CAST.map((person) => (
                    <li
                      key={person}
                      className="rounded-full border border-[var(--rule)] bg-paper-raised px-3 py-1 font-interface text-sm text-ink"
                    >
                      {person}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-interface text-sm text-ink-muted">
                  The app noticed each of them on its own. Nobody tagged anything.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Inside a volume ---- */}
      {volume ? (
        <div>
          <button
            type="button"
            onClick={() => setVolumeId(null)}
            className="inline-flex min-h-11 items-center font-interface text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            ← Back to the shelf
          </button>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-editorial text-3xl leading-tight text-ink sm:text-4xl">
                {volume.title}
              </h2>
              <p className="mt-1 font-interface text-sm text-ink-muted">{volume.years}</p>
            </div>

            {/* The toggle — the permanent check on the weave. */}
            <div
              className="flex gap-1 rounded-full border border-[var(--rule)] bg-paper p-1"
              role="group"
              aria-label="Read the woven story or the original entries"
            >
              {(["story", "raw"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={mode === option}
                  className={
                    mode === option
                      ? "inline-flex min-h-11 items-center rounded-full bg-action px-4 font-interface text-sm text-paper"
                      : "inline-flex min-h-11 items-center rounded-full px-4 font-interface text-sm text-ink-muted hover:text-ink"
                  }
                >
                  {option === "story" ? "Story" : "As written"}
                </button>
              ))}
            </div>
          </div>

          {mode === "raw" ? (
            <p className="mt-6 font-interface text-sm text-ink-muted">
              Exactly as it was written. Nothing here was tidied, and nothing below was invented
              from it.
            </p>
          ) : null}

          <div className="mt-10 space-y-14">
            {volume.chapters.map((chapter) => (
              <article key={chapter.id}>
                <h3 className="font-editorial text-2xl leading-snug text-ink">{chapter.title}</h3>
                <p className="mt-1 font-interface text-sm text-ink-muted">{chapter.dates}</p>

                {chapter.people.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {chapter.people.map((person) => (
                      <li
                        key={person}
                        className="rounded-full border border-[var(--rule)] px-3 py-1 font-interface text-xs text-ink-muted"
                      >
                        {person}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {mode === "story" ? (
                  <div className="mt-5 space-y-4">
                    {chapter.story.map((paragraph, index) => (
                      <p key={index} className="font-editorial text-lg leading-relaxed text-ink">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {chapter.moments.map((moment) => (
                      <div key={moment.id}>
                        <p className="font-interface text-xs uppercase tracking-[0.14em] text-ink-muted">
                          {moment.date}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap font-interface text-base leading-relaxed text-ink">
                          {moment.raw}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* In story mode, the raw stays one gesture beneath. */}
                {mode === "story" ? (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => toggleMoments(chapter.id)}
                      aria-expanded={openMoments.has(chapter.id)}
                      className="inline-flex min-h-11 items-center font-interface text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
                    >
                      {openMoments.has(chapter.id)
                        ? "Hide what I actually wrote"
                        : `What I actually wrote (${chapter.moments.length})`}
                    </button>

                    {openMoments.has(chapter.id) ? (
                      <div className="mt-4 space-y-4 border-l-2 border-[var(--rule)] pl-5">
                        {chapter.moments.map((moment) => (
                          <div key={moment.id}>
                            <p className="font-interface text-xs uppercase tracking-[0.14em] text-ink-muted">
                              {moment.date}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap font-interface text-base leading-relaxed text-ink-muted">
                              {moment.raw}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
