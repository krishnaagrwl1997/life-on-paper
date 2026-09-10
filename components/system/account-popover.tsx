"use client";

import { BookOpenText, LockKey, SignOut } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import type { AccountSummary } from "@/lib/supabase/account";

const paperEase = [0.22, 0.72, 0.26, 1] as const;

export function AccountPopover({
  account,
  bookTitle,
  memoryCount,
  authPending,
  authError,
  onGoogleSignIn,
  onSignOut,
  onClose,
}: {
  account: AccountSummary | null;
  bookTitle: string;
  memoryCount: number;
  authPending: boolean;
  authError: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const initials = account
    ? account.name
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toLocaleUpperCase()
    : "";

  return (
    <motion.div
      className="account-popover"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Your account"
        className="account-popover__card"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: paperEase }}
        onClick={(event) => event.stopPropagation()}
      >
        {account ? (
          <header className="account-popover__identity">
            {account.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.avatarUrl} alt="" className="account-popover__avatar" />
            ) : (
              <span className="account-popover__avatar account-popover__avatar--fallback" aria-hidden="true">
                {initials}
              </span>
            )}
            <div>
              <strong>{account.name}</strong>
              {account.email ? <small>{account.email}</small> : null}
            </div>
          </header>
        ) : null}

        <section className="account-popover__book">
          <BookOpenText size={17} weight="regular" aria-hidden="true" />
          <span>
            <small>Your book</small>
            <strong>{bookTitle}</strong>
            <em>{memoryCount} {memoryCount === 1 ? "page" : "pages"}</em>
          </span>
        </section>

        <p className="account-popover__privacy">
          <LockKey size={13} weight="fill" aria-hidden="true" />
          Private by design &mdash; your words are never used to train models.
        </p>

        {account ? (
          <button type="button" className="account-popover__signout" onClick={onSignOut} disabled={authPending}>
            <SignOut size={15} weight="bold" aria-hidden="true" />
            {authPending ? "Signing out…" : "Sign out"}
          </button>
        ) : (
          <div className="account-popover__signin">
            <p>Connect your account to keep your pages safe across devices.</p>
            <button type="button" className="account-popover__google" onClick={onGoogleSignIn} disabled={authPending}>
              {authPending ? "Connecting…" : "Connect with Google"}
            </button>
            {authError ? <small role="status">{authError}</small> : null}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
