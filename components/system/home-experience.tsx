"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ImageSquare,
  Microphone,
  Sparkle,
  Stop,
} from "@phosphor-icons/react";
import { NavShell } from "@/components/system/nav-shell";
import { CaptureMode, KeptPage, MemoryInterview } from "@/components/system/memory-interview";
import { LibraryExperience } from "@/components/system/library-experience";
import { GardenExperience } from "@/components/system/garden-experience";
import { useLiveTranscription } from "@/components/system/use-live-transcription";

type Destination = "Home" | "Library" | "Add Memory" | "Garden";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

function todayHeading() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function HomeExperience() {
  const [active, setActive] = useState<Destination>("Home");
  const [memory, setMemory] = useState("");
  const [memorySeed, setMemorySeed] = useState("");
  const [memoryMode, setMemoryMode] = useState<CaptureMode>("Write");
  const [notice, setNotice] = useState<string | null>(null);
  const [savedPages, setSavedPages] = useState<KeptPage[]>([]);
  const [isReading, setIsReading] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();
  const liveSpeech = useLiveTranscription({ value: memory, onChange: setMemory, onError: setNotice });

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
    setMemorySeed("");
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
    setMemory("");
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
          onOpenLibrary={() => {
            setMemorySeed("");
            setActive("Library");
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      ) : active === "Library" ? (
        <LibraryExperience savedPages={savedPages} onReadingChange={setIsReading} />
      ) : active === "Garden" ? (
        <GardenExperience />
      ) : (
        <div className="home-frame">
          <header className="home-header">
            <div>
              <h1>Life In Books</h1>
              <p className="home-date">{todayHeading()}</p>
            </div>
            <button className="profile-mark" type="button" aria-label="Open profile">
              <Image src="/assets/profile-portrait.png" alt="" fill unoptimized sizes="48px" priority />
            </button>
          </header>

          <div className="home-layout">
            <section className="interview-column" aria-labelledby="today-question">
              <div className="interview-intro">
                <div className="section-kicker">
                  <Sparkle className="reflection-star" size={20} weight="fill" aria-hidden="true" />
                  <span>Today&apos;s reflection</span>
                </div>
                <h2 id="today-question">What part of today would you never want to forget?</h2>
                <p>Tell it as it happened. I&apos;ll help you find the story inside it.</p>
              </div>

              <div className="memory-composer" id="memory-composer">
                <label className="sr-only" htmlFor="memory-text">Share today&apos;s memory</label>
                <textarea
                  id="memory-text"
                  ref={composerRef}
                  value={memory}
                  onChange={(event) => {
                    if (liveSpeech.isListening) liveSpeech.stop();
                    setMemory(event.target.value);
                  }}
                  placeholder="Someone appreciated me today for…"
                  rows={5}
                />

                <div className="composer-footer">
                  <div className="composer-tools" aria-label="Ways to add to this memory">
                    <button type="button" onClick={() => openMemory("Photo")} aria-label="Add a photo or screenshot"><ImageSquare size={23} aria-hidden="true" /></button>
                    <button
                      type="button"
                      className={liveSpeech.isListening ? "composer-mic composer-mic--listening" : "composer-mic"}
                      onClick={liveSpeech.isListening ? liveSpeech.stop : liveSpeech.start}
                      aria-label={liveSpeech.isListening ? "Stop live transcription" : "Speak and transcribe"}
                      aria-pressed={liveSpeech.isListening}
                    >
                      {liveSpeech.isListening ? <Stop size={19} weight="fill" aria-hidden="true" /> : <Microphone size={23} weight="regular" aria-hidden="true" />}
                    </button>
                    <div className="composer-status" aria-live="polite">
                      <strong>{liveSpeech.isListening ? "Listening…" : "Type or speak"}</strong>
                      <span>{liveSpeech.isListening && liveSpeech.interimTranscript ? liveSpeech.interimTranscript : liveSpeech.isSupported ? "Your words stay editable." : "Type your memory here."}</span>
                    </div>
                  </div>
                  <button className="begin-memory" type="button" onClick={beginInterview} aria-label="Continue with this memory">
                    <ArrowRight size={28} weight="regular" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            <aside className="book-column" aria-label="Your growing memoir">
              <section className="book-section">
                <div className="section-heading-row">
                  <p className="section-label">Current book</p>
                  <button type="button" onClick={() => selectDestination("Library")}>View all</button>
                </div>

                <button className="book-cover-card" type="button" onClick={() => selectDestination("Library")} aria-label="Open Summer of Firsts in the library">
                  <div className="book-cover-image">
                    <Image src="/assets/current-book-cover.png" alt="An open handwritten notebook beside old family photographs and tea" fill unoptimized sizes="(max-width: 700px) 92vw, 38vw" priority />
                  </div>
                  <div className="book-cover-copy">
                    <h3>Summer of Firsts</h3>
                    <span className="book-accent" aria-hidden="true" />
                    <p>12 memories · Last updated today</p>
                  </div>
                </button>
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
