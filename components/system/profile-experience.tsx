"use client";

import Image from "next/image";
import {
  BookOpenText,
  CaretRight,
  Leaf,
  LockKey,
  UserCircle,
} from "@phosphor-icons/react";
import type { AccountSummary } from "@/lib/supabase/account";

export function ProfileExperience({
  bookTitle,
  memoryCount,
  account,
  authPending,
  onOpenGarden,
  onGoogleSignIn,
  onSignOut,
}: {
  bookTitle: string;
  memoryCount: number;
  account: AccountSummary | null;
  authPending: boolean;
  onOpenGarden: () => void;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}) {
  const displayName = account?.name ?? "Your memoir";

  return (
    <div className="profile-experience">
      <header className="profile-header">
        <div>
          <p>Life In Books</p>
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

      <section className="profile-book-summary" aria-label="Your memoir summary">
        <div><BookOpenText size={23} weight="duotone" aria-hidden="true" /><span><small>Current book</small><strong>{bookTitle}</strong></span></div>
        <dl>
          <div><dt>Memories</dt><dd>{Math.max(12, memoryCount)}</dd></div>
          <div><dt>Visibility</dt><dd>Private</dd></div>
        </dl>
      </section>

      <div className="profile-sections">
        <button type="button" onClick={onOpenGarden}>
          <span className="profile-row-icon"><Leaf size={22} weight="duotone" aria-hidden="true" /></span>
          <span><strong>Discover other lives</strong><small>Visit the Garden and request to read shared books.</small></span>
          <CaretRight size={18} aria-hidden="true" />
        </button>
        <button type="button">
          <span className="profile-row-icon"><LockKey size={22} weight="duotone" aria-hidden="true" /></span>
          <span><strong>Privacy and sharing</strong><small>Control who can request or preview your books.</small></span>
          <CaretRight size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={account ? onSignOut : onGoogleSignIn} disabled={authPending}>
          <span className="profile-row-icon"><UserCircle size={22} weight="duotone" aria-hidden="true" /></span>
          <span>
            <strong>{account ? "Signed in with Google" : "Save this book across devices"}</strong>
            <small>{account ? `${account.email ?? "Your account"} · tap to sign out` : authPending ? "Opening Google…" : "Continue with Google when you are ready."}</small>
          </span>
          <CaretRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
