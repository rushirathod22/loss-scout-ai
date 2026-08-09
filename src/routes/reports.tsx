import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { AppShell } from "@/components/losscope/AppShell";
import { NoData } from "@/components/losscope/ui";
import { inr } from "@/lib/losscope/engine";
import { useLosscope } from "@/lib/losscope/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Executive Loss Report — Losscope AI" },
      {
        name: "description",
        content:
          "A print-ready executive report: analysis period, total estimated loss, top losses, evidence, root causes, recommendations and potential recovery.",
      },
      { property: "og:title", content: "Executive Loss Report — Losscope AI" },
      { property: "og:description", content: "Print-ready executive summary of every detected loss and action." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { result, ai } = useLosscope();

  if (!result) {
    return (
      <AppShell>
        <NoData message="No report available yet." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Executive report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.businessName} · {result.periodLabel} · demo data
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Printer className="size-4" /> Generate / download report
        </button>
      </div>

      <article className="panel mt-6 space-y-8 p-8">
        <section>
          <h2 className="font-display text-lg font-semibold">Summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {ai?.executive_summary ?? result.narrative}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Stat label="Combined measured + est. cost" value={inr(result.totalDirectlyMeasured + result.totalEstimatedOperationalCost)} cls="text-loss" />
            <Stat label="Loss score" value={`${result.lossScore}/100`} cls="text-foreground" />
            <Stat label="Confidence" value={`${result.confidence}%`} cls="text-primary" />
            <Stat label="Capital at risk" value={inr(result.totalCapitalAtRisk)} cls="text-orange-500" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Stat label="Waste recovery est." value={inr(result.potentialWasteRecovery)} cls="text-gain" />
            <Stat label="Operational cost reduction" value={inr(result.potentialOperationalCostReduction)} cls="text-gain" />
            <Stat label="Revenue recovery est." value={inr(result.potentialRevenueRecovery)} cls="text-blue-500" />
            <Stat label="Inventory optimization" value={inr(result.potentialInventoryOptimization)} cls="text-orange-500" />
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">Detected losses</h2>
          <div className="mt-4 space-y-6">
            {result.losses.map((l, i) => (
              <div key={l.id} className="border-t border-border pt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold">
                    {i + 1}. {l.category} — {l.title}
                  </h3>
                  <span className="num text-sm font-semibold text-loss">
                    {inr(l.estimated_loss)}/mo · {l.severity.toUpperCase()} · {l.confidence}% confidence
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="text-foreground">Root cause: </span>
                  {l.root_cause}
                </p>
                <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {l.evidence.map((e) => (
                    <li key={e.label}>
                      • {e.label}: <span className="num text-foreground">{e.value}</span>
                      {e.detail ? ` (${e.detail})` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Recommendation: </span>
                  {l.recommendation}
                </p>
                <p className="mt-1 text-sm text-gain">
                  Estimated potential recovery {inr(l.potential_saving)}/mo (
                  {Math.round(l.recovery_rate * 100)}%)
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">Prioritised actions</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {result.actions.map((a, i) => (
              <li key={a.lossId}>
                <span className="text-muted-foreground">{a.horizon} · </span>
                {i + 1}. {a.title}{" "}
                <span className="num text-gain">(+{inr(a.potential_saving)}/mo, {a.effort} effort)</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">Methodology and limitations</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>
              • Six deterministic detectors (waste, overstock, demand mismatch, delivery, payment delay,
              trend) run over {result.rowCount} rows; overlapping detectors are merged so value is counted
              once.
            </li>
            <li>• Overstock is costed at a 15% monthly carrying rate; payment delay at an 18% annual cost of capital.</li>
            <li>• Confidence is computed from sample size, pattern consistency and data completeness ({result.dataQuality}%).</li>
            <li>• All figures are estimated potential recovery on synthetic demo data — not guaranteed savings or real business results.</li>
          </ul>
        </section>
      </article>
    </AppShell>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className={`num mt-1 font-display text-xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
