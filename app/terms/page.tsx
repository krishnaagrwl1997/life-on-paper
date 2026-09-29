import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms — Life on Paper",
  description:
    "The plain-language terms for using Life on Paper: your words stay yours, the editor helps rather than replaces, and the service is a work in progress.",
};

const UPDATED = "28 September 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 font-editorial text-2xl leading-snug tracking-tight text-ink sm:text-3xl">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 font-interface text-base leading-relaxed text-ink-muted">{children}</p>;
}

export default function TermsPage() {
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
        <p className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">Terms</p>
        <h1 className="mt-3 font-editorial text-4xl leading-tight tracking-tight sm:text-5xl">
          The short version: it is your book.
        </h1>
        <P>
          Plain-language terms for using Life on Paper. By using the app you agree to these.
        </P>
        <p className="mt-6 font-interface text-sm text-ink-muted">Last updated {UPDATED}.</p>

        <H2>Your words stay yours</H2>
        <P>
          What you write belongs to you. We claim no ownership over your entries, and we do not
          publish them. You can delete anything you have written, at any time.
        </P>

        <H2>What the editor does — and does not do</H2>
        <P>
          The editor lightly cleans and files what you wrote. It is designed to keep your
          wording, your language, and your meaning, and to{" "}
          <strong className="text-ink">never invent</strong> a person, quote, date, place,
          event, or lesson. It is software, so it can still get something wrong. Read the page
          before you keep it; you are always able to edit it.
        </P>

        <H2>It is not professional advice</H2>
        <P>
          Life on Paper is a place to write. It is not a doctor, therapist, lawyer, or financial
          adviser, and nothing it generates is professional advice.
        </P>

        <H2>Use it kindly</H2>
        <P>
          Please do not use the app to break the law, to harm anyone, to store other
          people&rsquo;s private information without their consent, or to attack or overload the
          service (including scraping it or automating it to burn our AI budget). We may
          suspend access that does.
        </P>

        <H2>It is early, and it may change</H2>
        <P>
          This is a young product and it is offered as-is, without warranties. Features may
          change, and the service may be unavailable at times. Keep your own copy of anything
          you cannot bear to lose — your pages also live in your browser on the device you
          wrote them on.
        </P>

        <H2>Limits on our liability</H2>
        <P>
          To the extent the law allows, we are not liable for indirect or consequential losses
          arising from your use of the app, including lost entries or interrupted access. Where
          liability cannot be excluded, it is limited to the amount you have paid us (which,
          during the beta, is nothing).
        </P>

        <H2>Ending your use</H2>
        <P>
          You may stop using the app at any time and ask us to delete your account. We may
          close an account that breaks these terms.
        </P>

        <H2>Changes</H2>
        <P>
          If these terms change in a way that matters, we will say so on this page and update
          the date above.
        </P>

        <H2>Contact</H2>
        <P>
          Anything unclear?{" "}
          <a className="text-action underline underline-offset-4" href="mailto:hello@lifeonpaper.app">
            hello@lifeonpaper.app
          </a>
        </P>
      </main>

      <footer className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-interface text-sm text-ink-muted">
          <Link className="underline underline-offset-4 hover:text-ink" href="/privacy">
            Privacy
          </Link>
          <Link className="underline underline-offset-4 hover:text-ink" href="/terms">
            Terms
          </Link>
          <Link className="underline underline-offset-4 hover:text-ink" href="/">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
