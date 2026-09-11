"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { Destination, NavShell } from "@/components/system/nav-shell";
import { CaptureMode, KeptPage, MemoryInterview, composeDailyEntry, refineKeptPageWriting, upgradeKeptPageWithAi } from "@/components/system/memory-interview";
import { LibraryExperience } from "@/components/system/library-experience";
import { TodayExperience } from "@/components/system/today-experience";
import { PeopleExperience } from "@/components/system/people-experience";
import { detectTutorQuestions, loadMemoryDecisions, persistMemoryDecisions, tutorWeekKey, type MemoryDecisions, type TutorQuestion } from "@/components/system/people-intel";
import { isoWeekKey, loadWeaveCache } from "@/components/system/weekly-weave";
import { kindCandidate, loadDismissed, persistDismissedIds } from "@/components/system/tone";
import { detectAcuteSignal, detectSustainedHeaviness, loadCareDismissed, persistCareDismissed, type CareKind } from "@/components/system/tone";
import { markMonthlyShown, monthlyShownKey, shouldShowMonthly, thisMonthSummary } from "@/components/system/monthly";
import type { Keepsake } from "@/components/system/keepsakes";
import { AddMomentSheet } from "@/components/system/add-moment-sheet";
import { OnboardingExperience } from "@/components/system/onboarding-experience";
import { createClient } from "@/lib/supabase/client";
import { loadCloudGraph, saveCloudGraph } from "@/lib/supabase/graph";
import { deleteCloudPage, saveCloudPage, syncDevicePages } from "@/lib/supabase/memories";
import type { AccountSummary } from "@/lib/supabase/account";
import { DEMO_SEED_KEY } from "@/lib/demo-seed";

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

type ActiveView = Destination | "Add Memory";

