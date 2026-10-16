import { createClient } from "@supabase/supabase-js";

/**
 * A server-only Supabase client with the service-role key, for jobs that act
 * on behalf of no single user (sending daily reminders). Returns null when the
 * key is not configured, so callers can answer "not set up" instead of crashing.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
