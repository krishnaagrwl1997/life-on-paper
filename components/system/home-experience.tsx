"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpenText, CaretRight, Sparkle, X } from "@phosphor-icons/react";
import { Destination, NavShell } from "@/components/system/nav-shell";
import { CaptureMode, KeptPage, MemoryInterview, refineKeptPageWriting } from "@/components/system/memory-interview";
import { LibraryExperience } from "@/components/system/library-experience";
import { GardenExperience } from "@/components/system/garden-experience";
import { ProfileExperience } from "@/components/system/profile-experience";
import { OnboardingExperience } from "@/components/system/onboarding-experience";
import { createClient } from "@/lib/supabase/client";
import { deleteCloudPage, saveCloudPage, syncDevicePages } from "@/lib/supabase/memories";
import type { AccountSummary } from "@/lib/supabase/account";

const paperEase = [0.22, 0.72, 0.26, 1] as const;
const starterQuestions = [
  { category: "Life", question: "What happened recently that you hope you never forget?" },
  { category: "Travel", question: "Which journey made you feel most like yourself?" },
  { category: "Work", question: "When did someone at work make you feel seen?" },
  { category: "People", question: "Whose words have stayed with you longer than they probably know?" },
  { category: "Small things", question: "What ordinary moment quietly made your day better?" },
  { category: "Growth", question: "When did you realise you had become braver than before?" },
  { category: "Home", question: "What sound, smell, or corner instantly feels like home?" },
  { category: "Friendship", question: "What is a small kindness from a friend you still remember?" },
  { category: "Childhood", question: "Which childhood day can you still see clearly?" },
  { category: "Change", question: "What choice changed your life in a way you did not expect?" },
  { category: "Joy", question: "When was the last time you laughed without holding back?" },
  { category: "Learning", question: "What did a recent conversation teach you about yourself?" },
] as const;

