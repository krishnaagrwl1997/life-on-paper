import posthog from "posthog-js";

/**
 * Product analytics (PostHog, US region).
 *
 * Privacy rules — keep them, the privacy page promises them:
 * - Named events only. No autocapture, no session recording, no surveys.
 * - Never send anything a person wrote: no entry text, titles, names or
 *   emails. Properties are counts, booleans and fixed labels only.
 * - `persistence: "memory"` — nothing is stored in cookies or localStorage,
 *   so a visitor is anonymous and forgotten when the tab closes.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_yqWDVAhymgGkoy5YbbHTMYmUgToCWn6fno8R9U4GzTWL";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let started = false;

export function initAnalytics() {
  if (started || typeof window === "undefined" || !KEY) return;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    persistence: "memory",
    autocapture: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    disable_session_recording: true,
    disable_surveys: true,
    person_profiles: "identified_only",
    respect_dnt: true,
  });
}

type Properties = Record<string, string | number | boolean | undefined>;

export function track(event: string, properties?: Properties) {
  if (!started) return;
  try {
    posthog.capture(event, properties);
  } catch {
    /* analytics must never break the product */
  }
}
