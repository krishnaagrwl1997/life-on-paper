"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A phone-only action bar pinned to the bottom of a long page. It steps aside
 * once the page's own closing action (the element with `hideWhenVisibleId`)
 * scrolls into view, so the same button is never shown twice on one screen.
 */
export function StickyMobileCta({ hideWhenVisibleId, children }: { hideWhenVisibleId: string; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById(hideWhenVisibleId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hideWhenVisibleId]);

  return (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-[var(--rule)] bg-paper/95 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-[transform,opacity] duration-300 ease-paper motion-reduce:transition-none sm:hidden ${
        hidden ? "pointer-events-none translate-y-full opacity-0" : ""
      }`}
    >
      {children}
    </div>
  );
}
