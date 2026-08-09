# Losscope AI — Project Guidelines

- Maintain clean 5-bucket financial classification (Directly Measured Loss, Estimated Operational Cost, Capital at Risk, Revenue Exposure, Cash-flow Risk).
- Ensure all findings follow 6-field auditable AI standard: `TYPE`, `RAW VALUE`, `ESTIMATED IMPACT`, `FORMULA`, `CONFIDENCE`, `EVIDENCE`.
- Keep calculations deterministic in `engine.ts` with Groq LLaMA 3.1 narrative reasoning in `ai.functions.ts`.
