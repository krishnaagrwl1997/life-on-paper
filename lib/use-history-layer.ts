"use client";

import { useEffect, useRef } from "react";

/**
 * Makes an in-page layer (a profile panel, a person's page, a sheet) behave
 * like a screen: opening it adds a browser history entry, so the browser or
 * phone Back gesture closes it instead of leaving the app.
 *
 * Closing it from the UI (an on-screen Back or ×) pops that entry again, so
 * the history does not fill up with dead steps.
 */
export function useHistoryLayer(open: boolean, onClose: () => void, param: string) {
  const closeRef = useRef(onClose);
  const pushed = useRef(false);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      if (pushed.current) {
        pushed.current = false;
        if (window.history.state?.lopLayer === param) window.history.back();
      }
      return;
    }

    if (!pushed.current) {
      const url = new URL(window.location.href);
      url.searchParams.set(param, "1");
      window.history.pushState({ ...(window.history.state ?? {}), lopLayer: param }, "", url);
      pushed.current = true;
    }

    const onPop = () => {
      if (!pushed.current) return;
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, param]);
}
