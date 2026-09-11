import { DemoWidget } from "@/components/marketing/demo-widget";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The public landing page. The app itself lives at `/today`.
 *
 * The job of this page is not to list features — it is to compress the payoff
 * of a journal that takes months to reveal itself into about thirty seconds,
 * by letting a visitor watch the real memory engine work on their own words.
 * See growth-strategy.md §3.
 */
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
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="font-editorial text-lg tracking-tight">Life on Paper</span>
        <a
          href="/today"
          className="rounded-full border border-[var(--rule)] px-4 py-2 font-interface text-sm text-ink transition-colors hover:border-action hover:text-action"
        >
          {signedIn ? "Open your book" : "Start writing"}
        </a>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
          <h1 className="font-editorial text-4xl leading-[1.15] tracking-tight sm:text-6xl">
            Write ninety seconds a day.
            <br />
            Get a book of your life.
          </h1>
          <p className="mt-6 max-w-2xl font-interface text-lg leading-relaxed text-ink-muted">
            Life on Paper is a journal that treats what you write as the story of a life. Every
            entry is quietly polished in your own voice, filed with the people and the years it
            belongs to, and woven into chapters — then printed as a book you can hold.
          </p>
          <p className="mt-5 max-w-2xl font-interface text-base leading-relaxed text-ink-muted">
            No organising. No tagging. No streaks. No guilt. Just a warm page and one faint
            question.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/today"
              className="rounded-full bg-action px-7 py-3.5 font-interface text-base text-paper transition-colors hover:bg-action-deep"
            >
              Start your book — free
            </a>
            <a
              href="#try"
              className="font-interface text-base text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              Try it first, below
            </a>
          </div>
        </section>

        {/* The demo — the most important element on this page. */}
        <section id="try" className="mx-auto max-w-3xl scroll-mt-8 px-5 pb-20 sm:px-8">
          <h2 className="font-editorial text-2xl tracking-tight sm:text-3xl">
            See what the editor does
          </h2>
          <p className="mt-3 max-w-2xl font-interface text-base leading-relaxed text-ink-muted">
            Messy is fine — that is the point. Type a few lines in English, Hindi, or Hinglish and
            watch. Hinglish stays Hinglish; nothing gets translated or corrected into someone
            else’s voice.
          </p>
          <div className="mt-6">
            <DemoWidget />
          </div>
        </section>

        {/* The three doors */}
        <section className="border-t border-[var(--rule)]">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
            <h2 className="font-editorial text-3xl tracking-tight sm:text-4xl">
              Three quiet doors. Nothing to manage.
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <div>
                <h3 className="font-editorial text-xl">Today</h3>
                <p className="mt-3 font-interface text-base leading-relaxed text-ink-muted">
                  The writing page. A faint question breathes where you would type, and changes
                  daily. Type or speak. Every word saves as you go — there is never a save button.
                </p>
              </div>
              <div>
                <h3 className="font-editorial text-xl">Story</h3>
                <p className="mt-3 font-interface text-base leading-relaxed text-ink-muted">
                  Your life as volumes on a shelf — school years, college, the present. Across
                  months and years the app remembers who and what you were writing about, and
                  attaches each new memory to the right era.
                </p>
              </div>
              <div>
                <h3 className="font-editorial text-xl">People</h3>
                <p className="mt-3 font-interface text-base leading-relaxed text-ink-muted">
                  Everyone who keeps appearing — amma, Rahul, the cousins. Their moments gathered in
                  one place, with a quiet arc of how you wrote about them over the years.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The payoff */}
        <section className="border-t border-[var(--rule)] bg-paper-raised">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
            <h2 className="font-editorial text-3xl tracking-tight sm:text-4xl">
              The part that makes it worth it.
            </h2>
            <p className="mt-6 font-interface text-lg leading-relaxed text-ink-muted">
              Ninety seconds a day does not feel like much. Then thirty days pass, and it is a slim
              volume of your own life, in your own words. Then a year passes, and it is a book.
            </p>
            <p className="mt-5 font-interface text-lg leading-relaxed text-ink-muted">
              Written by the app from your words alone. Never invented, never dramatised, never
              moralised. And always — one gesture away — the raw diary exactly as you wrote it.
            </p>
          </div>
        </section>

        {/* Trust */}
        <section className="border-t border-[var(--rule)]">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
            <h2 className="font-editorial text-3xl tracking-tight sm:text-4xl">
              You are handing over your inner life. We take that literally.
            </h2>
            <ul className="mt-8 space-y-5 font-interface text-base leading-relaxed text-ink-muted">
              <li>
                <span className="text-ink">Your words live on your device first.</span> Writing,
                reading and searching work offline. The journal is yours.
              </li>
              <li>
                <span className="text-ink">Never used to train any model.</span> Not ours, not
                anyone’s. This is a hard line, not a setting.
              </li>
              <li>
                <span className="text-ink">Your original words are always kept beneath.</span> The
                polish is an editor, never a replacement. One tap and the raw is there.
              </li>
              <li>
                <span className="text-ink">The app never knocks with a wound.</span> No streaks, no
                scores, no daily notifications, no ambush.
              </li>
            </ul>
          </div>
        </section>

        {/* Closing */}
        <section className="border-t border-[var(--rule)] bg-paper-raised">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
            <h2 className="font-editorial text-3xl leading-snug tracking-tight sm:text-4xl">
              It starts with one line.
              <br />
              Yours, today.
            </h2>
            <a
              href="/today"
              className="mt-9 inline-block rounded-full bg-action px-8 py-4 font-interface text-base text-paper transition-colors hover:bg-action-deep"
            >
              Start your book — free
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="font-interface text-sm text-ink-muted">
          Life on Paper — your life, in your own words, in your own language.
        </p>
      </footer>
    </div>
  );
}
