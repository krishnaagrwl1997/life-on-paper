"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpenText, Check, Sparkle } from "@phosphor-icons/react";
import type { AccountSummary } from "@/lib/supabase/account";

type OnboardingExperienceProps = {
  onComplete: (bookTitle: string) => void;
  account: AccountSummary | null;
  authPending: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
};

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function OnboardingExperience({
  onComplete,
  account,
  authPending,
  authError,
  onGoogleSignIn,
}: OnboardingExperienceProps) {
  const [bookTitle, setBookTitle] = useState("The Life I’m Becoming");
  const reduceMotion = useReducedMotion();
  const finish = () => onComplete(bookTitle.trim() || "My Life In Books");

  return (
    <main className="onboarding-shell onboarding-shell--simple">
      <header className="onboarding-header onboarding-header--simple">
        <p className="onboarding-wordmark">Life In Books</p>
        <span>Your memoir begins here</span>
      </header>

      <motion.section
        className="onboarding-page onboarding-page--simple"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
      >
        <div className="onboarding-welcome onboarding-welcome--simple">
          <div className="onboarding-kicker"><Sparkle size={18} weight="fill" aria-hidden="true" /> A memoir made from conversation</div>
          <h1>Your life is already a book.</h1>
          <p className="onboarding-lede">Tell us one moment in your own words. We’ll ask only what helps, find where it belongs, and turn it into a page worth returning to.</p>

          <div className="onboarding-simple-grid">
            <div className="onboarding-hero onboarding-hero--simple">
              <Image src="/assets/current-book-cover.png" alt="An open notebook beside old photographs and tea" fill priority unoptimized sizes="(max-width: 700px) 100vw, 560px" />
              <div className="onboarding-hero-caption">
                <span>One moment at a time</span>
                <strong>Your story, beautifully remembered.</strong>
              </div>
            </div>

            <div className="onboarding-start-card">
              <div className="onboarding-kicker"><BookOpenText size={18} aria-hidden="true" /> Your first book</div>
              <label className="onboarding-title-field">
                <span>Give your book a working title</span>
                <input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} maxLength={52} />
                <small>You can change this anytime.</small>
              </label>

              {account ? (
                <div className="onboarding-signed-in" role="status">
                  <span><Check size={16} weight="bold" aria-hidden="true" /></span>
                  <div><strong>Signed in as {account.name}</strong><small>{account.email}</small></div>
                </div>
              ) : (
                <>
                  <button className="google-connect" type="button" onClick={onGoogleSignIn} disabled={authPending} aria-describedby="google-privacy-note">
                    <Image src="/assets/google-g.svg" alt="" width={20} height={20} unoptimized />
                    <span>{authPending ? "Opening Google…" : "Continue with Google"}</span>
                  </button>
                  <p className="google-privacy" id="google-privacy-note">Your book stays private. Nothing is posted or shared.</p>
                </>
              )}

              <button className="onboarding-next onboarding-next--primary" type="button" onClick={finish}>
                <span>{account ? "Start my first memory" : "Try it without an account"}</span>
                <ArrowRight size={22} aria-hidden="true" />
              </button>

              <AnimatePresence>
                {authError ? (
                  <motion.div
                    className="google-connection-note google-connection-note--error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
                    role="alert"
                  >
                    <strong>Google sign-in could not start.</strong>
                    <span>{authError}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
