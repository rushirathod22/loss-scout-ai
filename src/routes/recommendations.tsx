import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles, Zap } from "lucide-react";
import { AppShell } from "@/components/losscope/AppShell";
import { NoData } from "@/components/losscope/ui";
import { inr, simulate } from "@/lib/losscope/engine";
import { useLosscope } from "@/lib/losscope/store";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Action Plan & What-If — Losscope AI" },
      {
        name: "description",
        content:
          "A prioritised action plan with effort and estimated potential recovery, plus a what-if simulator that recalculates loss from your own numbers.",
      },
      { property: "og:title", content: "Action Plan & What-If — Losscope AI" },
      { property: "og:description", content: "Prioritised actions and a live what-if recovery simulator." },
    ],
  }),
  component: Recommendations,
});

const LEVERS = [
  { key: "waste", label: "Waste reduction", options: [0, 10, 20, 30] },
  { key: "overstock", label: "Overstock reduction", options: [0, 10, 20, 30] },
  { key: "delivery", label: "Delivery cost reduction", options: [0, 5, 10, 15] },
  { key: "payment", label: "Payment delay reduction", options: [0, 10, 20, 30] },
] as const;

function Recommendations() {
  const { result, ai } = useLosscope();
  const [levers, setLevers] = useState({ waste: 20, overstock: 10, delivery: 10, payment: 10 });

  const sim = useMemo(() => (result ? simulate(result, levers) : null), [result, levers]);

  if (!result || !sim) {
    return (
      <AppShell>
        <NoData message="No recommendations yet." />
      </AppShell>
    );
  }

  const chartData = [
    { label: "Current estimated loss", value: Math.round(sim.current), fill: "var(--color-loss)" },
    { label: "Remaining after changes", value: Math.round(sim.remaining), fill: "var(--color-warn)" },
    { label: "Estimated potential recovery", value: Math.round(sim.recovered), fill: "var(--color-gain)" },
  ];

  const horizons = ["TODAY", "THIS WEEK", "THIS MONTH"] as const;

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-semibold">Action plan</h1>
      <p className="mt-2 text-muted-foreground">
        Ordered by financial impact against implementation effort. Every action links back to the evidence
        that produced it.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          {horizons.map((h) => {
            const items = result.actions.filter((a) => a.horizon === h);
            if (!items.length) return null;
            return (
              <section key={h} className="panel p-6">
                <h2 className="text-xs tracking-widest text-primary uppercase">{h}</h2>
                <ol className="mt-4 space-y-4">
                  {items.map((a, i) => (
                    <li key={a.lossId} className="border-l-2 border-border pl-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="max-w-xl text-sm font-medium">
                          {i + 1}. {a.title}
                        </p>
                        <span className="num text-sm font-semibold text-gain">
                          +{inr(a.potential_saving)}/mo
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        <span className="text-foreground">Why: </span>
                        {a.reason}
                      </p>
                      <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                        <span className="rounded-md bg-surface px-2 py-0.5">Effort: {a.effort}</span>
                        <span className="rounded-md bg-surface px-2 py-0.5">Priority: {h}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}

          {ai ? (
            <section className="panel p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Sparkles className="size-4 text-primary" /> Analyst reasoning
                <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                  {ai.source === "ai" ? "AI generated" : "Deterministic fallback"}
                </span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{ai.executive_summary}</p>
              {ai.insights.length ? (
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {ai.insights.slice(0, 6).map((i) => (
                    <li key={i} className="rounded-lg bg-surface px-3 py-2">
                      {i}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>

        <section className="panel h-fit p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Zap className="size-4 text-warn" /> What if I fix this?
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recalculated from the detected losses. Reductions are capped at each detector&apos;s estimated
            recovery ceiling.
          </p>

          <div className="mt-5 space-y-4">
            {LEVERS.map((l) => (
              <div key={l.key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span className="num font-semibold">{levers[l.key]}%</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {l.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => setLevers((p) => ({ ...p, [l.key]: o }))}
                      className={`num flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                        levers[l.key] === o
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {o}%
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current estimated loss</dt>
              <dd className="num font-semibold text-loss">{inr(sim.current)}/mo</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Estimated potential recovery</dt>
              <dd className="num font-semibold text-gain">{inr(sim.recovered)}/mo</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Remaining estimated loss</dt>
              <dd className="num font-semibold">{inr(sim.remaining)}/mo</dd>
            </div>
          </dl>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 40, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={10} angle={-12} textAnchor="end" height={56} interval={0} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} width={54} />
              <Tooltip
                formatter={(v: number) => inr(v)}
                contentStyle={{
                  backgroundColor: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" name="₹ per month" radius={[6, 6, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.label} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {sim.perLoss
              .filter((p) => p.capped)
              .map((p) => (
                <p key={p.id}>
                  {p.category}: capped at the detector&apos;s estimated recovery ceiling.
                </p>
              ))}
            <p>Estimated potential recovery only — actual savings depend on implementation.</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
