import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Deliberately permissive, matching RFC 5321 length limits. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_SOURCE_LENGTH = 60;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

export async function POST(request: Request) {
  const verdict = rateLimit(clientKey(request, "waitlist"), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfter) } },
    );
  }

  let body: { email?: unknown; source?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; source?: unknown };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "That email doesn’t look quite right." },
      { status: 400 },
    );
  }

  const source =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, MAX_SOURCE_LENGTH)
      : null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({ email, source });

    if (error) {
      // 23505 = unique_violation. Already on the list is a success from the
      // visitor's point of view, and saying so leaks nothing useful.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadyOnList: true });
      }
      console.error("Waitlist insert failed", error.message);
      return NextResponse.json(
        { error: "STORAGE_UNAVAILABLE", message: "We couldn’t save that just now. Try again shortly." },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "Waitlist unavailable",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "STORAGE_UNAVAILABLE", message: "We couldn’t save that just now. Try again shortly." },
      { status: 503 },
    );
  }
}
