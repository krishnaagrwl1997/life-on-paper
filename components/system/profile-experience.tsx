"use client";

import Image from "next/image";
import { ArrowLeft, BookOpenText, CloudCheck, CloudSlash, LockKey, SignOut } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { AccountSummary } from "@/lib/supabase/account";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function ProfileExperience({
  account,
  bookTitle,
  memoryCount,
  authPending,
  authError,
  syncState = "device",
  onGoogleSignIn,
  onSignOut,
  onBack,
}: {
  account: AccountSummary | null;
  bookTitle: string;
  memoryCount: number;
  authPending: boolean;
  authError: string | null;
  syncState?: "device" | "syncing" | "synced" | "error";
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onBack: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const initials = account
    ? account.name.split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 2).toLocaleUpperCase()
    : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-6">
      <button type="button" className="cast-back" onClick={onBack}>
        <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Back
      </button>

      <motion.div
        className="profile-screen"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: paperEase }}
      >
        <header className="profile-identity">
          {account?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="cast-avatar" />
          ) : (
            <span className="cast-avatar" aria-hidden="true">{account ? initials : <BookOpenText size={20} weight="regular" />}</span>
          )}
          <div>
            <p className="profile-eyebrow">Your profile</p>
            <h1 className="profile-name">{account ? account.name : "A private book"}</h1>
            {account?.email ? <p className="profile-email">{account.email}</p> : null}
          </div>
        </header>

        <section className="cast-section">
          <p className="section-label">Your book</p>
          <div className="profile-book-row">
            <BookOpenText size={18} weight="regular" aria-hidden="true" />
            <span><strong>{bookTitle}</strong><em>{memoryCount} {memoryCount === 1 ? "page" : "pages"} in progress</em></span>
          </div>
        </section>

        <section className="cast-section">
          <p className="section-label">Cloud backup</p>
          <div className={syncState === "synced" ? "profile-backup profile-backup--ok" : "profile-backup"}>
            {syncState === "synced" ? <CloudCheck size={16} weight="fill" aria-hidden="true" /> : <CloudSlash size={16} weight="regular" aria-hidden="true" />}
            <p>
              {syncState === "synced"
                ? "Backed up to your account. Your book opens on your other devices."
                : syncState === "syncing"
                  ? "Syncing your pages…"
                  : syncState === "error"
                    ? "Saved on this device. Backup will retry automatically."
                    : "Saved on this device only. Sign in to back up your book."}
            </p>
          </div>
        </section>

        <section className="cast-section">
          <p className="section-label">Account & privacy</p>
          {account ? (
            <button type="button" className="profile-signout" onClick={onSignOut} disabled={authPending}>
              <SignOut size={15} weight="bold" aria-hidden="true" />
              {authPending ? "Signing out…" : "Sign out"}
            </button>
          ) : (
            <div className="profile-connect">
              <button className="google-connect" type="button" onClick={onGoogleSignIn} disabled={authPending}>
                <Image src="/assets/google-g.svg" alt="" width={20} height={20} unoptimized />
                <span>{authPending ? "Opening Google…" : "Sign in with Google"}</span>
              </button>
              <p className="google-privacy">Sign in to keep your pages safe across devices and private to you.</p>
              {authError ? <p className="profile-error" role="alert">{authError}</p> : null}
            </div>
          )}
        </section>

        <section className="cast-section">
          <p className="section-label">Our promise</p>
          <div className="profile-privacy">
            <LockKey size={15} weight="fill" aria-hidden="true" />
            <p>Private by design. Your words are never used to train models, and never shared.</p>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
