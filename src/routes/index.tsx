import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Scan, TrendingDown, Sparkles, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { generateUrbanBiteData } from "@/lib/losscope/data";
import { analyze, inr } from "@/lib/losscope/engine";
import { losscopeStore } from "@/lib/losscope/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Losscope AI — Find the losses you don't see" },
      {
        name: "description",
        content:
          "AI-powered operational intelligence that discovers hidden money, inventory, time and resource losses in small business data before they become expensive.",
      },
      { property: "og:title", content: "Losscope AI — Find the losses you don't see" },
      {
        property: "og:description",
        content:
          "Upload operational data and Losscope surfaces invisible losses with evidence, root cause, confidence and estimated potential recovery.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const preview = useMemo(() => analyze(generateUrbanBiteData(), "UrbanBite Cafe"), []);

  const startDemo = () => {
    losscopeStore.loadDemo();
    void navigate({ to: "/analysis" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scan className="size-4" />
            </span>
            <span className="font-display text-sm font-semibold">LOSSCOPE AI</span>
          </div>
          <Link
            to="/dashboard"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open app
          </Link>
        </div>
      </header>

      <section className="grid-backdrop relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> Invisible Loss Discovery Engine
            </span>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
              Find the losses
              <br />
              you don&apos;t see.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              AI-powered operational intelligence that discovers hidden money, inventory, time and
              resource losses before they become expensive problems.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={startDemo}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Analyze My Business <ArrowRight className="size-4" />
              </button>
              <button
                onClick={startDemo}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                View Demo
              </button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No signup, no API keys — the demo runs on 30 days of synthetic UrbanBite Cafe data.
            </p>
          </div>

          <div className="panel rise relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-primary/10 blur-2xl scanline" />
            <div className="flex items-center justify-between">
              <div className="text-xs tracking-wide text-muted-foreground uppercase">
                UrbanBite Cafe · Last 30 days
              </div>
              <span className="rounded-md bg-loss-soft px-2 py-0.5 text-[11px] font-semibold text-loss uppercase">
                Live scan
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <HeroStat
                label="Invisible loss"
                value={`${inr(preview.totalLoss)}/mo`}
                tone="text-loss"
                icon={<TrendingDown className="size-4" />}
              />
              <HeroStat label="Losses detected" value={`${preview.losses.length}`} tone="text-foreground" />
              <HeroStat label="Potential recovery" value={`${inr(preview.totalRecovery)}/mo`} tone="text-gain" />
              <HeroStat
                label="Confidence"
                value={`${preview.confidence}%`}
                tone="text-primary"
                icon={<ShieldCheck className="size-4" />}
              />
            </div>
            <div className="mt-6 space-y-2">
              {preview.losses.slice(0, 4).map((l, i) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="num text-xs text-muted-foreground">#{i + 1}</span>
                    {l.category}
                  </span>
                  <span className="num font-semibold text-loss">{inr(l.estimated_loss)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">Not a chatbot. An operational analyst.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              t: "Deterministic first",
              d: "Six statistical detectors run over your data — waste, overstock, demand mismatch, delivery, payments, trend. Numbers come from your rows, not from a model.",
            },
            {
              t: "Every insight has evidence",
              d: "Each finding shows the transactions, quantities and day-of-week patterns behind it, plus a confidence score derived from sample size and consistency.",
            },
            {
              t: "Answers, then actions",
              d: "Root cause, recommended change, estimated potential recovery and a what-if simulator so you can see the impact before you commit.",
            },
          ].map((c) => (
            <div key={c.t} className="panel p-6">
              <h3 className="font-display text-base font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
        {icon}
      </div>
      <div className={`num mt-2 font-display text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
