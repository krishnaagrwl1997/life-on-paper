import { HomeExperience } from "@/components/system/home-experience";
import { accountFromUser, type AccountSummary } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
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
