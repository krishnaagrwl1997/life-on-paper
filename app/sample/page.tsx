import type { Metadata } from "next";
import Link from "next/link";
import { SampleBook } from "@/components/marketing/sample-book";
import { TrackedLink } from "@/components/marketing/tracked-link";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

export const metadata: Metadata = {
  title: "A sample book — Life on Paper",
  description:
    "Read a finished Life on Paper book: chapters woven only from the writer’s own messy entries, in English and Hinglish, with the original words one tap away.",
};

export default function SamplePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-paper pb-24 text-ink sm:pb-0">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="font-editorial text-lg tracking-tight">
          Life on Paper
        </Link>
        <TrackedLink
          href="/today"
          event="sample_cta"
          where="header"
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--rule)] px-4 font-interface text-sm text-ink transition-colors hover:border-action-deep hover:text-action-deep"
        >
          Start writing
        </TrackedLink>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="max-w-3xl pt-6 sm:pt-10">
          <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">A sample book</p>
          <h1 className="mt-3 text-balance font-editorial text-4xl leading-[1.1] tracking-tight sm:text-6xl">
            This is what your words become.
          </h1>
          <p className="mt-5 font-interface text-lg leading-relaxed text-ink-muted">
            A made-up life, typed the way people really type. Read it as a book — then flip to{" "}
            <span className="text-ink">As written</span> and check that every line came from the entries.
          </p>
        </section>

        <section className="mt-12 sm:mt-16">
          <SampleBook />
        </section>

        <section className="mt-24 border-t border-[var(--rule)] py-16 text-center">
          <h2 className="font-editorial text-3xl leading-snug tracking-tight sm:text-5xl">
            Your own book starts with one line.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <TrackedLink
              href="/today"
              event="sample_cta"
              where="closing"
              className="inline-flex min-h-12 items-center rounded-full bg-action-deep px-8 font-interface text-base text-paper shadow-paper-sm transition-colors hover:bg-ink"
            >
              Start your book — free
            </TrackedLink>
            <TrackedLink
              href="/#try"
              event="sample_cta"
              where="closing-demo"
              className="font-interface text-base text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              Try it with your own words
            </TrackedLink>
          </div>

          <div className="mx-auto mt-14 max-w-lg border-t border-[var(--rule)] pt-8 text-left">
            <p className="font-interface text-sm text-ink">
              Not ready yet? Get one email when printed books open.
            </p>
            <div className="mt-4">
              <WaitlistForm source="sample" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-interface text-sm text-ink-muted">
            Life on Paper — your life, in your own words, in your own language.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2 font-interface text-sm text-ink-muted">
            <Link className="underline underline-offset-4 hover:text-ink" href="/">
              Home
            </Link>
            <Link className="underline underline-offset-4 hover:text-ink" href="/privacy">
              Privacy
            </Link>
            <Link className="underline underline-offset-4 hover:text-ink" href="/terms">
              Terms
            </Link>
          </nav>
        </div>
      </footer>

      {/* Sticky action on phones — the page is long and the reader is the point. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--rule)] bg-paper/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
        <TrackedLink
          href="/today"
          event="sample_cta"
          where="sticky-mobile"
          className="flex min-h-12 w-full items-center justify-center rounded-full bg-action-deep font-interface text-base text-paper"
        >
          Start your book — free
        </TrackedLink>
      </div>
    </div>
  );
}
