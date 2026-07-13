"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkSimple,
  LampPendant,
} from "@phosphor-icons/react";
import type { KeptPage } from "@/components/system/memory-interview";

type LibraryView = "shelf" | "book" | "reader";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

const samplePages: KeptPage[] = [
  {
    id: "solo-coast",
    title: "The Morning I Chose the Longer Road",
    excerpt: "Freedom arrived quietly, somewhere between the empty station and the first glimpse of the sea.",
    body: [
      "I arrived before the town had fully opened its eyes. The platform was empty except for a blue bench, my backpack, and the sound of gulls beyond the roofs.",
      "There was no one waiting for me and, for once, that did not feel lonely. It felt like proof that I could carry a whole day by myself.",
      "I took the road that curved away from the harbour simply because I had nowhere else I needed to be.",
    ],
    reflection: "Sometimes independence is not a declaration. It is choosing the longer road because the morning belongs entirely to you.",
    book: "Book One",
    volume: "Volume I · Elsewhere",
    chapter: "Chapter Two",
    chapterTitle: "Places That Changed My Pace",
    layout: "Travel",
    date: "18 March 2024",
  },
  {
    id: "quiet-strength",
    title: "The Patience Someone Else Noticed",
    excerpt: "They noticed the patience I had almost forgotten I possessed.",
    body: [
      "It was an ordinary conversation at the end of a long day. I was already thinking about the journey home when someone thanked me for making a difficult moment feel calm.",
      "The appreciation was small and almost passing, but it stayed. I had been measuring myself by louder strengths and had overlooked the quiet ones.",
      "Their words gave me a new way to understand the person I was becoming.",
    ],
    reflection: "The smallest words can reveal a part of us that has been growing unnoticed.",
    book: "Book One",
    volume: "Volume II · Becoming",
    chapter: "Chapter Four",
    chapterTitle: "Becoming Someone I Trust",
    layout: "Reflection",
    date: "13 July 2026",
  },
  {
    id: "kitchen-light",
    title: "What the Kitchen Window Taught Me",
    excerpt: "A life can feel full because of the light on a table, the smell of tea, and someone staying a little longer.",
    body: [
      "Nothing important was supposed to happen that afternoon. There was fruit on the table, two unfinished cups of tea, and late sunlight moving slowly across the wall.",
      "We spoke about work, weather, and the kind of things that disappear from memory unless you decide they matter.",
      "I learned that ordinary time is not empty time. It is often where a life is most honestly lived.",
    ],
    reflection: "The little things were never little. I simply needed to look at them long enough.",
    book: "Book One",
    volume: "Volume II · Becoming",
    chapter: "Chapter Six",
    chapterTitle: "Small Things I Carry Forward",
    layout: "Little Things",
    date: "02 June 2026",
  },
];

