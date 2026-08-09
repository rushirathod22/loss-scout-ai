import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AlertCircle } from "lucide-react";
import { AppShell } from "@/components/losscope/AppShell";
import { ConfidenceMeter, Kpi, NoData, SeverityBadge } from "@/components/losscope/ui";
import { inr } from "@/lib/losscope/engine";
import { useLosscope } from "@/lib/losscope/store";
import type { LossType } from "@/lib/losscope/types";

function LossTypeBadge({ lossType }: { lossType: LossType }) {
  const config = {
    "Directly Measured Loss": { label: "🔴 Directly Measured", style: { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" } },
    "Estimated Operational Cost": { label: "🟡 Operational Cost", style: { background: "rgba(234,179,8,0.12)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.3)" } },
    "Capital at Risk": { label: "🟠 Capital at Risk", style: { background: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" } },
    "Revenue Exposure": { label: "🔵 Revenue Exposure", style: { background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" } },
  }[lossType];
  return (
    <span
      style={{ ...config.style, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {config.label}
    </span>
  );
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Loss Dashboard — Losscope AI" },
      {
        name: "description",
        content:
          "Operational analysis dashboard: directly measured losses, estimated operational costs, capital at risk, and auditable 6-field evidence.",
      },
      { property: "og:title", content: "Loss Dashboard — Losscope AI" },
      {
        property: "og:description",
        content: "Transparent 6-field auditable findings with explicit financial classification.",
      },
    ],
  }),
  component: Dashboard,
});

const chartTheme = {
  grid: "var(--color-border)",
  axis: "var(--color-muted-foreground)",
};

const tooltipStyle = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "12px",
  color: "var(--color-popover-foreground)",
  fontSize: "12px",
};

function Dashboard() {
  const { result } = useLosscope();

  if (!result) {
    return (
      <AppShell>
        <NoData />
      </AppShell>
    );
  }

  const combinedCost = result.totalDirectlyMeasured + result.totalEstimatedOperationalCost;

  const matrixData = result.losses.map((l) => ({
    x: l.effort,
    y: l.impact,
    z: Math.round(l.estimated_loss),
    name: l.category,
  }));

  return (
    <AppShell>
      <div className="rise">
        <h1 className="font-display text-3xl font-semibold">Good morning, UrbanBite 👋</h1>
        <p className="mt-2 text-muted-foreground">
          Operational analysis split into transparent financial categories.
        </p>
      </div>

      {/* Honest KPI Overview Row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Period Revenue" value={inr(result.totalRevenue)} tone="info" sub={`Actual ${result.dayCount}-day sales sum`} />
        <Kpi label="Directly Measured" value={inr(result.totalDirectlyMeasured)} tone="loss" sub="Confirmed direct waste loss" />
        <Kpi label="Est. Operational Cost" value={inr(result.totalEstimatedOperationalCost)} tone="warn" sub={`Delivery (${inr(result.totalDeliveryInefficiency)}) + Payment (${inr(result.totalCashFlowRisk)})`} />
        <Kpi label="Combined Measured + Est." value={inr(combinedCost)} tone="loss" sub="Waste + Operational Inefficiencies" />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/40 px-4 py-2 text-xs text-muted-foreground">
        <AlertCircle className="size-4 shrink-0 text-primary" />
        <span>
          Capital at risk ({inr(result.totalCapitalAtRisk)}) and revenue exposure ({inr(result.totalDemandExposure)}) are intentionally excluded from this total to avoid double counting.
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="panel p-6">
          <h2 className="text-xs tracking-wide text-muted-foreground uppercase">Loss score</h2>
          <div className="num mt-3 font-display text-5xl font-semibold text-loss">
            {result.lossScore}
            <span className="text-xl text-muted-foreground"> / 100</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{result.lossScoreLabel}</p>
          <div className="mt-5 space-y-3">
            {result.scoreBreakdown.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="num font-semibold">
                    {b.points}/{b.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-loss" style={{ width: `${(b.points / b.max) * 100}%` }} />
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{b.detail}</p>
              </div>
            ))}
          </div>

          {/* Potential Recovery Categories Breakdown (Separated cleanly) */}
          <div className="mt-6 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recovery Opportunities
            </h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Potential Waste Recovery</dt>
                <dd className="num font-semibold text-gain">{inr(result.potentialWasteRecovery)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Operational Cost Reduction</dt>
                <dd className="num font-semibold text-gain">{inr(result.potentialOperationalCostReduction)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Potential Revenue Recovery</dt>
                <dd className="num font-semibold text-blue-500">{inr(result.potentialRevenueRecovery)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Inventory Optimization</dt>
                <dd className="num font-semibold text-orange-500">{inr(result.potentialInventoryOptimization)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">Operational Analysis Findings</h2>
          <div className="mt-4 space-y-4">
            {result.losses.map((l, i) => (
              <article key={l.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-xs text-muted-foreground">#{i + 1}</span>
                      <h3 className="font-display text-base font-semibold">{l.category}</h3>
                      <SeverityBadge severity={l.severity} />
                      <LossTypeBadge lossType={l.lossType} />
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{l.summary}</p>
                  </div>
                  <div className="text-right">
                    <div className="num font-display text-2xl font-semibold text-loss">
                      {inr(l.estimated_loss)}
                    </div>
                    <div className="text-xs text-muted-foreground">{l.period}</div>
                  </div>
                </div>

                {/* 6-Field Standard Auditable Block */}
                <div className="mt-4 grid gap-2 rounded-lg bg-surface p-3.5 text-xs border border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold text-muted-foreground">TYPE: </span>
                      <span className="font-medium text-foreground">{l.lossType}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">ESTIMATED IMPACT: </span>
                      <span className="font-bold text-loss">{inr(l.estimated_loss)}</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground">RAW VALUE: </span>
                    <span className="font-medium text-foreground">{l.raw_value_text}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-muted-foreground">FORMULA: </span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground">
                      {l.formulaText}
                    </code>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div className="w-56">
                    <ConfidenceMeter value={l.confidence} />
                  </div>
                  <div className="text-xs text-gain font-medium">
                    Est. potential recovery: {inr(l.potential_saving)}
                  </div>
                  <Link
                    to="/losses/$lossId"
                    params={{ lossId: l.id }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Investigate
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Daily Estimated Operational Cost" hint="Daily waste write-offs + delivery excess + payment financing cost">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={result.charts.lossOverTime}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="label" stroke={chartTheme.axis} fontSize={11} tickMargin={8} />
              <YAxis stroke={chartTheme.axis} fontSize={11} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr(v)} />
              <Line type="monotone" dataKey="loss" name="Daily Operational Cost" stroke="var(--color-loss)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Waste cost by product" hint="Direct waste write-off value (quantity × cost)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={result.charts.wasteByProduct}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="product" stroke={chartTheme.axis} fontSize={11} interval={0} angle={-15} height={50} textAnchor="end" />
              <YAxis stroke={chartTheme.axis} fontSize={11} width={54} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr(v)} />
              <Bar dataKey="wasteCost" name="Waste cost" fill="var(--color-loss)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Purchases vs sales" hint="Units bought against units sold each day">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={result.charts.purchasesVsSales}>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="label" stroke={chartTheme.axis} fontSize={11} />
              <YAxis stroke={chartTheme.axis} fontSize={11} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="purchased" name="Purchased" stroke="var(--color-warn)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sold" name="Sold" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Loss priority matrix" hint="Financial impact vs implementation difficulty">
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 16, bottom: 20, left: 0 }}>
              <CartesianGrid stroke={chartTheme.grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Difficulty"
                domain={[0, 100]}
                stroke={chartTheme.axis}
                fontSize={11}
                label={{ value: "Implementation difficulty", position: "insideBottom", offset: -12, fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Impact"
                domain={[0, 100]}
                stroke={chartTheme.axis}
                fontSize={11}
                width={44}
              />
              <ZAxis type="number" dataKey="z" range={[80, 420]} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, key: string) => (key === "Loss" ? inr(value) : value)}
                labelFormatter={() => ""}
                content={({ payload }) => {
                  const p = payload?.[0]?.payload as { name: string; x: number; y: number; z: number } | undefined;
                  if (!p) return null;
                  return (
                    <div style={tooltipStyle} className="px-3 py-2">
                      <div className="font-semibold">{p.name}</div>
                      <div>Impact {p.y} · Difficulty {p.x}</div>
                      <div>{inr(p.z)}/mo</div>
                    </div>
                  );
                }}
              />
              <Scatter data={matrixData} fill="var(--color-primary)" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <span>Top-left: quick wins</span>
            <span className="text-right">Top-right: strategic</span>
            <span>Bottom-left: low priority</span>
            <span className="text-right">Bottom-right: avoid</span>
          </div>
        </ChartCard>
      </div>
    </AppShell>
  );
}

export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      {hint ? <p className="mt-1 mb-3 text-xs text-muted-foreground">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}
