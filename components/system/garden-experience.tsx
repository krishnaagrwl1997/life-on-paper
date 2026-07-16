"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  LockKey,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

type GardenAccess = "public" | "request" | "private" | "granted";
type GardenView = "garden" | "book" | "preview";

type GardenBook = {
  id: string;
  author: string;
  initials: string;
  title: string;
  subtitle: string;
  summary: string;
  themes: string[];
  access: GardenAccess;
  cover: string;
  coverImage: string;
  pages: number;
  updated: string;
  previewTitle: string;
  previewQuote: string;
  previewBody: string[];
};

const paperEase = [0.22, 0.72, 0.26, 1] as const;

const gardenBooks: GardenBook[] = [
  {
    id: "maya",
    author: "Maya Sen",
    initials: "MS",
    title: "Rooms I Learned to Leave",
    subtitle: "On belonging, beginnings, and choosing myself",
    summary: "A memoir about moving through cities, friendships, and versions of home without mistaking familiarity for belonging.",
    themes: ["Home", "Friendship", "Starting over"],
    access: "request",
    cover: "clay",
    coverImage: "/assets/domestic-still-life.png",
    pages: 46,
    updated: "Writing this week",
    previewTitle: "The Key I Left on the Table",
    previewQuote: "Leaving became real when I stopped carrying the key.",
    previewBody: ["The room was already empty, but I stood there as if it might say something final.", "I placed the key on the table and understood that home could be something I carried differently."],
  },
  {
    id: "jon",
    author: "Jon Bell",
    initials: "JB",
    title: "A Map Made of Detours",
    subtitle: "Journeys that refused to follow the plan",
    summary: "Solo trains, missed ferries, borrowed bicycles, and the unexpected people who made every wrong turn worth taking.",
    themes: ["Travel", "Chance", "Strangers"],
    access: "public",
    cover: "blue",
    coverImage: "/assets/seaside-memory.png",
    pages: 71,
    updated: "Updated 4 days ago",
    previewTitle: "The Ferry I Was Never Meant to Catch",
    previewQuote: "The best part of the journey began after the timetable stopped being useful.",
    previewBody: ["By the time I reached the harbour, the last ferry was a white mark on the horizon.", "A fisherman pointed toward a village road and told me, with complete confidence, that there was always another way across."],
  },
  {
    id: "amina",
    author: "Amina Yusuf",
    initials: "AY",
    title: "The Women Who Raised the Weather",
    subtitle: "A family history told through kitchens and seasons",
    summary: "Three generations of women remembered through recipes, weather, argument, tenderness, and inherited ways of surviving.",
    themes: ["Family", "Inheritance", "Food"],
    access: "request",
    cover: "forest",
    coverImage: "/assets/botanical-paper-collage.png",
    pages: 58,
    updated: "Updated yesterday",
    previewTitle: "Rain Against the Kitchen Glass",
    previewQuote: "My grandmother measured storms by how early she began cooking.",
    previewBody: ["Before the sky darkened, she had already placed the largest pot on the stove.", "We learned the weather through her hands long before we learned to read a forecast."],
  },
  {
    id: "elias",
    author: "Elias Hart",
    initials: "EH",
    title: "Notes From the Long Way Home",
    subtitle: "Letters from a life between places",
    summary: "A quiet collection of letters about distance, fatherhood, music, and slowly returning to the life that had been waiting.",
    themes: ["Letters", "Fatherhood", "Return"],
    access: "granted",
    cover: "gold",
    coverImage: "/assets/seaside-memory.png",
    pages: 39,
    updated: "Access shared with you",
    previewTitle: "A Song for the Drive Back",
    previewQuote: "Some roads are long because we need time to become the person arriving.",
    previewBody: ["The same song played twice before I noticed the mountains had disappeared behind me.", "I had spent years calling the distance freedom. That evening, I began to call the return a choice."],
  },
  {
    id: "noor",
    author: "Noor Patel",
    initials: "NP",
    title: "What We Keep Quiet",
    subtitle: "Private notes on family and forgiveness",
    summary: "A private memoir about the stories families protect, revise, and eventually become ready to tell each other.",
    themes: ["Family", "Silence", "Forgiveness"],
    access: "private",
    cover: "ink",
    coverImage: "/assets/domestic-still-life.png",
    pages: 24,
    updated: "Private book",
    previewTitle: "",
    previewQuote: "",
    previewBody: [],
  },
];

