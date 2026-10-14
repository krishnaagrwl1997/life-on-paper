"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { KeptPage } from "@/components/system/memory-interview";
import { track } from "@/lib/analytics";

/**
 * The printable book: cover, contents, then every chapter on its own page,
 * set in the book's typefaces. "Save as PDF" is the browser's print dialog —
 * it gives better typography than a generated PDF and works on phones too.
 *
 * Reads the same device store as the Story tab (life-in-books-pages plus the
 * Book Studio's added and removed pages), so what you download is exactly
 * the book you see. Nothing leaves the device.
 */

type Chapter = { title: string; pages: KeptPage[] };
type Volume = { title: string; chapters: Chapter[] };

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function pageTime(page: KeptPage) {
  const time = Date.parse(page.createdAt ?? page.date);
  return Number.isNaN(time) ? 0 : time;
}

function loadBook() {
  const saved = readJson<KeptPage[]>("life-in-books-pages", []);
  const studio = readJson<{ pages?: KeptPage[]; removedPageIds?: string[]; bookTitle?: string }>(
    "life-in-books-studio",
    {},
  );
  const extra = (studio.pages ?? []).filter(
    (page) => !saved.some((item) => item.id === page.id || item.title === page.title),
  );
  const removed = new Set(studio.removedPageIds ?? []);
  const pages = [...saved, ...extra]
    .filter((page) => !removed.has(page.id))
    .sort((a, b) => pageTime(a) - pageTime(b));

  // Volumes and chapters in the order they first appear in time.
  const volumes: Volume[] = [];
  for (const page of pages) {
    const volumeTitle = page.volume || "Your Story";
    let volume = volumes.find((item) => item.title === volumeTitle);
    if (!volume) {
      volume = { title: volumeTitle, chapters: [] };
      volumes.push(volume);
    }
    const chapterTitle = page.chapterTitle || "Pages";
    let chapter = volume.chapters.find((item) => item.title === chapterTitle);
    if (!chapter) {
      chapter = { title: chapterTitle, pages: [] };
      volume.chapters.push(chapter);
    }
    chapter.pages.push(page);
  }

  const title =
    studio.bookTitle || window.localStorage.getItem("life-in-books-book-title") || "My Life on Paper";
  return { title, pages, volumes };
}

function formatMonthYear(time: number) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(time));
}

