import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Life on Paper",
  description:
    "What Life on Paper stores, where it lives, who touches it, and how to remove it. Your writing is yours.",
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

function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 font-interface text-base leading-relaxed text-ink-muted">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
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
        <p className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">
          Privacy
        </p>
        <h1 className="mt-3 font-editorial text-4xl leading-tight tracking-tight sm:text-5xl">
          Your writing is yours.
        </h1>
        <P>
          This page says, in plain language, what happens to the words you put into Life on
          Paper.
        </P>
        <p className="mt-6 font-interface text-sm text-ink-muted">Last updated {UPDATED}.</p>

        <H2>What we store</H2>
        <UL
          items={[
            <>
              <strong className="text-ink">Your entries.</strong> The moments you write: the
              text, anything you choose to add (like a photograph), and the page the editor
              shapes from it.
            </>,
            <>
              <strong className="text-ink">Your account.</strong> If you sign in with Google,
              we receive your email address, name, and profile picture from Google. We do not
              receive your Google password.
            </>,
            <>
              <strong className="text-ink">Waitlist email.</strong> If you leave an email on
              the launch list, we keep that address so we can write to you once when the first
              books can be printed.
            </>,
          ]}
        />

        <H2>Where it lives</H2>
        <UL
          items={[
            <>
              <strong className="text-ink">On your device.</strong> Before you sign in — and
              always, as a working copy — your pages are kept in your browser&rsquo;s local
              storage on that device. If you never sign in, they never leave it.
            </>,
            <>
              <strong className="text-ink">In your account, if you sign in.</strong> Signing in
              copies your pages to your private account so your book follows you between your
              phone and your computer. That storage is provided by Supabase, and each account
              can only ever read its own rows — enforced at the database level, not just in the
              app.
            </>,
          ]}
        />

        <H2>The editor and your words</H2>
        <P>
          When you ask the editor to shape a page, that entry is sent to our AI provider to be
          cleaned and filed. We send only what is needed: the words you wrote for that page.
        </P>
        <UL
          items={[
            <>
              We route these requests through <strong className="text-ink">OpenRouter</strong>{" "}
              (currently to DeepSeek models), with <strong className="text-ink">Gemini</strong>{" "}
              and <strong className="text-ink">OpenAI</strong> as fallbacks if the first is
              unavailable.
            </>,
            <>
              We ask our providers not to retain or train on your words (OpenRouter is called
              with data collection denied, and we require providers that honour that).
            </>,
            <>
              The editor is built to <strong className="text-ink">never invent</strong> people,
              quotes, dates, places, or events. It may still make a mistake; you can always
              edit the result or delete the page.
            </>,
          ]}
        />

        <H2>What we do not do</H2>
        <UL
          items={[
            "We do not sell your data.",
            "We do not show advertising.",
            "We do not publish anything you write. Nothing is visible to another person unless you deliberately share it.",
            "We do not use your entries to train our own models.",
          ]}
        />

        <H2>Cookies</H2>
        <P>
          We set a session cookie when you sign in, so the app knows it is you. We do not use
          advertising or cross-site tracking cookies.
        </P>

        <H2>Your choices</H2>
        <UL
          items={[
            "Delete any page from your book inside the app, at any time.",
            "Sign out to stop using your account on that device. Your synced pages stay in your account.",
            <>
              Ask us to delete your account and everything in it by writing to{" "}
              <a
                className="text-action underline underline-offset-4"
                href="mailto:privacy@lifeonpaper.app"
              >
                privacy@lifeonpaper.app
              </a>
              .
            </>,
            "Leave the launch list by asking us to remove your address.",
          ]}
        />

        <H2>Children</H2>
        <P>
          Life on Paper is not intended for children under 16, and we do not knowingly collect
          their information.
        </P>

        <H2>Where your data is held</H2>
        <P>
          Our database is hosted in Singapore (Supabase, <code>ap-southeast-2</code>). Our
          AI providers process requests in data centres in the United States and Europe. By
          using the app you understand your words may be processed in those regions.
        </P>

        <H2>Changes</H2>
        <P>
          If this policy changes in a way that matters, we will say so on this page and update
          the date above.
        </P>

        <H2>Contact</H2>
        <P>
          Questions about any of this?{" "}
          <a
            className="text-action underline underline-offset-4"
            href="mailto:privacy@lifeonpaper.app"
          >
            privacy@lifeonpaper.app
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
