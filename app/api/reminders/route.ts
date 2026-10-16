import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/allowed-origin";

export const runtime = "nodejs";

type Body = {
  subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  endpoint?: unknown;
  time?: unknown;
  timezone?: unknown;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function guard(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedOrigin(origin)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const verdict = rateLimit(clientKey(request, "reminders"), 20, 10 * 60 * 1000);
  if (!verdict.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  return null;
}

function validZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Save (or update) this browser's reminder. */
export async function POST(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  const time = typeof body.time === "string" && TIME.test(body.time) ? body.time : "21:00";
  const timezone = typeof body.timezone === "string" && validZone(body.timezone) ? body.timezone : "Asia/Kolkata";
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000 || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const { error } = await admin.from("push_subscriptions").upsert({
    endpoint,
    p256dh,
    auth,
    user_id: userId,
    remind_at: time,
    timezone,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Reminder save failed", error.message);
    return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

/** Turn this browser's reminder off. */
export async function DELETE(request: Request) {
  const blocked = guard(request);
  if (blocked) return blocked;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true });
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (typeof body.endpoint !== "string") return NextResponse.json({ error: "INVALID_ENDPOINT" }, { status: 400 });
  await admin.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
