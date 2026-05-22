import { csvCell, normalizeOffer, parseCsvLine, parsePaymentEvidenceCsv } from "./model.js";
import { parseRevenueEvidence } from "./revenue-proof.js";

const PAYMENT_HEADER = ["paid_at", "buyer", "offer", "amount", "ref"];
const OFFER_LABELS = {
  self: "19,000원 셀프툴",
  setup: "49,000원 셋업팩",
  service: "99,000원 대행팩",
  team: "300,000원 팀 브리핑 스프린트"
};

export function mergeLedgerWithEvidence(ledgerText, evidenceText) {
  const sections = splitSections(ledgerText);
  const existing = parseRevenueEvidence(ledgerText);
  const incoming = parsePaymentEvidenceCsv(evidenceText);
  const payments = dedupePayments([...existing, ...incoming]);
  const leads = mergeLeadSection(sections.leads || fallbackLeads(ledgerText), incoming);
  const text = [
    "# leads",
    leads,
    "",
    "# payments",
    PAYMENT_HEADER.map(csvCell).join(","),
    ...payments.map(paymentRow)
  ].join("\n");

  return {
    text,
    added: payments.length - existing.length,
    existing: existing.length,
    incoming: incoming.length,
    total: payments.length
  };
}

export function formatMergeReport(result, outputPath = "") {
  return [
    "# Brief30 ledger merge",
    "",
    `Output: ${outputPath || "stdout"}`,
    `Existing payments: ${result.existing}`,
    `Incoming evidence rows: ${result.incoming}`,
    `Added payments: ${Math.max(result.added, 0)}`,
    `Total payments: ${result.total}`
  ].join("\n");
}

function splitSections(text) {
  const sections = {};
  let current = "";
  for (const rawLine of String(text || "").split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("#")) {
      current = line.replace(/^#+/u, "").trim().toLowerCase();
      sections[current] = "";
      continue;
    }
    if (current) {
      sections[current] += `${rawLine}\n`;
    }
  }
  return sections;
}

function fallbackLeads(text) {
  const lines = String(text || "").split("\n").filter(Boolean);
  const header = parseCsvLine(lines[0] || "").map(normalizeHeader);
  return header.includes("name") && header.includes("offer") ? lines.join("\n") : "name,segment,source,offer,status,next_touch,last_touch,paid_at,paid_amount,payment_ref,note";
}

function mergeLeadSection(text, payments) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return fallbackLeads("");
  }
  const header = parseCsvLine(lines[0]);
  const normalized = header.map(normalizeHeader);
  if (!normalized.includes("name")) {
    return lines.join("\n");
  }
  const paymentByBuyer = new Map(payments.map((item) => [key(item.buyer), item]));
  const rows = lines.slice(1).map((line) => updateLeadRow(header, normalized, parseCsvLine(line), paymentByBuyer));
  return [header.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
}

function updateLeadRow(header, normalized, cells, paymentByBuyer) {
  const row = Object.fromEntries(normalized.map((name, index) => [name, cells[index] || ""]));
  const payment = paymentByBuyer.get(key(row.name));
  if (!payment) {
    return header.map((_, index) => cells[index] || "");
  }
  const updates = {
    offer: offerLabel(payment.offer),
    status: "closed",
    next_touch: "",
    paid_at: payment.paidAt,
    paid_amount: payment.amount,
    payment_ref: payment.ref
  };
  return header.map((_, index) => {
    const column = normalized[index];
    return Object.hasOwn(updates, column) ? updates[column] : cells[index] || "";
  });
}

function dedupePayments(payments) {
  const seen = new Set();
  const rows = [];
  payments.forEach((item) => {
    const id = [item.paidAt, key(item.buyer), Number(item.amount || 0), item.ref].join("|");
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    rows.push(item);
  });
  return rows.sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));
}

function paymentRow(item) {
  return [
    item.paidAt,
    item.buyer,
    offerLabel(item.offer),
    item.amount,
    item.ref
  ].map(csvCell).join(",");
}

function offerLabel(value) {
  return OFFER_LABELS[normalizeOffer(value)] || value || OFFER_LABELS.setup;
}

function key(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "_");
}
