"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpenText,
  CaretRight,
  ImageSquare,
  Microphone,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AccountSummary } from "@/lib/supabase/account";
import type { KeptPage } from "@/components/system/memory-interview";
import type { TutorQuestion } from "@/components/system/people-intel";
import { careResources, type CareKind } from "@/components/system/tone";
import { useLiveTranscription, type LiveTranscriptionLanguage } from "@/components/system/use-live-transcription";
import { KeepsakePlayer } from "@/components/system/keepsake-player";
import type { StoryForming } from "@/components/system/first-week";
import { useKeepsakeRecorder } from "@/components/system/use-keepsake-recorder";
import { formatDuration, keepsakeLine, listKeepsakes, type Keepsake } from "@/components/system/keepsakes";
import { Waveform } from "@phosphor-icons/react";
import type { MonthlySummary } from "@/components/system/monthly";
import { ProfileExperience } from "@/components/system/profile-experience";
import { useHistoryLayer } from "@/lib/use-history-layer";
import { HabitNudge, shouldShowHabitNudge } from "@/components/system/habit-panel";

const draftKey = "life-on-paper-today-draft";

/** The first printable book — a slim volume. Progress toward it, never a streak. */
const FIRST_BOOK_PAGES = 30;
/** From here a PDF of what exists so far is worth offering. */
const PDF_OFFER_PAGES = 7;

function pageMillis(page: KeptPage) {
  const time = Date.parse(page.createdAt ?? page.date);
  return Number.isNaN(time) ? 0 : time;
}
const paperEase = [0.22, 0.72, 0.26, 1] as const;

const dailyQuestions = [
  "What made today different?",
  "What's one small moment from today worth keeping?",
  "Who crossed your mind today — and why?",
  "What did today teach you, even a little?",
  "Where did you find ease today?",
  "What would you want to remember about today in a year?",
  "Aaj ka ek chhota sa pal jo yaad rakhna chahiye?",
  "What felt heavy today — and what lifted it?",
  "What are you quietly looking forward to?",
  "Whose words stayed with you today?",
  "Aaj kis baat ne tujhe hasa diya?",
] as const;

function dailyQuestion() {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return dailyQuestions[dayIndex % dailyQuestions.length];
}

