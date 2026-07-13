"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookmarkSimple,
  Check,
  Eye,
  GearSix,
  LampPendant,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { KeptPage } from "@/components/system/memory-interview";

type LibraryView = "shelf" | "book" | "reader" | "studio";
type BookVisibility = "private" | "request" | "previews";
type CoverStyle = "coast" | "linen" | "ink";

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
  onReadingChange,
}: {
  savedPages: KeptPage[];
  onReadingChange?: (reading: boolean) => void;
}) {
  const initialPages = [...savedPages, ...samplePages.filter((sample) => !savedPages.some((page) => page.title === sample.title))];
  const [pages, setPages] = useState<KeptPage[]>(initialPages);
  const [removedPageIds, setRemovedPageIds] = useState<string[]>([]);
  const [bookTitle, setBookTitle] = useState("The Person I Am Learning to Trust");
  const [bookVisibility, setBookVisibility] = useState<BookVisibility>("request");
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("coast");
  const [extraVolumes, setExtraVolumes] = useState<string[]>([]);
  const [view, setView] = useState<LibraryView>("shelf");
  const [selectedPageId, setSelectedPageId] = useState(pages[0]?.id ?? samplePages[0].id);
  const [lamplight, setLamplight] = useState(false);
  const [readerScale, setReaderScale] = useState<"small" | "medium" | "large">("medium");
  const reduceMotion = useReducedMotion();
  const activePages = pages.filter((page) => !removedPageIds.includes(page.id));
  const selectedPage = activePages.find((page) => page.id === selectedPageId) ?? activePages[0] ?? pages[0];

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("life-in-books-studio");
        if (!stored) return;
        const studio = JSON.parse(stored) as { pages?: KeptPage[]; removedPageIds?: string[]; bookTitle?: string; bookVisibility?: BookVisibility; coverStyle?: CoverStyle; extraVolumes?: string[] };
        if (studio.pages?.length) setPages(studio.pages);
        if (studio.removedPageIds) setRemovedPageIds(studio.removedPageIds);
        if (studio.bookTitle) setBookTitle(studio.bookTitle);
        if (studio.bookVisibility) setBookVisibility(studio.bookVisibility);
        if (studio.coverStyle) setCoverStyle(studio.coverStyle);
        if (studio.extraVolumes) setExtraVolumes(studio.extraVolumes);
      } catch {
        // Keep the editorial sample when device-local studio data is unavailable.
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    onReadingChange?.(view === "reader");
    return () => onReadingChange?.(false);
  }, [onReadingChange, view]);

  const persistStudio = (next: { pages?: KeptPage[]; removedPageIds?: string[]; bookTitle?: string; bookVisibility?: BookVisibility; coverStyle?: CoverStyle; extraVolumes?: string[] }) => {
    const state = { pages, removedPageIds, bookTitle, bookVisibility, coverStyle, extraVolumes, ...next };
    window.localStorage.setItem("life-in-books-studio", JSON.stringify(state));
  };

  const movePage = (direction: -1 | 1) => {
    const current = activePages.findIndex((page) => page.id === selectedPage.id);
    const next = (current + direction + activePages.length) % activePages.length;
    setSelectedPageId(activePages[next].id);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <div className={view === "reader" ? lamplight ? "library-experience library-experience--reader library-experience--lamplight" : "library-experience library-experience--reader" : "library-experience"}>
      {view !== "reader" ? <header className="library-header">
        <div>
          <p>Life In Books</p>
          <span>{view === "shelf" ? "Your library" : view === "book" ? "Book One" : view === "studio" ? "Book Studio" : selectedPage.chapterTitle}</span>
        </div>
        {view !== "shelf" ? (
          <button type="button" onClick={() => setView(view === "reader" || view === "studio" ? "book" : "shelf")}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            {view === "reader" || view === "studio" ? "Contents" : "Library"}
          </button>
        ) : <span className="library-folio">13 · 07 · 26</span>}
      </header> : null}

      <AnimatePresence mode="wait">
        {view === "shelf" ? (
          <motion.section key="shelf" className="library-shelf" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="library-intro">
              <p className="memory-eyebrow">Your life, arranged in volumes</p>
              <h1>A library only you could have written.</h1>
              <p>Every conversation becomes part of a book you can return to—chapter by chapter, page by page.</p>
            </div>

            <div className="library-featured">
              <button type="button" className={`library-cover library-cover--${coverStyle}`} onClick={() => setView("book")} aria-label={`Open Book One, ${bookTitle}`}>
                <Image src="/assets/seaside-memory.png" alt="A quiet coast under a soft sky" fill sizes="(max-width: 700px) 92vw, 36vw" priority />
                <span>Book One</span>
                <div><small>A memoir in progress</small><strong>{bookTitle}</strong><em>Krishna</em></div>
              </button>
              <div className="library-book-copy">
                <p className="section-label">Currently writing</p>
                <h2>{bookTitle}</h2>
                <p>Small recognitions, solo journeys, and the ordinary days that quietly changed the way I see myself.</p>
                <dl>
                  <div><dt>Volumes</dt><dd>2</dd></div>
                  <div><dt>Chapters</dt><dd>6</dd></div>
                  <div><dt>Pages</dt><dd>{activePages.length}</dd></div>
                </dl>
                <button type="button" className="library-primary" onClick={() => setView("book")}>Open this book <ArrowRight size={18} weight="bold" aria-hidden="true" /></button>
              </div>
            </div>

            <div className="library-recents">
              <div><p className="section-label">Recently bound</p><span>{savedPages.length ? "Saved on this device" : "Sample pages"}</span></div>
              <div className="library-recent-grid">
                {activePages.slice(0, 3).map((page, index) => (
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
              <h1>{bookTitle}</h1>
              <p>Choose a chapter, then enter the page as you would open a book.</p>
              <button type="button" className="studio-entry" onClick={() => setView("studio")}><GearSix size={18} weight="fill" aria-hidden="true" /> Open Book Studio</button>
            </div>

            <div className="volume-list">
              <section>
                <header><span>Volume I</span><h2>Elsewhere</h2><small>1 page</small></header>
                {activePages.filter((page) => page.volume.includes("Elsewhere")).map((page) => <PageRow key={page.id} page={page} onOpen={() => { setSelectedPageId(page.id); setView("reader"); }} />)}
              </section>
              <section>
                <header><span>Volume II</span><h2>Becoming</h2><small>{activePages.filter((page) => page.volume.includes("Becoming")).length} pages</small></header>
                {activePages.filter((page) => page.volume.includes("Becoming")).map((page) => <PageRow key={page.id} page={page} onOpen={() => { setSelectedPageId(page.id); setView("reader"); }} />)}
              </section>
            </div>
          </motion.section>
        ) : view === "studio" ? (
          <BookStudio
            pages={pages}
            removedPageIds={removedPageIds}
            bookTitle={bookTitle}
            bookVisibility={bookVisibility}
            coverStyle={coverStyle}
            extraVolumes={extraVolumes}
            reduceMotion={Boolean(reduceMotion)}
            onPagesChange={(next) => { setPages(next); persistStudio({ pages: next }); }}
            onRemovedChange={(next) => { setRemovedPageIds(next); persistStudio({ removedPageIds: next }); }}
            onTitleChange={(next) => { setBookTitle(next); persistStudio({ bookTitle: next }); }}
            onVisibilityChange={(next) => { setBookVisibility(next); persistStudio({ bookVisibility: next }); }}
            onCoverChange={(next) => { setCoverStyle(next); persistStudio({ coverStyle: next }); }}
            onVolumesChange={(next) => { setExtraVolumes(next); persistStudio({ extraVolumes: next }); }}
            onPreview={() => { if (activePages[0]) setSelectedPageId(activePages[0].id); setView("reader"); }}
          />
        ) : (
          <motion.section key={selectedPage.id} className="reader-view reader-view--kindle" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <header className="reader-kindle-bar">
              <button type="button" onClick={() => setView("book")}><ArrowLeft size={17} weight="bold" aria-hidden="true" /> Contents</button>
              <div><strong>{bookTitle}</strong><span>{selectedPage.chapterTitle}</span></div>
              <div className="reader-type-controls" aria-label="Reading appearance">
                <button type="button" aria-label="Use smaller text" aria-pressed={readerScale === "small"} onClick={() => setReaderScale("small")}>A</button>
                <button type="button" aria-label="Use medium text" aria-pressed={readerScale === "medium"} onClick={() => setReaderScale("medium")}>A</button>
                <button type="button" aria-label="Use larger text" aria-pressed={readerScale === "large"} onClick={() => setReaderScale("large")}>A</button>
                <button type="button" aria-label="Toggle reading by lamplight" aria-pressed={lamplight} onClick={() => setLamplight((value) => !value)}><LampPendant size={18} weight={lamplight ? "fill" : "regular"} aria-hidden="true" /></button>
              </div>
            </header>
            <aside className="reader-margin">
              <p>{selectedPage.volume}</p><strong>{selectedPage.chapterTitle}</strong><span>{selectedPage.layout} layout</span>
              <p className="reader-time">About 2 minutes left in this page</p>
            </aside>
            <article className={`reader-page reader-page--${readerScale}`}>
              <header><span>{selectedPage.book} · {selectedPage.volume}</span><span>{selectedPage.chapter}</span></header>
              <div>
                <p className="reader-date">{selectedPage.date}</p>
                <h1>{selectedPage.title}</h1>
                {selectedPage.photo ? <div className="reader-photo"><Image src={selectedPage.photo} alt="Photograph attached to this memory" fill unoptimized sizes="620px" /></div> : null}
                <blockquote>{selectedPage.reflection}</blockquote>
                {selectedPage.body.map((paragraph, index) => <p key={`${selectedPage.id}-${index}`}>{paragraph}</p>)}
              </div>
              <footer><span>Life In Books</span><span>04 · {String(activePages.findIndex((page) => page.id === selectedPage.id) + 1).padStart(2, "0")}</span></footer>
            </article>
            <nav className="reader-controls" aria-label="Page controls">
              <button type="button" onClick={() => movePage(-1)}><ArrowLeft size={17} weight="bold" aria-hidden="true" /> Previous</button>
              <span>{activePages.findIndex((page) => page.id === selectedPage.id) + 1} of {activePages.length}</span>
              <button type="button" onClick={() => movePage(1)}>Next <ArrowRight size={17} weight="bold" aria-hidden="true" /></button>
              <div className="reader-progress" aria-hidden="true"><span style={{ width: `${((activePages.findIndex((page) => page.id === selectedPage.id) + 1) / activePages.length) * 100}%` }} /></div>
            </nav>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookStudio({
  pages,
  removedPageIds,
  bookTitle,
  bookVisibility,
  coverStyle,
  extraVolumes,
  reduceMotion,
  onPagesChange,
  onRemovedChange,
  onTitleChange,
  onVisibilityChange,
  onCoverChange,
  onVolumesChange,
  onPreview,
}: {
  pages: KeptPage[];
  removedPageIds: string[];
  bookTitle: string;
  bookVisibility: BookVisibility;
  coverStyle: CoverStyle;
  extraVolumes: string[];
  reduceMotion: boolean;
  onPagesChange: (pages: KeptPage[]) => void;
  onRemovedChange: (ids: string[]) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: BookVisibility) => void;
  onCoverChange: (cover: CoverStyle) => void;
  onVolumesChange: (volumes: string[]) => void;
  onPreview: () => void;
}) {
  const activePages = pages.filter((page) => !removedPageIds.includes(page.id));
  const [selectedId, setSelectedId] = useState(activePages[0]?.id ?? pages[0]?.id ?? "");
  const [newVolume, setNewVolume] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const selected = pages.find((page) => page.id === selectedId) ?? activePages[0] ?? pages[0];
  const volumes = ["Volume I · Elsewhere", "Volume II · Becoming", ...extraVolumes];

  const updatePage = (id: string, update: Partial<KeptPage>) => {
    onPagesChange(pages.map((page) => page.id === id ? { ...page, ...update } : page));
  };

  const renameChapter = (oldTitle: string, nextTitle: string) => {
    onPagesChange(pages.map((page) => page.chapterTitle === oldTitle ? { ...page, chapterTitle: nextTitle } : page));
  };

  const reorder = (id: string, direction: -1 | 1) => {
    const currentIndex = pages.findIndex((page) => page.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pages.length) return;
    const next = [...pages];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    onPagesChange(next);
  };

  const createVolume = () => {
    const title = newVolume.trim();
    if (!title) return;
    const next = [...extraVolumes, `Volume ${toRoman(extraVolumes.length + 3)} · ${title}`];
    onVolumesChange(next);
    setNewVolume("");
  };

  const markSaved = () => {
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2200);
  };

  return (
    <motion.section className="book-studio" initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
      <header className="studio-heading">
        <div><p className="memory-eyebrow">Book Studio</p><h1>Shape the book, without losing the life behind it.</h1><p>Everything the AI arranged remains yours to revise, move, rename, or quietly set aside.</p></div>
        <div className="studio-page-stack" aria-hidden="true">
          <motion.span initial={{ rotate: -7, x: -20, opacity: 0 }} animate={{ rotate: -4, x: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} />
          <motion.span initial={{ rotate: 8, x: 20, opacity: 0 }} animate={{ rotate: 3, x: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.18, ease: paperEase }} />
          <motion.strong initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.34, ease: paperEase }}>Book<br />One</motion.strong>
        </div>
      </header>

      <div className="studio-layout">
        <aside className="studio-settings">
          <section>
            <p className="studio-label">Book identity</p>
            <label htmlFor="studio-book-title">Title</label>
            <textarea id="studio-book-title" value={bookTitle} onChange={(event) => onTitleChange(event.target.value)} rows={3} />
          </section>

          <section>
            <p className="studio-label">Cover</p>
            <div className="studio-cover-options" aria-label="Choose a book cover">
              {(["coast", "linen", "ink"] as CoverStyle[]).map((cover) => <button key={cover} type="button" className={`studio-cover-chip studio-cover-chip--${cover}`} aria-pressed={coverStyle === cover} onClick={() => onCoverChange(cover)}><span>{coverStyle === cover ? <Check size={14} weight="bold" aria-hidden="true" /> : null}</span><strong>{cover === "coast" ? "Coastal photograph" : cover === "linen" ? "Warm linen" : "Ink cloth"}</strong></button>)}
            </div>
          </section>

          <section>
            <p className="studio-label">Sharing</p>
            <div className="studio-visibility">
              {(["private", "request", "previews"] as BookVisibility[]).map((visibility) => <button key={visibility} type="button" aria-pressed={bookVisibility === visibility} onClick={() => onVisibilityChange(visibility)}><span>{bookVisibility === visibility ? <Check size={14} weight="bold" aria-hidden="true" /> : null}</span><strong>{visibility === "private" ? "Private" : visibility === "request" ? "Request-only" : "Selected previews"}</strong><small>{visibility === "private" ? "Only you can read" : visibility === "request" ? "You approve each reader" : "You choose visible pages"}</small></button>)}
            </div>
          </section>

          <section>
            <p className="studio-label">New volume</p>
            <div className="studio-new-volume"><label className="sr-only" htmlFor="new-volume-name">New volume name</label><input id="new-volume-name" value={newVolume} onChange={(event) => setNewVolume(event.target.value)} placeholder="What Came After" /><button type="button" onClick={createVolume}><Plus size={17} weight="bold" aria-hidden="true" /> Add</button></div>
            {extraVolumes.map((volume) => <p key={volume} className="studio-added-volume"><Check size={13} weight="bold" aria-hidden="true" /> {volume}</p>)}
          </section>

          <button type="button" className="studio-preview" onClick={onPreview}><Eye size={18} weight="fill" aria-hidden="true" /> Preview complete book</button>
        </aside>

        <div className="studio-workbench">
          <div className="studio-workbench-heading"><div><p className="studio-label">Pages &amp; chapters</p><h2>{activePages.length} pages in your working book</h2></div>{removedPageIds.length ? <button type="button" onClick={() => onRemovedChange([])}>Restore {removedPageIds.length} removed {removedPageIds.length === 1 ? "page" : "pages"}</button> : null}</div>

          <div className="studio-page-list">
            <AnimatePresence initial={false}>
              {activePages.map((page, index) => (
                <motion.article key={page.id} layout initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: reduceMotion ? 0 : 40 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} className={selected?.id === page.id ? "studio-page-row studio-page-row--selected" : "studio-page-row"}>
                  <button type="button" className="studio-page-select" onClick={() => setSelectedId(page.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{page.volume} · {page.chapter}</small><strong>{page.title}</strong><p>{page.chapterTitle}</p></div></button>
                  <div className="studio-row-actions"><button type="button" aria-label={`Move ${page.title} earlier`} disabled={index === 0} onClick={() => reorder(page.id, -1)}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" aria-label={`Move ${page.title} later`} disabled={index === activePages.length - 1} onClick={() => reorder(page.id, 1)}><ArrowDown size={16} aria-hidden="true" /></button><button type="button" aria-label={`Remove ${page.title}`} onClick={() => onRemovedChange([...removedPageIds, page.id])}><Trash size={16} aria-hidden="true" /></button></div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          {selected && !removedPageIds.includes(selected.id) ? (
            <motion.section key={selected.id} className="studio-editor" initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
              <header><div><PencilSimple size={18} weight="fill" aria-hidden="true" /><span>Editing page</span></div><strong>{selected.title}</strong></header>
              <div className="studio-editor-grid">
                <label>Page title<input value={selected.title} onChange={(event) => updatePage(selected.id, { title: event.target.value })} /></label>
                <label>Volume<select value={selected.volume} onChange={(event) => updatePage(selected.id, { volume: event.target.value })}>{volumes.map((volume) => <option key={volume} value={volume}>{volume}</option>)}</select></label>
                <label className="studio-editor-wide">Chapter title<input value={selected.chapterTitle} onChange={(event) => renameChapter(selected.chapterTitle, event.target.value)} /></label>
                <label className="studio-editor-wide">Opening reflection<textarea value={selected.reflection} onChange={(event) => updatePage(selected.id, { reflection: event.target.value, excerpt: event.target.value })} rows={4} /></label>
                <label className="studio-editor-wide">Page text<textarea value={selected.body.join("\n\n")} onChange={(event) => updatePage(selected.id, { body: event.target.value.split(/\n\s*\n/) })} rows={9} /></label>
              </div>
              <div className="studio-original"><span>Original memory remains attached</span><p>{selected.excerpt}</p></div>
              <div className="studio-save-row"><button type="button" onClick={markSaved}>Keep these edits <Check size={17} weight="bold" aria-hidden="true" /></button><AnimatePresence>{savedNotice ? <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>Saved on this device</motion.span> : null}</AnimatePresence></div>
            </motion.section>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}

function toRoman(value: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][value - 1] ?? String(value);
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
