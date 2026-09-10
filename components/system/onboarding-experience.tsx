"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpenText, Sparkle } from "@phosphor-icons/react";
import type { AccountSummary } from "@/lib/supabase/account";

type Step = "intro" | "glimpse" | "language" | "title";

const paperEase = [0.22, 0.72, 0.26, 1] as const;
const languageKey = "life-in-books-writing-language";

export function OnboardingExperience({
  onComplete,
  account,
  authPending,
  authError,
  onGoogleSignIn,
}: {
  onComplete: (bookTitle: string) => void;
  account: AccountSummary | null;
  authPending: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Step>("intro");
  const [bookTitle, setBookTitle] = useState("My Life on Paper");

  useEffect(() => {
    if (step !== "intro") return;
    const timer = window.setTimeout(() => setStep("glimpse"), reduceMotion ? 1200 : 4600);
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion]);

  const chooseLanguage = (value: string) => {
    try {
      window.localStorage.setItem(languageKey, value);
    } catch {
      // Best-effort.
    }
    setStep("title");
  };

  const finish = () => onComplete(bookTitle.trim() || "My Life on Paper");

  return (
    <main className="onboarding-new">
      <AnimatePresence mode="wait">
        {step === "intro" ? (
          <motion.section
            key="intro"
            className="ob-step ob-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: paperEase }}
          >
            <button type="button" className="ob-skip" onClick={() => setStep("glimpse")}>Skip</button>

            <motion.div
              className="ob-intro-scene"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: reduceMotion ? 0 : 0.55 } },
              }}
            >
              <p className="ob-kicker"><Sparkle size={16} weight="fill" aria-hidden="true" /> A life, becoming a book</p>

              <div className="ob-lines" aria-hidden="true">
                {["Aaj office me lambi meeting thi.", "Shaam ko ghar aake chai pi.", "Amma ne poocha, sab theek hai?"].map((line) => (
                  <motion.span
                    key={line}
                    className="ob-line"
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
                  >
                    {line}
                  </motion.span>
                ))}
              </div>

              <motion.span
                className="ob-chapter"
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
              >
                — The week everything changed
              </motion.span>

              <motion.p
                className="ob-weave"
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: reduceMotion ? 0 : 0.6, ease: paperEase }}
              >
                That week stretched long, but it ended warm — a quiet thread of small days.
              </motion.p>

              <motion.div
                className="ob-volume"
                variants={{ hidden: { scaleY: 0.05, opacity: 0 }, show: { scaleY: 1, opacity: 1 } }}
                transition={{ duration: reduceMotion ? 0 : 0.9, ease: paperEase }}
                aria-hidden="true"
              >
                <span>Volume One</span>
              </motion.div>
            </motion.div>

            <p className="ob-intro-caption">Write for ninety seconds a day. Get a book of your life.</p>
          </motion.section>
        ) : step === "glimpse" ? (
          <motion.section
            key="glimpse"
            className="ob-step ob-glimpse"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
          >
            <p className="ob-kicker"><BookOpenText size={16} aria-hidden="true" /> A sample life</p>
            <h1 className="ob-title">This is what your words become.</h1>
            <p className="ob-lede">A short, true book — woven from ordinary days, like yours will be.</p>

            <div className="ob-sample" aria-hidden="true">
              <div className="ob-sample-cover">
                <Image src="/assets/seaside-memory.png" alt="" fill priority unoptimized sizes="(max-width: 700px) 40vw, 200px" />
                <span>Book One</span>
                <div><small>A memoir in progress</small><strong>The Life I&rsquo;m Becoming</strong></div>
              </div>
              <div className="ob-sample-page">
                <small>A woven week</small>
                <p>&ldquo;The work kept me busy, but home was where I unwound.&rdquo;</p>
                <p>&ldquo;…and the week ended the way good weeks do: quietly, and warm.&rdquo;</p>
              </div>
            </div>

            <button type="button" className="ob-primary" onClick={() => setStep("language")}>
              Continue <ArrowRight size={20} aria-hidden="true" />
            </button>
          </motion.section>
        ) : step === "language" ? (
          <motion.section
            key="language"
            className="ob-step ob-language"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
          >
            <p className="ob-kicker">One small choice</p>
            <h1 className="ob-title">What language do you write in?</h1>
            <p className="ob-lede">Your book stays in the words you actually use — we just make them read well.</p>

            <div className="ob-langs">
              {[
                { value: "english", label: "English" },
                { value: "hindi", label: "Hindi" },
                { value: "hinglish", label: "Hinglish", note: "a natural mix" },
              ].map((option) => (
                <button key={option.value} type="button" className="ob-lang" onClick={() => chooseLanguage(option.value)}>
                  <span>{option.label}</span>
                  {option.note ? <small>{option.note}</small> : null}
                </button>
              ))}
            </div>

            {!account ? (
              <button type="button" className="ob-google-button" onClick={onGoogleSignIn} disabled={authPending}>
                <Image src="/assets/google-g.svg" alt="" width={20} height={20} unoptimized />
                <span>{authPending ? "Opening Google…" : "Sign in with Google"}</span>
              </button>
            ) : (
              <p className="ob-signed">Signed in as {account.name}</p>
            )}
            {authError ? <p className="ob-error" role="alert">{authError}</p> : null}
          </motion.section>
        ) : (
          <motion.section
            key="title"
            className="ob-step ob-title-step"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
          >
            <p className="ob-kicker"><Sparkle size={16} weight="fill" aria-hidden="true" /> Your first book</p>
            <h1 className="ob-title">Give it a working title.</h1>
            <p className="ob-lede">You can change this anytime.</p>

            <label className="ob-title-field">
              <span className="sr-only">Book title</span>
              <input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} maxLength={52} autoFocus />
            </label>

            <button type="button" className="ob-primary" onClick={finish}>
              Begin your book <ArrowRight size={20} aria-hidden="true" />
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
