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

/**
 * Financial Classification Types:
 * - "Directly Measured Loss": Confirmed sunk cost (e.g. discarded inventory)
 * - "Estimated Operational Cost": Calculated operational inefficiency (e.g. delivery gap, payment financing)
 * - "Capital at Risk": Unsold inventory currently on the shelf (not a loss)
 * - "Revenue Exposure": Potential forward-looking revenue risk from declining demand (not a confirmed loss)
 */
export type LossType =
  | "Directly Measured Loss"
  | "Estimated Operational Cost"
  | "Capital at Risk"
  | "Revenue Exposure";

export type LossClass = "confirmed" | "at_risk" | "leakage";

export interface Loss {
  id: string;
  category: string;
  title: string;
  
  /** 6-Field Standard Properties for Auditable AI */
  lossType: LossType;
  raw_value_text: string;
  estimated_loss: number;
  formulaText: string;
  confidence: number; // 0-100
  evidence: Evidence[];

  raw_actual: number;
  period: string;
  severity: Severity;
  lossClass: LossClass;
  confidence_reason: string;
  summary: string;
  root_cause: string;
  recommendation: string;
  potential_saving: number;
  recovery_rate: number; // 0-1
  impact: number; // 0-100 financial impact score
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
  dayCount: number;
  /** Raw period revenue = Σ(quantity_sold × selling_price). NOT extrapolated. */
  totalRevenue: number;
  dataQuality: number; // 0-100 completeness

  losses: Loss[];

  // ── Financial Overview Architecture ──────────────────────────────────────
  /** 🔴 DIRECTLY MEASURED LOSS: Σ(waste_qty × unit_cost). Confirmed sunk cost. */
  totalDirectlyMeasured: number;

  /** 🟡 ESTIMATED OPERATIONAL COST: Delivery inefficiency + Late Payment financing cost. */
  totalEstimatedOperationalCost: number;

  /** 🟠 CAPITAL AT RISK: Value of unsold inventory on hand. Not a loss. */
  totalCapitalAtRisk: number;

  /** 🔵 REVENUE EXPOSURE: Est. revenue impact from declining demand trend. Not a confirmed loss. */
  totalDemandExposure: number;

  // Individual breakdown amounts for reference
  totalDirectWaste: number;
  totalDeliveryInefficiency: number;
  totalCashFlowRisk: number;

  // ── Category-Specific Potential Recovery Breakdown ──────────────────────
  potentialWasteRecovery: number;
  potentialOperationalCostReduction: number;
  potentialRevenueRecovery: number;
  potentialInventoryOptimization: number;

  /** Sum of estimated operational costs + waste for internal score calculations */
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
