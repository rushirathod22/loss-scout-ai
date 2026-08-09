import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb, Sparkles, Target, Calculator } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/losscope/AppShell";
import { ConfidenceMeter, EvidenceList, NoData, SeverityBadge } from "@/components/losscope/ui";
import { inr } from "@/lib/losscope/engine";
import { useLosscope } from "@/lib/losscope/store";

export const Route = createFileRoute("/losses/$lossId")({
  head: () => ({
    meta: [
      { title: "Loss Investigation — Losscope AI" },
      {
        name: "description",
        content:
          "Investigate a single detected pattern: 6-field auditable standards, formula, root cause, evidence, and potential recovery.",
      },
      { property: "og:title", content: "Loss Investigation — Losscope AI" },
      { property: "og:description", content: "Problem, formula, evidence, root cause, recommended action and recovery." },
    ],
  }),
  component: LossDetail,
});

function LossDetail() {
  const { lossId } = useParams({ from: "/losses/$lossId" });
  const { result, ai } = useLosscope();
  const loss = result?.losses.find((l) => l.id === lossId);

  if (!result || !loss) {
    return (
      <AppShell>
        <NoData message="That finding isn't in the current analysis." />
      </AppShell>
    );
  }

  const aiLine = ai?.recommendations.find((r) =>
    r.toLowerCase().includes(loss.category.split(" ")[0]?.toLowerCase() ?? ""),
  );

  return (
    <AppShell>
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to dashboard
      </Link>

      <div className="panel rise mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">{loss.category}</span>
              <SeverityBadge severity={loss.severity} />
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold">{loss.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{loss.summary}</p>
          </div>
          <div className="text-right">
            <div className="num font-display text-3xl font-semibold text-loss">{inr(loss.estimated_loss)}</div>
            <div className="text-xs text-muted-foreground">{loss.period}</div>
          </div>
        </div>

        {/* 6-Field Standard Auditable Block */}
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-muted-foreground uppercase tracking-wide">
            <Calculator className="size-4 text-primary" /> Auditable Calculation Standard
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <span className="font-semibold text-muted-foreground">CLASSIFICATION TYPE: </span>
              <span className="font-bold text-foreground">{loss.lossType}</span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">ESTIMATED IMPACT: </span>
              <span className="font-bold text-loss">{inr(loss.estimated_loss)}</span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">RAW OBSERVED VALUE: </span>
              <span className="font-medium text-foreground">{loss.raw_value_text}</span>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">CONFIDENCE SCORE: </span>
              <span className="font-bold text-foreground">{loss.confidence}%</span>
            </div>
          </div>
          <div className="pt-1">
            <span className="font-semibold text-muted-foreground">EXACT FORMULA: </span>
            <code className="rounded bg-muted px-2 py-1 text-xs font-mono text-foreground inline-block mt-1">
              {loss.formulaText}
            </code>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="font-display text-base font-semibold">Why it happens — likely root cause</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{loss.root_cause}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Likely root cause based on available evidence, not a confirmed causal test.
            </p>
          </section>

          <section className="panel p-6">
            <h2 className="font-display text-base font-semibold">Evidence</h2>
            <div className="mt-4">
              <EvidenceList items={loss.evidence} />
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Lightbulb className="size-4 text-warn" /> Recommended action
            </h2>
            <p className="mt-3 text-sm leading-relaxed">{loss.recommendation}</p>
            {aiLine ? (
              <div className="mt-4 rounded-xl bg-surface p-4">
                <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                  <Sparkles className="size-3.5 text-primary" /> Analyst note
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{aiLine}</p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="font-display text-base font-semibold">Confidence</h2>
            <div className="mt-4">
              <ConfidenceMeter value={loss.confidence} reason={loss.confidence_reason} />
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Target className="size-4 text-gain" /> Potential savings
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Current estimated impact</dt>
                <dd className="num font-semibold text-loss">{inr(loss.estimated_loss)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated potential recovery</dt>
                <dd className="num font-semibold text-gain">{inr(loss.potential_saving)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Recovery rate</dt>
                <dd className="num font-semibold">{Math.round(loss.recovery_rate * 100)}%</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Actual savings depend on implementation.
            </p>
            <Link
              to="/recommendations"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              What if I fix this?
            </Link>
          </section>

          <section className="panel p-6">
            <h2 className="font-display text-sm font-semibold">Breakdown</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={loss.series} margin={{ top: 16, right: 8, bottom: 30, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} angle={-15} textAnchor="end" height={46} interval={0} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} width={50} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" name={loss.category} fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
