import { ArrowRight, ArrowDown } from "@phosphor-icons/react/dist/ssr";

/**
 * The editor's work, shown before anyone has to click anything.
 *
 * The "after" is hand-written to the same rules as the engine (AGENTS.md §7):
 * fix, don't rewrite. Every fact, feeling and phrase is the writer's own —
 * only capitals, punctuation and paragraphing change. Keep it that way.
 */
const BEFORE =
  "today was so long. work was just work. but then i walked home by the lake and the light was doing that thing it does in october and i just stood there for a while doing nothing. amma called later, she sounded tired but she laughed at something i said and i felt better";

const AFTER_TITLE = "The Light in October";
const AFTER = [
  "Today was so long. Work was just work. But then I walked home by the lake, and the light was doing that thing it does in October, and I just stood there for a while, doing nothing.",
  "Amma called later. She sounded tired, but she laughed at something I said, and I felt better.",
];

export function BeforeAfter() {
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
      {/* Before */}
      <figure className="flex flex-col rounded-book border border-dashed border-[var(--rule)] bg-paper p-5 sm:p-7">
        <figcaption className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">
          What you type · 9:47 pm
        </figcaption>
        <p className="mt-4 font-interface text-base leading-relaxed text-ink-muted">{BEFORE}</p>
      </figure>

      <div aria-hidden className="flex items-center justify-center text-action">
        <ArrowDown size={28} className="lg:hidden" />
        <ArrowRight size={28} className="hidden lg:block" />
      </div>

      {/* After */}
      <figure className="flex flex-col rounded-book border border-[var(--rule)] bg-paper-raised p-5 shadow-paper-md sm:p-7">
        <figcaption className="font-interface text-xs uppercase tracking-[0.18em] text-ink-muted">
          What goes in your book
        </figcaption>
        <h3 className="mt-4 font-editorial text-2xl leading-snug text-ink">{AFTER_TITLE}</h3>
        <div className="mt-3 space-y-3">
          {AFTER.map((paragraph, index) => (
            <p key={index} className="font-editorial text-lg leading-relaxed text-ink">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2 font-interface text-xs text-ink-muted">
          <span className="rounded-full border border-[var(--rule)] bg-paper px-3 py-1.5">
            Filed in <span className="text-ink">The Present · October</span>
          </span>
          <span className="rounded-full border border-[var(--rule)] bg-paper px-3 py-1.5">
            Remembered <span className="text-ink">Amma</span>
          </span>
        </div>
      </figure>
    </div>
  );
}