export function HomeExperience({ initialAccount }: { initialAccount: AccountSummary | null }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [active, setActive] = useState<Destination>("Home");
  const [memorySeed, setMemorySeed] = useState("");
  const [memoryMode, setMemoryMode] = useState<CaptureMode>("Write");
  const [memoryPrompt, setMemoryPrompt] = useState("");
  const [starterQuestionIndex, setStarterQuestionIndex] = useState(0);
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
  const [syncState, setSyncState] = useState<"device" | "syncing" | "synced" | "error">(initialAccount ? "syncing" : "device");
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
        const contentResetKey = "life-on-paper-clean-start-v1";
        if (window.localStorage.getItem(contentResetKey) !== "complete") {
          window.localStorage.removeItem("life-in-books-pages");
          window.localStorage.removeItem("life-in-books-studio");
          window.localStorage.setItem(contentResetKey, "complete");
        }
        const previewOnboarding = new URLSearchParams(window.location.search).get("onboarding") === "1";
        setStarterQuestionIndex(Math.floor(Math.random() * starterQuestions.length));
        setShowOnboarding(previewOnboarding || window.localStorage.getItem("life-in-books-onboarding-complete") !== "yes");
        const storedBookTitle = window.localStorage.getItem("life-in-books-book-title") || "Summer of Firsts";
        setBookTitle(storedBookTitle);
        const stored = window.localStorage.getItem("life-in-books-pages");
        const devicePages = (stored ? JSON.parse(stored) as KeptPage[] : []).map(refineKeptPageWriting);
        if (devicePages.length) window.localStorage.setItem("life-in-books-pages", JSON.stringify(devicePages));
        setSavedPages(devicePages);
        if (initialAccount) {
          setSyncState("syncing");
          void syncDevicePages(createClient(), initialAccount.id, storedBookTitle, devicePages)
            .then((cloudPages) => {
              const syncedPages = cloudPages.map(refineKeptPageWriting);
              setSavedPages(syncedPages);
              window.localStorage.setItem("life-in-books-pages", JSON.stringify(syncedPages));
              setSyncState("synced");
            })
            .catch((error: unknown) => {
              console.error("Life on Paper account sync failed", error);
              setSyncState("error");
              setNotice("Your pages are safe on this device. Account sync will retry automatically.");
            });
        }
      } catch {
        setSavedPages([]);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [initialAccount]);

  useEffect(() => {
    if (!notice || notice === "Saving your page…") return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
    setMemoryPrompt("");
    setNotice(null);
    setShowForYou(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const openMemory = (mode: CaptureMode = "Write", seed = "", prompt = "") => {
    setMemoryMode(mode);
    setMemorySeed(seed);
    setMemoryPrompt(prompt);
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
    if (account) {
      setSyncState("syncing");
      setNotice("Saving your page…");
      void saveCloudPage(createClient(), account.id, bookTitle, page, page.emotions)
        .then((cloudId) => {
          setSavedPages((current) => {
            const next = current.map((item) => item.id === page.id ? { ...item, cloudId } : item);
            window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
            return next;
          });
          setSyncState("synced");
          setNotice("Saved to your private book. It is available on your other devices.");
        })
        .catch((error: unknown) => {
          console.error("Life on Paper page save failed", error);
          setSyncState("error");
          setNotice("Saved on this device. Account sync will retry automatically.");
        });
    } else {
      setSyncState("device");
      setNotice("Saved on this device. Sign in when you want private cloud backup.");
    }
  };

  const commitLibraryPages = async (pages: KeptPage[]) => {
    setSavedPages(pages);
    window.localStorage.setItem("life-in-books-pages", JSON.stringify(pages));
    if (!account) {
      setSyncState("device");
      setNotice("Edits saved on this device. Sign in to sync them everywhere.");
      return;
    }

    setSyncState("syncing");
    setNotice("Syncing your edits…");
    try {
      const client = createClient();
      const synced: KeptPage[] = [];
      for (const page of pages) {
        synced.push({
          ...page,
          cloudId: await saveCloudPage(client, account.id, bookTitle, page, page.emotions),
        });
      }
      setSavedPages(synced);
      window.localStorage.setItem("life-in-books-pages", JSON.stringify(synced));
      setSyncState("synced");
      setNotice("Your edits are synced across your devices.");
    } catch (error) {
      console.error("Life on Paper edit sync failed", error);
      setSyncState("error");
      setNotice("Edits are safe on this device. Account sync will retry automatically.");
    }
  };

  const removeLibraryPage = async (page: KeptPage) => {
    const next = savedPages.filter((item) => item.id !== page.id);
    setSavedPages(next);
    window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
    if (!account) {
      setNotice("Page removed from this device.");
      return;
    }

    setSyncState("syncing");
    try {
      await deleteCloudPage(createClient(), account.id, page);
      setSyncState("synced");
      setNotice("Page removed from your private book on every device.");
    } catch (error) {
      console.error("Life on Paper cloud deletion failed", error);
      setSyncState("error");
      setNotice("Page removed here. Cloud deletion will need another try.");
    }
  };

  const latestPage = savedPages[0];
  const starterQuestion = starterQuestions[starterQuestionIndex];
  const showAnotherStarter = () => {
    setStarterQuestionIndex((current) => (current + 1 + Math.floor(Math.random() * (starterQuestions.length - 1))) % starterQuestions.length);
  };

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
    <>
    <main className={active === "Add Memory" ? "home-app home-app--memory" : isReading ? "home-app home-app--reading" : "home-app"}>
      {active === "Add Memory" ? (
        <MemoryInterview
          key={`${memoryMode}-${memorySeed}-${memoryPrompt}`}
          initialMode={memoryMode}
          initialMemory={memorySeed}
          starterPrompt={memoryPrompt}
          onBack={showHome}
          onPageKept={keepPageInLibrary}
          onOpenLibrary={() => openLibraryAt("book")}
        />
      ) : active === "Library" ? (
        <LibraryExperience
          key={`${libraryEntry}-${libraryPage ?? "first"}`}
          savedPages={savedPages}
          bookTitle={bookTitle}
          initialView={libraryEntry}
          initialPageId={libraryPage}
          onReadingChange={setIsReading}
          onAddMemory={() => openMemory()}
          syncState={syncState}
          onCommitPages={commitLibraryPages}
          onDeletePage={removeLibraryPage}
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
          onOpenLibrary={() => openLibraryAt("book")}
          onGoogleSignIn={signInWithGoogle}
          onSignOut={signOut}
        />
      ) : (
        <div className="reader-home">
          <header className="reader-home__header">
            <div className="reader-home__identity">
              <span>Personal memoir</span>
              <h1>Life on Paper</h1>
              <p>Speak naturally. Keep the page forever.</p>
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
                    {latestPage ? (
                      <button type="button" onClick={() => openLibraryAt("reader", latestPage.id)}><span>Worth returning to</span><strong>{latestPage.excerpt}</strong></button>
                    ) : (
                      <button type="button" onClick={() => openMemory("Write", "", starterQuestion.question)}><span>{starterQuestion.category}</span><strong>{starterQuestion.question}</strong></button>
                    )}
                  </motion.aside>
                ) : null}
              </AnimatePresence>
            </div>
          </header>

          <section className="reader-home__book-heading">
            <span>Now reading</span>
            <strong>{bookTitle}</strong>
          </section>

          <motion.article className="reader-home__page-stack" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}>
            {latestPage ? (
              <button className="reader-home__page" type="button" onClick={() => openLibraryAt("reader", latestPage.id)} aria-label={`Continue reading ${latestPage.title}`}>
                <span className="reader-home__page-meta"><span>Latest page · {latestPage.chapterTitle}</span><span>— 01</span></span>
                <strong className="reader-home__page-title">{latestPage.title}</strong>
                <span className="reader-home__excerpt"><i aria-hidden="true">{latestPage.excerpt.charAt(0)}</i>{latestPage.excerpt.slice(1)}</span>
                <span className="reader-home__continue"><strong>Continue reading <CaretRight size={15} weight="bold" aria-hidden="true" /></strong><span>Page 01 <i aria-hidden="true"><b /></i></span></span>
              </button>
            ) : (
              <div className="reader-home__page reader-home__page--empty">
                <span className="reader-home__page-meta"><span>A new beginning</span><span>— 01</span></span>
                <span className="reader-home__prompt-category">{starterQuestion.category}</span>
                <strong className="reader-home__page-title">{starterQuestion.question}</strong>
                <span className="reader-home__excerpt">You do not need to write beautifully. Tell it as you remember it.</span>
                <span className="reader-home__starter-actions">
                  <button type="button" onClick={() => openMemory("Write", "", starterQuestion.question)}>Start with this <CaretRight size={15} weight="bold" aria-hidden="true" /></button>
                  <button type="button" onClick={showAnotherStarter}>Another question</button>
                </span>
              </div>
            )}
          </motion.article>

          <aside className="reader-home__verso" aria-label={`${bookTitle} overview`}>
            <div className="reader-home__verso-heading">
              <span>Book One · A memoir in progress</span>
              <h2>{bookTitle}</h2>
              <p>{latestPage ? "A growing collection of the moments, places, and conversations that made you who you are." : "This book will grow from the life you tell—not from prompts you have to complete."}</p>
            </div>

            <div className="reader-home__verso-rule" aria-hidden="true"><span>✦</span></div>

            <blockquote>
              {latestPage ? latestPage.reflection || latestPage.excerpt : starterQuestion.question}
            </blockquote>

            <section className="reader-home__book-note">
              <div>
                <BookOpenText size={21} weight="regular" aria-hidden="true" />
                <span><small>Inside your book</small><strong>{savedPages.length ? `${savedPages.length} ${savedPages.length === 1 ? "page" : "pages"}` : "Ready to begin"}</strong></span>
              </div>
              <button type="button" onClick={() => openLibraryAt("book")}>
                See contents <CaretRight size={16} weight="bold" aria-hidden="true" />
              </button>
            </section>

            <button className="reader-home__verso-action" type="button" onClick={() => openMemory("Write", "", latestPage ? "" : starterQuestion.question)}>
              <span aria-hidden="true">＋</span>
              <span><strong>{latestPage ? "Write the next page" : "Write the first page"}</strong><small>Speak, type, or add a photograph</small></span>
            </button>
          </aside>
        </div>
      )}

      <AnimatePresence>
        {notice ? (
          <motion.aside className="home-notice" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }} role="status">
            <span>{notice}</span>
            {!account && notice.toLowerCase().includes("sign in") ? <button type="button" className="home-notice__action" onClick={signInWithGoogle}>Sign in</button> : null}
            <button type="button" className="home-notice__close" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={15} weight="bold" aria-hidden="true" /></button>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </main>
    {!isReading && active !== "Add Memory" ? <NavShell active={active} onSelect={selectDestination} /> : null}
    </>
  );
}
