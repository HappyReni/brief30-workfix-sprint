import { addDays, formatKrw, normalizeOffer, normalizeStatus, parseCsvLine, today } from "./model.js";
import { buildClosePlan, parseOperatorLedger } from "./close-plan.js";

const OFFER_LABELS = {
  self: "19,000원 셀프툴",
  setup: "49,000원 셋업팩",
  service: "99,000원 대행팩"
};

const STATUS_WEIGHT = {
  tester: 50,
  replied: 42,
  contacted: 24,
  prospect: 10
};

const SOURCE_WEIGHT = {
  referral: 18,
  previous_client: 16,
  direct_dm: 10,
  community: 6,
  social_post: 5
};

export function buildTodaySalesPack(text, options = {}) {
  const limit = Number(options.limit || 10);
  const publicUrl = normalizePublicUrl(options.publicUrl || "https://your-site.example.com/");
  const plan = buildClosePlan(text, options);
  const parsed = parseActionLeads(text);
  const leads = parsed.length ? parsed : plan.leads;
  const actions = rankLeads(leads).slice(0, limit).map((item, index) => actionFromLead(item, publicUrl, index));

  return {
    publicUrl,
    month: plan.month,
    revenue: plan.revenue,
    gap: plan.gap,
    nextAction: plan.nextAction,
    actions,
    operatorCsv: buildOperatorCsv(actions),
    closePlan: plan
  };
}

export function parseActionLeads(text) {
  const ledger = parseOperatorLedger(text);
  if (ledger.leads.length) {
    return ledger.leads;
  }
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const header = parseCsvLine(lines[0] || "").map(normalizeHeader);
  if (!header.includes("name") || !header.includes("offer")) {
    return [];
  }
  return lines.slice(1).map((line) => leadFromCells(header, parseCsvLine(line))).filter(Boolean);
}

export function formatTodaySalesPack(pack, sourcePath = "") {
  return [
    "# Brief30 today sales actions",
    "",
    `Source: ${sourcePath || "stdin"}`,
    `Month: ${pack.month}`,
    `Revenue: ${formatKrw(pack.revenue)}`,
    `Gap: ${formatKrw(pack.gap)}`,
    `Plan: ${pack.nextAction}`,
    "",
    "## Send now",
    ...pack.actions.map(actionBlock),
    "",
    "## Operator import CSV",
    pack.operatorCsv
  ].join("\n");
}

function rankLeads(leads) {
  return [...leads]
    .filter((item) => !["closed", "lost"].includes(item.status))
    .sort((a, b) => scoreLead(b) - scoreLead(a));
}

function scoreLead(item) {
  const offerBoost = item.offer === "service" ? 32 : item.offer === "setup" ? 18 : 6;
  return (STATUS_WEIGHT[item.status] || 0) + (SOURCE_WEIGHT[item.source] || 0) + offerBoost;
}

function actionFromLead(item, publicUrl, index) {
  const type = ["tester", "replied"].includes(item.status) ? "close" : "dm";
  return {
    ...item,
    type,
    message: type === "close" ? closeMessage(item, publicUrl) : dmMessage(item, publicUrl, index),
    closeUrl: closeUrl(item, publicUrl)
  };
}

function dmMessage(item, publicUrl, index) {
  const opener = index % 2 === 0 ? "혹시" : "짧게 여쭙습니다.";
  const proof = `${publicUrl}diagnostic/index.html`;
  const offerUrl = item.offer === "service" ? `${publicUrl}service/index.html` : orderUrl(item.offer, publicUrl);
  const ask =
    item.offer === "service"
      ? "툴을 직접 배우기보다 결과물이 필요하면 제가 첫 메모 3개를 정리해드립니다."
      : "맞으면 첫 업무 메모 1개 기준으로 바로 써먹을 포맷까지 맞춰드릴게요.";
  return [
    `${item.name}, ${opener} ${item.note || item.segment} 관련해서 아직 정리 시간이 많이 드나요?`,
    "Brief30으로 업무 메모를 보고서/회의록/후속메일로 바로 정리하는 흐름을 테스트 중입니다.",
    `무료 진단: ${proof}`,
    `${OFFER_LABELS[item.offer] || OFFER_LABELS.setup}: ${offerUrl}`,
    ask,
    "10분만 보고 실제 업무에 쓸 상황이 있는지 답 주시면 됩니다."
  ].join("\n");
}

function closeMessage(item, publicUrl) {
  return [
    `${item.name}, 관심 주신 김에 바로 진행 여부만 확인드릴게요.`,
    `${OFFER_LABELS[item.offer] || OFFER_LABELS.setup}으로 진행하면 됩니다.`,
    `결제 요청/견적: ${closeUrl(item, publicUrl)}`,
    "오늘 가능하면 결제 후 익명 메모를 보내주세요. 어렵다면 보류라고 답 주셔도 괜찮습니다."
  ].join("\n");
}

function closeUrl(item, publicUrl) {
  const params = new URLSearchParams({
    offer: item.offer || "setup",
    buyer: item.name || "",
    useCase: item.offer === "service" ? "고객사 업데이트" : "주간보고",
    source: "today-plan"
  });
  return `${publicUrl}closing/index.html?${params.toString()}`;
}

function orderUrl(offer, publicUrl) {
  return `${publicUrl}order/index.html?offer=${offer || "setup"}`;
}

function buildOperatorCsv(actions) {
  return [
    ["name", "segment", "source", "offer", "status", "next_touch", "note"],
    ...actions.map((item) => [
      item.name,
      item.segment,
      item.source || "direct_dm",
      item.offer,
      item.type === "close" ? item.status : "contacted",
      item.type === "close" ? today() : addDays(1),
      `${item.type} action / ${item.note || ""}`.trim()
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function actionBlock(item, index) {
  return [
    `### ${index + 1}. ${item.name} / ${item.type}`,
    "",
    item.message
  ].join("\n");
}

function leadFromCells(header, cells) {
  const row = Object.fromEntries(header.map((key, index) => [key, cells[index] || ""]));
  if (!row.name) {
    return null;
  }
  return {
    name: row.name,
    segment: row.segment || "직장인",
    source: row.source || "direct_dm",
    offer: normalizeOffer(row.offer),
    status: normalizeStatus(row.status || "prospect"),
    note: row.note || row.pain || "",
    nextTouch: row.next_touch || today(),
    lastTouch: row.last_touch || ""
  };
}

function normalizePublicUrl(value) {
  return String(value || "").trim().replace(/\/?$/u, "/");
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "_");
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}
