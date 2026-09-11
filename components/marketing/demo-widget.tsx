"use client";

import { useState } from "react";

import { DEMO_SEED_KEY } from "@/lib/demo-seed";

/**
 * The public demo: a visitor types (or picks) a few messy lines and sees the
 * real memory engine polish them, file them, and name the people it noticed.
 *
 * This is deliberately thin — it calls the same `/api/memory-engine` route the
 * app uses, with `action: "page"`. The words a visitor types here are carried
 * into their first real entry via DEMO_SEED_KEY (see home-experience.tsx), so
 * the demo doubles as onboarding.
 */

type PageResult = {
  language?: string;
  cleanTranscript?: string;
  bookDraft?: string;
  title?: string;
  reflection?: string;
  placement?: {
    book?: string;
    volume?: string;
    chapter?: string;
    chapterTitle?: string;
    confidence?: number;
    reason?: string;
  };
  signals?: {
    people?: string[];
    places?: string[];
    dates?: string[];
    themes?: string[];
  };
};

const SAMPLES = {
  English: `today was so long. work was just work. but then i walked home by the lake and the light was doing that thing it does in october and i just stood there for a while doing nothing. amma called later, she sounded tired but she laughed at something i said and i felt better`,
  Hinglish: `aaj bahut lamba din tha, office mein sab kuch ulta seedha. shaam ko lake ke paas se aaya toh light aisi thi jaise october mein hoti hai, main thodi der wahi khada raha. phir amma ka phone aaya, awaaz thaki hui thi par meri baat pe has padi`,
  Hindi: `आज दिन बहुत लंबा था। शाम को झील के पास से लौटा तो रोशनी वैसी ही थी जैसी अक्टूबर में होती है। मैं कुछ देर वहीं खड़ा रहा। फिर अम्मा का फ़ोन आया। आवाज़ थकी हुई थी, पर मेरी बात पर हँस पड़ीं।`,
} as const;

type SampleKey = keyof typeof SAMPLES;
const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

type Status = "idle" | "loading" | "done" | "error";

export function DemoWidget() {
  const [language, setLanguage] = useState<SampleKey>("English");
  const [text, setText] = useState<string>(SAMPLES.English);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<PageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseLanguage = (key: SampleKey) => {
    setLanguage(key);
    setText(SAMPLES[key]);
    setStatus("idle");
    setResult(null);
    setError(null);
  };

  const run = async () => {
    if (!text.trim() || status === "loading") return;
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/memory-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "page",
          memory: text,
          answers: [],
          emotions: [],
          questionIndex: 0,
          speechLanguage: "auto",
          attachment: null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | (PageResult & { error?: string })
        | null;

      if (!response.ok || !payload || typeof payload.bookDraft !== "string") {
        setStatus("error");
        setError(
          payload?.error === "AI_NOT_CONFIGURED"
            ? "The editor isn’t switched on in this environment yet."
            : response.status === 429
              ? "That’s a lot of tries at once — give it a minute and come back."
              : "The editor couldn’t be reached just now. Try again in a moment.",
        );
        return;
      }

      setResult(payload);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("The editor couldn’t be reached just now. Try again in a moment.");
    }
  };

  // Carry the visitor's own words into their first real entry.
  const keepIt = () => {
    try {
      window.localStorage.setItem(DEMO_SEED_KEY, text.trim());
    } catch {
      /* best-effort — the CTA still works without it */
    }
  };

  const paragraphs = (result?.bookDraft ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const people = (result?.signals?.people ?? []).filter(Boolean);
  const placement = result?.placement;

  return (
    <div className="rounded-book border border-[var(--rule)] bg-paper-raised p-5 shadow-paper-md sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex gap-1 rounded-full border border-[var(--rule)] bg-paper p-1"
          role="group"
          aria-label="Choose a language for the sample"
        >
          {SAMPLE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseLanguage(key)}
              aria-pressed={language === key}
              className={
                language === key
                  ? "rounded-full bg-action px-3 py-1.5 font-interface text-sm text-paper"
                  : "rounded-full px-3 py-1.5 font-interface text-sm text-ink-muted hover:text-ink"
              }
            >
              {key}
            </button>
          ))}
        </div>
        <p className="font-interface text-xs text-ink-muted">
          Nothing is saved. Yours lives on your device.
        </p>
      </div>

      <label htmlFor="demo-memory" className="sr-only">
        Write a few lines about today
      </label>
      <textarea
        id="demo-memory"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        spellCheck={false}
        className="mt-4 w-full resize-y rounded-book border border-[var(--rule)] bg-paper p-4 font-editorial text-lg leading-relaxed text-ink outline-none focus-visible:border-action"
        placeholder="Write a few lines about today — messy is fine."
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={status === "loading" || !text.trim()}
          className="rounded-full bg-action px-6 py-3 font-interface text-base text-paper transition-colors hover:bg-action-deep disabled:opacity-60"
        >
          {status === "loading" ? "Reading it…" : "See what the editor does"}
        </button>
        <button
          type="button"
          onClick={() => chooseLanguage(language)}
          className="font-interface text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          Reset the sample
        </button>
      </div>

      <div aria-live="polite">
        {status === "error" && error ? (
          <p className="mt-6 rounded-book border border-[var(--rule)] bg-paper p-4 font-interface text-sm text-ink-muted">
            {error}
          </p>
        ) : null}

        {status === "done" && result ? (
          <div className="mt-8 border-t border-[var(--rule)] pt-8">
            {result.title ? (
              <p className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">
                Your page
              </p>
            ) : null}
            <h3 className="mt-2 font-editorial text-2xl leading-snug text-ink sm:text-3xl">
              {result.title}
            </h3>

            <div className="mt-5 space-y-3">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="font-editorial text-lg leading-relaxed text-ink">
                  {paragraph}
                </p>
              ))}
            </div>

            {result.reflection ? (
              <p className="mt-4 font-editorial text-lg italic leading-relaxed text-ink-muted">
                {result.reflection}
              </p>
            ) : null}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {people.length ? (
                <p className="rounded-book border border-[var(--rule)] bg-paper p-4 font-interface text-sm text-ink">
                  I noticed{" "}
                  <span className="font-medium">
                    {people.slice(0, 2).map((person) => `“${person}”`).join(" and ")}
                  </span>{" "}
                  — I’ll remember {people.length > 1 ? "them" : "them"}.
                </p>
              ) : null}

              {placement?.volume || placement?.chapterTitle ? (
                <p className="rounded-book border border-[var(--rule)] bg-paper p-4 font-interface text-sm text-ink-muted">
                  Filed into{" "}
                  <span className="text-ink">
                    {[placement.volume, placement.chapterTitle].filter(Boolean).join(" · ")}
                  </span>
                  {placement.reason ? <span className="block mt-1">{placement.reason}</span> : null}
                </p>
              ) : null}
            </div>

            <details className="mt-6">
              <summary className="cursor-pointer font-interface text-sm text-ink-muted hover:text-ink">
                See what it looked like before
              </summary>
              <p className="mt-3 whitespace-pre-wrap rounded-book border border-[var(--rule)] bg-paper p-4 font-interface text-sm leading-relaxed text-ink-muted">
                {text}
              </p>
            </details>

            <a
              href="/today"
              onClick={keepIt}
              className="mt-8 inline-block rounded-full bg-action px-6 py-3 font-interface text-base text-paper transition-colors hover:bg-action-deep"
            >
              Keep this — start your book
            </a>
            <p className="mt-3 font-interface text-xs text-ink-muted">
              Your words come with you. No sign-up needed to begin.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
