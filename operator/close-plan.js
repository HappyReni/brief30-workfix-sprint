import {
  OFFERS,
  TARGET_KRW,
  formatKrw,
  lead,
  normalizeOffer,
  normalizeStatus,
  parseCsvLine
} from "./model.js";
import { closeCandidates, closeCombos } from "./revenue-plan.js";
import { auditRevenueEvidence } from "./revenue-proof.js";

export function buildClosePlan(text, options = {}) {
  const target = Number(options.target || TARGET_KRW);
  const month = options.month || new Date().toISOString().slice(0, 7);
  const ledger = parseOperatorLedger(text);
  const audit = auditRevenueEvidence(text, { target, month });
  const gap = audit.gap;
  const candidates = closeCandidates(ledger.leads, Number(options.limit || 5));
  const combos = closeCombos(gap);

  return {
    target,
    month,
    revenue: audit.revenue,
    gap,
    reached: audit.reached,
    qualifiedPayments: audit.qualified.length,
    unverifiedPayments: audit.unverified.length,
    leads: ledger.leads,
    candidates,
    combos,
    nextAction: nextAction({ gap, candidates, combos })
  };
}

export function parseOperatorLedger(text) {
  const sections = splitSections(text);
  return {
    leads: parseLeadSection(sections.leads || ""),
    paymentsText: sections.payments || ""
  };
}

export function formatClosePlan(plan, ledgerPath = "") {
  return [
    "# Brief30 close plan",
    "",
    `Ledger: ${ledgerPath || "stdin"}`,
    `Month: ${plan.month}`,
    `Target: ${formatKrw(plan.target)}`,
    `Qualified revenue: ${formatKrw(plan.revenue)}`,
    `Gap: ${formatKrw(plan.gap)}`,
    `Qualified payments: ${plan.qualifiedPayments}`,
    `Unverified current-month rows: ${plan.unverifiedPayments}`,
    "",
    "Best close paths:",
    ...comboLines(plan.combos),
    "",
    "Warm candidates:",
    ...candidateLines(plan.candidates),
    "",
    "Today:",
    ...actionLines(plan)
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
  if (!Object.keys(sections).length) {
    sections.leads = String(text || "");
  }
  return sections;
}

function parseLeadSection(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return [];
  }
  const header = parseCsvLine(lines[0]).map(normalizeHeader);
  if (!header.includes("name") || !header.includes("offer")) {
    return [];
  }
  return lines.slice(1).map((line) => leadFromRow(header, parseCsvLine(line))).filter(Boolean);
}

function leadFromRow(header, cells) {
  const row = Object.fromEntries(header.map((key, index) => [key, cells[index] || ""]));
  if (!row.name) {
    return null;
  }
  return lead(
    row.name,
    row.segment || "직장인",
    row.source || "direct_dm",
    normalizeOffer(row.offer),
    normalizeStatus(row.status),
    row.note || "",
    row.next_touch || "",
    row.last_touch || ""
  );
}

function nextAction({ gap, candidates, combos }) {
  if (gap <= 0) {
    return "목표 달성. 결제 증거와 납품 상태만 정리";
  }
  if (candidates.length) {
    return `${candidates[0].name}에게 ${offerLabel(candidates[0].offer)} 결제 요청`;
  }
  const best = combos[0];
  const serviceCount = best?.counts?.service || Math.ceil(gap / OFFERS.service.price);
  return `대행팩 후보 ${serviceCount}명에게 DM 발송`;
}

function comboLines(combos) {
  return combos.map((combo, index) => {
    const label = combo.label || "목표 달성";
    return `${index + 1}. ${label} = ${formatKrw(combo.total)} (초과 ${formatKrw(combo.overage)})`;
  });
}

function candidateLines(candidates) {
  if (!candidates.length) {
    return ["- 없음. outbox/prospecting에서 대행팩 후보를 먼저 추가"];
  }
  return candidates.map((item) => {
    const due = item.nextTouch ? ` · next ${item.nextTouch}` : "";
    return `- ${item.name} · ${offerLabel(item.offer)} · ${item.status}${due}`;
  });
}

function actionLines(plan) {
  if (plan.reached) {
    return ["1. 납품/후기 요청을 끝내고 매출 증거 CSV를 보관"];
  }
  const first = plan.candidates[0];
  if (!first) {
    return [
      `1. ${plan.combos[0]?.label || "대행팩 4건"} 목표로 신규 후보 발송`,
      "2. 답장 오면 replydesk에서 대행팩 기본 오퍼로 close CSV 생성",
      "3. 결제 확인 즉시 operator Payment evidence에 ref 포함 기록"
    ];
  }
  return [
    `1. ${first.name}에게 closing 링크와 결제 요청 발송`,
    "2. 나머지 warm 후보에게 24시간 내 결제 가능 여부 확인",
    "3. 결제 확인 즉시 operator Payment evidence에 ref 포함 기록"
  ];
}

function offerLabel(key) {
  return OFFERS[key]?.label || OFFERS.setup.label;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "_");
}