export function LibraryExperience({
  savedPages,
}: {
  savedPages: KeptPage[];
}) {
  const pages = [...savedPages, ...samplePages.filter((sample) => !savedPages.some((page) => page.title === sample.title))];
  const [view, setView] = useState<LibraryView>("shelf");
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id ?? samplePages[0].id);
  const [lamplight, setLamplight] = useState(false);
  const reduceMotion = useReducedMotion();
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];

  const movePage = (direction: -1 | 1) => {
    const current = pages.findIndex((page) => page.id === selectedPage.id);
    const next = (current + direction + pages.length) % pages.length;
    setSelectedPageId(pages[next].id);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div className={lamplight && view === "reader" ? "library-experience library-experience--lamplight" : "library-experience"}>
      <header className="library-header">
        <div>
          <p>Life In Books</p>
          <span>{view === "shelf" ? "Your library" : view === "book" ? "Book One" : selectedPage.chapterTitle}</span>
        </div>
        {view !== "shelf" ? (
          <button type="button" onClick={() => setView(view === "reader" ? "book" : "shelf")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            {view === "reader" ? "Contents" : "Library"}
          </button>
        ) : <span className="library-folio">13 · 07 · 26</span>}
      </header>

      <AnimatePresence mode="wait">
        {view === "shelf" ? (
          <motion.section key="shelf" className="library-shelf" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="library-intro">
              <p className="memory-eyebrow">Your life, arranged in volumes</p>
              <h1>A library only you could have written.</h1>
              <p>Every conversation becomes part of a book you can return to—chapter by chapter, page by page.</p>
            </div>

            <div className="library-featured">
              <button type="button" className="library-cover" onClick={() => setView("book")} aria-label="Open Book One, The Person I Am Learning to Trust">
                <Image src="/assets/seaside-memory.png" alt="A quiet coast under a soft sky" fill sizes="(max-width: 700px) 92vw, 36vw" priority />
                <span>Book One</span>
                <div><small>A memoir in progress</small><strong>The Person I Am Learning to Trust</strong><em>Krishna</em></div>
              </button>
              <div className="library-book-copy">
                <p className="section-label">Currently writing</p>
                <h2>The Person I Am Learning to Trust</h2>
                <p>Small recognitions, solo journeys, and the ordinary days that quietly changed the way I see myself.</p>
                <dl>
                  <div><dt>Volumes</dt><dd>2</dd></div>
                  <div><dt>Chapters</dt><dd>6</dd></div>
                  <div><dt>Pages</dt><dd>{pages.length}</dd></div>
                </dl>
                <button type="button" className="library-primary" onClick={() => setView("book")}>Open this book <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
              </div>
            </div>

            <div className="library-recents">
              <div><p className="section-label">Recently bound</p><span>{savedPages.length ? "Saved on this device" : "Sample pages"}</span></div>
              <div className="library-recent-grid">
                {pages.slice(0, 3).map((page, index) => (
                  <button key={page.id} type="button" onClick={() => { setSelectedPageId(page.id); setView("reader"); }}>
                    <span>{String(index + 1).padStart(2, "0")}</span><small>{page.chapterTitle}</small><strong>{page.title}</strong><p>{page.excerpt}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        ) : view === "book" ? (
          <motion.section key="book" className="book-contents" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="book-contents-heading">
              <p className="memory-eyebrow">Book One · A memoir in progress</p>
              <h1>The Person I Am Learning to Trust</h1>
              <p>Choose a chapter, then enter the page as you would open a book.</p>
            </div>

            <div className="volume-list">
              <section>
                <header><span>Volume I</span><h2>Elsewhere</h2><small>1 page</small></header>
                {pages.filter((page) => page.volume.includes("Elsewhere")).map((page) => <PageRow key={page.id} page={page} onOpen={() => { setSelectedPageId(page.id); setView("reader"); }} />)}
              </section>
              <section>
                <header><span>Volume II</span><h2>Becoming</h2><small>{pages.filter((page) => page.volume.includes("Becoming")).length} pages</small></header>
                {pages.filter((page) => page.volume.includes("Becoming")).map((page) => <PageRow key={page.id} page={page} onOpen={() => { setSelectedPageId(page.id); setView("reader"); }} />)}
              </section>
            </div>
          </motion.section>
        ) : (
          <motion.section key={selectedPage.id} className="reader-view" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <aside className="reader-margin">
              <p>{selectedPage.volume}</p><strong>{selectedPage.chapterTitle}</strong><span>{selectedPage.layout} layout</span>
              <button type="button" aria-pressed={lamplight} onClick={() => setLamplight((value) => !value)}><LampPendant size={19} weight={lamplight ? "fill" : "regular"} aria-hidden="true" /> Reading by lamplight</button>
            </aside>
            <article className="reader-page">
              <header><span>{selectedPage.book} · {selectedPage.volume}</span><span>{selectedPage.chapter}</span></header>
              <div>
                <p className="reader-date">{selectedPage.date}</p>
                <h1>{selectedPage.title}</h1>
                <blockquote>{selectedPage.reflection}</blockquote>
                {selectedPage.body.map((paragraph, index) => <p key={`${selectedPage.id}-${index}`}>{paragraph}</p>)}
              </div>
              <footer><span>Life In Books</span><span>04 · {String(pages.findIndex((page) => page.id === selectedPage.id) + 1).padStart(2, "0")}</span></footer>
            </article>
            <nav className="reader-controls" aria-label="Page controls">
              <button type="button" onClick={() => movePage(-1)}><ArrowLeft size={17} weight="bold" aria-hidden="true" /> Previous</button>
              <span>{pages.findIndex((page) => page.id === selectedPage.id) + 1} of {pages.length}</span>
              <button type="button" onClick={() => movePage(1)}>Next <ArrowRight size={17} weight="bold" aria-hidden="true" /></button>
            </nav>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageRow({ page, onOpen }: { page: KeptPage; onOpen: () => void }) {
  return (
    <button type="button" className="page-row" onClick={onOpen}>
      <div><BookmarkSimple size={17} weight="fill" aria-hidden="true" /></div>
      <span><small>{page.chapter}</small><strong>{page.chapterTitle}</strong></span>
      <span><small>{page.layout}</small><strong>{page.title}</strong></span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}