export function GardenExperience() {
  const [view, setView] = useState<GardenView>("garden");
  const [selectedId, setSelectedId] = useState(gardenBooks[0].id);
  const [requests, setRequests] = useState<string[]>([]);
  const reduceMotion = useReducedMotion();
  const selected = gardenBooks.find((book) => book.id === selectedId) ?? gardenBooks[0];
  const requestSent = requests.includes(selected.id);
  const todayFolio = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date()).replaceAll("/", " · ");

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("life-in-books-garden-requests");
        if (stored) setRequests(JSON.parse(stored) as string[]);
      } catch {
        setRequests([]);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const openBook = (id: string) => {
    setSelectedId(id);
    setView("book");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const goToView = (next: GardenView) => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  };

  const sendRequest = () => {
    setRequests((current) => {
      const next = current.includes(selected.id) ? current : [...current, selected.id];
      window.localStorage.setItem("life-in-books-garden-requests", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="garden-experience">
      <header className="garden-header">
        <div><p>Life In Books</p><span>{view === "garden" ? "The Garden" : selected.author}</span></div>
        {view !== "garden" ? <button type="button" onClick={() => goToView(view === "preview" ? "book" : "garden")}><ArrowLeft size={17} weight="bold" aria-hidden="true" />{view === "preview" ? "Book" : "Garden"}</button> : <span>{todayFolio}</span>}
      </header>

      <AnimatePresence mode="wait">
        {view === "garden" ? (
          <motion.section key="garden" className="garden-discovery" initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className="garden-intro">
              <p className="memory-eyebrow">Books shared with intention</p>
              <h1>Other lives, opened carefully.</h1>
              <p>Discover the books people are making from their lives. Nothing is public by default; every author decides what may be read.</p>
            </div>

            <div className="garden-principle"><LockKey size={18} weight="fill" aria-hidden="true" /><p><strong>No audience metrics.</strong> No likes, follower counts, or performance—only stories and permission.</p></div>

            <div className="garden-grid">
              {gardenBooks.map((book, index) => (
                <article key={book.id} className="garden-card">
                  <button type="button" className={`garden-cover garden-cover--${book.cover}`} onClick={() => openBook(book.id)} aria-label={`Open ${book.title} by ${book.author}`}>
                    <Image className="garden-cover-image" src={book.coverImage} alt="" fill unoptimized sizes="(max-width: 700px) 92vw, 33vw" />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><small>{book.author}</small><strong>{book.title}</strong><em>{book.subtitle}</em></div>
                  </button>
                  <div className="garden-card-copy">
                    <div className="garden-author"><span>{book.initials}</span><div><strong>{book.author}</strong><small>{accessLabel(book.access, requests.includes(book.id))}</small></div></div>
                    <p>{book.summary}</p>
                    <button type="button" onClick={() => openBook(book.id)}>See this book <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
                  </div>
                </article>
              ))}
            </div>
          </motion.section>
        ) : view === "book" ? (
          <motion.section key={selected.id} className="garden-book" initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <div className={`garden-book-cover garden-cover--${selected.cover}`}><Image className="garden-cover-image" src={selected.coverImage} alt="" fill unoptimized sizes="(max-width: 700px) 92vw, 38vw" /><span>{selected.author}</span><h1>{selected.title}</h1><p>{selected.subtitle}</p></div>
            <div className="garden-book-details">
              <div className="garden-book-author"><span>{selected.initials}</span><div><p>A memoir by</p><h2>{selected.author}</h2></div></div>
              <p className="garden-book-summary">{selected.summary}</p>
              <AccessAction book={selected} requestSent={requestSent} onRequest={sendRequest} onRead={() => goToView("preview")} />
              <div className="garden-themes">{selected.themes.map((theme) => <span key={theme}>{theme}</span>)}</div>
              <dl><div><dt>Pages</dt><dd>{selected.pages}</dd></div><div><dt>Sharing</dt><dd>{accessLabel(selected.access, requestSent)}</dd></div><div><dt>Status</dt><dd>{selected.updated}</dd></div></dl>
            </div>
          </motion.section>
        ) : (
          <motion.section key={`${selected.id}-preview`} className="garden-preview" initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            <aside><p>Shared preview</p><strong>{selected.title}</strong><span>One page chosen by {selected.author}</span></aside>
            <article>
              <header><span>{selected.author}</span><span>Shared with permission</span></header>
              <div><p>From {selected.title}</p><h1>{selected.previewTitle}</h1><blockquote>{selected.previewQuote}</blockquote>{selected.previewBody.map((paragraph, index) => <p key={`${selected.id}-${index}`}>{paragraph}</p>)}</div>
              <footer><span>Life In Books</span><span>Preview · 01</span></footer>
            </article>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function accessLabel(access: GardenAccess, requested: boolean) {
  if (access === "public") return "Preview open";
  if (access === "granted") return "Shared with you";
  if (access === "private") return "Private";
  return requested ? "Request sent" : "Request to read";
}

function AccessAction({ book, requestSent, onRequest, onRead }: { book: GardenBook; requestSent: boolean; onRequest: () => void; onRead: () => void }) {
  if (book.access === "public" || book.access === "granted") {
    return <div className="garden-access garden-access--open"><BookOpenText size={21} weight="fill" aria-hidden="true" /><div><span>{book.access === "granted" ? "Access granted" : "Author-selected preview"}</span><strong>{book.previewTitle}</strong><p>{book.previewQuote}</p></div><button type="button" onClick={onRead}>Read permitted preview <ArrowRight size={17} weight="bold" aria-hidden="true" /></button></div>;
  }
  if (book.access === "private") {
    return <div className="garden-access garden-access--private"><LockKey size={21} weight="fill" aria-hidden="true" /><div><span>Private book</span><strong>This author is not accepting requests.</strong><p>You can still see the title and summary they chose to share.</p></div></div>;
  }
  if (requestSent) {
    return <div className="garden-access garden-access--sent"><Check size={21} weight="bold" aria-hidden="true" /><div><span>Request sent</span><strong>{book.author} will decide what to share.</strong><p>If they accept, only the pages they permit will become readable.</p></div></div>;
  }
  return <div className="garden-access garden-access--request"><PaperPlaneTilt size={21} weight="fill" aria-hidden="true" /><div><span>Request-only book</span><strong>Ask {book.author} for permission to read.</strong><p>Your request shares your name, not your own book.</p></div><button type="button" onClick={onRequest}>Request to read <ArrowRight size={17} weight="bold" aria-hidden="true" /></button></div>;
}
