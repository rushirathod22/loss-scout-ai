import type { Row } from "./types";

/** Deterministic PRNG so the demo dataset is identical on server and client. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ProductSpec {
  product: string;
  category: string;
  unit_cost: number;
  selling_price: number;
  baseDemand: number;
  supplier: string;
  /** purchase multiplier applied on top of expected demand */
  overBuy: number;
  wasteRate: number;
  declinePerDay?: number;
  weekendLift: number;
}

const PRODUCTS: ProductSpec[] = [
  {
    product: "Chicken Bowl",
    category: "Mains",
    unit_cost: 118,
    selling_price: 265,
    baseDemand: 38,
    supplier: "FreshFarm Supplies",
    overBuy: 1.26,
    wasteRate: 0.1,
    weekendLift: 1.22,
  },
  {
    product: "Paneer Sandwich",
    category: "Mains",
    unit_cost: 68,
    selling_price: 175,
    baseDemand: 31,
    supplier: "FreshFarm Supplies",
    overBuy: 1.12,
    wasteRate: 0.05,
    weekendLift: 1.1,
  },
  {
    product: "Garden Salad",
    category: "Fresh",
    unit_cost: 54,
    selling_price: 160,
    baseDemand: 18,
    supplier: "GreenLeaf Farms",
    overBuy: 1.22,
    wasteRate: 0.14,
    weekendLift: 1.05,
  },
  {
    product: "Cold Brew",
    category: "Beverages",
    unit_cost: 38,
    selling_price: 145,
    baseDemand: 46,
    supplier: "Metro Wholesale",
    overBuy: 1.04,
    wasteRate: 0.01,
    weekendLift: 1.3,
  },
  {
    product: "Blueberry Muffin",
    category: "Bakery",
    unit_cost: 32,
    selling_price: 105,
    baseDemand: 26,
    supplier: "Sunrise Bakehouse",
    overBuy: 1.15,
    wasteRate: 0.08,
    declinePerDay: 0.012,
    weekendLift: 1.08,
  },
  {
    product: "Masala Chai",
    category: "Beverages",
    unit_cost: 16,
    selling_price: 70,
    baseDemand: 62,
    supplier: "Metro Wholesale",
    overBuy: 1.03,
    wasteRate: 0.01,
    weekendLift: 1.12,
  },
];

const SUPPLIER_DELIVERY: Record<string, { perDrop: number; dropsPerWeek: number }> = {
  "FreshFarm Supplies": { perDrop: 420, dropsPerWeek: 6 },
  "GreenLeaf Farms": { perDrop: 380, dropsPerWeek: 5 },
  "Metro Wholesale": { perDrop: 260, dropsPerWeek: 2 },
  "Sunrise Bakehouse": { perDrop: 190, dropsPerWeek: 3 },
};

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** 30 days of synthetic UrbanBite Cafe operational data (deterministic). */
export function generateUrbanBiteData(endDateISO = "2026-08-08"): Row[] {
  const rand = mulberry32(20260808);
  const rows: Row[] = [];
  const end = new Date(endDateISO + "T00:00:00Z");

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - dayOffset);
    const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
    const dayIndex = 29 - dayOffset;

    for (const p of PRODUCTS) {
      const isWeekend = dow === 0 || dow === 6;
      const decline = p.declinePerDay ? 1 - p.declinePerDay * dayIndex : 1;
      const noise = 0.88 + rand() * 0.24;
      const demand = p.baseDemand * (isWeekend ? p.weekendLift : 1) * decline * noise;
      const sold = Math.max(0, Math.round(demand));

      // Friday over-ordering: buyers stock up for the weekend on Friday.
      const fridayPush = dow === 5 ? 1.34 : 1;
      const purchased = Math.round(
        p.baseDemand * p.overBuy * fridayPush * (isWeekend ? p.weekendLift : 1) * (0.94 + rand() * 0.14),
      );

      const surplus = Math.max(0, purchased - sold);
      // Perishables spoil: a share of surplus is wasted, more after Friday over-buys.
      const spoilBoost = dow === 6 || dow === 0 ? 1.5 : 1;
      const waste = Math.round(surplus * p.wasteRate * spoilBoost * 10) / 10;
      const inventory_remaining = Math.max(0, Math.round(surplus - waste));

      const sup = SUPPLIER_DELIVERY[p.supplier] ?? { perDrop: 250, dropsPerWeek: 3 };
      const delivers = rand() < sup.dropsPerWeek / 7;
      const delivery_cost = delivers ? Math.round(sup.perDrop * (0.9 + rand() * 0.25)) : 0;

      const due = new Date(d);
      due.setUTCDate(d.getUTCDate() + 7);
      // Catering / corporate tabs: some settle late, mostly with one supplier's cycle.
      const lateRoll = rand();
      let payment_status: Row["payment_status"] = "paid";
      let received = new Date(due);
      if (lateRoll > 0.86) {
        payment_status = "late";
        received.setUTCDate(due.getUTCDate() + 5 + Math.round(rand() * 16));
      } else if (lateRoll > 0.8) {
        payment_status = "pending";
      } else {
        received.setUTCDate(due.getUTCDate() - Math.round(rand() * 2));
      }
      const receivedStr = payment_status === "pending" ? "" : fmt(received);

      rows.push({
        date: fmt(d),
        product: p.product,
        category: p.category,
        quantity_sold: sold,
        quantity_purchased: purchased,
        unit_cost: p.unit_cost,
        selling_price: p.selling_price,
        inventory_remaining,
        waste_quantity: waste,
        supplier: p.supplier,
        delivery_cost,
        payment_status,
        payment_due_date: fmt(due),
        payment_received_date: receivedStr,
      });
    }
  }
  return rows;
}

