/**
 * "Thirty days becomes a slim book; a year becomes a book." Drawn as three
 * objects on a shelf so the payoff is seen, not just read.
 */
const STAGES = [
  {
    label: "Day 1",
    caption: "One page. A few lines about today.",
    object: "page",
  },
  {
    label: "Day 30",
    caption: "A slim volume of your own life — your first printable book.",
    object: "slim",
  },
  {
    label: "One year",
    caption: "A book. Chapters, people, eras — in your own words.",
    object: "book",
  },
] as const;

function ShelfObject({ kind }: { kind: (typeof STAGES)[number]["object"] }) {
  if (kind === "page") {
    return (
      <div className="h-28 w-20 rotate-[-4deg] rounded-[3px] border border-[var(--rule)] bg-paper-raised p-2.5 shadow-paper-sm">
        <div className="space-y-1.5">
          {[90, 100, 75, 95, 60].map((width, index) => (
            <div key={index} className="h-[3px] rounded bg-[var(--rule)]" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const slim = kind === "slim";
  return (
    <div className="flex items-end">
      {/* Spine */}
      <div
        className={`flex items-center justify-center rounded-l-[3px] bg-[#8a3a1b] shadow-paper-sm ${
          slim ? "h-32 w-4" : "h-40 w-10"
        }`}
      >
        <span className="rotate-180 font-editorial text-[0.6rem] tracking-wide text-paper [writing-mode:vertical-rl]">
          {slim ? "" : "Life on Paper"}
        </span>
      </div>
      {/* Cover */}
      <div
        className={`flex flex-col justify-between rounded-r-[4px] bg-action-deep p-3 shadow-paper-md ${
          slim ? "h-32 w-24" : "h-40 w-28"
        }`}
      >
        <span className="font-editorial text-sm leading-tight text-paper">
          {slim ? "October" : "The Long Way Home"}
        </span>
        <span className="h-px w-8 bg-[var(--ceremonial)]" />
      </div>
    </div>
  );
}

export function GrowthShelf() {
  return (
    // On phones each stage is one compact row (object beside its words) so the
    // whole progression fits on about one screen; from sm up it is a shelf.
    <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
      {STAGES.map((stage) => (
        <li key={stage.label} className="flex items-center gap-5 sm:flex-col sm:gap-0 sm:text-center">
          <div className="flex h-40 w-36 shrink-0 items-end justify-center sm:h-44 sm:w-auto">
            <ShelfObject kind={stage.object} />
          </div>
          <div aria-hidden className="mt-3 hidden h-1 w-40 rounded-full bg-[var(--sheet-deep)] sm:block" />
          <div>
          <p className="font-editorial text-xl text-ink sm:mt-5">{stage.label}</p>
          <p className="mt-1 max-w-[16rem] font-interface text-sm leading-relaxed text-ink-muted sm:mt-2">
            {stage.caption}
          </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
