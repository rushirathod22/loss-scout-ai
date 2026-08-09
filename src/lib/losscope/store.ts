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

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
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
