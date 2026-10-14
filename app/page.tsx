import Link from "next/link";
import {
  BellSlash,
  BookOpenText,
  DeviceMobile,
  Microphone,
  Scroll,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { BeforeAfter } from "@/components/marketing/before-after";
import { BookMockup } from "@/components/marketing/book-mockup";
import { DemoWidget } from "@/components/marketing/demo-widget";
import { GrowthShelf } from "@/components/marketing/growth-shelf";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The public landing page. The app itself lives at `/today`.
 *
 * The job of this page is not to list features — it is to compress the payoff
 * of a journal that takes months to reveal itself into about thirty seconds:
 * show the book, show a messy note becoming a page, then let the visitor try
 * the real memory engine on their own words. See growth-strategy.md §3.
 *
 * One primary action throughout: "Start your book — free". The waitlist is
 * kept, but moved out of the main path to the closing section.
 */

const STEPS = [
  {
    icon: Microphone,
    title: "Write or speak",
    body: "Ninety seconds on a warm page. A faint question helps if you’re stuck. English, Hindi or Hinglish — type or talk.",
  },
  {
    icon: Sparkle,
    title: "It’s quietly polished",
    body: "Grammar and flow, lightly. Your voice stays yours. The people, places and years are filed for you — nothing to tag.",
  },
  {
    icon: BookOpenText,
    title: "It becomes a book",
    body: "Days weave into chapters, chapters into eras. Thirty days in, you have a slim book you can print.",
  },
];

const PROMISES = [
  {
    icon: DeviceMobile,
    title: "Your device first",
    body: "Writing and reading work offline. The journal is yours.",
  },
  {
    icon: ShieldCheck,
    title: "Never used to train AI",
    body: "Not ours, not anyone’s. A hard line, not a setting.",
  },
  {
    icon: Scroll,
    title: "Your raw words, kept",
    body: "The polish is an editor, never a replacement. One tap away.",
  },
  {
    icon: BellSlash,
    title: "No streaks, no guilt",
    body: "No scores, no daily nags. Come back whenever you like.",
  },
];

function PrimaryCta({ signedIn, className = "" }: { signedIn: boolean; className?: string }) {
  return (
    <Link
      href="/today"
      className={`inline-flex min-h-12 items-center rounded-full bg-action-deep px-7 font-interface text-base text-paper shadow-paper-sm transition-colors hover:bg-ink ${className}`}
    >
      {signedIn ? "Open your book" : "Start your book — free"}
    </Link>
  );
}

export default async function Home() {
  let signedIn = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    signedIn = false;
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="font-editorial text-lg tracking-tight">Life on Paper</span>
        <nav className="flex items-center gap-5">
          <Link
            href="/sample"
            className="hidden font-interface text-sm text-ink-muted hover:text-ink sm:inline"
          >
            Sample book
          </Link>
          <Link
            href="/today"
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--rule)] px-4 font-interface text-sm text-ink transition-colors hover:border-action-deep hover:text-action-deep"
          >
            {signedIn ? "Open your book" : "Start writing"}
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero — the promise on the left, the book itself on the right. */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <h1 className="font-editorial text-[2.6rem] leading-[1.08] tracking-tight sm:text-6xl lg:text-[3.6rem]">
              <span className="block text-balance">Write ninety seconds a day.</span>
              <span className="block text-balance text-action">Get a book of your life.</span>
            </h1>
            <p className="mt-6 max-w-xl font-interface text-lg leading-relaxed text-ink-muted">
              A journal that quietly turns what you write into the story of your life — polished in
              your own voice, then printed as a book you can hold.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PrimaryCta signedIn={signedIn} />
              <Link
                href="/sample"
                className="font-interface text-base text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                Read a sample book
              </Link>
            </div>
            <p className="mt-5 font-interface text-sm text-ink-muted">
              Free to start · No sign-up to begin · English, Hindi & Hinglish
            </p>
          </div>

          <div className="mx-auto w-full max-w-xl lg:max-w-none">
            <BookMockup />
          </div>
        </section>

        {/* Before → after, visible without a click; then the live demo. */}
        <section id="try" className="scroll-mt-8 border-t border-[var(--rule)] bg-paper-raised">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">
              The editor
            </p>
            <h2 className="mt-3 max-w-2xl font-editorial text-3xl leading-tight tracking-tight sm:text-4xl">
              Messy is fine. That’s the point.
            </h2>
            <p className="mt-4 max-w-2xl font-interface text-base leading-relaxed text-ink-muted">
              Type the way you think. The editor fixes, it doesn’t rewrite — nothing invented,
              nothing dramatised. Hinglish stays Hinglish.
            </p>

            <div className="mt-10">
              <BeforeAfter />
            </div>

            <div className="mt-16">
              <h3 className="font-editorial text-2xl tracking-tight">Now try it with your own words</h3>
              <p className="mt-2 font-interface text-sm text-ink-muted">
                Edit the sample or write your own — the real editor runs on it in a few seconds.
              </p>
              <div className="mt-5">
                <DemoWidget />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-[var(--rule)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">
              How it works
            </p>
            <h2 className="mt-3 font-editorial text-3xl tracking-tight sm:text-4xl">
              Three steps. Only the first is yours.
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, index) => (
                <li
                  key={title}
                  className="rounded-book border border-[var(--rule)] bg-paper-raised p-6 shadow-paper-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sheet)] text-action">
                      <Icon size={22} />
                    </span>
                    <span className="font-editorial text-3xl text-ink-muted/60">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-editorial text-xl text-ink">{title}</h3>
                  <p className="mt-2 font-interface text-base leading-relaxed text-ink-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The payoff, drawn */}
        <section className="border-t border-[var(--rule)] bg-paper-raised">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
            <div className="text-center">
              <p className="font-interface text-xs uppercase tracking-[0.18em] text-action-deep">
                The part that makes it worth it
              </p>
              <h2 className="mx-auto mt-3 max-w-2xl font-editorial text-3xl leading-tight tracking-tight sm:text-4xl">
                Ninety seconds doesn’t feel like much. Then it’s a book.
              </h2>
            </div>
            <div className="mt-14">
              <GrowthShelf />
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-t border-[var(--rule)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <h2 className="max-w-2xl font-editorial text-3xl leading-tight tracking-tight sm:text-4xl">
              You’re handing over your inner life. We take that literally.
            </h2>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PROMISES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-book border border-[var(--rule)] p-5">
                  <Icon size={24} className="text-action" />
                  <h3 className="mt-4 font-interface text-base font-medium text-ink">{title}</h3>
                  <p className="mt-1.5 font-interface text-sm leading-relaxed text-ink-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing — one action, with the waitlist as a quiet secondary. */}
        <section className="border-t border-[var(--rule)] bg-paper-raised">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
            <h2 className="font-editorial text-3xl leading-snug tracking-tight sm:text-5xl">
              It starts with one line.
              <br />
              Yours, today.
            </h2>
            <div className="mt-9">
              <PrimaryCta signedIn={signedIn} className="px-9" />
            </div>

            <div className="mx-auto mt-16 max-w-lg border-t border-[var(--rule)] pt-10 text-left">
              <p className="font-interface text-sm text-ink">
                Not ready yet? Get one email when printed books open.
              </p>
              <div className="mt-4">
                <WaitlistForm source="landing-closing" />
              </div>
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
            <Link className="underline underline-offset-4 hover:text-ink" href="/sample">
              Sample book
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
    </div>
  );
}