export function TodayExperience({
  account,
  bookTitle,
  memoryCount,
  latestPage,
  pages,
  onOpenStory,
  authPending,
  authError,
  syncState = "device",
  onGoogleSignIn,
  onSignOut,
  onCraftMemory,
  onSaveDaily,
  onKeepSound,
  onOpenLibrary,
  storyForming,
  onOpenWeaves,
  composeSignal,
  monthlyCard,
  onDismissMonthly,
  careCard,
  onDismissCare,
  surfacingCandidate,
  onOpenSurfacing,
  onDismissSurfacing,
  showTutor,
  tutorQuestions,
  onTutorAnswer,
  onTutorDismiss,
}: {
  account: AccountSummary | null;
  bookTitle: string;
  memoryCount: number;
  latestPage: KeptPage | null;
  pages: KeptPage[];
  onOpenStory: () => void;
  authPending: boolean;
  authError: string | null;
  syncState?: "device" | "syncing" | "synced" | "error";
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onCraftMemory: () => void;
  onSaveDaily: (text: string, photo?: string) => void;
  onKeepSound: (keepsake: Keepsake, line: string) => void;
  onOpenLibrary: (pageId: string) => void;
  storyForming: StoryForming | null;
  onOpenWeaves: () => void;
  composeSignal: number;
  monthlyCard: MonthlySummary | null;
  onDismissMonthly: () => void;
  careCard: { kind: CareKind } | null;
  onDismissCare: (kind: CareKind) => void;
  surfacingCandidate: KeptPage | null;
  onOpenSurfacing: (pageId: string) => void;
  onDismissSurfacing: (pageId: string) => void;
  showTutor: boolean;
  tutorQuestions: TutorQuestion[];
  onTutorAnswer: (question: TutorQuestion, answer: "yes" | "no" | "not-sure") => void;
  onTutorDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(() => {
    try {
      return window.localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const [showProfile, setShowProfile] = useState(false);
  useHistoryLayer(showProfile, () => setShowProfile(false), "profile");
  const [whisperMsg, setWhisperMsg] = useState<string | null>(null);
  const justSavedRef = useRef(false);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [dictationLang, setDictationLang] = useState<LiveTranscriptionLanguage>("en-IN");
  const [micError, setMicError] = useState<string | null>(null);
  const { interimTranscript, isListening, isSupported, start: startDictation, stop: stopDictation } = useLiveTranscription({
    value: draft,
    onChange: setDraft,
    onError: setMicError,
    language: dictationLang,
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // A photo stays on Today: it joins the lines being written and goes into
  // the page when it's shaped, instead of opening a separate flow.
  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMicError("That file isn't a photo. Try a JPG or PNG.");
      return;
    }
    setMicError(null);
    setPhotoBusy(true);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch {
      setMicError("That photo couldn't be opened. Try another one.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const [keepsakes, setKeepsakes] = useState<Keepsake[]>([]);
  const { isRecording, elapsedMs, start: startRecording, stop: stopRecording } = useKeepsakeRecorder({
    onSaved: (keepsake) => {
      setKeepsakes((current) => [keepsake, ...current]);
      onKeepSound(keepsake, keepsakeLine(keepsake));
    },
    onError: setMicError,
  });

  // Show the recordings attached to the most recent page.
  useEffect(() => {
    let cancelled = false;
    const ids = latestPage?.keepsakes ?? [];
    // Deferred a frame so the effect never sets state synchronously on mount.
    const frame = window.requestAnimationFrame(() => {
      if (!ids.length) {
        setKeepsakes([]);
        return;
      }
      void listKeepsakes().then((all) => {
        if (cancelled) return;
        setKeepsakes(all.filter((item) => ids.includes(item.id)));
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [latestPage?.id, latestPage?.keepsakes]);

  useEffect(() => {
    if (composeSignal > 0) composerRef.current?.focus();
  }, [composeSignal]);

  // Whether to suggest a daily reminder (read after mount: it lives in localStorage).
  const [showHabit, setShowHabit] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShowHabit(shouldShowHabitNudge(memoryCount)));
    return () => window.cancelAnimationFrame(frame);
  }, [memoryCount]);

  // Opened from a reminder or a home-screen shortcut: ?write=1 puts the cursor
  // in the field, ?speak=1 starts listening. The flag is then dropped from the
  // address so a refresh doesn't repeat it.
  useEffect(() => {
    const url = new URL(window.location.href);
    const write = url.searchParams.has("write");
    const speak = url.searchParams.has("speak");
    if (!write && !speak && !url.searchParams.has("source")) return;
    // Acts (and clears the flag) only once this screen has settled, so a
    // quick remount on arrival doesn't swallow it.
    const timer = window.setTimeout(() => {
      url.searchParams.delete("write");
      url.searchParams.delete("speak");
      url.searchParams.delete("source");
      window.history.replaceState(window.history.state, "", url);
      composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (speak && isSupported) startDictation();
      else if (write) composerRef.current?.focus();
    }, 350);
    return () => window.clearTimeout(timer);
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the browser (native dictation, autofill, an extension) writes into the
  // field without React seeing it, state and DOM diverge — which used to leave
  // "Shape into a page" disabled even though text was visible. Keep them in
  // sync while listening, and once more when listening stops.
  const syncDraftFromField = () => {
    const fieldValue = composerRef.current?.value ?? "";
    if (fieldValue !== draft) setDraft(fieldValue);
  };

  useEffect(() => {
    if (!isListening) return;
    const timer = window.setInterval(syncDraftFromField, 500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, draft]);

  useEffect(() => {
    if (!latestPage || !justSavedRef.current) return;
    const person = latestPage.people?.[0];
    setWhisperMsg(person ? `Saved. I noticed ${person} — I'll remember them.` : "Saved to your book.");
    setJustSavedId(latestPage.id);
    setShowOriginal(false);
    justSavedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestPage?.id]);

  useEffect(() => {
    if (!whisperMsg) return;
    const timer = window.setTimeout(() => setWhisperMsg(null), 3000);
    return () => window.clearTimeout(timer);
  }, [whisperMsg]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (draft.trim()) window.localStorage.setItem(draftKey, draft);
        else window.localStorage.removeItem(draftKey);
      } catch {
        // Draft autosave is best-effort.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft]);

  // The field grows with the writing, and follows dictated words to the end.
  useEffect(() => {
    const field = composerRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
    if (isListening && document.activeElement !== field) field.scrollTop = field.scrollHeight;
  }, [draft, isListening]);

  const toggleDictation = () => {
    if (isListening) {
      stopDictation();
      return;
    }
    setMicError(null);
    if (!isSupported) {
      setMicError("Live dictation isn't available in this browser. You can still type your lines.");
      return;
    }
    if (isRecording) stopRecording();
    startDictation();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    setMicError(null);
    if (isListening) stopDictation();
    void startRecording();
  };

  const shapeIntoPage = () => {
    // Words still being spoken are kept, not dropped.
    const text = (stopDictation() ?? draft).trim();
    if (!text) return;
    setDraft("");
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // Best-effort cleanup.
    }
    onSaveDaily(text, photo ?? undefined);
    setPhoto(null);
    justSavedRef.current = true;
  };

  const recentPages = useMemo(
    () => [...pages].sort((a, b) => pageMillis(b) - pageMillis(a)).slice(0, 3),
    [pages],
  );
  const today = new Date().toDateString();
  const wroteToday = pages.some((page) => page.createdAt && new Date(page.createdAt).toDateString() === today);
  const justSaved = justSavedId ? pages.find((page) => page.id === justSavedId) ?? null : null;
  const bookProgress = Math.min(1, memoryCount / FIRST_BOOK_PAGES);
  const todayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  // One suggestion at a time, so Today stays a writing page rather than a
  // feed. Care always comes first.
  const nudge: "care" | "chapter" | "tutor" | "monthly" | "forming" | "surfacing" | "backup" | "habit" | null =
    careCard ? "care"
      : showHabit ? "habit"
      : storyForming?.chapterReady ? "chapter"
        : showTutor && tutorQuestions.length ? "tutor"
          : monthlyCard ? "monthly"
            : storyForming && storyForming.momentsNeeded > 0 ? "forming"
              : surfacingCandidate ? "surfacing"
                : !account && memoryCount >= 3 ? "backup"
                  : null;

  const initials = account
    ? account.name
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toLocaleUpperCase()
    : "";

  if (showProfile) {
    return (
      <ProfileExperience
        account={account}
        bookTitle={bookTitle}
        memoryCount={memoryCount}
        authPending={authPending}
        authError={authError}
        syncState={syncState}
        onGoogleSignIn={onGoogleSignIn}
        onSignOut={onSignOut}
        onBack={() => setShowProfile(false)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6 lg:max-w-3xl">
      <header className="today-header">
        <div>
          <Link href="/" className="today-wordmark block text-inherit no-underline" aria-label="Life on Paper — home">Life on Paper</Link>
          <small className="today-tagline">A few lines a day. A book of your life.</small>
        </div>
        <div className="today-header__actions">
        {!account ? (
          <button
            type="button"
            className="today-signin"
            onClick={onGoogleSignIn}
            disabled={authPending}
            aria-label="Sign in with Google"
          >
            {authPending ? "Opening…" : "Sign in"}
          </button>
        ) : null}
        <button
          type="button"
          className="today-avatar"
          aria-label="Profile"
          title="Profile — account & privacy"
          onClick={() => setShowProfile(true)}
        >
          {account?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="today-avatar__image" />
          ) : (
            <span className="today-avatar__fallback" aria-hidden="true">
              {account ? initials : <UserCircle size={20} weight="regular" />}
            </span>
          )}
        </button>
        </div>
      </header>

      {memoryCount > 0 ? (
        <div className="today-progress" aria-label="Your book so far">
          <div className="today-progress__row">
            <span>
              {memoryCount} {memoryCount === 1 ? "page" : "pages"} in <em>{bookTitle}</em>
            </span>
            {memoryCount < FIRST_BOOK_PAGES ? (
              <span className="today-progress__goal">Your first book at {FIRST_BOOK_PAGES}</span>
            ) : (
              <Link href="/book" className="today-progress__link">Your first book is ready — download it</Link>
            )}
          </div>
          <div className="today-progress__bar" aria-hidden="true">
            <span style={{ width: `${Math.max(3, bookProgress * 100)}%` }} />
          </div>
          {memoryCount >= PDF_OFFER_PAGES && memoryCount < FIRST_BOOK_PAGES ? (
            <Link href="/book" className="today-progress__pdf">Download what you have so far as a PDF</Link>
          ) : null}
        </div>
      ) : null}

      {wroteToday && !justSaved ? (
        <p className="today-done" role="status">
          <span aria-hidden="true">✓</span> Today’s page is in your book. Anything else worth keeping?
        </p>
      ) : null}

      {memoryCount === 0 ? (
        <motion.p
          className="today-beginning"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: paperEase }}
        >
          Your book begins with a few lines a day.
        </motion.p>
      ) : null}

      <p className="today-date">{todayLabel}</p>

      <section className="today-composer" aria-label="Write today's lines">
        <label className="sr-only" htmlFor="today-lines">Today&rsquo;s lines</label>
        <textarea
          id="today-lines"
          ref={composerRef}
          rows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onInput={(event) => setDraft((event.target as HTMLTextAreaElement).value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isListening) {
              event.preventDefault();
              stopDictation();
            }
          }}
          placeholder={photo ? "What's the story behind this photo?" : wroteToday ? "Anything else from today?" : dailyQuestion()}
          className="today-composer__field"
        />
        {photo || photoBusy ? (
          <figure className="today-photo">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="The photo for this page" />
            ) : (
              <span className="today-photo__loading" aria-live="polite">Adding your photo…</span>
            )}
            {photo ? (
              <button type="button" className="today-photo__remove" onClick={() => setPhoto(null)} aria-label="Remove the photo">
                <X size={14} weight="bold" aria-hidden="true" />
              </button>
            ) : null}
            {photo && !draft.trim() ? <figcaption>Add a line or two about it, then shape it into a page.</figcaption> : null}
          </figure>
        ) : null}
        <footer className="today-composer__footer">
          <span className="today-composer__tools">
            <button
              type="button"
              className={isListening ? "today-mic today-mic--listening" : "today-mic"}
              onClick={toggleDictation}
              aria-label={isListening ? "Stop dictation" : "Speak your lines"}
              aria-pressed={isListening}
              title={isListening ? "Stop dictation" : "Speak your lines"}
            >
              <Microphone size={19} weight={isListening ? "fill" : "regular"} aria-hidden="true" />
              <span className="today-tool__label">{isListening ? "Stop" : "Speak"}</span>
            </button>
            <button
              type="button"
              className={isRecording ? "today-record today-record--on" : "today-record"}
              onClick={toggleRecording}
              aria-label={isRecording ? "Stop keeping this sound" : "Keep a sound"}
              aria-pressed={isRecording}
              title={isRecording ? "Stop keeping this sound" : "Keep a sound — a voice, laughter, the rain"}
            >
              <Waveform size={19} weight={isRecording ? "bold" : "regular"} aria-hidden="true" />
              <span className="today-tool__label">{isRecording ? "Stop" : "Record"}</span>
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              aria-label={photo ? "Change the photo" : "Add a photo"}
              title={photo ? "Change the photo" : "Add a photo"}
              disabled={photoBusy}
            >
              <ImageSquare size={19} weight={photo ? "fill" : "regular"} aria-hidden="true" />
              <span className="today-tool__label">Photo</span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                void choosePhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </span>
          <button type="button" className="today-composer__action" onClick={shapeIntoPage} disabled={!draft.trim() && !interimTranscript}>
            Shape into a page
          </button>
        </footer>

        {isListening ? (
          <div className={interimTranscript ? "today-listening today-listening--hearing" : "today-listening"} role="status">
            <span className="today-listening__bars" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="today-listening__label">{interimTranscript ? "Hearing you" : "Listening"}</span>
            <em>
              {draft.trim()
                ? "Pause whenever you like. Say \u201cfull stop\u201d or \u201cnew paragraph\u201d."
                : "Speak naturally \u2014 your words appear above as you talk."}
            </em>
            <button type="button" className="today-listening__done" onClick={() => stopDictation()}>Done</button>
          </div>
        ) : null}

        {isRecording ? (
          <div className="today-listening today-listening--record" role="status" aria-live="polite">
            <span className="today-listening__dot" aria-hidden="true" />
            <span className="today-listening__label">Keeping this sound</span>
            <em>{formatDuration(elapsedMs)}</em>
            <button type="button" className="today-listening__done" onClick={() => stopRecording()}>Done</button>
          </div>
        ) : null}

        {keepsakes.length ? (
          <div className="today-keepsakes">
            {keepsakes.map((keepsake) => <KeepsakePlayer key={keepsake.id} keepsake={keepsake} />)}
          </div>
        ) : null}

        <div className="today-dictation">
          <div className="today-dictation__langs" role="group" aria-label="Language you speak in">
            <span className="today-dictation__label">Speaking in</span>
            <button type="button" className={dictationLang === "en-IN" ? "is-active" : ""} onClick={() => setDictationLang("en-IN")} aria-pressed={dictationLang === "en-IN"}>English</button>
            <button type="button" className={dictationLang === "hi-IN" ? "is-active" : ""} onClick={() => setDictationLang("hi-IN")} aria-pressed={dictationLang === "hi-IN"}>हिंदी</button>
          </div>
          {micError ? <p className="today-mic-error" role="alert">{micError}</p> : null}
        </div>

        <p className="today-composer__note">Saved on this device as you write.</p>
      </section>

      {!draft.trim() && !justSaved ? (
        <button type="button" className="today-guide" onClick={onCraftMemory}>
          Not sure what to write? I&rsquo;ll ask you a few questions <CaretRight size={13} weight="bold" aria-hidden="true" />
        </button>
      ) : null}

      <AnimatePresence>
        {justSaved ? (
          <motion.section
            key={justSaved.id}
            className="today-new-page"
            aria-label="Your new page"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
          >
            <header className="today-new-page__header">
              <p>Just added to your book · {justSaved.chapterTitle || justSaved.volume}</p>
              <button type="button" onClick={() => setJustSavedId(null)} aria-label="Close the new page">×</button>
            </header>
            <h2 className="today-new-page__title">{justSaved.title}</h2>
            {justSaved.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="today-new-page__photo" src={justSaved.photo} alt="The photo on this page" />
            ) : null}
            {showOriginal ? (
              <p className="today-new-page__raw">{justSaved.originalText || justSaved.body.join(" ")}</p>
            ) : (
              <div className="today-new-page__body">
                {justSaved.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
            <footer className="today-new-page__footer">
              <button type="button" onClick={() => setShowOriginal((current) => !current)}>
                {showOriginal ? "See the page" : "See what you wrote"}
              </button>
              <button type="button" onClick={() => onOpenLibrary(justSaved.id)}>
                Read it in your book <CaretRight size={13} weight="bold" aria-hidden="true" />
              </button>
            </footer>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {whisperMsg ? (
          <motion.p
            key="saved"
            className="today-saved"
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: paperEase }}
          >
            {whisperMsg}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {nudge === "forming" && storyForming ? (
        <section className="forming-card" role="region" aria-label="Your story is forming">
          <header className="forming-card__header">
            <p>Your story is forming</p>
          </header>
          <p className="forming-card__body">
            {storyForming.threads.length
              ? <>I&rsquo;ve noticed {storyForming.threads.map((thread) => thread.label).join(", ")} appearing more than once.</>
              : <>A few more lines and patterns will start to appear.</>}
          </p>
          {storyForming.threads.length ? (
            <div className="forming-card__threads">
              {storyForming.threads.map((thread) => (
                <span key={thread.label}>{thread.label} · {thread.count}</span>
              ))}
            </div>
          ) : null}
          <p className="forming-card__next">
            {storyForming.momentsNeeded === 1
              ? "One more moment this week and I'll weave your first chapter."
              : `${storyForming.momentsNeeded} more moments this week and I'll weave your first chapter.`}
          </p>
        </section>
      ) : null}

      {nudge === "chapter" && storyForming ? (
        <section className="forming-card forming-card--ready" role="region" aria-label="Your first chapter is ready">
          <header className="forming-card__header">
            <p>Your first chapter is ready</p>
          </header>
          <p className="forming-card__body">
            This week has enough moments to read as one story &mdash; gathered from your own words.
          </p>
          <button type="button" className="forming-card__action" onClick={onOpenWeaves}>
            Read your first woven week
          </button>
        </section>
      ) : null}

      {nudge === "monthly" && monthlyCard ? (
        <section className="monthly-card" role="region" aria-label={`Your month so far, ${monthlyCard.label}`}>
          <header className="monthly-card__header">
            <p>Your month, so far · {monthlyCard.label}</p>
            <button type="button" onClick={onDismissMonthly} aria-label="Not now">Not now</button>
          </header>
          <p className="monthly-card__body">
            You&rsquo;ve written {monthlyCard.count} {monthlyCard.count === 1 ? "moment" : "moments"} this month
            {monthlyCard.people.length ? ` — with ${monthlyCard.people.slice(0, 3).join(", ")}` : ""}. Your book is taking shape.
          </p>
          {monthlyCard.weeks > 1 ? <small className="monthly-card__meta">across {monthlyCard.weeks} woven weeks</small> : null}
        </section>
      ) : null}

      {nudge === "care" && careCard ? (
        <section className={`care-card${careCard.kind === "acute" ? " care-card--acute" : ""}`} role="region" aria-label={careCard.kind === "acute" ? "You're not alone" : "I'm here"}>
          <header className="care-card__header">
            <p>{careCard.kind === "acute" ? "You're not alone" : "I'm here."}</p>
            <button type="button" aria-label="Dismiss" onClick={() => onDismissCare(careCard.kind)}>×</button>
          </header>
          <div className="care-card__body">
            {careCard.kind === "acute" ? (
              <>
                <p>What you&rsquo;re carrying sounds like more than any one person should hold alone. Please reach out to someone who can be with you right now &mdash; here are real people who answer.</p>
                <div className="care-resources">
                  {careResources.map((resource) => (
                    <div key={resource.name} className="care-resource"><span>{resource.region} · {resource.name}</span><strong>{resource.number}</strong></div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p>I&rsquo;ve noticed you&rsquo;ve been writing about heavy things lately. I&rsquo;m here for all of it &mdash; and sometimes, when it gets too heavy to carry alone, talking to someone real can help.</p>
                {showResources ? (
                  <div className="care-resources">
                    {careResources.map((resource) => (
                      <div key={resource.name} className="care-resource"><span>{resource.region} · {resource.name}</span><strong>{resource.number}</strong></div>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="care-card__more" onClick={() => setShowResources(true)}>See places that can help</button>
                )}
              </>
            )}
          </div>
        </section>
      ) : null}

      {nudge === "habit" ? <HabitNudge onClose={() => setShowHabit(false)} /> : null}

      {nudge === "backup" ? (
        <section className="today-backup" aria-label="Back up your book">
          <div>
            <strong>Back up your book</strong>
            <p>Your {memoryCount} pages live only on this device. Sign in to keep a private copy you can open anywhere.</p>
          </div>
          <button type="button" onClick={onGoogleSignIn} disabled={authPending}>
            {authPending ? "Opening…" : "Sign in with Google"}
          </button>
        </section>
      ) : null}

      {nudge === "surfacing" && surfacingCandidate ? (
        <section className="surfacing-card" role="region" aria-label="A moment worth returning to">
          <header className="surfacing-card__header">
            <p>A moment worth returning to</p>
            <button type="button" onClick={() => onDismissSurfacing(surfacingCandidate.id)} aria-label="Not today">
              Not today
            </button>
          </header>
          <button type="button" className="surfacing-card__body" onClick={() => onOpenSurfacing(surfacingCandidate.id)}>
            <small>{surfacingCandidate.date}</small>
            <strong>{surfacingCandidate.title}</strong>
            <em>{surfacingCandidate.excerpt}</em>
          </button>
        </section>
      ) : null}

      {nudge === "tutor" ? (
        <section className="tutor-card" role="region" aria-label="A quick memory check">
          <header className="tutor-card__header">
            <p>A quick memory check</p>
            <button type="button" onClick={onTutorDismiss} aria-label="Dismiss">
              ×
            </button>
          </header>
          {tutorQuestions.map((question) => (
            <div key={question.key} className="tutor-card__question">
              <p>{question.prompt}</p>
              <span>
                <button type="button" onClick={() => onTutorAnswer(question, "yes")}>Yes</button>
                <button type="button" onClick={() => onTutorAnswer(question, "no")}>No</button>
                <button type="button" onClick={() => onTutorAnswer(question, "not-sure")}>Not sure</button>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {recentPages.length ? (
        <section className="today-recent" aria-label="Recent pages">
          <header className="today-recent__header">
            <p>Recent pages</p>
            <button type="button" onClick={onOpenStory}>
              Your whole book <CaretRight size={13} weight="bold" aria-hidden="true" />
            </button>
          </header>
          <ul>
            {recentPages.map((page) => (
              <li key={page.id}>
                <button type="button" onClick={() => onOpenLibrary(page.id)}>
                  <span className="today-recent__icon" aria-hidden="true">
                    <BookOpenText size={16} weight="regular" />
                  </span>
                  <span className="today-recent__copy">
                    <strong>{page.title}</strong>
                    <small>{page.date}</small>
                  </span>
                  <CaretRight size={14} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** Scales a photo down so a day's page stays light enough to keep on the device. */
function shrinkPhoto(file: File, maxSide = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) return reject(new Error("no canvas"));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    image.src = url;
  });
}
