"use client";

import { useState } from "react";
import { Copy, WhatsappLogo } from "@phosphor-icons/react";
import { track } from "@/lib/analytics";

/** Writes the invitation: a personal link and a ready WhatsApp message. */
export function GiftInvite({ defaultName = "" }: { defaultName?: string }) {
  const [name, setName] = useState(defaultName);
  const [copied, setCopied] = useState(false);
  const link = `https://lifeonpaper.app/gift${name.trim() ? `?from=${encodeURIComponent(name.trim())}` : ""}`;
  const message = `I'd love to hear your stories. Try this — just speak a few lines a day, in Hindi or English, and it turns them into a book of your life: ${link}`;

  return (
    <div className="rounded-[22px] border border-[var(--rule)] bg-[var(--paper-raised)] p-6 shadow-paper-sm">
      <p className="font-editorial text-2xl text-ink">Send an invitation</p>
      <label className="mt-5 block font-interface text-sm text-ink">
        Your name, as they call you
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Riya, Beta, Chotu"
          maxLength={40}
          className="mt-2 block min-h-12 w-full rounded-xl border border-[var(--rule)] bg-paper px-4 font-interface text-base text-ink outline-none focus:border-action-deep"
        />
      </label>
      <p className="mt-4 rounded-xl bg-paper p-4 font-interface text-sm leading-relaxed text-ink-muted">{message}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("gift_invite", { method: "whatsapp", named: Boolean(name.trim()) })}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-action-deep px-6 font-interface text-base text-paper transition-colors hover:bg-ink"
        >
          <WhatsappLogo size={20} weight="fill" aria-hidden="true" /> Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              setCopied(true);
              track("gift_invite", { method: "copy", named: Boolean(name.trim()) });
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--rule)] px-6 font-interface text-base text-ink transition-colors hover:border-action-deep"
        >
          <Copy size={18} aria-hidden="true" /> {copied ? "Copied" : "Copy message"}
        </button>
      </div>
    </div>
  );
}
