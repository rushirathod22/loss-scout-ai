import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const findingSchema = z.object({
  businessName: z.string(),
  periodLabel: z.string(),
  narrative: z.string(),
  totalLoss: z.number(),
  totalRecovery: z.number(),
  lossScore: z.number(),
  confidence: z.number(),
  losses: z.array(
    z.object({
      category: z.string(),
      title: z.string(),
      estimated_loss: z.number(),
      severity: z.string(),
      confidence: z.number(),
      root_cause: z.string(),
      evidence: z.array(z.object({ label: z.string(), value: z.string(), detail: z.string().optional() })),
      recommendation: z.string(),
      potential_saving: z.number(),
    }),
  ),
});

export type Findings = z.infer<typeof findingSchema>;

const SYSTEM_PROMPT = `You are Losscope's Operational Loss Analyst.
Your responsibility is to analyze structured operational findings and identify meaningful, evidence-backed sources of avoidable loss.
Never invent facts. Never create evidence that is not provided. Never claim certainty when evidence is weak.
Prioritize recurring patterns over isolated anomalies. Distinguish between correlation and confirmed causation.
For every recommendation explain: 1. What should change 2. Why 3. Evidence 4. Expected impact 5. Confidence.
If evidence is insufficient, explicitly state that more data is required.
Currency is Indian Rupees (₹). Use "estimated potential recovery", never guaranteed savings.
Your output must be valid JSON matching the requested schema.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["executive_summary", "top_loss", "root_causes", "insights", "recommendations", "priority_actions"],
  properties: {
    executive_summary: { type: "string" },
    top_loss: { type: "string" },
    root_causes: { type: "array", items: { type: "string" } },
    insights: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    priority_actions: { type: "array", items: { type: "string" } },
  },
} as const;

function fallback(f: Findings) {
  const top = f.losses[0];
  return {
    executive_summary: `${f.narrative} Across ${f.losses.length} detected patterns the estimated invisible loss is ₹${Math.round(f.totalLoss).toLocaleString("en-IN")} per month, with an estimated potential recovery of ₹${Math.round(f.totalRecovery).toLocaleString("en-IN")} at ${f.confidence}% weighted confidence.`,
    top_loss: top ? `${top.category}: ₹${Math.round(top.estimated_loss).toLocaleString("en-IN")}/month — ${top.title}` : "No material loss detected.",
    root_causes: f.losses.map((l) => `${l.category}: ${l.root_cause}`),
    insights: f.losses.flatMap((l) => l.evidence.slice(0, 2).map((e) => `${l.category} — ${e.label}: ${e.value}`)),
    recommendations: f.losses.map((l) => l.recommendation),
    priority_actions: f.losses
      .slice(0, 3)
      .map((l, i) => `${i + 1}. ${l.recommendation} (estimated potential recovery ₹${Math.round(l.potential_saving).toLocaleString("en-IN")}/month)`),
    source: "fallback" as const,
    note: "Generated from the deterministic detector output — the AI narrator was unavailable.",
  };
}

export const generateInsights = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => findingSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return fallback(data);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Structured findings from deterministic Pandas-style analysis of ${data.businessName} (${data.periodLabel}). Only these facts exist — do not add others.\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "loss_analysis", strict: true, schema: RESPONSE_SCHEMA },
          },
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        console.error("AI gateway error", res.status, detail.slice(0, 400));
        return { ...fallback(data), note: res.status === 429 ? "AI narrator rate-limited — showing the deterministic analysis." : "AI narrator unavailable — showing the deterministic analysis." };
      }

      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return fallback(data);
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
      return {
        executive_summary: typeof parsed["executive_summary"] === "string" ? parsed["executive_summary"] : fallback(data).executive_summary,
        top_loss: typeof parsed["top_loss"] === "string" ? parsed["top_loss"] : fallback(data).top_loss,
        root_causes: arr(parsed["root_causes"]),
        insights: arr(parsed["insights"]),
        recommendations: arr(parsed["recommendations"]),
        priority_actions: arr(parsed["priority_actions"]),
        source: "ai" as const,
      };
    } catch (err) {
      console.error("AI insight generation failed", err);
      return fallback(data);
    }
  });
