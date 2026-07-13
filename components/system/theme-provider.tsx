"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type ThemeContextValue = {
  theme: "warm-ivory";
  readingTheme: "paper" | "lamplight";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ThemeContextValue>(
    () => ({ theme: "warm-ivory", readingTheme: "paper" }),
    [],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div data-theme="warm-ivory">{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
