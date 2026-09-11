import { HomeExperience } from "@/components/system/home-experience";
import { accountFromUser, type AccountSummary } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The app itself. Marketing owns `/`; the journal lives here.
 * `app/page.tsx` is the public landing page.
 */
export default async function TodayPage() {
  let account: AccountSummary | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    account = data.user ? accountFromUser(data.user) : null;
  } catch {
    account = null;
  }

  return <HomeExperience initialAccount={account} />;
}
