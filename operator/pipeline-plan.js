import { OFFERS, TARGET_KRW, formatKrw, offerPrice, stageWeight } from "./model.js";
import { parseOperatorLedger } from "./close-plan.js";
import { auditRevenueEvidence } from "./revenue-proof.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

const OFFER_CLOSE_RATE = {
  team: 0.025,
  self: 0.08,
  setup: 0.06,
  service: 0.04
};

const FOCUS_MIX = {
  team: { team: 1 },
  self: { self: 1 },
  setup: { setup: 1 },
  service: { service: 1 },
  mixed: { team: 0.35, service: 0.35, setup: 0.2, self: 0.1 }
};

export function buildPipelinePlan(text = "", options = {}) {
  const target = Number(options.target || TARGET_KRW);
  const month = options.month || new Date().toISOString().slice(0, 7);
  const days = clamp(Number(options.days || 30), 1, 90);
  const focus = FOCUS_MIX[options.focus] ? options.focus : "service";
  const replyRate = percentOption(options.replyRate, 0.12);
  const closeRateScale = numberOption(options.closeRateScale, 1);
  const audit = auditRevenueEvidence(text, { target, month });
  const ledger = parseOperatorLedger(text);
  const pipelineValue = expectedPipelineValue(ledger.leads);
  const requiredRevenue = Math.max(audit.gap - pipelineValue, 0);
  const expectedValuePerSend = valuePerSend(FOCUS_MIX[focus], replyRate, closeRateScale);
  const sendsNeeded = expectedValuePerSend ? Math.ceil(requiredRevenue / expectedValuePerSend) : 0;

  return {
    target,
    month,
    days,
    focus,
    replyRate,
    closeRateScale,
    revenue: audit.revenue,
    gap: audit.gap,
    pipelineValue,
    requiredRevenue,
    expectedValuePerSend,
    sendsNeeded,
    dailySends: Math.ceil(sendsNeeded / days),
    weeklySends: Math.ceil(sendsNeeded / Math.max(days / 7, 1)),
    offerMix: FOCUS_MIX[focus],
    statusCounts: countStatuses(ledger.leads),
    actionPlan: buildActionPlan({ focus, sendsNeeded, days, requiredRevenue })
  };
}

export function formatPipelinePlan(plan, sourcePath = "") {
  return [
    "# Brief30 pipeline math",
    "",
    `Source: ${sourcePath || "stdin"}`,
    `Month: ${plan.month}`,
    `Focus: ${plan.focus}`,
    `Window: ${plan.days} days`,
    `Revenue: ${formatKrw(plan.revenue)} / ${formatKrw(plan.target)}`,
    `Gap: ${formatKrw(plan.gap)}`,
    `Expected open pipeline: ${formatKrw(plan.pipelineValue)}`,
    `Revenue still to create: ${formatKrw(plan.requiredRevenue)}`,
    `Expected value per send: ${formatKrw(plan.expectedValuePerSend)}`,
    `Sends needed: ${plan.sendsNeeded}`,
    `Daily sends: ${plan.dailySends}`,
    `Weekly sends: ${plan.weeklySends}`,
    "",
    "## Offer mix",
    ...offerMixLines(plan.offerMix),
    "",
    "## Current pipeline",
    ...statusLines(plan.statusCounts),
    "",
    "## Action plan",
    ...plan.actionPlan.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Commands",
    `npm run plan:send -- --count=${Math.max(plan.dailySends, 1)} --focus=${plan.focus} --url=https://happyreni.github.io/brief30-workfix-sprint`,
    `npm run plan:proposal -- --buyer=김PM --use-case=${plan.focus === "team" ? "팀 주간보고" : "주간보고"} --offer=${proposalOffer(plan.focus)} --url=https://happyreni.github.io/brief30-workfix-sprint`,
    "npm run audit:revenue -- path/to/brief30-launch-ledger.csv"
  ].join("\n");
}

function expectedPipelineValue(leads) {
  return leads
    .filter((lead) => !["closed", "lost"].includes(lead.status))
    .reduce((total, lead) => total + offerPrice(lead) * stageWeight(lead.status), 0);
}

function valuePerSend(mix, replyRate, closeRateScale) {
  return Object.entries(mix).reduce((total, [offer, share]) => {
    const price = OFFERS[offer]?.price || 0;
    const closeRate = (OFFER_CLOSE_RATE[offer] || 0) * closeRateScale;
    return total + share * replyRate * closeRate * price;
  }, 0);
}

function buildActionPlan({ focus, sendsNeeded, days, requiredRevenue }) {
  if (requiredRevenue <= 0) {
    return ["현재 파이프라인 기대값으로 목표를 덮습니다. warm 후보에게 plan:proposal을 먼저 보내세요."];
  }
  const daily = Math.ceil(sendsNeeded / days);
  return [
    `${days}일 동안 하루 ${daily}명에게 ${focus} 중심 메시지 발송`,
    "답장은 같은 날 plan:replies 또는 replydesk로 분류",
    "관심 답장에는 10분 안에 plan:proposal로 견적/결제 요청 발송",
    `입금 확인 즉시 ${buildMoneyPaidCommand({ ledgerPath: "path/to/ledger.csv" })} 실행`
  ];
}

function countStatuses(leads) {
  return leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
}

function offerMixLines(mix) {
  return Object.entries(mix).map(([offer, share]) => {
    const label = OFFERS[offer]?.label || offer;
    return `- ${label}: ${Math.round(share * 100)}%`;
  });
}

function proposalOffer(focus) {
  return ["team", "service", "setup", "self"].includes(focus) ? focus : "team";
}

function statusLines(counts) {
  const rows = Object.entries(counts);
  return rows.length ? rows.map(([status, count]) => `- ${status}: ${count}`) : ["- no leads yet"];
}

function percentOption(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return number > 1 ? number / 100 : number;
}

function numberOption(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
