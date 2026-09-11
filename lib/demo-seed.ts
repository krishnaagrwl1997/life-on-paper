/**
 * Key under which the public marketing demo parks a visitor's words so the app
 * can adopt them as a real first entry.
 *
 * Written by `components/marketing/demo-widget.tsx`.
 * Read once, then cleared, by `components/system/home-experience.tsx`.
 *
 * It is a raw string, deliberately: the app re-polishes it through its own
 * pipeline, so the visitor gets the same treatment as any other entry.
 */
export const DEMO_SEED_KEY = "life-on-paper-demo-seed";
