"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CaretRight, Plus, Sparkle } from "@phosphor-icons/react";
import { Destination, NavShell } from "@/components/system/nav-shell";
import { CaptureMode, KeptPage, MemoryInterview } from "@/components/system/memory-interview";
import { LibraryExperience } from "@/components/system/library-experience";
import { GardenExperience } from "@/components/system/garden-experience";
import { ProfileExperience } from "@/components/system/profile-experience";
import { OnboardingExperience } from "@/components/system/onboarding-experience";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function HomeExperience() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [active, setActive] = useState<Destination>("Home");
  const [memorySeed, setMemorySeed] = useState("");
  const [memoryMode, setMemoryMode] = useState<CaptureMode>("Write");
  const [bookTitle, setBookTitle] = useState("Summer of Firsts");
  const [notice, setNotice] = useState<string | null>(null);
  const [savedPages, setSavedPages] = useState<KeptPage[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [showForYou, setShowForYou] = useState(false);
  const [libraryEntry, setLibraryEntry] = useState<"shelf" | "book" | "reader">("shelf");
  const [libraryPage, setLibraryPage] = useState<string | undefined>();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const previewOnboarding = new URLSearchParams(window.location.search).get("onboarding") === "1";
        setShowOnboarding(previewOnboarding || window.localStorage.getItem("life-in-books-onboarding-complete") !== "yes");
        setBookTitle(window.localStorage.getItem("life-in-books-book-title") || "Summer of Firsts");
        const stored = window.localStorage.getItem("life-in-books-pages");
        if (stored) setSavedPages(JSON.parse(stored) as KeptPage[]);
      } catch {
        setSavedPages([]);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  const completeOnboarding = (title: string) => {
    window.localStorage.setItem("life-in-books-onboarding-complete", "yes");
    window.localStorage.setItem("life-in-books-book-title", title);
    setBookTitle(title);
    setShowOnboarding(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const showHome = () => {
    setActive("Home");
    setMemorySeed("");
    setNotice(null);
    setShowForYou(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const openMemory = (mode: CaptureMode = "Write", seed = "") => {
    setMemoryMode(mode);
    setMemorySeed(seed);
    setActive("Add Memory");
    setNotice(null);
    setShowForYou(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const openLibraryAt = (view: "shelf" | "book" | "reader", pageId?: string) => {
    setLibraryEntry(view);
    setLibraryPage(pageId);
    setActive("Library");
    setShowForYou(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const selectDestination = (destination: Destination) => {
    if (destination === "Home") return showHome();
    if (destination === "Add Memory") return openMemory();
    setNotice(null);
    setShowForYou(false);
    if (destination === "Library") {
      setLibraryEntry("shelf");
      setLibraryPage(undefined);
    }
    setActive(destination);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const keepPageInLibrary = (page: KeptPage) => {
    setSavedPages((current) => {
      const next = [page, ...current.filter((item) => item.id !== page.id)];
      window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
      return next;
    });
  };

  const latestPage = savedPages[0];

  if (showOnboarding) return <OnboardingExperience onComplete={completeOnboarding} />;

  return (
    <main className={active === "Add Memory" ? "home-app home-app--memory" : "home-app"}>
      {active === "Add Memory" ? (
        <MemoryInterview
          key={`${memoryMode}-${memorySeed}`}
          initialMode={memoryMode}
          initialMemory={memorySeed}
          onBack={showHome}
          onPageKept={keepPageInLibrary}
          onOpenLibrary={() => openLibraryAt("shelf")}
        />
      ) : active === "Library" ? (
        <LibraryExperience
          key={`${libraryEntry}-${libraryPage ?? "first"}`}
          savedPages={savedPages}
          initialView={libraryEntry}
          initialPageId={libraryPage}
          onReadingChange={setIsReading}
        />
      ) : active === "Garden" ? (
        <GardenExperience />
      ) : active === "Profile" ? (
        <ProfileExperience bookTitle={bookTitle} memoryCount={savedPages.length} onOpenGarden={() => selectDestination("Garden")} />
      ) : (
        <div className="contents-home">
          <header className="contents-running-head">
            <h1>Life In Books</h1>
            <div className="for-you-wrap contents-folio-wrap">
              <button className="contents-folio" type="button" aria-expanded={showForYou} aria-controls="for-you-notes" onClick={() => setShowForYou((current) => !current)} aria-label="Open a note from your life">17</button>
              <AnimatePresence>
                {showForYou ? (
                  <motion.aside id="for-you-notes" className="for-you-notes contents-note" initial={{ opacity: 0, y: -8, rotate: -0.4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} aria-label="Notes from your life">
                    <p><Sparkle size={13} weight="fill" aria-hidden="true" /> A note from your life</p>
                    <button type="button" onClick={() => openLibraryAt("reader", "quiet-strength")}><span>Worth returning to</span><strong>Someone once noticed the patience you had almost forgotten.</strong></button>
                  </motion.aside>
                ) : null}
              </AnimatePresence>
            </div>
          </header>

          <section className="contents-intro">
            <h2>Contents</h2>
            <p>Your life, organized by chapters.</p>
          </section>

          <section className="contents-list" aria-label={`${bookTitle} contents`}>
            <div className="contents-chapter contents-chapter--active">
              <button type="button" onClick={() => openLibraryAt("book")} aria-label="Open chapter one, Becoming">
                <span className="contents-roman">I</span><span className="contents-dot">·</span><strong>Becoming</strong><i aria-hidden="true" /><span className="contents-page">12</span>
              </button>
              <div className="contents-pages">
                {latestPage ? (
                  <button className="contents-page-new" type="button" onClick={() => openLibraryAt("reader", latestPage.id)}><strong>{latestPage.title}</strong><i aria-hidden="true" /><span>46</span></button>
                ) : null}
                <button type="button" onClick={() => openLibraryAt("reader", "quiet-strength")}><strong>The Patience Someone Else Noticed</strong><i aria-hidden="true" /><span>38</span></button>
                <button type="button" onClick={() => openLibraryAt("reader", "kitchen-light")}><strong>What the Kitchen Window Taught Me</strong><i aria-hidden="true" /><span>42</span></button>
              </div>
            </div>
            <div className="contents-chapter">
              <button type="button" onClick={() => openLibraryAt("book")}><span className="contents-roman">II</span><span className="contents-dot">·</span><strong>People Who Changed Me</strong><i aria-hidden="true" /><span className="contents-page">28</span></button>
            </div>
            <div className="contents-chapter">
              <button type="button" onClick={() => openLibraryAt("book")}><span className="contents-roman">III</span><span className="contents-dot">·</span><strong>Places I Carried Home</strong><i aria-hidden="true" /><span className="contents-page">44</span></button>
            </div>
            <button className="contents-add" type="button" onClick={() => openMemory()}><Plus size={24} weight="light" aria-hidden="true" /><strong>Add today&apos;s memory</strong><CaretRight size={20} weight="bold" aria-hidden="true" /></button>
          </section>

          <button className="contents-continue" type="button" onClick={() => openLibraryAt("reader", "quiet-strength")}><span><strong>Continue reading</strong> · page 38</span><CaretRight size={20} weight="bold" aria-hidden="true" /></button>
        </div>
      )}

      {!isReading && active !== "Add Memory" ? <NavShell active={active} onSelect={selectDestination} /> : null}
      <AnimatePresence>{notice ? <motion.p className="home-notice" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} role="status">{notice}</motion.p> : null}</AnimatePresence>
    </main>
  );
}
