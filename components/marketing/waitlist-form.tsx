"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Email capture for the pre-launch list.
 *
 * The list is the critical path to the Product Hunt launch (growth-strategy.md
 * §5.2), so this is intentionally the lowest-friction thing on the page: one
 * field, no name, no company, no confirmation step.
 */
export function WaitlistForm({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || status === "submitting") return;

    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; alreadyOnList?: boolean; message?: string }
        | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(payload?.message ?? "Something went wrong. Try again in a moment.");
        return;
      }

      setStatus("done");
      setMessage(
        payload?.alreadyOnList
          ? "You’re already on the list — we’ll be in touch."
          : "You’re on the list. We’ll write once, when there’s a book to print.",
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again in a moment.");
    }
  };

  if (status === "done") {
    return (
      <p
        className="rounded-book border border-[var(--rule)] bg-paper p-4 font-interface text-base text-ink"
        role="status"
      >
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`waitlist-${source}`} className="sr-only">
          Your email address
        </label>
        <input
          id={`waitlist-${source}`}
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full flex-1 rounded-full border border-[var(--rule)] bg-paper-raised px-5 py-3.5 font-interface text-base text-ink outline-none placeholder:text-ink-muted focus-visible:border-action"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-action px-7 py-3.5 font-interface text-base text-paper transition-colors hover:bg-action-deep disabled:opacity-60"
        >
          {status === "submitting" ? "Adding…" : "Keep me posted"}
        </button>
      </div>
      {status === "error" && message ? (
        <p className="mt-3 font-interface text-sm text-ink-muted" role="alert">
          {message}
        </p>
      ) : (
        <p className="mt-3 font-interface text-sm text-ink-muted">
          One email, when the first books can be printed. Nothing else.
        </p>
      )}
    </form>
  );
}
