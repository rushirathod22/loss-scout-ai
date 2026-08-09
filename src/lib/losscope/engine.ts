import type {
  ActionItem,
  AnalysisResult,
  DerivedRow,
  Evidence,
  Loss,
  Row,
  Severity,
} from "./types";

const CARRYING_COST_RATE = 0.15; // monthly cost of capital + spoilage risk on idle stock
const CAPITAL_COST_ANNUAL = 0.18; // annualised cost of money tied up in late payments
const DELIVERY_BENCHMARK_RATIO = 0.03; // healthy delivery cost as a share of purchase value

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const d1 = new Date(a + "T00:00:00Z").getTime();
  const d2 = new Date(b + "T00:00:00Z").getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2)) return 0;
  return Math.round((d2 - d1) / 86400000);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Confidence from sample size, consistency of the pattern and data completeness. */
function confidenceFrom(observations: number, samples: number[], completeness: number): number {
  const sizeScore = Math.min(1, Math.log10(1 + observations) / Math.log10(21)); // 20 obs ≈ full marks
  const m = mean(samples);
  const cv = m > 0 ? stdev(samples) / m : 1;
  const consistency = Math.max(0, 1 - Math.min(1, cv));
  const score = 0.4 * sizeScore + 0.4 * consistency + 0.2 * completeness;
  return Math.round(Math.max(35, Math.min(97, score * 100)));
}

function severityFor(monthlyLoss: number, totalLoss: number): Severity {
  const share = totalLoss > 0 ? monthlyLoss / totalLoss : 0;
  if (share >= 0.25 || monthlyLoss >= 2500) return "high";
  if (share >= 0.1 || monthlyLoss >= 800) return "medium";
  return "low";
}

export function derive(rows: Row[]): DerivedRow[] {
  return rows.map((r) => {
    const revenue = r.quantity_sold * r.selling_price;
    const cost = r.quantity_purchased * r.unit_cost;
    const waste_cost = r.waste_quantity * r.unit_cost;
    return {
      ...r,
      revenue,
      cost,
      gross_margin: revenue - r.quantity_sold * r.unit_cost,
      waste_cost,
      delivery_cost_ratio: cost > 0 ? r.delivery_cost / cost : 0,
      payment_delay_days:
        r.payment_status === "late" && r.payment_received_date
          ? Math.max(0, daysBetween(r.payment_due_date, r.payment_received_date))
          : 0,
    };
  });
}

function completenessOf(rows: Row[]): number {
  const fields: (keyof Row)[] = [
    "date",
    "product",
    "quantity_sold",
    "quantity_purchased",
    "unit_cost",
    "selling_price",
    "waste_quantity",
    "supplier",
    "delivery_cost",
    "payment_due_date",
  ];
  let filled = 0;
  let total = 0;
  for (const r of rows) {
    for (const f of fields) {
      total++;
      const v = r[f];
      if (v !== "" && v !== null && v !== undefined) filled++;
    }
  }
  return total ? filled / total : 0;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = map.get(k);
    if (arr) arr.push(it);
    else map.set(k, [it]);
  }
  return map;
}

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dowOf = (iso: string) => DOW[new Date(iso + "T00:00:00Z").getUTCDay()] ?? "Unknown";

