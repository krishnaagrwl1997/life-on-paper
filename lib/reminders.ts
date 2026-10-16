"use client";

/**
 * Daily reminders, in two forms:
 *  - a repeating calendar event, which works on every phone with no setup;
 *  - a push notification from the installed app, when the server has its
 *    keys configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY) and the browser allows it.
 */

export const REMINDER_KEY = "life-on-paper-reminder";
const TODAY_URL = "https://lifeonpaper.app/today?write=1";
const TITLE = "A few lines for your book";
const DETAILS = `Anything from today worth keeping? Open Life on Paper: ${TODAY_URL}`;

export type ReminderSettings = {
  time: string; // "21:00"
  via: Array<"calendar" | "push">;
};

export function loadReminder(): ReminderSettings | null {
  try {
    const raw = window.localStorage.getItem(REMINDER_KEY);
    return raw ? (JSON.parse(raw) as ReminderSettings) : null;
  } catch {
    return null;
  }
}

export function saveReminder(settings: ReminderSettings | null) {
  try {
    if (settings) window.localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
    else window.localStorage.removeItem(REMINDER_KEY);
  } catch {
    // Best-effort.
  }
}

function nextStart(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const start = new Date();
  start.setHours(hours || 21, minutes || 0, 0, 0);
  if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1);
  return start;
}

const pad = (value: number) => String(value).padStart(2, "0");
const localStamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
const utcStamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** A Google Calendar "add event" link for a daily 10-minute event. */
export function googleCalendarLink(time: string) {
  const start = nextStart(time);
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: TITLE,
    details: DETAILS,
    dates: `${localStamp(start)}/${localStamp(end)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recur: "RRULE:FREQ=DAILY",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** An .ics file for Apple Calendar, Outlook and the rest, with a gentle alert. */
export function downloadCalendarFile(time: string) {
  const start = nextStart(time);
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life on Paper//Daily reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:daily-reminder-${Date.now()}@lifeonpaper.app`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${zone}:${localStamp(start)}`,
    `DTEND;TZID=${zone}:${localStamp(end)}`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:${TITLE}`,
    `DESCRIPTION:${DETAILS}`,
    `URL:${TODAY_URL}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${TITLE}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "life-on-paper-reminder.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** "ready": can ask now; "install-first": iPhone needs the app installed; "unavailable": no push here. */
export function pushAvailability(): "ready" | "install-first" | "unavailable" {
  if (typeof window === "undefined" || !vapidKey) return "unavailable";
  if (isIos() && !isStandalone()) return "install-first";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unavailable";
  return "ready";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function enablePush(time: string): Promise<"on" | "denied" | "failed"> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }));
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        time,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    return response.ok ? "on" : "failed";
  } catch {
    return "failed";
  }
}

export async function disablePush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/reminders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  } catch {
    // Nothing else to do; the server drops dead subscriptions on its own.
  }
}
