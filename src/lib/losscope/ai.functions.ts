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

IMPORTANT: You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.
The JSON must have exactly these keys:
{
  "executive_summary": "string",
  "top_loss": "string",
  "root_causes": ["string"],
  "insights": ["string"],
  "recommendations": ["string"],
  "priority_actions": ["string"]
}`;

function fallback(f: Findings, note?: string) {
  const top = f.losses[0];
  return {
    executive_summary: f.narrative,
    top_loss: top ? `${top.category}: ₹${Math.round(top.estimated_loss).toLocaleString("en-IN")} — ${top.title}` : "No material loss detected.",
    root_causes: f.losses.map((l) => `${l.category}: ${l.root_cause}`),
    insights: f.losses.flatMap((l) => l.evidence.slice(0, 2).map((e) => `${l.category} — ${e.label}: ${e.value}`)),
    recommendations: f.losses.map((l) => l.recommendation),
    priority_actions: f.losses
      .slice(0, 3)
      .map((l, i) => `${i + 1}. ${l.recommendation} (estimated potential recovery ₹${Math.round(l.potential_saving).toLocaleString("en-IN")})`),
    source: "fallback" as const,
    note: note ?? "Generated from the deterministic detector output — the AI narrator was unavailable.",
  };
}

export const generateInsights = createServerFn({ method: "POST" })
  .validator((data: unknown) => findingSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["OPENAI_API_KEY"];
    const baseUrl = process.env["OPENAI_BASE_URL"] ?? "https://api.groq.com/openai/v1";

    if (!apiKey) {
      return fallback(data, "API key not configured; showing deterministic analysis.");
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env["OPENAI_MODEL"] ?? "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Analyse this business findings dataset:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("OpenAI API error", response.status, text);
        return fallback(data, `AI service error (${response.status}); falling back to deterministic analysis.`);
      }

      const json = await response.json();
      let rawText: string = json.choices?.[0]?.message?.content ?? "";

      // Strip Markdown code fence blocks if returned by Llama
      rawText = rawText.trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
      }

      const parsed = JSON.parse(rawText);
      return {
        executive_summary: parsed.executive_summary ?? data.narrative,
        top_loss: parsed.top_loss ?? "",
        root_causes: parsed.root_causes ?? [],
        insights: parsed.insights ?? [],
        recommendations: parsed.recommendations ?? [],
        priority_actions: parsed.priority_actions ?? [],
        source: "ai" as const,
      };
    } catch (err) {
      console.error("AI insight generation failed", err);
      return fallback(data, "AI parsing failed; showing deterministic analysis.");
    }
  });
