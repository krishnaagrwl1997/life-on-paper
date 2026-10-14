import Link from "next/link";

import { SAMPLE_BOOK_TITLE, SAMPLE_VOLUMES } from "@/components/marketing/sample-book-data";

/**
 * An open book, drawn in CSS, showing a real chapter from the sample book.
 *
 * The landing page promises "a book you can hold" — this is the picture of
 * that promise. It renders hand-written sample content (sample-book-data.ts),
 * never a real person's journal, and links through to the full sample.
 */
export function BookMockup() {
  const volume = SAMPLE_VOLUMES[0];
  const chapter = volume.chapters[0];

  return (
    <Link
      href="/sample"
      aria-label={`Read the sample book, ${SAMPLE_BOOK_TITLE}`}
      className="group relative block select-none"
    >
      {/* Soft shadow the book rests on */}
      <div
        aria-hidden
        className="absolute inset-x-6 -bottom-4 h-8 rounded-[50%] bg-[rgba(63,48,32,0.18)] blur-xl"
      />

      <div className="relative grid grid-cols-2 overflow-hidden rounded-[6px] border border-[var(--rule)] bg-paper-raised shadow-paper-md transition-transform duration-500 ease-paper group-hover:-translate-y-1 [aspect-ratio:1.45/1]">
        {/* Left page — the chapter opening */}
        <div className="relative flex flex-col justify-between border-r border-[var(--rule)] bg-[linear-gradient(90deg,var(--paper-raised)_70%,var(--sheet)_100%)] p-4 sm:p-7">
          <div>
            <p className="font-interface text-[0.65rem] uppercase tracking-[0.2em] text-ink-muted sm:text-[0.65rem]">
              {volume.title}
            </p>
            <p className="mt-5 font-editorial text-[0.7rem] text-action-deep sm:mt-8 sm:text-xs">
              Chapter One
            </p>
            <h3 className="mt-1 font-editorial text-lg leading-tight text-ink sm:text-3xl">
              {chapter.title}
            </h3>
            <p className="mt-1 font-editorial text-[0.65rem] italic text-ink-muted sm:text-sm">
              {chapter.dates}
            </p>
          </div>
          <p className="hidden font-editorial text-sm italic leading-snug text-ink-muted sm:block">
            “{volume.note}”
          </p>
          <p className="font-interface text-[0.65rem] text-ink-muted sm:text-[0.65rem]">12</p>
        </div>

        {/* Right page — the woven story */}
        <div className="relative flex min-h-0 flex-col justify-between bg-[linear-gradient(270deg,var(--paper-raised)_70%,var(--sheet)_100%)] p-4 sm:p-7">
          <div className="min-h-0 flex-1 space-y-2 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)] sm:space-y-3">
            {chapter.story.slice(0, 1).map((paragraph, index) => (
              <p
                key={index}
                className="font-editorial text-[0.65rem] leading-[1.55] text-ink sm:text-[0.8rem] lg:text-[0.85rem]"
              >
                {paragraph}
              </p>
            ))}
          </div>
          <p className="mt-2 text-right font-interface text-[0.65rem] text-ink-muted sm:text-[0.65rem]">
            13
          </p>
        </div>

        {/* Spine crease */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(63,48,32,0.10),transparent)]"
        />
      </div>

      <p className="mt-6 text-center font-interface text-sm text-ink-muted">
        A page from <span className="italic text-ink">{SAMPLE_BOOK_TITLE}</span>, our sample book —{" "}
        <span className="underline underline-offset-4 group-hover:text-ink">read it</span>
      </p>
    </Link>
  );
}
