"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BookOpenText,
  CaretRight,
  Leaf,
  LockKey,
  SignIn,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";
import type { AccountSummary } from "@/lib/supabase/account";

export function ProfileExperience({
  bookTitle,
  memoryCount,
  account,
  authPending,
  onOpenGarden,
  onOpenLibrary,
  onGoogleSignIn,
  onSignOut,
}: {
  bookTitle: string;
  memoryCount: number;
  account: AccountSummary | null;
  authPending: boolean;
  onOpenGarden: () => void;
  onOpenLibrary: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}) {
  const displayName = account?.name ?? "Your memoir";
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <div className="profile-experience">
      <header className="profile-header">
        <div>
          <p>Life on Paper</p>
          <span>Your profile</span>
        </div>
        <span>Private by default</span>
      </header>

      <section className="profile-intro">
        <div className="profile-portrait">
          <Image src={account?.avatarUrl ?? "/assets/profile-portrait.png"} alt={displayName} fill unoptimized sizes="112px" priority />
        </div>
        <div>
          <p className="memory-eyebrow">The person behind the pages</p>
          <h1>{displayName}</h1>
          <p>Your books stay yours. You choose which stories become visible to other readers.</p>
        </div>
      </section>

      {!account ? (
        <section className="profile-signin-card" aria-label="Sign in to Life on Paper">
          <span className="profile-signin-card__mark"><SignIn size={25} weight="duotone" aria-hidden="true" /></span>
          <div>
            <p className="memory-eyebrow">Continue your book anywhere</p>
            <h2>Sign in to keep your pages safely backed up.</h2>
            <p>Your current device copy stays here. Google sign-in adds private sync across your phone and computer.</p>
          </div>
          <button type="button" onClick={onGoogleSignIn} disabled={authPending}>
            {authPending ? "Opening Google…" : "Sign in with Google"}
          </button>
        </section>
      ) : null}

      <section className="profile-book-summary" aria-label="Your memoir summary">
        <div><BookOpenText size={23} weight="duotone" aria-hidden="true" /><span><small>Current book</small><strong>{bookTitle}</strong></span></div>
        <dl>
          <div><dt>Memories</dt><dd>{memoryCount}</dd></div>
          <div><dt>Visibility</dt><dd>Private</dd></div>
        </dl>
      </section>

      <div className="profile-sections">
        <button type="button" onClick={onOpenGarden}>
          <span className="profile-row-icon"><Leaf size={22} weight="duotone" aria-hidden="true" /></span>
          <span><strong>Discover other lives</strong><small>Visit the Garden and request to read shared books.</small></span>
          <CaretRight size={18} aria-hidden="true" />
        </button>
        <button type="button" aria-expanded={privacyOpen} onClick={() => setPrivacyOpen((current) => !current)}>
          <span className="profile-row-icon"><LockKey size={22} weight="duotone" aria-hidden="true" /></span>
          <span><strong>Privacy and sharing</strong><small>Control who can request or preview your books.</small></span>
          <CaretRight size={18} aria-hidden="true" />
        </button>
        {privacyOpen ? (
          <section className="profile-privacy-panel" aria-label="Privacy and sharing settings">
            <LockKey size={20} weight="fill" aria-hidden="true" />
            <div><strong>Your book is private by default.</strong><p>Only pages you deliberately share can appear in the Garden. Open Book Studio to change request or preview access.</p></div>
            <button type="button" onClick={onOpenLibrary}>Open Book Studio <CaretRight size={16} weight="bold" aria-hidden="true" /></button>
          </section>
        ) : null}
        {account && !confirmingSignOut ? (
          <button type="button" onClick={() => setConfirmingSignOut(true)} disabled={authPending}>
            <span className="profile-row-icon"><UserCircle size={22} weight="duotone" aria-hidden="true" /></span>
            <span>
              <strong>Signed in with Google</strong>
              <small>{account.email ?? "Your account"} · account settings</small>
            </span>
            <CaretRight size={18} aria-hidden="true" />
          </button>
        ) : null}
        {account && confirmingSignOut ? (
          <section className="profile-signout-confirm" aria-label="Confirm sign out">
            <span className="profile-row-icon"><SignOut size={22} weight="duotone" aria-hidden="true" /></span>
            <span><strong>Sign out of this device?</strong><small>Your synced pages will remain safely in your account.</small></span>
            <div>
              <button type="button" onClick={() => setConfirmingSignOut(false)}>Cancel</button>
              <button type="button" onClick={onSignOut} disabled={authPending}>{authPending ? "Signing out…" : "Sign out"}</button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
