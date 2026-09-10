"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenText, UsersThree } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { KeptPage } from "@/components/system/memory-interview";
import { aggregateCast, sortMoments, type CastCharacter, type MemoryDecisions } from "@/components/system/people-intel";
import { characterFeelingArc, type FeelingArc } from "@/components/system/tone";
import { pageTime } from "@/components/system/weekly-weave";

const paperEase = [0.22, 0.72, 0.26, 1] as const;
const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" });

function formatTime(time: number | null | undefined): string | null {
  if (time === null || time === undefined) return null;
  return dayFormatter.format(new Date(time));
}

function longestSilence(moments: KeptPage[]): number | null {
  const days = [...new Set(
    moments
      .map((page) => pageTime(page)?.getTime() ?? null)
      .filter((time): time is number => time !== null)
      .map((time) => Math.floor(time / 86_400_000)),
  )].sort((a, b) => a - b);
  if (days.length < 2) return null;
  let max = 0;
  for (let index = 1; index < days.length; index += 1) {
    max = Math.max(max, days[index] - days[index - 1]);
  }
  return max;
}

function arcSentence(label: string, arc: FeelingArc): string {
  if (arc.heavy > 0 && arc.warm > 0) {
    return `Your writing about ${label} has felt warm — with a heavier stretch${arc.heavyDate ? ` around ${arc.heavyDate}` : ""}.`;
  }
  if (arc.heavy > 0) {
    return `Your writing about ${label} has leaned heavy${arc.heavyDate ? `, most of all around ${arc.heavyDate}` : ""}.`;
  }
  return `Your writing about ${label} has read warm.`;
}

function CastCard({
  character,
  onSelect,
}: {
  character: CastCharacter;
  onSelect: () => void;
}) {
  const aliasHint = character.aliases.length > 1
    ? character.aliases.filter((alias) => alias.toLowerCase() !== character.label.toLowerCase()).slice(0, 2)
    : [];
  return (
    <button type="button" className="cast-card" onClick={onSelect}>
      <span className="cast-card__avatar" aria-hidden="true">
        {character.label.slice(0, 2).toLocaleUpperCase()}
      </span>
      <span className="cast-card__copy">
        <strong>{character.label}</strong>
        {aliasHint.length ? <small>also {aliasHint.join(", ")}</small> : null}
        <em>
          {character.pageIds.length} {character.pageIds.length === 1 ? "moment" : "moments"}
          {character.volumes.length ? ` · ${[...new Set(character.volumes)].join(", ")}` : ""}
        </em>
      </span>
      <ArrowRight size={16} weight="bold" aria-hidden="true" />
    </button>
  );
}