export default function BookPage() {
  const [book, setBook] = useState<ReturnType<typeof loadBook> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setBook(loadBook()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!book) return <div className="min-h-screen bg-paper" />;

  const { title, pages, volumes } = book;
  const first = pages[0] ? pageTime(pages[0]) : 0;
  const last = pages.length ? pageTime(pages[pages.length - 1]) : 0;
  const span =
    first && last
      ? formatMonthYear(first) === formatMonthYear(last)
        ? formatMonthYear(first)
        : `${formatMonthYear(first)} – ${formatMonthYear(last)}`
      : "";

  const download = () => {
    track("book_download", { pages: pages.length, chapters: volumes.reduce((n, v) => n + v.chapters.length, 0) });
    window.print();
  };

  return (
    <div className="book-print min-h-screen bg-paper text-ink print:bg-white">
      <style>{`
        @page { size: A5; margin: 18mm 16mm 20mm; }
        @media print {
          html, body { background: #fff !important; }
          .book-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .book-sheet { background: transparent !important; box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
          .book-break { break-before: page; }
          .book-keep { break-inside: avoid; }
        }
      `}</style>

      {/* Toolbar — never printed */}
      <div className="sticky top-0 z-10 border-b border-[var(--rule)] bg-paper/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/today" className="inline-flex min-h-11 items-center font-interface text-sm text-ink-muted hover:text-ink">
            ← Back to your book
          </Link>
          {pages.length ? (
            <button
              type="button"
              onClick={download}
              className="inline-flex min-h-11 items-center rounded-full bg-action-deep px-6 font-interface text-sm text-paper hover:bg-ink"
            >
              Save as PDF
            </button>
          ) : null}
        </div>
        {pages.length ? (
          <p className="mx-auto max-w-3xl px-5 pb-3 font-interface text-xs text-ink-muted">
            In the print window, choose <span className="text-ink">Save as PDF</span>. On iPhone: tap Share → Print, then
            Share again to save the PDF.
          </p>
        ) : null}
      </div>

      {!pages.length ? (
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-editorial text-3xl">Your book is waiting for its first page.</h1>
          <p className="mt-4 font-interface text-base text-ink-muted">
            Write a few lines about today and it will be here, ready to download.
          </p>
          <Link
            href="/today"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-action-deep px-6 font-interface text-base text-paper hover:bg-ink"
          >
            Write your first page
          </Link>
        </div>
      ) : (
        <div className="book-sheet mx-auto my-8 max-w-[38rem] rounded-[6px] border border-[var(--rule)] bg-paper-raised px-8 py-12 shadow-paper-md sm:px-14 print:my-0">
          {/* Cover */}
          <section className="flex min-h-[70vh] flex-col justify-between print:min-h-[170mm]">
            <p className="font-interface text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted">A Life on Paper book</p>
            <div>
              <h1 className="font-editorial text-5xl leading-[1.05] tracking-tight">{title}</h1>
              <div className="mt-6 h-px w-16 bg-[var(--ceremonial)]" />
              <p className="mt-6 font-editorial text-lg italic text-ink-muted">{span}</p>
            </div>
            <p className="font-interface text-xs text-ink-muted">
              {pages.length} {pages.length === 1 ? "page" : "pages"} · written in your own words
            </p>
          </section>

          {/* Contents */}
          <section className="book-break mt-16 print:mt-0">
            <h2 className="font-editorial text-3xl">Contents</h2>
            <ol className="mt-8 space-y-6">
              {volumes.map((volume) => (
                <li key={volume.title} className="book-keep">
                  <p className="font-interface text-[0.7rem] uppercase tracking-[0.18em] text-action-deep">{volume.title}</p>
                  <ol className="mt-2 space-y-1">
                    {volume.chapters.map((chapter) => (
                      <li key={chapter.title} className="flex items-baseline justify-between gap-4 font-editorial text-lg">
                        <span>{chapter.title}</span>
                        <span className="font-interface text-xs text-ink-muted">
                          {chapter.pages.length} {chapter.pages.length === 1 ? "page" : "pages"}
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </section>

          {/* Chapters */}
          {volumes.map((volume) =>
            volume.chapters.map((chapter) => (
              <section key={`${volume.title}-${chapter.title}`} className="book-break mt-20 print:mt-0">
                <p className="font-interface text-[0.7rem] uppercase tracking-[0.18em] text-action-deep">{volume.title}</p>
                <h2 className="mt-2 font-editorial text-4xl leading-tight tracking-tight">{chapter.title}</h2>
                <div className="mt-10 space-y-14">
                  {chapter.pages.map((page) => (
                    <article key={page.id}>
                      <div className="book-keep">
                        <p className="font-interface text-xs text-ink-muted">{page.date}</p>
                        <h3 className="mt-1 font-editorial text-2xl leading-snug">{page.title}</h3>
                      </div>
                      {page.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data URLs and signed URLs, printed as-is
                        <img src={page.photo} alt="" className="book-keep mt-5 max-h-72 w-full rounded-[4px] object-cover" />
                      ) : null}
                      <div className="mt-5 space-y-4">
                        {page.body.map((paragraph, index) => (
                          <p key={index} className="font-editorial text-[1.05rem] leading-[1.7]">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                      {page.reflection && !page.body.join(" ").includes(page.reflection) ? (
                        <p className="mt-4 font-editorial text-[1.05rem] italic leading-[1.7] text-ink-muted">
                          {page.reflection}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            )),
          )}

          {/* Colophon */}
          <section className="book-break mt-20 text-center print:mt-0 print:pt-[60mm]">
            <div className="mx-auto h-px w-12 bg-[var(--ceremonial)]" />
            <p className="mt-6 font-editorial text-lg italic text-ink-muted">
              Written by you{span ? `, ${span}` : ""}.
            </p>
            <p className="mt-2 font-interface text-xs text-ink-muted">
              Polished, never invented. Made with Life on Paper — lifeonpaper.app
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
