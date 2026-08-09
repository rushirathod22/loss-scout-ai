export interface Row {
  date: string; // YYYY-MM-DD
  product: string;
  category: string;
  quantity_sold: number;
  quantity_purchased: number;
  unit_cost: number;
  selling_price: number;
  inventory_remaining: number;
  waste_quantity: number;
  supplier: string;
  delivery_cost: number;
  payment_status: "paid" | "pending" | "late";
  payment_due_date: string;
  payment_received_date: string; // "" when not received
}

export interface DerivedRow extends Row {
  revenue: number;
  cost: number;
  gross_margin: number;
  waste_cost: number;
  delivery_cost_ratio: number;
  payment_delay_days: number;
}

export interface Evidence {
  label: string;
  value: string;
  detail?: string;
}

export type Severity = "high" | "medium" | "low";

export interface Loss {
  id: string;
  category: string;
  title: string;
  estimated_loss: number; // per month
  period: string;
  severity: Severity;
  confidence: number; // 0-100
  confidence_reason: string;
  summary: string;
  root_cause: string;
  evidence: Evidence[];
  recommendation: string;
  potential_saving: number;
  recovery_rate: number; // 0-1
  impact: number; // 0-100 financial impact
  effort: number; // 0-100 implementation difficulty
  lever: "waste" | "overstock" | "delivery" | "payment" | "demand";
  series: { label: string; value: number }[];
}

export interface ActionItem {
  horizon: "TODAY" | "THIS WEEK" | "THIS MONTH";
  title: string;
  reason: string;
  effort: "Low" | "Medium" | "High";
  potential_saving: number;
  lossId: string;
}

export interface AnalysisResult {
  businessName: string;
  periodLabel: string;
  rowCount: number;
  dataQuality: number; // 0-100 completeness
  losses: Loss[];
  totalLoss: number;
  totalRecovery: number;
  lossScore: number;
  lossScoreLabel: string;
  scoreBreakdown: { label: string; points: number; max: number; detail: string }[];
  confidence: number;
  actions: ActionItem[];
  charts: {
    lossOverTime: { label: string; loss: number }[];
    wasteByProduct: { product: string; wasteCost: number }[];
    purchasesVsSales: { label: string; purchased: number; sold: number }[];
    paymentDelays: { label: string; days: number }[];
  };
  narrative: string;
}

export interface AiInsights {
  executive_summary: string;
  top_loss: string;
  root_causes: string[];
  insights: string[];
  recommendations: string[];
  priority_actions: string[];
  source: "ai" | "fallback";
  note?: string;
}