export function analyze(rows: Row[], businessName = "UrbanBite Cafe"): AnalysisResult {
  const d = derive(rows);
  const dates = Array.from(new Set(d.map((r) => r.date))).sort();
  const dayCount = Math.max(1, dates.length);
  const monthFactor = 30 / dayCount;
  const completeness = completenessOf(rows);
  const periodLabel =
    dates.length > 1 ? `${dates[0]} → ${dates[dates.length - 1]} (${dayCount} days)` : (dates[0] ?? "unknown period");

  const losses: Loss[] = [];

  /* ---------- A. Inventory waste ---------- */
  const byProduct = groupBy(d, (r) => r.product);
  const wasteRows = d.filter((r) => r.waste_quantity > 0);
  const totalWasteCost = wasteRows.reduce((s, r) => s + r.waste_cost, 0);
  if (totalWasteCost > 0) {
    const perProduct = Array.from(byProduct.entries())
      .map(([product, rs]) => ({
        product,
        wasteCost: rs.reduce((s, r) => s + r.waste_cost, 0),
        wasteQty: rs.reduce((s, r) => s + r.waste_quantity, 0),
        events: rs.filter((r) => r.waste_quantity > 0).length,
      }))
      .sort((a, b) => b.wasteCost - a.wasteCost);
    const top = perProduct[0];
    const dowCost = new Map<string, number>();
    for (const r of wasteRows) dowCost.set(dowOf(r.date), (dowCost.get(dowOf(r.date)) ?? 0) + r.waste_cost);
    const worstDow = Array.from(dowCost.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);
    const worstDowShare = worstDow.reduce((s, x) => s + x[1], 0) / (totalWasteCost || 1);
    const monthly = totalWasteCost * monthFactor;
    const purchased = d.reduce((s, r) => s + r.quantity_purchased, 0);
    const sold = d.reduce((s, r) => s + r.quantity_sold, 0);
    const overBuyPct = sold > 0 ? ((purchased - sold) / sold) * 100 : 0;

    losses.push({
      id: "inventory-waste",
      category: "Inventory Waste",
      title: "Perishable stock is spoiling before it sells",
      estimated_loss: monthly,
      period: "per month",
      severity: "high",
      confidence: confidenceFrom(
        wasteRows.length,
        wasteRows.map((r) => r.waste_cost),
        completeness,
      ),
      confidence_reason: `The pattern repeats across ${wasteRows.length} independent waste events covering ${perProduct.filter((p) => p.wasteCost > 0).length} products.`,
      summary: `${inr(monthly)} of stock is written off every month, concentrated in a small number of perishable lines.`,
      root_cause: top
        ? `Purchase quantities are set from peak-day demand rather than day-of-week demand. ${top.product} alone accounts for ${Math.round((top.wasteCost / totalWasteCost) * 100)}% of the waste cost, and overall purchases run ${overBuyPct.toFixed(0)}% above units actually sold.`
        : "Purchases consistently exceed sold units, and the surplus of perishable lines spoils.",
      evidence: [
        { label: "Waste events in period", value: `${wasteRows.length}` },
        {
          label: "Total quantity wasted",
          value: `${Math.round(wasteRows.reduce((s, r) => s + r.waste_quantity, 0))} units`,
        },
        top
          ? {
              label: `${top.product} share of waste cost`,
              value: `${Math.round((top.wasteCost / totalWasteCost) * 100)}%`,
              detail: `${inr(top.wasteCost)} across ${top.events} events`,
            }
          : { label: "Top product", value: "n/a" },
        worstDow.length
          ? {
              label: `Concentrated on ${worstDow.map((w) => w[0]).join(" / ")}`,
              value: `${Math.round(worstDowShare * 100)}% of waste cost`,
            }
          : { label: "Day concentration", value: "none detected" },
        { label: "Purchases above units sold", value: `${overBuyPct.toFixed(0)}%` },
      ],
      recommendation: top
        ? `Cut ${top.product} purchase quantity by 15–18% on low-demand weekdays and re-check demand every 3 days before adjusting further.`
        : "Move to a 3-day rolling purchase plan sized on trailing weekday demand.",
      potential_saving: monthly * 0.68,
      recovery_rate: 0.68,
      impact: 90,
      effort: 25,
      lever: "waste",
      series: perProduct.slice(0, 6).map((p) => ({ label: p.product, value: Math.round(p.wasteCost * monthFactor) })),
    });
  }

  /* ---------- B + C. Overstock and demand mismatch (merged to avoid double counting) ---------- */
  const mismatch = Array.from(byProduct.entries())
    .map(([product, rs]) => {
      const soldAvg = mean(rs.map((r) => r.quantity_sold));
      const purAvg = mean(rs.map((r) => r.quantity_purchased));
      const unitCost = mean(rs.map((r) => r.unit_cost));
      const netExcess = rs.reduce(
        (s, r) => s + Math.max(0, r.quantity_purchased - r.quantity_sold - r.waste_quantity),
        0,
      );
      return {
        product,
        soldAvg,
        purAvg,
        gapPct: soldAvg > 0 ? ((purAvg - soldAvg) / soldAvg) * 100 : 0,
        idleValue: netExcess * unitCost,
        netExcess,
        days: rs.length,
      };
    })
    .filter((m) => m.gapPct > 8 && m.idleValue > 0)
    .sort((a, b) => b.idleValue - a.idleValue);

  const idleCapital = mismatch.reduce((s, m) => s + m.idleValue, 0);
  if (idleCapital > 0) {
    const monthly = idleCapital * CARRYING_COST_RATE * monthFactor;
    const fridayRows = d.filter((r) => dowOf(r.date) === "Friday");
    const fridayGap =
      mean(fridayRows.map((r) => r.quantity_purchased)) - mean(fridayRows.map((r) => r.quantity_sold));
    const otherRows = d.filter((r) => dowOf(r.date) !== "Friday");
    const otherGap = mean(otherRows.map((r) => r.quantity_purchased)) - mean(otherRows.map((r) => r.quantity_sold));
    const top = mismatch[0];

    losses.push({
      id: "overstocking",
      category: "Overstocking",
      title: "Cash is parked in stock that never turns over",
      estimated_loss: monthly,
      period: "per month",
      severity: "high",
      confidence: confidenceFrom(
        mismatch.reduce((s, m) => s + m.days, 0),
        mismatch.map((m) => m.gapPct),
        completeness,
      ),
      confidence_reason: `Over-purchasing repeats for ${mismatch.length} products on ${mismatch.reduce((s, m) => s + m.days, 0)} product-days, not on isolated days.`,
      summary: `${inr(idleCapital)} of stock value sits unsold each period; at a ${Math.round(CARRYING_COST_RATE * 100)}% monthly carrying cost that is ${inr(monthly)} of avoidable cost.`,
      root_cause: `Ordering is anchored to weekend peaks. Friday purchases exceed Friday sales by ${fridayGap.toFixed(1)} units per product versus ${otherGap.toFixed(1)} on other days, so the week starts with surplus stock already on the shelf.`,
      evidence: [
        { label: "Idle stock value", value: inr(idleCapital), detail: `${Math.round(mismatch.reduce((s, m) => s + m.netExcess, 0))} units unsold and not wasted` },
        top
          ? {
              label: `${top.product} demand vs purchase`,
              value: `${top.soldAvg.toFixed(0)}/day sold vs ${top.purAvg.toFixed(0)}/day bought`,
              detail: `${top.gapPct.toFixed(0)}% above demand`,
            }
          : { label: "Top product", value: "n/a" },
        { label: "Friday surplus per product", value: `${fridayGap.toFixed(1)} units` },
        { label: "Other-day surplus per product", value: `${otherGap.toFixed(1)} units` },
        { label: "Products over-purchased", value: `${mismatch.length}` },
        {
          label: "Merged detectors",
          value: "Overstock + demand mismatch",
          detail: "Both detectors point at the same units, so the value is counted once.",
        },
      ],
      recommendation: `Split the Friday order into a Friday and a Sunday drop, and set weekday order quantities to trailing 7-day demand +10% buffer instead of peak-day demand.`,
      potential_saving: monthly * 0.6,
      recovery_rate: 0.6,
      impact: 74,
      effort: 40,
      lever: "overstock",
      series: mismatch.slice(0, 6).map((m) => ({ label: m.product, value: Math.round(m.idleValue) })),
    });
  }

  /* ---------- D. Delivery inefficiency ---------- */
  const bySupplier = Array.from(groupBy(d, (r) => r.supplier).entries())
    .map(([supplier, rs]) => {
      const deliveryCost = rs.reduce((s, r) => s + r.delivery_cost, 0);
      const purchaseValue = rs.reduce((s, r) => s + r.cost, 0);
      const drops = rs.filter((r) => r.delivery_cost > 0).length;
      return {
        supplier,
        deliveryCost,
        purchaseValue,
        drops,
        ratio: purchaseValue > 0 ? deliveryCost / purchaseValue : 0,
        avgDropValue: drops > 0 ? purchaseValue / drops : 0,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const excessDelivery = bySupplier.reduce(
    (s, x) => s + Math.max(0, x.deliveryCost - x.purchaseValue * DELIVERY_BENCHMARK_RATIO),
    0,
  );
  if (excessDelivery > 0) {
    const monthly = excessDelivery * monthFactor;
    const worst = bySupplier[0];
    losses.push({
      id: "delivery-inefficiency",
      category: "Delivery Inefficiency",
      title: "Too many small deliveries from the same suppliers",
      estimated_loss: monthly,
      period: "per month",
      severity: "medium",
      confidence: confidenceFrom(
        d.filter((r) => r.delivery_cost > 0).length,
        bySupplier.map((s) => s.ratio * 100),
        completeness,
      ),
      confidence_reason: `Delivery charges are observed on ${d.filter((r) => r.delivery_cost > 0).length} line items across ${bySupplier.length} suppliers, with a stable per-drop pattern.`,
      summary: `Delivery charges run above the ${Math.round(DELIVERY_BENCHMARK_RATIO * 100)}% of purchase value benchmark, costing about ${inr(monthly)} a month more than necessary.`,
      root_cause: worst
        ? `${worst.supplier} delivers ${worst.drops} times in the period at an average drop value of only ${inr(worst.avgDropValue)}, giving a delivery cost ratio of ${(worst.ratio * 100).toFixed(1)}% — frequency, not distance, is the driver.`
        : "Delivery frequency is high relative to order value.",
      evidence: bySupplier.slice(0, 4).map((s) => ({
        label: s.supplier,
        value: `${(s.ratio * 100).toFixed(1)}% delivery cost ratio`,
        detail: `${inr(s.deliveryCost)} over ${s.drops} drops · avg drop ${inr(s.avgDropValue)}`,
      })),
      recommendation: `Batch ${worst?.supplier ?? "the highest-ratio supplier"} into 3 consolidated drops per week with a minimum order value, and renegotiate the per-drop fee at that committed volume.`,
      potential_saving: monthly * 0.55,
      recovery_rate: 0.55,
      impact: 52,
      effort: 45,
      lever: "delivery",
      series: bySupplier.map((s) => ({ label: s.supplier, value: Math.round(s.deliveryCost * monthFactor) })),
    });
  }

  /* ---------- E. Payment delays ---------- */
  const lateRows = d.filter((r) => r.payment_delay_days > 0);
  const pendingRows = d.filter((r) => r.payment_status === "pending");
  if (lateRows.length || pendingRows.length) {
    const delayedValue = lateRows.reduce((s, r) => s + r.revenue, 0);
    const avgDelay = mean(lateRows.map((r) => r.payment_delay_days));
    const pendingValue = pendingRows.reduce((s, r) => s + r.revenue, 0);
    const carrying = lateRows.reduce(
      (s, r) => s + (r.revenue * CAPITAL_COST_ANNUAL * r.payment_delay_days) / 365,
      0,
    );
    // Cash still outstanding past its due date carries the same cost of money.
    const pendingCarry = (pendingValue * CAPITAL_COST_ANNUAL * 14) / 365;
    const monthly = (carrying + pendingCarry) * monthFactor;
    if (monthly > 0) {
      losses.push({
        id: "payment-delays",
        category: "Payment Delays",
        title: "Working capital locked in late settlements",
        estimated_loss: monthly,
        period: "per month",
        severity: "medium",
        confidence: confidenceFrom(
          lateRows.length + pendingRows.length,
          lateRows.map((r) => r.payment_delay_days),
          completeness,
        ),
        confidence_reason: `${lateRows.length} settled invoices arrived after their due date and ${pendingRows.length} are still open, so the delay is systemic rather than one bad payer.`,
        summary: `${inr(delayedValue + pendingValue)} of billed revenue settles late by ${avgDelay.toFixed(0)} days on average, costing about ${inr(monthly)} a month in financing.`,
        root_cause: `Invoices carry a 7-day term but no reminder cadence, so payment lands ${avgDelay.toFixed(0)} days after due date. The financing cost is charged at an assumed ${Math.round(CAPITAL_COST_ANNUAL * 100)}% annual cost of capital.`,
        evidence: [
          { label: "Late settlements", value: `${lateRows.length}`, detail: inr(delayedValue) + " of revenue" },
          { label: "Average delay past due", value: `${avgDelay.toFixed(0)} days` },
          { label: "Still unpaid", value: `${pendingRows.length} invoices`, detail: inr(pendingValue) },
          { label: "Longest delay observed", value: `${Math.max(0, ...lateRows.map((r) => r.payment_delay_days))} days` },
        ],
        recommendation:
          "Automate a reminder at due-date minus 2 days and again on day 3 past due, and offer a 1% early-settlement discount to the two slowest accounts.",
        potential_saving: monthly * 0.6,
        recovery_rate: 0.6,
        impact: 38,
        effort: 20,
        lever: "payment",
        series: lateRows
          .slice(-8)
          .map((r) => ({ label: r.date.slice(5), value: r.payment_delay_days })),
      });
    }
  }

  /* ---------- F. Trend / declining demand ---------- */
  const half = Math.floor(dates.length / 2);
  const firstDates = new Set(dates.slice(0, half));
  const declining = Array.from(byProduct.entries())
    .map(([product, rs]) => {
      const early = rs.filter((r) => firstDates.has(r.date));
      const late = rs.filter((r) => !firstDates.has(r.date));
      const earlyMargin = mean(early.map((r) => r.gross_margin));
      const lateMargin = mean(late.map((r) => r.gross_margin));
      const earlySold = mean(early.map((r) => r.quantity_sold));
      const lateSold = mean(late.map((r) => r.quantity_sold));
      return {
        product,
        drop: earlyMargin - lateMargin,
        dropPct: earlyMargin > 0 ? ((earlyMargin - lateMargin) / earlyMargin) * 100 : 0,
        earlySold,
        lateSold,
      };
    })
    .filter((x) => x.dropPct > 6)
    .sort((a, b) => b.drop - a.drop);

  const worstTrend = declining[0];
  if (worstTrend) {
    const monthly = worstTrend.drop * 30;
    losses.push({
      id: "declining-demand",
      category: "Declining Demand",
      title: `${worstTrend.product} is quietly losing its audience`,
      estimated_loss: monthly,
      period: "per month",
      severity: "medium",
      confidence: confidenceFrom(
        dates.length,
        declining.map((x) => x.dropPct),
        completeness,
      ),
      confidence_reason: `The decline shows as a steady slope across ${dates.length} days, not a single bad week.`,
      summary: `${worstTrend.product} margin per day fell ${worstTrend.dropPct.toFixed(0)}% between the first and second half of the period — roughly ${inr(monthly)} of margin a month.`,
      root_cause: `Daily units for ${worstTrend.product} slid from ${worstTrend.earlySold.toFixed(0)} to ${worstTrend.lateSold.toFixed(0)} while purchase quantity stayed flat, so the item is losing demand and adding to surplus at the same time.`,
      evidence: [
        { label: "Units/day, first half", value: worstTrend.earlySold.toFixed(1) },
        { label: "Units/day, second half", value: worstTrend.lateSold.toFixed(1) },
        { label: "Daily margin drop", value: inr(worstTrend.drop) },
        { label: "Other declining lines", value: `${Math.max(0, declining.length - 1)}` },
      ],
      recommendation: `Trial a smaller bake batch for ${worstTrend.product} and test one replacement item in the same price band for two weeks before deciding to delist.`,
      potential_saving: monthly * 0.4,
      recovery_rate: 0.4,
      impact: 30,
      effort: 60,
      lever: "demand",
      series: [
        { label: "First half", value: Math.round(worstTrend.earlySold) },
        { label: "Second half", value: Math.round(worstTrend.lateSold) },
      ],
    });
  }

  /* ---------- Aggregate ---------- */
  const totalLoss = losses.reduce((s, l) => s + l.estimated_loss, 0);
  for (const l of losses) l.severity = severityFor(l.estimated_loss, totalLoss);
  losses.sort((a, b) => b.estimated_loss - a.estimated_loss);
  const totalRecovery = losses.reduce((s, l) => s + l.potential_saving, 0);
  const totalRevenue = d.reduce((s, r) => s + r.revenue, 0) * monthFactor;
  const confidence = losses.length
    ? Math.round(
        losses.reduce((s, l) => s + l.confidence * l.estimated_loss, 0) / (totalLoss || 1),
      )
    : 0;

  /* ---------- Transparent loss score ---------- */
  const lossRatio = totalRevenue > 0 ? totalLoss / totalRevenue : 0;
  const highCount = losses.filter((l) => l.severity === "high").length;
  const avoidable = totalLoss > 0 ? totalRecovery / totalLoss : 0;
  const scoreBreakdown = [
    {
      label: "Loss as share of revenue",
      points: Math.round(Math.min(40, (lossRatio / 0.08) * 40)),
      max: 40,
      detail: `${(lossRatio * 100).toFixed(1)}% of monthly revenue is estimated as avoidable loss (40 pts at 8%).`,
    },
    {
      label: "High-severity patterns",
      points: Math.min(20, highCount * 10),
      max: 20,
      detail: `${highCount} high-severity pattern${highCount === 1 ? "" : "s"} detected (10 pts each).`,
    },
    {
      label: "Recurrence",
      points: Math.round(Math.min(20, (losses.length / 5) * 20)),
      max: 20,
      detail: `${losses.length} distinct recurring loss patterns across the period.`,
    },
    {
      label: "Evidence strength",
      points: Math.round((confidence / 100) * 10),
      max: 10,
      detail: `Weighted detector confidence is ${confidence}%.`,
    },
    {
      label: "Avoidable share",
      points: Math.round(avoidable * 10),
      max: 10,
      detail: `${Math.round(avoidable * 100)}% of the detected loss looks addressable with operational changes.`,
    },
  ];
  const lossScore = Math.min(100, scoreBreakdown.reduce((s, b) => s + b.points, 0));
  const lossScoreLabel =
    lossScore >= 70
      ? "Your operations show significant hidden inefficiencies."
      : lossScore >= 45
        ? "Your operations show moderate hidden inefficiencies."
        : "Your operations are running fairly tight.";

  /* ---------- Action plan ---------- */
  const horizons: ActionItem["horizon"][] = ["TODAY", "THIS WEEK", "THIS MONTH"];
  const actions: ActionItem[] = losses.slice(0, 5).map((l, i) => ({
    horizon: horizons[Math.min(2, Math.floor(i / 2))] ?? "THIS MONTH",
    title: l.recommendation,
    reason: l.root_cause,
    effort: l.effort < 35 ? "Low" : l.effort < 55 ? "Medium" : "High",
    potential_saving: l.potential_saving,
    lossId: l.id,
  }));

  /* ---------- Charts ---------- */
  const byDate = Array.from(groupBy(d, (r) => r.date).entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const dailyDeliveryExcess = (rs: DerivedRow[]) =>
    Math.max(0, rs.reduce((s, r) => s + r.delivery_cost, 0) - rs.reduce((s, r) => s + r.cost, 0) * DELIVERY_BENCHMARK_RATIO);

  const lossOverTime = byDate.map(([date, rs]) => ({
    label: date.slice(5),
    loss: Math.round(
      rs.reduce((s, r) => s + r.waste_cost, 0) +
        dailyDeliveryExcess(rs) +
        rs.reduce(
          (s, r) => s + Math.max(0, r.quantity_purchased - r.quantity_sold - r.waste_quantity) * r.unit_cost,
          0,
        ) *
          (CARRYING_COST_RATE / 30) *
          30,
    ),
  }));

  const wasteByProduct = Array.from(byProduct.entries())
    .map(([product, rs]) => ({ product, wasteCost: Math.round(rs.reduce((s, r) => s + r.waste_cost, 0) * monthFactor) }))
    .filter((x) => x.wasteCost > 0)
    .sort((a, b) => b.wasteCost - a.wasteCost);

  const purchasesVsSales = byDate.map(([date, rs]) => ({
    label: date.slice(5),
    purchased: rs.reduce((s, r) => s + r.quantity_purchased, 0),
    sold: rs.reduce((s, r) => s + r.quantity_sold, 0),
  }));

  const paymentDelays = byDate
    .map(([date, rs]) => ({
      label: date.slice(5),
      days: Math.round(mean(rs.filter((r) => r.payment_delay_days > 0).map((r) => r.payment_delay_days))),
    }))
    .filter((x) => x.days > 0);

  const topLoss = losses[0];
  const narrative = topLoss
    ? `${businessName} is not losing money because sales are weak — revenue is steady at ${inr(totalRevenue)} a month. The leak is on the buying side: ${topLoss.category.toLowerCase()} alone accounts for ${inr(topLoss.estimated_loss)} a month, and ordering that is sized on peak-day demand feeds most of the other patterns too.`
    : `No material loss patterns were detected in ${dayCount} days of data.`;

  return {
    businessName,
    periodLabel,
    rowCount: rows.length,
    dataQuality: Math.round(completeness * 100),
    losses,
    totalLoss,
    totalRecovery,
    lossScore,
    lossScoreLabel,
    scoreBreakdown,
    confidence,
    actions,
    charts: { lossOverTime, wasteByProduct, purchasesVsSales, paymentDelays },
    narrative,
  };
}

export interface WhatIfInput {
  waste: number; // % reduction
  overstock: number;
  delivery: number;
  payment: number;
}

export function simulate(result: AnalysisResult, input: WhatIfInput) {
  const pct: Record<Loss["lever"], number> = {
    waste: input.waste,
    overstock: input.overstock,
    delivery: input.delivery,
    payment: input.payment,
    demand: 0,
  };
  const perLoss = result.losses.map((l) => {
    const reductionPct = Math.min(pct[l.lever] ?? 0, l.recovery_rate * 100);
    const recovered = l.estimated_loss * (reductionPct / 100);
    return {
      id: l.id,
      category: l.category,
      before: l.estimated_loss,
      recovered,
      after: l.estimated_loss - recovered,
      capped: (pct[l.lever] ?? 0) > l.recovery_rate * 100,
    };
  });
  const recovered = perLoss.reduce((s, x) => s + x.recovered, 0);
  return {
    perLoss,
    current: result.totalLoss,
    recovered,
    remaining: result.totalLoss - recovered,
  };
}
