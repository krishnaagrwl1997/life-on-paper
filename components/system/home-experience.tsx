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
import { createClient } from "@/lib/supabase/client";
import type { AccountSummary } from "@/lib/supabase/account";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function HomeExperience({ initialAccount }: { initialAccount: AccountSummary | null }) {
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
  const [account, setAccount] = useState(initialAccount);
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const signInWithGoogle = async () => {
    setAuthPending(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });

      if (error) throw error;
    } catch {
      setAuthPending(false);
      setAuthError("You can keep exploring as a guest and connect your account later.");
    }
  };

  const signOut = async () => {
    setAuthPending(true);
    setAuthError(null);
    const supabase = createClient();
    await supabase.auth.signOut();
    setAccount(null);
    setAuthPending(false);
  };

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

  if (showOnboarding) {
    return (
      <OnboardingExperience
        onComplete={completeOnboarding}
        account={account}
        authPending={authPending}
        authError={authError}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

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
        <ProfileExperience
          bookTitle={bookTitle}
          memoryCount={savedPages.length}
          account={account}
          authPending={authPending}
          onOpenGarden={() => selectDestination("Garden")}
          onGoogleSignIn={signInWithGoogle}
          onSignOut={signOut}
        />
      ) : (
        <div className="reader-home">
          <header className="reader-home__header">
            <div>
              <h1>Life on Paper</h1>
              <p>Your life, one page at a time</p>
            </div>
            <div className="for-you-wrap reader-home__note-wrap">
              <button className="reader-home__note" type="button" aria-expanded={showForYou} aria-controls="for-you-notes" onClick={() => setShowForYou((current) => !current)} aria-label="Open a note from your life">
                <span aria-hidden="true"><i /></span>
                <strong>A note from<br />your life</strong>
              </button>
              <AnimatePresence>
                {showForYou ? (
                  <motion.aside id="for-you-notes" className="for-you-notes reader-home__note-card" initial={{ opacity: 0, y: -8, rotate: -0.4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} aria-label="Notes from your life">
                    <p><Sparkle size={13} weight="fill" aria-hidden="true" /> A note from your life</p>
                    <button type="button" onClick={() => openLibraryAt("reader", "quiet-strength")}><span>Worth returning to</span><strong>Someone once noticed the patience you had almost forgotten.</strong></button>
                  </motion.aside>
                ) : null}
              </AnimatePresence>
            </div>
          </header>

          <section className="reader-home__book-heading">
            <span>Your book</span>
            <strong>{bookTitle}</strong>
          </section>

          <motion.article
            className="reader-home__page-stack"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
          >
            <button className="reader-home__page" type="button" onClick={() => openLibraryAt("reader", latestPage?.id ?? "quiet-strength")} aria-label={`Continue reading ${latestPage?.title ?? "The Patience Someone Else Noticed"}`}>
              <span className="reader-home__page-meta">
                <span>Latest page · {latestPage?.chapterTitle ?? "Becoming"}</span>
                <span>— {latestPage ? "46" : "38"}</span>
              </span>
              <strong className="reader-home__page-title">{latestPage?.title ?? "The Patience Someone Else Noticed"}</strong>
              <span className="reader-home__excerpt">
                <i aria-hidden="true">{(latestPage?.excerpt ?? "It was such a small thing to be seen for.").charAt(0)}</i>
                {(latestPage?.excerpt ?? "It was such a small thing to be seen for. I had almost missed it myself—the pause before answering, the choice to stay gentle. But someone else noticed, and for a moment I met the quieter person I was becoming.").slice(1)}
              </span>
              <span className="reader-home__continue">
                <strong>Continue reading <CaretRight size={15} weight="bold" aria-hidden="true" /></strong>
                <span>Page {latestPage ? "46" : "38"} <i aria-hidden="true"><b /></i></span>
              </span>
            </button>
          </motion.article>

          <section className="reader-home__chapters" aria-label={`${bookTitle} chapters`}>
            <div className="reader-home__section-title">
              <h2>Inside this book</h2>
              <span>{savedPages.length + 6} pages</span>
            </div>
            <div className="reader-home__chapter-list">
              <button type="button" onClick={() => openLibraryAt("book")} aria-label="Open chapter one, Becoming">
                <span className="reader-home__chapter-no">I</span>
                <span><strong>Becoming</strong><small>{latestPage ? "4" : "3"} memories</small></span>
                <CaretRight size={18} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => openLibraryAt("book")} aria-label="Open chapter two, People Who Changed Me">
                <span className="reader-home__chapter-no">II</span>
                <span><strong>People Who Changed Me</strong><small>2 memories</small></span>
                <CaretRight size={18} weight="bold" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => openLibraryAt("book")} aria-label="Open chapter three, Places I Carried Home">
                <span className="reader-home__chapter-no">III</span>
                <span><strong>Places I Carried Home</strong><small>1 memory</small></span>
                <CaretRight size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <button className="reader-home__add" type="button" onClick={() => openMemory()}>
              <span className="reader-home__add-icon"><Plus size={25} weight="light" aria-hidden="true" /></span>
              <span><strong>Add a memory</strong><small>Speak, write, or add a photo</small></span>
              <CaretRight size={20} weight="bold" aria-hidden="true" />
            </button>
          </section>
        </div>
      )}

      {!isReading && active !== "Add Memory" ? <NavShell active={active} onSelect={selectDestination} /> : null}
      <AnimatePresence>{notice ? <motion.p className="home-notice" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} role="status">{notice}</motion.p> : null}</AnimatePresence>
    </main>
  );
}