export const CSV_COLUMNS: (keyof Row)[] = [
  "date",
  "product",
  "category",
  "quantity_sold",
  "quantity_purchased",
  "unit_cost",
  "selling_price",
  "inventory_remaining",
  "waste_quantity",
  "supplier",
  "delivery_cost",
  "payment_status",
  "payment_due_date",
  "payment_received_date",
];

export const REQUIRED_COLUMNS: string[] = [
  "date",
  "product",
  "quantity_sold",
  "quantity_purchased",
  "unit_cost",
  "selling_price",
];

export function toCsv(rows: Row[]): string {
  const head = CSV_COLUMNS.join(",");
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => String(r[c] ?? "")).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}

export class CsvError extends Error {}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeDate(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    // Treat ambiguous values as DD/MM/YYYY unless the first part must be a month.
    const day = Number(a) > 12 ? a : b;
    const month = Number(a) > 12 ? b : a;
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  throw new CsvError(`Could not read the date value "${raw}". Use YYYY-MM-DD.`);
}

function num(raw: string): number {
  if (raw === undefined || raw === null || raw.trim() === "") return 0;
  const n = Number(raw.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) throw new CsvError("The file looks empty — no data rows were found.");
  const header = splitLine(lines[0] ?? "").map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    throw new CsvError(
      `Your file is missing the ${missing.map((m) => `'${m}'`).join(", ")} column${missing.length > 1 ? "s" : ""}.`,
    );
  }
  const idx = (c: string) => header.indexOf(c);
  const get = (cells: string[], c: string) => {
    const i = idx(c);
    return i === -1 ? "" : (cells[i] ?? "");
  };

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i] ?? "");
    const product = get(cells, "product");
    if (!product) continue;
    const status = get(cells, "payment_status").toLowerCase();
    rows.push({
      date: normalizeDate(get(cells, "date")),
      product,
      category: get(cells, "category") || "Uncategorised",
      quantity_sold: num(get(cells, "quantity_sold")),
      quantity_purchased: num(get(cells, "quantity_purchased")),
      unit_cost: num(get(cells, "unit_cost")),
      selling_price: num(get(cells, "selling_price")),
      inventory_remaining: num(get(cells, "inventory_remaining")),
      waste_quantity: num(get(cells, "waste_quantity")),
      supplier: get(cells, "supplier") || "Unknown supplier",
      delivery_cost: num(get(cells, "delivery_cost")),
      payment_status: status === "late" || status === "pending" ? status : "paid",
      payment_due_date: get(cells, "payment_due_date") ? normalizeDate(get(cells, "payment_due_date")) : "",
      payment_received_date: get(cells, "payment_received_date")
        ? normalizeDate(get(cells, "payment_received_date"))
        : "",
    });
  }
  if (!rows.length) throw new CsvError("No usable rows found — every row was missing a product name.");
  return rows;
}
