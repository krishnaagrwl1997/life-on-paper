import type { Metadata } from "next";
import Link from "next/link";
import { SampleBook } from "@/components/marketing/sample-book";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

export const metadata: Metadata = {
  title: "A sample book — Life on Paper",
  description:
    "Read a finished Life on Paper book: woven chapters made only from the writer's own entries, with the original words still underneath.",
};

export default function SamplePage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="font-editorial text-lg tracking-tight">
          Life on Paper
        </Link>
        <Link
          href="/today"
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--rule)] px-4 font-interface text-sm text-ink transition-colors hover:border-action hover:text-action"
        >
          Start writing
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        <section className="pt-8">
          <h1 className="font-editorial text-4xl leading-tight tracking-tight sm:text-5xl">
            A whole book, so you can judge it properly.
          </h1>
          <p className="mt-6 font-interface text-lg leading-relaxed text-ink-muted">
            This is a sample life — written the way people really write, then woven the way the app
            weaves. Read it as a story. Then switch to{" "}
            <span className="text-ink">As written</span> and see exactly what came in. Nothing in the
            story is invented from anything else.
          </p>
        </section>

        <section className="mt-12">
          <SampleBook />
        </section>

        <section className="mt-20 border-t border-[var(--rule)] pt-12">
          <h2 className="font-editorial text-2xl leading-snug text-ink sm:text-3xl">
            Your own book starts with one line.
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/today"
              className="inline-flex min-h-11 items-center rounded-full bg-action px-7 font-interface text-base text-paper transition-colors hover:bg-action-deep"
            >
              Start your book — free
            </Link>
          </div>

          <div className="mt-10">
            <p className="font-interface text-base text-ink-muted">
              Or leave your email and we’ll tell you when the first books can be printed.
            </p>
            <div className="mt-4">
              <WaitlistForm source="sample" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <p className="font-interface text-sm text-ink-muted">
          Life on Paper — your life, in your own words, in your own language.
        </p>
      </footer>
    </div>
  );
}
