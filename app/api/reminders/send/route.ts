import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends today's reminder to every browser whose chosen time has arrived in
 * its own timezone and that hasn't had one today. Called every 15 minutes by
 * .github/workflows/send-reminders.yml with `Authorization: Bearer CRON_SECRET`.
 * A reminder is only sent within two hours of its time, so a stalled
 * scheduler never sends a 9pm nudge at 3am.
 */

const PROMPTS = [
  "Anything from today worth keeping?",
  "One small moment from today — a few lines is enough.",
  "Who did you talk to today? Your book is listening.",
  "Before today slips away: what's one thing you'd like to remember?",
  "Say it out loud if you like — your book will write it down.",
];

type Row = { endpoint: string; p256dh: string; auth: string; remind_at: string; timezone: string; last_sent_on: string | null };

function localNow(zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const admin = createAdminClient();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!admin || !publicKey || !privateKey) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@lifeonpaper.app", publicKey, privateKey);

  const { data, error } = await admin.from("push_subscriptions").select("endpoint,p256dh,auth,remind_at,timezone,last_sent_on");
  if (error) return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });

  let sent = 0;
  let removed = 0;
  for (const row of (data ?? []) as Row[]) {
    const now = localNow(row.timezone);
    const [hours, minutes] = row.remind_at.split(":").map(Number);
    const due = hours * 60 + minutes;
    if (row.last_sent_on === now.date || now.minutes < due || now.minutes > due + 120) continue;

    const prompt = PROMPTS[Number(now.date.replace(/-/g, "")) % PROMPTS.length];
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({ title: "Life on Paper", body: prompt, url: "/today?write=1" }),
        { TTL: 60 * 60 * 3 },
      );
      await admin.from("push_subscriptions").update({ last_sent_on: now.date }).eq("endpoint", row.endpoint);
      sent += 1;
    } catch (failure) {
      const status = (failure as { statusCode?: number }).statusCode;
      // 404/410: the browser dropped this subscription; forget it.
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        removed += 1;
      } else {
        console.error("Reminder push failed", status);
      }
    }
  }
  return NextResponse.json({ ok: true, sent, removed });
}

export const GET = handle;
export const POST = handle;
