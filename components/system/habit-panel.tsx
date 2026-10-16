"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarPlus, Check, DeviceMobile, Export } from "@phosphor-icons/react";
import { useInstallPrompt } from "@/components/system/pwa";
import {
  disablePush,
  downloadCalendarFile,
  enablePush,
  googleCalendarLink,
  isIos,
  isStandalone,
  loadReminder,
  pushAvailability,
  saveReminder,
  type ReminderSettings,
} from "@/lib/reminders";
import { track } from "@/lib/analytics";

const TIMES = Array.from({ length: 33 }, (_, index) => {
  const minutes = 7 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

/** Install the app to the home screen: one tap where the browser allows it, clear steps where it doesn't. */
export function InstallRow() {
  const { available, install } = useInstallPrompt();
  const [installed, setInstalled] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setInstalled(isStandalone()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (installed) {
    return (
      <p className="habit-row habit-row--done">
        <Check size={15} weight="bold" aria-hidden="true" /> Installed on this device
      </p>
    );
  }
  return (
    <div className="habit-row">
      <DeviceMobile size={18} aria-hidden="true" />
      <div>
        <strong>Put your book on your home screen</strong>
        <p>Opens straight to Today, full screen, like an app.</p>
        {showSteps ? (
          <p className="habit-steps">
            {isIos()
              ? <>In Safari, tap <Export size={13} weight="bold" aria-label="Share" /> Share, then <b>Add to Home Screen</b>.</>
              : <>Open your browser menu (⋮ or ⋯) and choose <b>Install app</b> or <b>Add to Home screen</b>.</>}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={async () => {
          if (available) {
            const accepted = await install();
            track("install_prompt", { accepted });
            if (accepted) setInstalled(true);
            return;
          }
          setShowSteps(true);
        }}
      >
        {available ? "Install" : "How"}
      </button>
    </div>
  );
}

/** Pick a time, then a way to be reminded: a notification, or a repeating calendar event. */
export function ReminderSettingsPanel({ onDone }: { onDone?: () => void }) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [time, setTime] = useState("21:00");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [push, setPush] = useState<"ready" | "install-first" | "unavailable">("unavailable");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = loadReminder();
      setSettings(saved);
      if (saved) setTime(saved.time);
      setPush(pushAvailability());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const remember = (via: "calendar" | "push") => {
    const next: ReminderSettings = { time, via: [...new Set([...(settings?.via ?? []), via])] };
    saveReminder(next);
    setSettings(next);
    track("reminder_set", { via, time });
    onDone?.();
  };

  const pushOn = settings?.via.includes("push");

  return (
    <div className="reminder-panel">
      <label className="reminder-time">
        <span>Remind me at</span>
        <select value={time} onChange={(event) => setTime(event.target.value)}>
          {TIMES.map((option) => <option key={option} value={option}>{formatTime(option)}</option>)}
        </select>
      </label>

      <div className="reminder-ways">
        {push === "ready" ? (
          <button
            type="button"
            className="reminder-way reminder-way--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              const result = await enablePush(time);
              setBusy(false);
              if (result === "on") {
                remember("push");
                setStatus(`A gentle notification at ${formatTime(time)} each day.`);
              } else if (result === "denied") {
                setStatus("Notifications are blocked for this site. Use a calendar reminder instead, or allow them in your browser settings.");
              } else {
                setStatus("That didn't work just now. A calendar reminder works everywhere.");
              }
            }}
          >
            <Bell size={17} weight="fill" aria-hidden="true" />
            {busy ? "Asking…" : pushOn ? "Update notification" : "Notify me on this device"}
          </button>
        ) : null}
        <a
          className="reminder-way"
          href={googleCalendarLink(time)}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            remember("calendar");
            setStatus("Save the event in Google Calendar and it will repeat daily.");
          }}
        >
          <CalendarPlus size={17} aria-hidden="true" /> Google Calendar
        </a>
        <button
          type="button"
          className="reminder-way"
          onClick={() => {
            downloadCalendarFile(time);
            remember("calendar");
            setStatus("Open the downloaded file to add a daily event to your calendar.");
          }}
        >
          <CalendarPlus size={17} aria-hidden="true" /> Apple or other calendar
        </button>
      </div>

      {push === "install-first" ? (
        <p className="reminder-note">On iPhone, notifications work once the app is on your home screen.</p>
      ) : null}
      {status ? <p className="reminder-note" role="status">{status}</p> : null}
      {pushOn ? (
        <button
          type="button"
          className="reminder-off"
          onClick={async () => {
            await disablePush();
            const next = settings ? { ...settings, via: settings.via.filter((way) => way !== "push") } : null;
            saveReminder(next && next.via.length ? next : null);
            setSettings(next && next.via.length ? next : null);
            setStatus("Notifications are off.");
          }}
        >
          Turn notifications off
        </button>
      ) : null}
    </div>
  );
}

const HABIT_DISMISS_KEY = "life-on-paper-habit-dismissed";

/** Shown on Today once someone has a couple of pages: a nudge to make it a daily thing. */
export function shouldShowHabitNudge(memoryCount: number) {
  if (memoryCount < 2) return false;
  try {
    if (loadReminder()) return false;
    const dismissed = Number(window.localStorage.getItem(HABIT_DISMISS_KEY) ?? 0);
    return Date.now() - dismissed > 14 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function HabitNudge({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <section className="habit-card" aria-label="Make it a daily habit">
      <header>
        <div>
          <strong>{done ? "You're set." : "A few lines a day, without having to remember"}</strong>
          <p>{done ? "See you this evening." : "Pick a time and your book will gently ask for today's lines."}</p>
        </div>
        <button
          type="button"
          className="habit-card__close"
          onClick={() => {
            try {
              window.localStorage.setItem(HABIT_DISMISS_KEY, String(Date.now()));
            } catch {
              // Best-effort.
            }
            onClose();
          }}
        >
          {done ? "Close" : "Not now"}
        </button>
      </header>
      {done ? null : <ReminderSettingsPanel onDone={() => setDone(true)} />}
      <InstallRow />
    </section>
  );
}
