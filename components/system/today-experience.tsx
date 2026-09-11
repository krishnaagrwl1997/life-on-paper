"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpenText,
  CaretRight,
  ImageSquare,
  Microphone,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { AccountSummary } from "@/lib/supabase/account";
import type { KeptPage } from "@/components/system/memory-interview";
import type { TutorQuestion } from "@/components/system/people-intel";
import { careResources, type CareKind } from "@/components/system/tone";
import { useLiveTranscription, type LiveTranscriptionLanguage } from "@/components/system/use-live-transcription";
import { KeepsakePlayer } from "@/components/system/keepsake-player";
import { useKeepsakeRecorder } from "@/components/system/use-keepsake-recorder";
import { formatDuration, keepsakeLine, listKeepsakes, type Keepsake } from "@/components/system/keepsakes";
import { Waveform } from "@phosphor-icons/react";
import type { MonthlySummary } from "@/components/system/monthly";
import { ProfileExperience } from "@/components/system/profile-experience";

const draftKey = "life-on-paper-today-draft";
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
  authPending,
  authError,
  onGoogleSignIn,
  onSignOut,
  onCraftMemory,
  onSaveDaily,
  onKeepSound,
  onPhotoCapture,
  onOpenLibrary,
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
  authPending: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onCraftMemory: () => void;
  onSaveDaily: (text: string) => void;
  onKeepSound: (keepsake: Keepsake, line: string) => void;
  onPhotoCapture: () => void;
  onOpenLibrary: (pageId: string) => void;
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
  const [whisperMsg, setWhisperMsg] = useState<string | null>(null);
  const justSavedRef = useRef(false);
  const [showResources, setShowResources] = useState(false);
  const [dictationLang, setDictationLang] = useState<LiveTranscriptionLanguage>("en-IN");
  const [micError, setMicError] = useState<string | null>(null);
  const { interimTranscript, isListening, isSupported, start: startDictation, stop: stopDictation } = useLiveTranscription({
    value: draft,
    onChange: setDraft,
    onError: setMicError,
    language: dictationLang,
  });

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

  const shapeIntoPage = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // Best-effort cleanup.
    }
    onSaveDaily(text);
    justSavedRef.current = true;
  };

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
        onGoogleSignIn={onGoogleSignIn}
        onSignOut={onSignOut}
        onBack={() => setShowProfile(false)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6">
      <header className="today-header">
        <div>
          <p className="today-wordmark">Life on Paper</p>
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
              {account ? initials : <BookOpenText size={18} weight="regular" />}
            </span>
          )}
        </button>
        </div>
      </header>

      {memoryCount === 0 ? (
        <motion.p
          className="today-beginning"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: paperEase }}
        >
          Your book begins with a few lines a day.
          <button type="button" className="today-beginning__craft" onClick={onCraftMemory}>
            Prefer guidance? Craft a memory <CaretRight size={13} weight="bold" aria-hidden="true" />
          </button>
        </motion.p>
      ) : null}

      <section className="today-composer" aria-label="Write today's lines">
        <label className="sr-only" htmlFor="today-lines">Today&rsquo;s lines</label>
        <textarea
          id="today-lines"
          ref={composerRef}
          rows={5}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onInput={(event) => setDraft((event.target as HTMLTextAreaElement).value)}
          placeholder={dailyQuestion()}
          className="today-composer__field"
        />
        <footer className="today-composer__footer">
          <span className="today-composer__tools">
            <button
              type="button"
              className={isListening ? "today-mic today-mic--listening" : "today-mic"}
              onClick={() => {
                if (isListening) {
                  stopDictation();
                  window.setTimeout(syncDraftFromField, 60);
                  return;
                }
                setMicError(null);
                if (!isSupported) {
                  setMicError("Live dictation isn't available in this browser. You can still type your lines.");
                  return;
                }
                startDictation();
              }}
              aria-label={isListening ? "Stop dictation" : "Speak your lines"}
              aria-pressed={isListening}
              title={isListening ? "Stop dictation" : "Speak your lines"}
            >
              <Microphone size={19} weight={isListening ? "fill" : "regular"} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={isRecording ? "today-record today-record--on" : "today-record"}
              onClick={() => (isRecording ? stopRecording() : void startRecording())}
              aria-label={isRecording ? "Stop keeping this sound" : "Keep a sound"}
              aria-pressed={isRecording}
              title={isRecording ? "Stop keeping this sound" : "Keep a sound — a voice, laughter, the rain"}
            >
              <Waveform size={19} weight={isRecording ? "bold" : "regular"} aria-hidden="true" />
            </button>
            <button type="button" onClick={onPhotoCapture} aria-label="Add a photo" title="Add a photo">
              <ImageSquare size={19} weight="regular" aria-hidden="true" />
            </button>
          </span>
          <button type="button" className="today-composer__action" onClick={shapeIntoPage} disabled={!draft.trim()}>
            Shape into a page
          </button>
        </footer>

        {isListening || interimTranscript ? (
          <div className="today-listening" role="status" aria-live="polite">
            <span className="today-listening__dot" aria-hidden="true" />
            <span className="today-listening__label">Listening{dictationLang === "hi-IN" ? " · हिंदी" : ""}</span>
            {interimTranscript ? <em>{interimTranscript}</em> : <em>Speak naturally — pauses are fine.</em>}
          </div>
        ) : null}

        {isRecording ? (
          <div className="today-listening today-listening--record" role="status" aria-live="polite">
            <span className="today-listening__dot" aria-hidden="true" />
            <span className="today-listening__label">Keeping this sound</span>
            <em>{formatDuration(elapsedMs)} — tap the wave to stop</em>
          </div>
        ) : null}

        {keepsakes.length ? (
          <div className="today-keepsakes">
            {keepsakes.map((keepsake) => <KeepsakePlayer key={keepsake.id} keepsake={keepsake} />)}
          </div>
        ) : null}

        <div className="today-dictation">
          <div className="today-dictation__langs" role="group" aria-label="Dictation language">
            <button type="button" className={dictationLang === "en-IN" ? "is-active" : ""} onClick={() => setDictationLang("en-IN")} aria-pressed={dictationLang === "en-IN"}>EN</button>
            <button type="button" className={dictationLang === "hi-IN" ? "is-active" : ""} onClick={() => setDictationLang("hi-IN")} aria-pressed={dictationLang === "hi-IN"}>हिं</button>
          </div>
          {micError ? <p className="today-mic-error" role="alert">{micError}</p> : null}
        </div>

        <p className="today-composer__note">Saved on this device as you write.</p>
      </section>

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

      {monthlyCard ? (
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

      {careCard ? (
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

      <button type="button" className="today-profile-row" onClick={() => setShowProfile(true)}>
        <span className="today-profile-row__icon" aria-hidden="true">
          <BookOpenText size={18} weight="regular" />
        </span>
        <span className="today-profile-row__copy">
          <strong>Your profile</strong>
          <small>{account ? `${account.name} · account & privacy` : "Sign in with Google · account & privacy"}</small>
        </span>
        <CaretRight size={16} weight="bold" aria-hidden="true" />
      </button>

      {surfacingCandidate ? (
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

      {showTutor && tutorQuestions.length ? (
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

      {latestPage ? (
        <button
          type="button"
          className="today-back-to-book"
          onClick={() => onOpenLibrary(latestPage.id)}
          aria-label={`Back to your book — ${latestPage.title}`}
        >
          <span className="today-back-to-book__icon" aria-hidden="true">
            <BookOpenText size={18} weight="regular" />
          </span>
          <span className="today-back-to-book__copy">
            <small>Back to your book</small>
            <strong>{latestPage.title}</strong>
            <em>{latestPage.excerpt}</em>
          </span>
          <CaretRight size={16} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
