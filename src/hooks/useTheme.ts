import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "losscope:theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = mode === "system" ? getSystemPreference() : mode;
  const html = document.documentElement;

  // Add transition class for smooth changeover
  html.classList.add("theme-transitioning");
  requestAnimationFrame(() => {
    if (resolved === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    // Remove transition class after animation
    setTimeout(() => html.classList.remove("theme-transitioning"), 350);
  });
}

// ─── Tiny external store ────────────────────────────────────────────
let currentMode: ThemeMode = getStoredMode();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setMode(mode: ThemeMode) {
  currentMode = mode;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  applyTheme(mode);
  emit();
}

// Apply on first load
if (typeof window !== "undefined") {
  applyTheme(currentMode);

  // Listen for system preference changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentMode === "system") {
      applyTheme("system");
      emit();
    }
  });
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useTheme() {
  const mode = useSyncExternalStore(
    useCallback((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    () => currentMode,
    () => "system" as ThemeMode,
  );

  // Re-apply on hydration (SSR → client)
  useEffect(() => {
    applyTheme(currentMode);
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
  }, [mode]);

  const resolved: "light" | "dark" = mode === "system" ? getSystemPreference() : mode;

  return { mode, resolved, toggle, setMode };
}
