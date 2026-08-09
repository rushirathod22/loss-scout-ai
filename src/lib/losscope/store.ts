import { useSyncExternalStore } from "react";
import { analyze } from "./engine";
import { generateUrbanBiteData } from "./data";
import type { AiInsights, AnalysisResult, Row } from "./types";

interface State {
  rows: Row[] | null;
  result: AnalysisResult | null;
  businessName: string;
  isDemo: boolean;
  ai: AiInsights | null;
  aiLoading: boolean;
}

let state: State = {
  rows: null,
  result: null,
  businessName: "UrbanBite Cafe",
  isDemo: true,
  ai: null,
  aiLoading: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const KEY = "losscope:v1";

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  if (typeof window !== "undefined" && state.rows) {
    try {
      window.sessionStorage.setItem(
        KEY,
        JSON.stringify({ rows: state.rows, businessName: state.businessName, isDemo: state.isDemo }),
      );
    } catch {
      /* storage unavailable — in-memory only */
    }
  }
  emit();
}

/** Rehydrate after a page reload so a refreshed dashboard keeps its analysis. */
export function hydrateLosscope() {
  if (typeof window === "undefined" || state.rows) return;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { rows: Row[]; businessName: string; isDemo: boolean };
    if (!saved?.rows?.length) return;
    set({
      rows: saved.rows,
      businessName: saved.businessName,
      isDemo: saved.isDemo,
      result: analyze(saved.rows, saved.businessName),
    });
  } catch {
    /* ignore corrupt session data */
  }
}

export const losscopeStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get: () => state,
  loadDemo() {
    const rows = generateUrbanBiteData();
    set({
      rows,
      businessName: "UrbanBite Cafe",
      isDemo: true,
      result: analyze(rows, "UrbanBite Cafe"),
      ai: null,
    });
  },
  loadRows(rows: Row[], businessName: string, isDemo: boolean) {
    set({ rows, businessName, isDemo, result: analyze(rows, businessName), ai: null });
  },
  setAi(ai: AiInsights | null, loading = false) {
    set({ ai, aiLoading: loading });
  },
  setAiLoading(loading: boolean) {
    set({ aiLoading: loading });
  },
  reset() {
    set({ rows: null, result: null, ai: null, aiLoading: false });
  },
};

const serverSnapshot: State = state;

export function useLosscope(): State {
  return useSyncExternalStore(
    losscopeStore.subscribe,
    losscopeStore.get,
    () => serverSnapshot,
  );
}