export function PeopleExperience({
  pages,
  decisions = {},
  onOpenPage,
  onWrite,
}: {
  pages: KeptPage[];
  decisions?: MemoryDecisions;
  onOpenPage: (pageId: string) => void;
  onWrite: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const cast = useMemo(() => aggregateCast(pages, decisions), [pages, decisions]);
  const [selected, setSelected] = useState<CastCharacter | null>(null);

  const individuals = cast.filter((character) => character.kind === "person");
  const groups = cast.filter((character) => character.kind === "group");
  const moments = useMemo(
    () => (selected ? sortMoments(pages.filter((page) => selected.pageIds.includes(page.id))) : []),
    [pages, selected],
  );
  const arc = useMemo(() => (selected ? characterFeelingArc(moments) : null), [selected, moments]);

  if (!cast.length) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pt-8">
        <motion.section
          className="people-door"
          aria-label="People"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: paperEase }}
        >
          <span className="people-icon" aria-hidden="true">
            <UsersThree size={30} weight="regular" />
          </span>
          <p className="people-eyebrow">The cast of your life</p>
          <h1 className="people-title">
            {pages.length === 0
              ? "The people of your book will gather here."
              : "People will appear here as you keep writing."}
          </h1>
          <p className="people-copy">
            The app quietly notices who matters &mdash; your amma, your Rahul, the college
            group &mdash; and remembers them across everything you write. No naming, no
            sorting, no setup.
          </p>
          <p className="people-note">
            {pages.length === 0
              ? "Write a little, and the cast begins to form — one line at a time."
              : "The cast forms from names and the way you refer to people — one line at a time."}
          </p>
          <button type="button" className="people-action" onClick={onWrite}>
            Write today&rsquo;s lines
          </button>
        </motion.section>
      </div>
    );
  }

  if (selected) {
    const aliasHint = selected.aliases.length > 1 ? selected.aliases.filter((alias) => alias.toLowerCase() !== selected.label.toLowerCase()).slice(0, 3) : [];
    const silence = longestSilence(moments);
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pt-6">
        <button type="button" className="cast-back" onClick={() => setSelected(null)}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" /> People
        </button>
        <motion.div
          className="cast-portrait"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
        >
          <header className="cast-portrait__header">
            <span className="cast-avatar" aria-hidden="true">
              {selected.label.slice(0, 2).toLocaleUpperCase()}
            </span>
            <div>
              <p className="people-eyebrow">{selected.kind === "group" ? "A group in your life" : "A person in your life"}</p>
              <h1 className="cast-portrait__name">{selected.label}</h1>
              {aliasHint.length ? <p className="cast-alias">also {aliasHint.join(", ")}</p> : null}
            </div>
          </header>

          <section className="cast-section">
            <p className="section-label">Where they appear</p>
            <div className="cast-chips">
              {selected.volumes.length
                ? [...new Set(selected.volumes)].map((volume) => <span key={volume}>{volume}</span>)
                : <span>The story so far</span>}
            </div>
          </section>

          <section className="cast-section">
            <p className="section-label">Their moments · {moments.length}</p>
            <div className="cast-moments">
              {moments.map((page) => (
                <button key={page.id} type="button" className="cast-moment" onClick={() => onOpenPage(page.id)} aria-label={`Open ${page.title}`}>
                  <span className="cast-moment__icon" aria-hidden="true"><BookOpenText size={15} weight="regular" /></span>
                  <span className="cast-moment__copy">
                    <small>{page.date || formatTime(pageTime(page)?.getTime()) || "One day"}</small>
                    <strong>{page.title}</strong>
                    <em>{page.excerpt}</em>
                  </span>
                  <ArrowRight size={15} weight="bold" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          {arc && arc.confident ? (
            <section className="cast-section">
              <p className="section-label">How you wrote about them</p>
              <p className="cast-arc">{arcSentence(selected.label, arc)}</p>
            </section>
          ) : null}

          <section className="cast-section">
            <p className="section-label">Quiet notes</p>            <div className="cast-notes">
              {formatTime(selected.firstAt) ? <p><span>First written</span><strong>{formatTime(selected.firstAt)}</strong></p> : null}
              {formatTime(selected.lastAt) ? <p><span>Last written</span><strong>{formatTime(selected.lastAt)}</strong></p> : null}
              {silence !== null && silence > 0 ? <p><span>Longest quiet stretch</span><strong>{silence} {silence === 1 ? "day" : "days"}</strong></p> : null}
            </div>
          </section>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8">
      <motion.header
        className="cast-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
      >
        <p className="people-eyebrow">The cast of your life</p>
        <h1 className="cast-title">{individuals.length + groups.length} {individuals.length + groups.length === 1 ? "character" : "characters"} so far</h1>
        <p className="cast-subtitle">The people and groups your writing keeps returning to — gathered quietly, without any naming or sorting.</p>
      </motion.header>

      <AnimatePresence>
        {individuals.length ? (
          <motion.section className="cast-section" key="individuals" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="section-label">People</p>
            <div className="cast-list">
              {individuals.map((character) => <CastCard key={character.key} character={character} onSelect={() => setSelected(character)} />)}
            </div>
          </motion.section>
        ) : null}
        {groups.length ? (
          <motion.section className="cast-section" key="groups" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="section-label">Groups</p>
            <div className="cast-list">
              {groups.map((character) => <CastCard key={character.key} character={character} onSelect={() => setSelected(character)} />)}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
