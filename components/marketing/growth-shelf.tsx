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
    <ol className="grid gap-10 sm:grid-cols-3 sm:gap-6">
      {STAGES.map((stage) => (
        <li key={stage.label} className="flex flex-col items-center text-center">
          <div className="flex h-44 items-end">
            <ShelfObject kind={stage.object} />
          </div>
          <div aria-hidden className="mt-3 h-1 w-40 rounded-full bg-[var(--sheet-deep)]" />
          <p className="mt-5 font-editorial text-xl text-ink">{stage.label}</p>
          <p className="mt-2 max-w-[16rem] font-interface text-sm leading-relaxed text-ink-muted">
            {stage.caption}
          </p>
        </li>
      ))}
    </ol>
  );
}
