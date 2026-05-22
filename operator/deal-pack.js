import { buildProposalPack } from "../closing/proposal-pack.js";
import { buildClosePlan } from "./close-plan.js";
import { TARGET_KRW, formatKrw } from "./model.js";

export function buildDealPack(text = "", options = {}) {
  const target = Number(options.target || TARGET_KRW);
  const month = options.month || today().slice(0, 7);
  const limit = boundedLimit(options.limit);
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const closePlan = buildClosePlan(text, { target, month, limit });
  const warmCandidates = closePlan.candidates.filter((lead) => ["tester", "replied"].includes(lead.status)).slice(0, limit);
  const deals = warmCandidates.map((lead, index) => {
    const pack = buildProposalPack({
      buyer: lead.name,
      offer: lead.offer,
      useCase: useCaseFor(lead),
      publicUrl,
      paymentRoute,
      deliveryWindow: options.deliveryWindow,
      ref: makeRef(index, options.date)
    });
    return { lead, pack };
  });

  return {
    source: options.source || "",
    date: options.date || today(),
    target,
    month,
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    closePlan,
    deals,
    evidenceCsv: buildEvidenceCsv(deals)
  };
}

export function formatDealPack(pack) {
  return [
    "# Brief30 deal pack",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Month: ${pack.month}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(pack.closePlan.revenue)} / ${formatKrw(pack.target)}`,
    `Gap: ${formatKrw(pack.closePlan.gap)}`,
    `Warm deals: ${pack.deals.length}`,
    "",
    "## Send these first",
    ...dealBlocks(pack.deals),
    "",
    "## Combined evidence CSV",
    "```csv",
    pack.evidenceCsv,
    "```",
    "",
    "## If no one pays",
    ...fallbackLines(pack)
  ].join("\n");
}

export function dealPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    {
      name: `brief30-deal-pack-${date}.md`,
      content: `${formatDealPack(pack)}\n`
    },
    {
      name: `brief30-deal-evidence-${date}.csv`,
      content: `${pack.evidenceCsv}\n`
    }
  ];
}

function dealBlocks(deals) {
  if (!deals.length) {
    return ["warm deal 후보가 없습니다. ops:sprint로 신규 발송과 follow-up을 먼저 만드세요."];
  }
  return deals.map(({ lead, pack }, index) => [
    `### ${index + 1}. ${lead.name} / ${lead.status} / ${pack.offer.label}`,
    "",
    "#### 결제 요청",
    pack.proposal,
    "",
    "#### 24시간 후속",
    pack.nudge,
    "",
    "#### 낮춘 제안",
    pack.fallback
  ].join("\n"));
}

function fallbackLines(pack) {
  if (pack.deals.length) {
    return [
      "1. 24시간 후 follow-up 문안을 보냅니다.",
      "2. 가격이 걸리면 낮춘 제안을 보냅니다.",
      "3. 보류/무응답이면 plan:followups로 다음 터치 날짜를 잡습니다."
    ];
  }
  return [
    `npm run ops:sprint -- path/to/ledger.csv --url=${pack.publicUrl}`,
    `npm run plan:send -- --count=20 --focus=service --url=${pack.publicUrl}`,
    `npm run plan:followups -- path/to/ledger.csv --url=${pack.publicUrl}`
  ];
}

function buildEvidenceCsv(deals) {
  const rows = ["ref,buyer,offer,amount,contact,use_case,payment_route,date"];
  for (const { pack } of deals) {
    rows.push(...pack.evidenceCsv.split("\n").slice(1));
  }
  return rows.join("\n");
}

function useCaseFor(lead) {
  if (lead.offer === "service") return lead.note || "업무 메모 3개 정리";
  if (lead.offer === "self") return lead.note || "첫 업무 메모 셀프 정리";
  return lead.note || "첫 업무 메모 셋업";
}

function makeRef(index, date = today()) {
  const stamp = String(date || today()).replace(/[^\d]/gu, "") || today().replaceAll("-", "");
  return `B30-DEAL-${stamp}-${String(index + 1).padStart(2, "0")}`;
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function boundedLimit(value) {
  return Math.max(1, Math.min(20, Number(value || 5)));
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
