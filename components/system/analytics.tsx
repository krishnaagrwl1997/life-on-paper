"use client";

import { useEffect } from "react";

import { initAnalytics } from "@/lib/analytics";

/** Starts analytics once on the client. See lib/analytics.ts for the rules. */
export function Analytics() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
