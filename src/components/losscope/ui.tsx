import { Link } from "@tanstack/react-router";
import { CheckCircle2, ShieldQuestion } from "lucide-react";
import type { ReactNode } from "react";
import type { Evidence, Severity } from "@/lib/losscope/types";
import { inr } from "@/lib/losscope/engine";
import { losscopeStore } from "@/lib/losscope/store";

export function Money({ value, tone = "neutral" }: { value: number; tone?: "loss" | "gain" | "neutral" }) {
  const cls = tone === "loss" ? "text-loss" : tone === "gain" ? "text-gain" : "text-foreground";
  return <span className={`num ${cls}`}>{inr(value)}</span>;
}

export function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "loss" | "gain" | "warn" | "info" | "neutral";
  icon?: ReactNode;
}) {
  const toneCls = {
    loss: "text-loss",
    gain: "text-gain",
    warn: "text-warn",
    info: "text-info",
    neutral: "text-foreground",
  }[tone];
  return (
    <div className="panel rise p-5">
      <div className="flex items-center justify-between text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
        {icon}
      </div>
      <div className={`num mt-3 font-display text-3xl font-semibold ${toneCls}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

const SEVERITY_CLS: Record<Severity, string> = {
  high: "bg-loss-soft text-loss",
  medium: "bg-warn-soft text-warn",
  low: "bg-info-soft text-info",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${SEVERITY_CLS[severity]}`}
    >
      {severity}
    </span>
  );
}

export function ConfidenceMeter({ value, reason }: { value: number; reason?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Confidence</span>
        <span className="num font-semibold text-foreground">{value}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      {reason ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{reason}</p> : null}
    </div>
  );
}

export function EvidenceList({ items }: { items: Evidence[] }) {
  if (!items.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldQuestion className="size-4" /> Insufficient evidence — more data is required.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((e) => (
        <li key={e.label} className="flex items-start gap-3 rounded-lg bg-surface px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gain" />
          <div className="min-w-0">
            <div className="text-sm">
              <span className="text-muted-foreground">{e.label}: </span>
              <span className="num font-semibold">{e.value}</span>
            </div>
            {e.detail ? <div className="mt-0.5 text-xs text-muted-foreground">{e.detail}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NoData({ message = "No analysis loaded yet." }: { message?: string }) {
  return (
    <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
      <h2 className="font-display text-xl font-semibold">{message}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Load the UrbanBite Cafe demo dataset to see the full loss discovery flow, or upload your own
        operational CSV.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => losscopeStore.loadDemo()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Load UrbanBite demo data
        </button>
        <Link
          to="/upload"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Upload CSV
        </Link>
      </div>
    </div>
  );
}
