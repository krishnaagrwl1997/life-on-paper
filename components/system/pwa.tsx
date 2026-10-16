"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredInstall: InstallEvent | null = null;
const listeners = new Set<() => void>();

/** Registers the service worker once, and keeps the browser's install offer for later. */
export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstall = event as InstallEvent;
      listeners.forEach((listener) => listener());
    };
    const onInstalled = () => {
      deferredInstall = null;
      listeners.forEach((listener) => listener());
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

/** Whether the browser offered a one-tap install (Chrome, Edge, Android), and a way to use it. */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(() => deferredInstall !== null);
  useEffect(() => {
    const update = () => setAvailable(deferredInstall !== null);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  const install = async () => {
    if (!deferredInstall) return false;
    await deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    listeners.forEach((listener) => listener());
    return outcome === "accepted";
  };
  return { available, install };
}
