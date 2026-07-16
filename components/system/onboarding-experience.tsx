"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Camera,
  Check,
  CloudCheck,
  Heart,
  LockKey,
  Microphone,
  Mountains,
  Notebook,
  Sparkle,
  Sun,
  TextT,
} from "@phosphor-icons/react";

type OnboardingExperienceProps = {
  onComplete: (bookTitle: string) => void;
};

type Choice = {
  id: string;
  label: string;
  detail: string;
  icon: typeof TextT;
};

const paperEase = [0.22, 0.72, 0.26, 1] as const;

const captureChoices: Choice[] = [
  { id: "write", label: "Write a few words", detail: "For details that arrive quietly", icon: TextT },
  { id: "speak", label: "Talk it through", detail: "Your voice becomes editable text", icon: Microphone },
  { id: "photo", label: "Begin with an image", detail: "Photos and screenshots can start the story", icon: Camera },
];

const themeChoices: Choice[] = [
  { id: "adventures", label: "Firsts & adventures", detail: "Travel, courage, and unfamiliar places", icon: Mountains },
  { id: "people", label: "People I love", detail: "The words, rituals, and people worth keeping", icon: Heart },
  { id: "small-wins", label: "Small wins", detail: "Kindness, appreciation, and ordinary joy", icon: Sun },
  { id: "lessons", label: "Lessons & turning points", detail: "What changed you, slowly or all at once", icon: Sparkle },
];

