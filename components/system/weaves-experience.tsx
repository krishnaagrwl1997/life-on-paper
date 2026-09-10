"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenText, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { KeptPage } from "@/components/system/memory-interview";
import {
  pageTime,
  reconcileWeaves,
  upgradeWeave,
  weaveSurpriseKey,
  type WeekWeave,
} from "@/components/system/weekly-weave";

const paperEase = [0.22, 0.72, 0.26, 1] as const;
const dayShort = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

function pagesKey(pages: KeptPage[]) {
  return pages.map((page) => `${page.id}:${page.createdAt ?? page.date ?? ""}`).sort().join("|");
}

export function WeavesExperience({
  pages,
  onBack,
  onOpenPage,
}: {
  pages: KeptPage[];
  onBack: () => void;
  onOpenPage: (pageId: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const key = useMemo(() => pagesKey(pages), [pages]);
  const [weaves, setWeaves] = useState<WeekWeave[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<WeekWeave | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [surprise, setSurprise] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const raf = window.requestAnimationFrame(() => {
      const { weaves: reconciled, upgrade } = reconcileWeaves(pages);
      if (cancelled) return;
      setBusy(true);
      setWeaves(reconciled);
      if (reconciled.length && !window.localStorage.getItem(weaveSurpriseKey)) {
        window.localStorage.setItem(weaveSurpriseKey, "yes");
        setSurprise(true);
      }
      void (async () => {
        for (const group of upgrade) {
          const current = reconciled.find((weave) => weave.weekKey === group.weekKey);
          if (!current) continue;
          const upgraded = await upgradeWeave(group, current);
          if (!cancelled && upgraded) {
            setWeaves((previous) => previous.map((weave) => weave.weekKey === upgraded.weekKey ? upgraded : weave));
          }
        }
        if (!cancelled) setBusy(false);
      })();
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const openWeekDays = useMemo(() => {
    if (!open) return [];
    const byTime = new Map<string, KeptPage>();
    for (const page of pages) {
      const id = open.pageIds.includes(page.id) ? page.id : "";
      if (id) byTime.set(id, page);
    }
    return [...byTime.values()].sort((a, b) => (pageTime(a)?.getTime() ?? 0) - (pageTime(b)?.getTime() ?? 0));
  }, [open, pages]);

  if (!weaves.length) {
    return (
      <div className="weaves-shell">
        <button type="button" className="weaves-back" onClick={onBack}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Story
        </button>
        <p className="weaves-empty">Your woven weeks will gather here once a week earns its chapter.</p>
      </div>
    );
  }

  if (open) {
    return (
      <motion.div
        className="weaves-shell"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
      >
        {!rawOpen ? (
          <>
            <button type="button" className="weaves-back" onClick={() => setOpen(null)}>
              <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Your weeks
            </button>
            <header className="weave-reader__header">
              <p className="memory-eyebrow">{open.label}</p>
              {open.title ? <h1 className="weave-reader__title">{open.title}</h1> : null}
              <span className="weave-reader__meta">
                {open.pageIds.length} {open.pageIds.length === 1 ? "moment" : "moments"} · woven from your own words
              </span>
            </header>
            <article className="weave-reader__narrative">
              {open.narrative.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </article>
            <button type="button" className="weaves-raw-toggle" onClick={() => setRawOpen(true)}>
              See the raw days <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="weaves-back" onClick={() => setRawOpen(false)}>
              <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Back to the woven week
            </button>
            <header className="weave-reader__header">
              <p className="memory-eyebrow">As written · {open.label}</p>
              <h1 className="weave-reader__title">The real pages beneath</h1>
            </header>
            <div className="weaves-raw-days">
              {openWeekDays.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="weaves-raw-day"
                  onClick={() => onOpenPage(page.id)}
                  aria-label={`Open ${page.title}`}
                >
                  <span className="weaves-raw-day__meta">
                    {page.date ? dayShort.format(pageTime(page) ?? new Date()) : ""} · {page.chapterTitle}
                  </span>
                  <strong>{page.title}</strong>
                  <em>{page.excerpt}</em>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="weaves-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
    >
      <button type="button" className="weaves-back" onClick={onBack}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Story
      </button>
      <header className="weaves-heading">
        <p className="memory-eyebrow">Your weeks</p>
        <h1>Your life, week by week.</h1>
        <p>Each woven week gathers your moments into one quiet narrative &mdash; written only from what you said.</p>
      </header>

      <AnimatePresence>
        {surprise ? (
          <motion.aside
            className="weaves-surprise"
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
          >
            <Sparkle size={14} weight="fill" aria-hidden="true" />
            <span><strong>Your first woven week is here.</strong> Weeks with enough moments become chapters of your story.</span>
            <button type="button" aria-label="Dismiss" onClick={() => setSurprise(false)}>×</button>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="weaves-list">
        {weaves.map((weave) => (
          <button key={weave.weekKey} type="button" className="weaves-week" onClick={() => { setOpen(weave); setRawOpen(false); }}>
            <span className="weaves-week__icon" aria-hidden="true">
              <BookOpenText size={18} weight="regular" />
            </span>
            <span className="weaves-week__copy">
              <small>{weave.label}</small>
              {weave.title ? <strong>{weave.title}</strong> : null}
              <em>{weave.narrative[0]}</em>
              <span className="weaves-week__meta">{weave.pageIds.length} {weave.pageIds.length === 1 ? "moment" : "moments"} · {weave.source === "ai" ? "woven" : "in your own words"}</span>
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </button>
        ))}
      </div>

      {busy ? <p className="weaves-busy">Gently weaving…</p> : null}
    </motion.div>
  );
}
