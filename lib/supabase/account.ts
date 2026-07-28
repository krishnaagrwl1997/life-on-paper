import type { User } from "@supabase/supabase-js";

export type AccountSummary = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

export function accountFromUser(user: User): AccountSummary {
  const metadata = user.user_metadata ?? {};
  const email = user.email ?? null;

  return {
    id: user.id,
    email,
    name:
      metadata.full_name ??
      metadata.name ??
      email?.split("@")[0] ??
      "Reader",
    avatarUrl: metadata.avatar_url ?? metadata.picture ?? null,
  };
}