export function OnboardingExperience({ onComplete }: OnboardingExperienceProps) {
  const [step, setStep] = useState(0);
  const [captureMethods, setCaptureMethods] = useState<string[]>(["speak"]);
  const [themes, setThemes] = useState<string[]>(["small-wins"]);
  const [bookTitle, setBookTitle] = useState("The Life I’m Becoming");
  const [googleNotice, setGoogleNotice] = useState(false);
  const reduceMotion = useReducedMotion();

  const stepMeta = useMemo(() => `${String(step + 1).padStart(2, "0")} / 05`, [step]);

  const toggleChoice = (value: string, current: string[], update: (next: string[]) => void) => {
    update(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const finish = () => onComplete(bookTitle.trim() || "My Life In Books");

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <button
          className="onboarding-back"
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          aria-label="Go to the previous step"
          disabled={step === 0}
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <p className="onboarding-wordmark">Life In Books</p>
        <button className="onboarding-skip" type="button" onClick={finish}>Skip</button>
      </header>

      <div className="onboarding-progress" aria-label={`Step ${step + 1} of 5`}>
        <span style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          className="onboarding-page"
          key={step}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
        >
          <p className="onboarding-step">{stepMeta}</p>

          {step === 0 ? (
            <div className="onboarding-welcome">
              <div className="onboarding-kicker"><Sparkle size={18} weight="fill" aria-hidden="true" /> A memoir made from conversation</div>
              <h1>Your life is already a book.</h1>
              <p className="onboarding-lede">You don’t need to become a writer. Share a moment in your own words, and Life In Books will help shape it into a page worth returning to.</p>
              <div className="onboarding-hero">
                <Image src="/assets/current-book-cover.png" alt="An open notebook beside old photographs and tea" fill priority unoptimized sizes="(max-width: 700px) 100vw, 560px" />
                <div className="onboarding-hero-caption">
                  <span>One moment at a time</span>
                  <strong>Your story, beautifully remembered.</strong>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="onboarding-choice-step">
              <div className="onboarding-kicker"><Notebook size={18} aria-hidden="true" /> Begin naturally</div>
              <h1>How do memories find you?</h1>
              <p className="onboarding-lede">Choose as many as you like. You can use a different way every time.</p>
              <div className="onboarding-choice-list">
                {captureChoices.map((choice) => {
                  const selected = captureMethods.includes(choice.id);
                  const Icon = choice.icon;
                  return (
                    <button
                      key={choice.id}
                      className={selected ? "onboarding-choice is-selected" : "onboarding-choice"}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleChoice(choice.id, captureMethods, setCaptureMethods)}
                    >
                      <Icon size={25} weight={selected ? "fill" : "regular"} aria-hidden="true" />
                      <span><strong>{choice.label}</strong><small>{choice.detail}</small></span>
                      <span className="onboarding-check" aria-hidden="true">{selected ? <Check size={16} weight="bold" /> : null}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="onboarding-choice-step">
              <div className="onboarding-kicker"><Sparkle size={18} weight="fill" aria-hidden="true" /> Notice what matters</div>
              <h1>What would you like to remember more of?</h1>
              <p className="onboarding-lede">This helps us ask better questions. Nothing is fixed—you can follow any story.</p>
              <div className="onboarding-theme-grid">
                {themeChoices.map((choice) => {
                  const selected = themes.includes(choice.id);
                  const Icon = choice.icon;
                  return (
                    <button
                      key={choice.id}
                      className={selected ? "onboarding-theme is-selected" : "onboarding-theme"}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleChoice(choice.id, themes, setThemes)}
                    >
                      <Icon size={24} weight={selected ? "fill" : "regular"} aria-hidden="true" />
                      <strong>{choice.label}</strong>
                      <small>{choice.detail}</small>
                      <span className="onboarding-check" aria-hidden="true">{selected ? <Check size={15} weight="bold" /> : null}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="onboarding-book-step">
              <div className="onboarding-kicker"><BookOpenText size={18} aria-hidden="true" /> Your first book</div>
              <h1>Give this chapter of your life a name.</h1>
              <p className="onboarding-lede">It can change whenever your life does.</p>
              <label className="onboarding-title-field">
                <span>Book title</span>
                <input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} maxLength={52} />
              </label>
              <div className="onboarding-book-preview">
                <Image src="/assets/current-book-cover.png" alt="" fill unoptimized sizes="(max-width: 700px) 90vw, 520px" />
                <div>
                  <span>Book One</span>
                  <h2>{bookTitle.trim() || "My Life In Books"}</h2>
                  <p>Begins today</p>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="onboarding-account-step">
              <div className="onboarding-kicker"><LockKey size={18} aria-hidden="true" /> Keep your book safe</div>
              <h1>Take your book with you.</h1>
              <p className="onboarding-lede">Connect an account to continue your memoir on any device. Your memories stay private unless you choose to share them.</p>

              <div className="onboarding-account-card">
                <div className="onboarding-account-mark"><CloudCheck size={30} weight="duotone" aria-hidden="true" /></div>
                <div>
                  <span>Optional account</span>
                  <h2>{bookTitle.trim() || "My Life In Books"}</h2>
                  <p>Sync your book, preserve its pages, and return from any device.</p>
                </div>
              </div>

              <button className="google-connect" type="button" onClick={() => setGoogleNotice(true)} aria-describedby="google-privacy-note">
                <Image src="/assets/google-g.svg" alt="" width={20} height={20} unoptimized />
                <span>Continue with Google</span>
              </button>
              <p className="google-privacy" id="google-privacy-note">Nothing will be posted or shared.</p>

              <AnimatePresence>
                {googleNotice ? (
                  <motion.div
                    className="google-connection-note"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
                    role="status"
                  >
                    <strong>Google connection is the next technical step.</strong>
                    <span>OAuth credentials are needed before this can securely sign you in. You can continue as a guest for now.</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : null}
        </motion.section>
      </AnimatePresence>

      <footer className="onboarding-footer">
        <p>{step === 0 ? "No login needed to begin." : step === 3 ? "One last optional step." : step === 4 ? "You can connect an account later." : "You can change this later."}</p>
        <button
          className={step === 4 ? "onboarding-next onboarding-next--guest" : "onboarding-next"}
          type="button"
          onClick={() => step === 4 ? finish() : setStep((current) => current + 1)}
        >
          <span>{step === 0 ? "Begin" : step === 4 ? "Continue without account" : "Continue"}</span>
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </footer>
    </main>
  );
}