export function HomeExperience({ initialAccount }: { initialAccount: AccountSummary | null }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [active, setActive] = useState<ActiveView>("Today");
  const [memorySeed, setMemorySeed] = useState("");
  const [memoryMode, setMemoryMode] = useState<CaptureMode>("Write");
  const [memoryPrompt, setMemoryPrompt] = useState("");
  const [starterQuestionIndex, setStarterQuestionIndex] = useState(0);
  const [bookTitle, setBookTitle] = useState("Summer of Firsts");
  const [notice, setNotice] = useState<string | null>(null);
  const [savedPages, setSavedPages] = useState<KeptPage[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [libraryEntry, setLibraryEntry] = useState<"shelf" | "book" | "reader" | "search">("shelf");
  const [libraryPage, setLibraryPage] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [composeSignal, setComposeSignal] = useState(0);
  const [decisions, setDecisions] = useState<MemoryDecisions>(() => {
    try { return loadMemoryDecisions(); } catch { return {}; }
  });
  const [tutorWeek, setTutorWeek] = useState<string | null>(() => {
    try { return window.localStorage.getItem(tutorWeekKey); } catch { return null; }
  });
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return loadDismissed(); } catch { return new Set<string>(); }
  });
  const [careDismissed, setCareDismissed] = useState<Set<string>>(() => {
    try { return loadCareDismissed(); } catch { return new Set<string>(); }
  });
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
          redirectTo: `${window.location.origin}/auth/callback?next=/today`,
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
              const client = createClient();
              void loadCloudGraph(client, initialAccount.id).then((graph) => {
                if (!graph) return;
                if (graph.decisions) {
                  const d = graph.decisions as MemoryDecisions;
                  setDecisions(d);
                  persistMemoryDecisions(d);
                }
                if (graph.notToday) {
                  const nextNotToday = new Set(graph.notToday);
                  setDismissed(nextNotToday);
                  persistDismissedIds(nextNotToday);
                }
                if (graph.careDismissed) {
                  const nextCare = new Set(graph.careDismissed);
                  setCareDismissed(nextCare);
                  persistCareDismissed(nextCare);
                }
                if (graph.monthlyShown) {
                  try { window.localStorage.setItem(monthlyShownKey, graph.monthlyShown); } catch { /* best-effort */ }
                }
              });
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

  // Phase 6+ — debounced cloud sync of the memory graph (decisions, dismissed, care, monthly).
  useEffect(() => {
    if (!account) return;
    const timer = window.setTimeout(() => {
      void saveCloudGraph(createClient(), account.id, {
        decisions,
        notToday: [...dismissed],
        careDismissed: [...careDismissed],
        monthlyShown: (() => { try { return window.localStorage.getItem(monthlyShownKey) ?? undefined; } catch { return undefined; } })(),
        weaves: loadWeaveCache(),
      }).catch((error: unknown) => console.error("Life on Paper graph sync failed", error));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [account, decisions, dismissed, careDismissed]);

  const completeOnboarding = (title: string) => {
    window.localStorage.setItem("life-in-books-onboarding-complete", "yes");
    window.localStorage.setItem("life-in-books-book-title", title);
    setBookTitle(title);
    setShowOnboarding(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  const showToday = () => {
    setActive("Today");
    setMemorySeed("");
    setMemoryPrompt("");
    setNotice(null);
    scrollTop();
  };

  const openMemory = (mode: CaptureMode = "Write", seed = "", prompt = "") => {
    setMemoryMode(mode);
    setMemorySeed(seed);
    setMemoryPrompt(prompt);
    setActive("Add Memory");
    setNotice(null);
    scrollTop();
  };

  const openLibraryAt = (view: "shelf" | "book" | "reader" | "search", pageId?: string) => {
    setLibraryEntry(view);
    setLibraryPage(view === "reader" ? pageId : undefined);
    setActive("Story");
    setNotice(null);
    scrollTop();
  };

  const selectDestination = (destination: Destination) => {
    setNotice(null);
    if (destination === "Today") return showToday();
    if (destination === "Story") return openLibraryAt("shelf");
    if (destination === "People") {
      setActive("People");
      scrollTop();
    }
  };

  const focusTodayComposer = () => {
    if (active !== "Today") showToday();
    setComposeSignal((current) => current + 1);
  };

  const chooseTodayLines = () => {
    setAddOpen(false);
    focusTodayComposer();
  };

  const chooseCraftMemory = () => {
    setAddOpen(false);
    const question = starterQuestions[starterQuestionIndex];
    setStarterQuestionIndex((current) => (current + 1 + Math.floor(Math.random() * (starterQuestions.length - 1))) % starterQuestions.length);
    openMemory("Write", "", question.question);
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

  // Phase 4 — memory tutor: ask only at genuine forks, at most once a week.
  const currentWeek = isoWeekKey(new Date());
  const tutorQuestions = active === "Today" ? detectTutorQuestions(savedPages, decisions) : [];
  const showTutor = active === "Today" && tutorQuestions.length > 0 && tutorWeek !== currentWeek;

  function markTutorWeek() {
    setTutorWeek(currentWeek);
    try { window.localStorage.setItem(tutorWeekKey, currentWeek); } catch { /* best-effort */ }
  }

  const tutorAnswer = (question: TutorQuestion, answer: "yes" | "no" | "not-sure") => {
    setDecisions((current) => {
      const next: MemoryDecisions = {
        ...current,
        answered: { ...(current.answered ?? {}), [question.key]: answer },
      };
      if (question.kind === "split" && answer === "no") {
        const dash = question.key.replace(/^split-/, "");
        next.split = { ...(next.split ?? {}), [dash]: ["a", "b"] };
      }
      if (question.kind === "membership" && answer === "yes" && question.meta.groupKey && question.meta.personKey) {
        const members = next.groupMembers?.[question.meta.groupKey] ?? [];
        next.groupMembers = { ...(next.groupMembers ?? {}), [question.meta.groupKey]: [...members, question.meta.personKey] };
      }
      persistMemoryDecisions(next);
      return next;
    });
    markTutorWeek();
  };

  const tutorDismiss = () => markTutorWeek();

  const surfacingCandidate = active === "Today" ? kindCandidate(savedPages, dismissed) : null;
  const dismissNotToday = (pageId: string) => {
    setDismissed((current) => {
      const next = new Set(current);
      next.add(pageId);
      persistDismissedIds(next);
      return next;
    });
  };

  const careCard = useMemo<{ kind: CareKind } | null>(() => {
    if (active !== "Today") return null;
    const texts = savedPages.map((page) => [page.originalText, page.body.join(" ")].join(" "));
    if (texts.some((text) => detectAcuteSignal(text)) && !careDismissed.has("acute")) return { kind: "acute" };
    if (detectSustainedHeaviness(savedPages) && !careDismissed.has("checkin")) return { kind: "checkin" };
    return null;
  }, [active, savedPages, careDismissed]);

  const dismissCare = (kind: CareKind) => {
    setCareDismissed((current) => {
      const next = new Set(current);
      next.add(kind);
      persistCareDismissed(next);
      return next;
    });
  };

  const [monthlyAck, setMonthlyAck] = useState(false);
  const monthlyCard = (!monthlyAck && active === "Today" && shouldShowMonthly(savedPages)) ? thisMonthSummary(savedPages) : null;
  const dismissMonthly = () => {
    setMonthlyAck(true);
    markMonthlyShown();
  };

  // Phase 1 — daily lines become pages instantly (silent cloud sync) and then
  // receive a best-effort, invisible AI upgrade when the engine is available.
  const addDailyPage = (page: KeptPage) => {
    setSavedPages((current) => {
      const next = [page, ...current.filter((item) => item.id !== page.id)];
      window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
      return next;
    });
    if (!account) return;
    void saveCloudPage(createClient(), account.id, bookTitle, page, page.emotions)
      .then((cloudId) => {
        setSavedPages((current) => {
          const next = current.map((item) => item.id === page.id ? { ...item, cloudId } : item);
          window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
          return next;
        });
      })
      .catch((error: unknown) => console.error("Life on Paper daily page cloud save failed", error));
  };

  const patchDailyPage = (updated: KeptPage) => {
    setSavedPages((current) => {
      const next = current.map((item) => item.id === updated.id ? updated : item);
      window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
      return next;
    });
    if (!account) return;
    void saveCloudPage(createClient(), account.id, bookTitle, updated, updated.emotions)
      .then((cloudId) => {
        setSavedPages((current) => {
          const next = current.map((item) => item.id === updated.id ? { ...item, cloudId } : item);
          window.localStorage.setItem("life-in-books-pages", JSON.stringify(next));
          return next;
        });
      })
      .catch((error: unknown) => console.error("Life on Paper daily page AI upgrade sync failed", error));
  };

  // A kept sound: attach it to today's page when there is one, otherwise the
  // recording *is* the day's page (a wordless day is still a day), with one
  // factual contextual line rather than any invented writing.
  const keepSound = (keepsake: Keepsake, line: string) => {
    const today = new Date().toDateString();
    const existing = savedPages.find((page) => page.createdAt && new Date(page.createdAt).toDateString() === today);
    if (existing) {
      const updated: KeptPage = { ...existing, keepsakes: [...(existing.keepsakes ?? []), keepsake.id] };
      patchDailyPage(updated);
      return;
    }
    let page: KeptPage;
    try {
      page = composeDailyEntry(line);
    } catch {
      return;
    }
    page = { ...page, title: "A sound I wanted to keep", keepsakes: [keepsake.id], people: [] };
    addDailyPage(page);
  };

  const saveDailyEntry = (text: string) => {
    let page: KeptPage;
    try {
      page = composeDailyEntry(text);
    } catch {
      return;
    }
    addDailyPage(page);
    const attemptUpgrade = (attempt: number) => {
      void upgradeKeptPageWithAi(page).then((upgraded) => {
        if (upgraded) {
          patchDailyPage(upgraded);
          return;
        }
        if (attempt < 3) window.setTimeout(() => attemptUpgrade(attempt + 1), 1800);
      });
    };
    attemptUpgrade(0);
  };

  // Marketing demo carry-over: the words a visitor typed on the landing page
  // become their first real entry instead of being thrown away, so the demo
  // doubles as onboarding and there is no cold start. See growth-strategy.md §3.1.
  useEffect(() => {
    const adopt = window.setTimeout(() => {
      let seed: string | null = null;
      try {
        seed = window.localStorage.getItem(DEMO_SEED_KEY);
        if (!seed) return;
        window.localStorage.removeItem(DEMO_SEED_KEY);
      } catch {
        return;
      }
      if (seed.trim()) saveDailyEntry(seed);
    }, 0);
    return () => window.clearTimeout(adopt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberate one-shot on mount
  }, []);

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

  const shellVisible = !isReading && active !== "Add Memory";

  return (
    <>
    <main className={active === "Add Memory" ? "home-app home-app--memory" : isReading ? "home-app home-app--reading" : "home-app"}>
      {active === "Add Memory" ? (
        <MemoryInterview
          key={`${memoryMode}-${memorySeed}-${memoryPrompt}`}
          initialMode={memoryMode}
          initialMemory={memorySeed}
          starterPrompt={memoryPrompt}
          onBack={showToday}
          onPageKept={keepPageInLibrary}
          onOpenLibrary={() => openLibraryAt("book")}
        />
      ) : active === "Story" ? (
        <LibraryExperience
          key={`${libraryEntry}-${libraryPage ?? "first"}`}
          savedPages={savedPages}
          bookTitle={bookTitle}
          initialView={libraryEntry}
          initialPageId={libraryPage}
          onReadingChange={setIsReading}
          onAddMemory={chooseCraftMemory}
          syncState={syncState}
          onCommitPages={commitLibraryPages}
          onDeletePage={removeLibraryPage}
        />
      ) : active === "People" ? (
        <PeopleExperience
          pages={savedPages}
          decisions={decisions}
          onWrite={focusTodayComposer}
          onOpenPage={(pageId) => openLibraryAt("reader", pageId)}
        />
      ) : (
        <TodayExperience
          account={account}
          bookTitle={bookTitle}
          memoryCount={savedPages.length}
          latestPage={latestPage ?? null}
          authPending={authPending}
          authError={authError}
          onGoogleSignIn={signInWithGoogle}
          onSignOut={signOut}
          onCraftMemory={chooseCraftMemory}
          onSaveDaily={saveDailyEntry}
          onKeepSound={keepSound}
          onPhotoCapture={() => openMemory("Photo")}
          onOpenLibrary={(pageId) => openLibraryAt("reader", pageId)}
          composeSignal={composeSignal}
          monthlyCard={monthlyCard}
          onDismissMonthly={dismissMonthly}
          careCard={careCard}
          onDismissCare={dismissCare}
          surfacingCandidate={surfacingCandidate}
          onOpenSurfacing={(pageId) => openLibraryAt("reader", pageId)}
          onDismissSurfacing={dismissNotToday}
          showTutor={showTutor}
          tutorQuestions={tutorQuestions}
          onTutorAnswer={tutorAnswer}
          onTutorDismiss={tutorDismiss}
        />
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

    <AnimatePresence>
      {addOpen ? (
        <AddMomentSheet
          onClose={() => setAddOpen(false)}
          onTodayLines={chooseTodayLines}
          onCraftMemory={chooseCraftMemory}
        />
      ) : null}
    </AnimatePresence>

    {shellVisible ? (
      <NavShell
        active={active}
        onSelect={selectDestination}
        onAdd={() => setAddOpen(true)}
        onSearch={() => openLibraryAt("search")}
      />
    ) : null}
    </>
  );
}
