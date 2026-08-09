# Loss Scout AI (Losscope AI)
> **Tagline:** Find the losses you don't see.

Losscope AI is an **Invisible Loss Discovery Engine** built for SMBs, cafes, and retailers. It analyzes operational CSV dataset transactions to discover hidden financial waste, overstocking, delivery inefficiencies, delayed payments, and demand declines with 6-field auditable evidence.

---

## 🚀 Key Features

1. **5 Non-Overlapping Financial Impact Buckets:**
   - 🔴 **Directly Measured Loss:** Confirmed direct waste from recorded write-offs (`Σ waste_qty × unit_cost`).
   - 🟡 **Estimated Operational Cost:** Freight inefficiency vs 3% baseline + 18% p.a. late payment financing cost.
   - 🟠 **Capital at Risk:** Value of unsold inventory currently on hand (`Σ inventory_remaining × unit_cost`).
   - 🔵 **Revenue Exposure:** Projected forward-looking revenue impact from declining demand trends.

2. **6-Field Auditable AI Evidence Standard:**
   - Every finding shows: `TYPE`, `RAW VALUE`, `ESTIMATED IMPACT`, `FORMULA`, `CONFIDENCE`, and `EVIDENCE`.

3. **Deterministic Formula Engine + LLaMA 3.1 AI Narrator:**
   - Pure math for 100% accurate calculation + Groq LLaMA 3.1 for evidence-backed executive insights.

4. **What-If Simulator & Category-Specific Recovery Breakdown:**
   - Interactive recovery sliders with capped realistic ceilings across 4 distinct economic outcome categories.

---

## 🛠️ Tech Stack

- **Framework:** React + TypeScript + TanStack Start / Vite
- **Styling:** Tailwind CSS + Lucide Icons
- **Data & Charts:** Recharts
- **AI Integration:** Groq OpenAI-compatible Endpoint (`llama-3.1-8b-instant`)

---

## 🏃 Local Setup & Running

```bash
# 1. Clone the repository
git clone https://github.com/rushirathod22/loss-scout-ai.git
cd loss-scout-ai

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# Add your Groq API Key to .env:
# OPENAI_API_KEY=gsk_your_key_here
# OPENAI_BASE_URL=https://api.groq.com/openai/v1
# OPENAI_MODEL=llama-3.1-8b-instant

# 4. Start local dev server
npm run dev
```

Open `http://localhost:8080` in your browser.

---

## 🌐 Live Demo & Pitch Story
1. **Upload / Demo:** Click "Use UrbanBite Demo Data".
2. **Classify:** View 5 transparent financial buckets with zero double-counting.
3. **Investigate:** Drill down into formulas and 6-field evidence.
4. **Simulate:** Test what-if recovery scenarios before taking action.
