import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Sparkles, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/losscope/AppShell";
import { NoData } from "@/components/losscope/ui";
import { inr } from "@/lib/losscope/engine";
import { losscopeStore, useLosscope } from "@/lib/losscope/store";
import { generateInsights } from "@/lib/losscope/ai.functions";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Running Analysis — Losscope AI" },
      {
        name: "description",
        content:
          "Losscope validates operational data and classifies findings across directly measured losses, estimated operational costs, capital at risk, and revenue exposure.",
      },
      { property: "og:title", content: "Running Analysis — Losscope AI" },
      { property: "og:description", content: "Deterministic analysis with 6-field auditable evidence standards." },
    ],
  }),
  component: AnalysisPage,
});

const STAGES = [
  "Validating columns and dates",
  "Understanding your business",
  "Finding patterns across period transactions",
  "Investigating anomalies",
  "Classifying financial impact into distinct categories",
  "Preparing evidence-backed recommendations",
];

function AnalysisPage() {
  const { result, ai, aiLoading } = useLosscope();
  const [stage, setStage] = useState(0);
  const navigate = useNavigate();
  const asked = useRef(false);

  useEffect(() => {
    if (!result) return;
    setStage(0);
    const timers = STAGES.map((_, i) => window.setTimeout(() => setStage(i + 1), 260 * (i + 1)));
    return () => timers.forEach(window.clearTimeout);
  }, [result]);

  useEffect(() => {
    if (!result || asked.current) return;
    asked.current = true;
    losscopeStore.setAiLoading(true);
    generateInsights({
      data: {
        businessName: result.businessName,
        periodLabel: result.periodLabel,
        narrative: result.narrative,
        totalLoss: Math.round(result.totalLoss),
        totalRecovery: Math.round(result.totalRecovery),
        lossScore: result.lossScore,
        confidence: result.confidence,
        losses: result.losses.map((l) => ({
          category: l.category,
          title: l.title,
          estimated_loss: Math.round(l.estimated_loss),
          severity: l.severity,
          confidence: l.confidence,
          root_cause: l.root_cause,
          evidence: l.evidence,
          recommendation: l.recommendation,
          potential_saving: Math.round(l.potential_saving),
        })),
      },
    })
      .then((res) => losscopeStore.setAi(res, false))
      .catch(() => losscopeStore.setAi(null, false));
  }, [result]);

  if (!result) {
    return (
      <AppShell>
        <NoData message="Nothing to analyse yet." />
      </AppShell>
    );
  }

  const done = stage >= STAGES.length;
  const combinedCost = result.totalDirectlyMeasured + result.totalEstimatedOperationalCost;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-semibold">Analysing {result.businessName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{result.periodLabel} · {result.rowCount} rows</p>

        <div className="panel mt-6 space-y-3 p-6">
          {STAGES.map((s, i) => {
            const complete = stage > i;
            const active = stage === i;
            return (
              <div key={s} className="flex items-center gap-3 text-sm">
                {complete ? (
                  <Check className="size-4 text-gain" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <span className="size-4 rounded-full border border-border" />
                )}
                <span className={complete || active ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </div>
            );
          })}
        </div>

        {done ? (
          <div className="panel rise mt-6 p-8 text-center">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">Analysis Summary</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl text-foreground">
              Financial Impact Overview
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Based on {result.dayCount} days · {result.rowCount} transactions · {result.confidence}% weighted confidence
            </p>

            {/* Combined Measured + Estimated Headline */}
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Combined Measured + Estimated Cost
              </div>
              <div className="num mt-1 font-display text-4xl font-bold text-loss">
                {inr(combinedCost)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Direct Waste ({inr(result.totalDirectlyMeasured)}) + Estimated Operational Cost ({inr(result.totalEstimatedOperationalCost)})
              </p>
            </div>

            {/* Clean 4-Part Financial Impact Overview Layout */}
            <div className="mt-6 grid gap-3 text-left">
              {/* 🔴 DIRECTLY MEASURED */}
              <div className="flex items-center justify-between rounded-lg bg-surface border border-rose-500/20 p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-rose-500 text-sm">
                    🔴 DIRECTLY MEASURED LOSS
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Confirmed direct waste loss from recorded inventory write-offs
                  </div>
                </div>
                <div className="num font-display text-xl font-semibold text-rose-500">
                  {inr(result.totalDirectlyMeasured)}
                </div>
              </div>

              {/* 🟡 ESTIMATED OPERATIONAL COST */}
              <div className="flex items-center justify-between rounded-lg bg-surface border border-amber-500/20 p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-amber-500 text-sm">
                    🟡 ESTIMATED OPERATIONAL COST
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Delivery inefficiency ({inr(result.totalDeliveryInefficiency)}) + Late payment financing ({inr(result.totalCashFlowRisk)})
                  </div>
                </div>
                <div className="num font-display text-xl font-semibold text-amber-500">
                  {inr(result.totalEstimatedOperationalCost)}
                </div>
              </div>

              {/* 🟠 CAPITAL AT RISK */}
              <div className="flex items-center justify-between rounded-lg bg-surface border border-orange-500/20 p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-orange-500 text-sm">
                    🟠 CAPITAL AT RISK
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Value of unsold inventory currently on hand (not a confirmed loss)
                  </div>
                </div>
                <div className="num font-display text-xl font-semibold text-orange-500">
                  {inr(result.totalCapitalAtRisk)}
                </div>
              </div>

              {/* 🔵 REVENUE EXPOSURE */}
              <div className="flex items-center justify-between rounded-lg bg-surface border border-blue-500/20 p-4">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-blue-500 text-sm">
                    🔵 REVENUE EXPOSURE
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Estimated revenue exposure from declining demand trend (not a confirmed loss)
                  </div>
                </div>
                <div className="num font-display text-xl font-semibold text-blue-500">
                  {inr(result.totalDemandExposure)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/40 px-4 py-2.5 text-xs text-muted-foreground text-left">
              <AlertCircle className="size-4 shrink-0 text-primary" />
              <span>
                Capital at risk and revenue exposure are intentionally excluded from this total to avoid double counting.
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-left">
              <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                <Sparkles className="size-3.5 text-primary" /> Analyst summary
                {aiLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {ai?.executive_summary ?? result.narrative}
              </p>
              {ai?.note ? <p className="mt-2 text-xs text-warn">{ai.note}</p> : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/dashboard"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Open loss dashboard
              </Link>
              <button
                onClick={() => void navigate({ to: "/recommendations" })}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                See action plan
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
