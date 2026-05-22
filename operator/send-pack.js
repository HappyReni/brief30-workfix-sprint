import { generateProspects, SEGMENTS, SOURCES } from "../prospecting/data.js";
import { buildAllMessages, buildOperatorCsv, buildOutboxRows, normalizeUrls } from "../outbox/messages.js";

const TARGET_KRW = 300000;
const OFFER_PRICES = {
  self: 19000,
  setup: 49000,
  service: 99000,
  team: 300000
};

const FOCUS_SEGMENTS = {
  mixed: ["agency", "consultant", "freelancer", "office", "founder"],
  service: ["agency", "consultant", "freelancer"],
  team: ["office", "founder", "agency", "consultant"],
  setup: ["office", "founder", "consultant"],
  self: ["office", "freelancer", "founder"]
};

const DEFAULT_SOURCES = ["previous_client", "referral", "direct_dm", "community", "social_post"];

export function buildSendPack(options = {}) {
  const count = boundedCount(options.count);
  const focus = normalizeFocus(options.focus);
  const segments = normalizeList(options.segments, FOCUS_SEGMENTS[focus], SEGMENTS);
  const sources = normalizeList(options.sources, DEFAULT_SOURCES, SOURCES);
  const publicUrl = normalizePublicUrl(options.publicUrl);
  const paymentStatus = normalizePaymentStatus(options.paymentStatus);
  const prospects = buildProspects({ count, focus, segments, sources });
  const rows = buildOutboxRows(prospects, normalizeNames(options.names), normalizeUrls(publicUrl));
  return {
    count,
    focus,
    publicUrl,
    paymentStatus,
    sendGate: buildSendGate(paymentStatus),
    expectedReplies: Math.max(1, Math.round(rows.length * 0.12)),
    rows,
    operatorCsv: buildOperatorCsv(rows),
    messages: buildAllMessages(rows),
    offerCounts: countOffers(rows),
    sourceCounts: countBy(rows, "source"),
    closeMath: buildCloseMath(),
    firstActions: buildFirstActions(rows)
  };
}

export function formatSendPack(pack) {
  return [
    "# Brief30 Send Pack",
    "",
    `Public URL: ${pack.publicUrl}`,
    `Focus: ${pack.focus}`,
    `Payment route: ${formatPaymentStatus(pack.paymentStatus)}`,
    `Send gate: ${pack.sendGate}`,
    `Messages: ${pack.rows.length}`,
    `Expected replies: ${pack.expectedReplies}`,
    "",
    "## Monthly close math",
    ...pack.closeMath.map((item) => `- ${item.offer}: ${item.required}건 = ${item.total.toLocaleString("ko-KR")}원`),
    "",
    "## Offer mix",
    ...Object.entries(pack.offerCounts).map(([offer, count]) => `- ${offer}: ${count}`),
    "",
    "## Source mix",
    ...Object.entries(pack.sourceCounts).map(([source, count]) => `- ${source}: ${count}`),
    "",
    "## First 5 sends",
    ...pack.firstActions.map((row, index) => `${index + 1}. ${row.name} / ${row.offerLabel} / ${row.note}`),
    "",
    "## Copy block",
    pack.messages,
    "",
    "## Operator import CSV",
    "```csv",
    pack.operatorCsv,
    "```"
  ].join("\n");
}

function buildProspects({ count, focus, segments, sources }) {
  const counters = new Map();
  return Array.from({ length: count }, (_, index) => {
    const segment = segments[index % segments.length];
    const source = sources[index % sources.length];
    const nextIndex = (counters.get(segment) || 0) + 1;
    counters.set(segment, nextIndex);
    const offer = focus === "mixed" ? SEGMENTS[segment].offer : focus;
    return generateProspects({ segment, source, count: nextIndex, offer }).at(-1);
  });
}

function buildCloseMath() {
  return Object.entries(OFFER_PRICES).map(([offer, price]) => {
    const required = Math.ceil(TARGET_KRW / price);
    return { offer, required, total: required * price };
  });
}

function buildFirstActions(rows) {
  return rows.slice(0, 5);
}

function countOffers(rows) {
  return rows.reduce((acc, row) => {
    acc[row.offer] = (acc[row.offer] || 0) + 1;
    return acc;
  }, {});
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1;
    return acc;
  }, {});
}

function boundedCount(value) {
  return Math.max(1, Math.min(80, Number(value || 30)));
}

function normalizeFocus(value) {
  return ["mixed", "service", "team", "setup", "self"].includes(value) ? value : "mixed";
}

function normalizePublicUrl(value) {
  const root = String(value || "https://your-site.example.com/").trim();
  return root.endsWith("/") ? root : `${root}/`;
}

function normalizePaymentStatus(status) {
  if (!status) {
    return {
      ready: false,
      route: "",
      label: "payment route not checked",
      missing: ["run payment setup audit"],
      detail: "run prepare:seller or prepare:launch first"
    };
  }
  return {
    ready: Boolean(status.ready),
    route: clean(status.route),
    label: clean(status.label) || (status.ready ? "payment route ready" : "payment route missing"),
    missing: Array.isArray(status.missing) ? status.missing.map(clean).filter(Boolean) : [],
    detail: clean(status.detail)
  };
}

function formatPaymentStatus(status) {
  if (status.ready) return `${status.label}${status.route ? ` (${status.route})` : ""}`;
  return `${status.label}: ${status.detail || status.missing.join(", ") || "payment route"}`;
}

function buildSendGate(status) {
  return status.ready
    ? "ready for live outreach"
    : "draft only - configure payment route before sending order links";
}

function normalizeNames(value) {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n|,/u)
    .map(clean)
    .filter(Boolean);
}

function normalizeList(value, fallback, dictionary) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  const cleaned = items.map(clean).filter((item) => dictionary[item]);
  return cleaned.length ? cleaned : fallback;
}

function clean(value) {
  return String(value || "").trim();
}
