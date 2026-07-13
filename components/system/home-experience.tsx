"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Check,
  ImageSquare,
  Microphone,
  PencilSimple,
} from "@phosphor-icons/react";
import { NavShell } from "@/components/system/nav-shell";
import { CaptureMode, KeptPage, MemoryInterview } from "@/components/system/memory-interview";
import { LibraryExperience } from "@/components/system/library-experience";
import { GardenExperience } from "@/components/system/garden-experience";

type Destination = "Home" | "Library" | "Add Memory" | "Garden";
type HomeCaptureMode = "Write" | "Voice" | "Photo" | "Screenshot";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

const captureModes = [
  { label: "Write" as const, icon: PencilSimple },
  { label: "Voice" as const, icon: Microphone },
  { label: "Photo" as const, icon: Camera },
  { label: "Screenshot" as const, icon: ImageSquare },
];

export function HomeExperience() {
  const [active, setActive] = useState<Destination>("Home");
  const [captureMode, setCaptureMode] = useState<HomeCaptureMode>("Write");
  const [memory, setMemory] = useState("");
  const [memorySeed, setMemorySeed] = useState("");
  const [memoryMode, setMemoryMode] = useState<CaptureMode>("Write");
  const [notice, setNotice] = useState<string | null>(null);
  const [savedPages, setSavedPages] = useState<KeptPage[]>([]);
  const [isReading, setIsReading] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("life-in-books-pages");
        if (stored) setSavedPages(JSON.parse(stored) as KeptPage[]);
      } catch {
        setSavedPages([]);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const showHome = () => {
    setActive("Home");
    setNotice(null);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const openMemory = (mode: CaptureMode = "Write", seed = "") => {
    setMemoryMode(mode);
    setMemorySeed(seed);
    setActive("Add Memory");
    setNotice(null);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const selectDestination = (destination: Destination) => {
    if (destination === "Home") {
      showHome();
      return;
    }
    if (destination === "Add Memory") {
      openMemory();
      return;
    }
    if (destination === "Library") {
      setActive("Library");
      setNotice(null);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    if (destination === "Garden") {
      setActive("Garden");
      setNotice(null);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  };

  const beginInterview = () => {
    if (!memory.trim()) {
      setNotice("Start with one small detail. A sentence is enough.");
      window.setTimeout(() => composerRef.current?.focus(), 40);
      window.setTimeout(() => setNotice(null), 2600);
      return;
    }
    openMemory("Write", memory.trim());
  };

  const keepPageInLibrary = (page: KeptPage) => {
    setSavedPages((current) => {
      const next = [page, ...current.filter((item) => item.id !== page.id)];
      window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
      return next;
    });
  };

  return (
    <main className={active === "Add Memory" ? "home-app home-app--memory" : "home-app"}>
      {active === "Add Memory" ? (
        <MemoryInterview
          key={`${memoryMode}-${memorySeed}`}
          initialMode={memoryMode}
          initialMemory={memorySeed}
          onBack={showHome}
          onPageKept={keepPageInLibrary}
          onOpenLibrary={() => setActive("Library")}
        />
      ) : active === "Library" ? (
        <LibraryExperience savedPages={savedPages} onReadingChange={setIsReading} />
      ) : active === "Garden" ? (
        <GardenExperience />
      ) : (
        <div className="home-frame">
          <header className="home-header">
            <div>
              <p className="home-date">Sunday, 13 July</p>
              <h1>Life In Books</h1>
            </div>
            <button className="profile-mark" type="button" aria-label="Open profile">K</button>
          </header>

          <div className="home-layout">
            <section className="interview-column" aria-labelledby="today-question">
              <div className="interview-intro">
                <div className="section-kicker">
                  <span>Today&apos;s reflection</span>
                  <span className="issue-number">01</span>
                </div>
                <h2 id="today-question">What part of today would you never want to forget?</h2>
                <p>Tell it as it happened. I&apos;ll help you find the story inside it.</p>
              </div>

              <div className="memory-composer" id="memory-composer">
                <div className="capture-modes" aria-label="Choose how to share this memory">
                  {captureModes.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      className={captureMode === label ? "capture-mode capture-mode--active" : "capture-mode"}
                      aria-pressed={captureMode === label}
                      onClick={() => {
                        setCaptureMode(label);
                        if (label !== "Write") openMemory(label);
                      }}
                    >
                      <Icon size={19} weight={captureMode === label ? "fill" : "regular"} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <label className="sr-only" htmlFor="memory-text">Share today&apos;s memory</label>
                <textarea
                  id="memory-text"
                  ref={composerRef}
                  value={memory}
                  onChange={(event) => setMemory(event.target.value)}
                  placeholder="Someone appreciated me today for…"
                  rows={5}
                />

                <div className="composer-footer">
                  <p>A sentence is enough to begin.</p>
                  <button className="begin-memory" type="button" onClick={beginInterview}>
                    Begin this memory
                    <ArrowRight size={18} weight="bold" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            <aside className="book-column" aria-label="Your growing memoir">
              <section className="book-section">
                <div className="section-heading-row">
                  <div>
                    <p className="section-label">Your book</p>
                    <h2>A life, taking shape.</h2>
                  </div>
                  <button type="button" onClick={() => selectDestination("Library")}>See library</button>
                </div>

                <article className="book-cover-card">
                  <div className="book-cover-image">
                    <Image src="/assets/seaside-memory.png" alt="A quiet coast at the edge of the sea" fill unoptimized sizes="(max-width: 700px) 92vw, 38vw" priority />
                    <span className="book-one-mark">Book one</span>
                  </div>
                  <div className="book-cover-copy">
                    <p>Volume II · Becoming</p>
                    <h3>The person I am learning to trust</h3>
                    <div><span>12 memories</span><span>Edited today</span></div>
                  </div>
                </article>
              </section>

              <section className="recent-section">
                <div className="section-heading-row section-heading-row--compact">
                  <p className="section-label">Recently placed</p>
                  <span>Page 34</span>
                </div>
                <article className="recent-page">
                  <div className="recent-page-image">
                    <Image src="/assets/domestic-still-life.png" alt="A warm still life near a kitchen window" fill unoptimized sizes="120px" />
                  </div>
                  <div>
                    <p className="chapter-path">Becoming Someone I Trust</p>
                    <h3>“They noticed the patience I had almost forgotten I possessed.”</h3>
                    <p className="recent-meta"><Check size={14} weight="bold" aria-hidden="true" /> Added to Chapter Four</p>
                  </div>
                </article>
              </section>
            </aside>
          </div>
        </div>
      )}

      {!isReading ? <NavShell active={active} onSelect={selectDestination} /> : null}

      <AnimatePresence>
        {notice ? (
          <motion.p
            className="home-notice"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
            role="status"
          >
            {notice}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
