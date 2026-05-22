import { TARGET_KRW, formatKrw, parseCsvLine } from "./model.js";

const REQUIRED_PAYMENT_FIELDS = ["buyer", "offer", "amount"];
const REF_FIELDS = ["ref", "payment_ref", "payment_route", "order_ref"];

export function auditRevenueEvidence(text, options = {}) {
  const target = Number(options.target || TARGET_KRW);
  const month = options.month || monthKey(options.date || new Date());
  const payments = parseRevenueEvidence(text);
  const qualified = [];
  const unverified = [];
  const ignored = [];

  payments.forEach((item) => {
    const issues = paymentIssues(item, month);
    if (!item.paidAt.startsWith(month)) {
      ignored.push({ ...item, reason: "outside_month" });
      return;
    }
    if (issues.length) {
      unverified.push({ ...item, issues });
      return;
    }
    qualified.push(item);
  });

  const revenue = qualified.reduce((total, item) => total + item.amount, 0);
  return {
    target,
    month,
    payments,
    qualified,
    unverified,
    ignored,
    revenue,
    gap: Math.max(target - revenue, 0),
    reached: revenue >= target
  };
}

export function parseRevenueEvidence(text) {
  const payments = [];
  let section = "";
  let header = null;

  for (const rawLine of String(text || "").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("#")) {
      section = line.replace(/^#+/u, "").trim().toLowerCase();
      header = null;
      continue;
    }
    const cells = parseCsvLine(line);
    const normalized = cells.map(normalizeHeader);
    if (isPaymentHeader(normalized, section)) {
      header = normalized;
      continue;
    }
    if (!header) {
      continue;
    }
    const item = paymentFromCells(header, cells);
    if (item) {
      payments.push(item);
    }
  }

  return payments;
}

export function formatRevenueAudit(result, ledgerPath = "") {
  const status = result.reached ? "PASS" : "FAIL";
  return [
    "# Brief30 revenue audit",
    "",
    `Ledger: ${ledgerPath || "stdin"}`,
    `Month: ${result.month}`,
    `Target: ${formatKrw(result.target)}`,
    `Qualified revenue: ${formatKrw(result.revenue)}`,
    `Gap: ${formatKrw(result.gap)}`,
    `Qualified payments: ${result.qualified.length}`,
    `Unverified current-month rows: ${result.unverified.length}`,
    `Ignored outside-month rows: ${result.ignored.length}`,
    "",
    `${status} revenue target: ${result.reached ? "monthly target reached" : "monthly target not reached"}`,
    ...unverifiedLines(result.unverified)
  ].join("\n");
}

function paymentFromCells(header, cells) {
  const row = Object.fromEntries(header.map((key, index) => [key, cells[index] || ""]));
  if (!REQUIRED_PAYMENT_FIELDS.every((field) => row[field])) {
    return null;
  }
  const amount = Number(String(row.amount || "").replace(/[^\d]/g, ""));
  const ref = REF_FIELDS.map((field) => row[field]).find(Boolean) || "";
  return {
    paidAt: row.paid_at || "",
    buyer: row.buyer || "",
    offer: row.offer || "",
    amount,
    ref
  };
}

function isPaymentHeader(cells, section) {
  if (section && section !== "payments") {
    return false;
  }
  return REQUIRED_PAYMENT_FIELDS.every((field) => cells.includes(field)) && cells.includes("paid_at");
}

function paymentIssues(item, month) {
  return [
    !item.paidAt.startsWith(month) ? "paid_at" : "",
    item.amount <= 0 ? "amount" : "",
    !item.buyer ? "buyer" : "",
    !item.ref ? "ref" : ""
  ].filter(Boolean);
}

function unverifiedLines(rows) {
  if (!rows.length) {
    return [];
  }
  return [
    "",
    "Unverified rows:",
    ...rows.slice(0, 8).map((item) => `- ${item.buyer || "buyer missing"}: ${item.issues.join(", ")}`)
  ];
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "_");
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}
