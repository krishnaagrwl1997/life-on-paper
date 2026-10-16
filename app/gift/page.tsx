import type { Metadata } from "next";
import Link from "next/link";
import { TrackedLink } from "@/components/marketing/tracked-link";
import { GiftInvite } from "@/components/marketing/gift-invite";

export const metadata: Metadata = {
  title: "Give someone the book of their life — Life on Paper",
  description:
    "Ask Amma, Papa, Nani or a friend to keep a few lines a day — spoken in Hindi or English — and their stories become a book you can hold.",
  openGraph: {
    title: "Someone wants to hear your stories",
    description: "A few lines a day, spoken or typed, in Hindi or English. Your stories become a book.",
    images: [{ url: "/og.jpg", width: 1200, height: 630 }],
  },
};

const PROMPTS = [
  "What was the house you grew up in like?",
  "How did you and Papa meet?",
  "What did a Sunday look like when you were ten?",
  "What's a song that takes you straight back?",
];

/**
 * The gift page does two jobs: for someone who wants to give a book, it
 * writes the invitation; for someone who received one (?from=Name), it is a
 * warm, simple welcome that leads straight to their first page.
 */
export default async function GiftPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const sender = (from ?? "").replace(/[^\p{L}\p{M} .'-]/gu, "").trim().slice(0, 40);

  return (
    <div className="min-h-screen overflow-x-clip bg-paper pb-16 text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="font-editorial text-lg tracking-tight">
          Life on Paper
        </Link>
        <TrackedLink
          href="/today"
          event="gift_cta"
          where="header"
          className="inline-flex min-h-11 items-center rounded-full border border-[var(--rule)] px-4 font-interface text-sm text-ink transition-colors hover:border-action-deep hover:text-action-deep"
        >
          Start writing
        </TrackedLink>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        {sender ? (
          <section className="max-w-2xl pt-6 sm:pt-12">
            <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">An invitation</p>
            <h1 className="mt-3 text-balance font-editorial text-4xl leading-[1.1] tracking-tight sm:text-6xl">
              {sender} wants to hear your stories.
            </h1>
            <p className="mt-5 font-interface text-lg leading-relaxed text-ink-muted">
              Say a few lines a day — in Hindi, English, or both, the way you talk. Life on Paper writes them down, keeps your
              own words, and slowly turns them into a book of your life that you can read, share and print.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <TrackedLink
                href="/today"
                event="gift_cta"
                where="received"
                className="inline-flex min-h-12 items-center rounded-full bg-action-deep px-8 font-interface text-base text-paper shadow-paper-sm transition-colors hover:bg-ink"
              >
                Tell your first story
              </TrackedLink>
              <Link href="/sample" className="font-interface text-base text-ink-muted underline underline-offset-4 hover:text-ink">
                See what a book looks like
              </Link>
            </div>
            <ul className="mt-10 grid gap-3 font-interface text-sm text-ink-muted sm:grid-cols-3">
              <li className="rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] p-4">Free to start. No typing needed — tap the mic and talk.</li>
              <li className="rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] p-4">Private. Your pages stay yours; only you choose what to share.</li>
              <li className="rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] p-4">Your words, never invented — just gently tidied.</li>
            </ul>
          </section>
        ) : (
          <section className="grid gap-12 pt-6 sm:pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">Give a book</p>
              <h1 className="mt-3 text-balance font-editorial text-4xl leading-[1.1] tracking-tight sm:text-6xl">
                The stories you&rsquo;ll wish you had written down.
              </h1>
              <p className="mt-5 font-interface text-lg leading-relaxed text-ink-muted">
                Ask Amma, Papa, Nani — or a friend far away — to keep a few lines a day. They can just speak, in Hindi or
                English. Over months, their stories become a book you can hold.
              </p>
              <div className="mt-8">
                <p className="font-interface text-sm font-semibold text-ink">A few first questions to send them</p>
                <ul className="mt-3 space-y-2 font-editorial text-lg italic text-ink-muted">
                  {PROMPTS.map((prompt) => <li key={prompt}>&ldquo;{prompt}&rdquo;</li>)}
                </ul>
              </div>
            </div>
            <GiftInvite />
          </section>
        )}
      </main>
    </div>
  );
}
