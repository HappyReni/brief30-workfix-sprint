import { buildPaymentEvidencePack, formatPaymentEvidencePack } from "../operator/payment-evidence.js";

const TARGET_KRW = 300000;

export const samplePaymentText = [
  "구매자: Lead 24",
  "상품: 팀 브리핑 스프린트",
  "금액: 300,000원",
  "주문번호: B30-TEAM-20260522-0024",
  "입금일: 2026-05-22",
  "용도: 팀 주간보고/회의록 반복 정리",
  "",
  "2026-05-22 Lead 13 99,000원 B30-SVC-20260522-0013 service",
  "",
  "구매자: 박리드",
  "금액: 49,000원",
  "상품: 셋업팩",
  "입금일: 2026-05-22"
].join("\n");

export function buildEvidenceDesk(input = {}, options = {}) {
  const pack = buildPaymentEvidencePack(input.paymentText || "", {
    source: "evidence-desk",
    date: options.date,
    paymentRoute: options.paymentRoute
  });
  const readyTotal = pack.ready.reduce((sum, row) => sum + row.amount, 0);
  const month = clean(options.month) || String(pack.date || "").slice(0, 7);
  return {
    ...pack,
    month,
    readyTotal,
    gapAfterReady: Math.max(0, TARGET_KRW - readyTotal),
    fullText: formatPaymentEvidencePack(pack),
    metrics: [
      { label: "PARSED", value: String(pack.rows.length) },
      { label: "READY", value: String(pack.ready.length) },
      { label: "REVIEW", value: String(pack.review.length) },
      { label: "READY TOTAL", value: formatKrw(readyTotal) },
      { label: "GAP AFTER", value: formatKrw(Math.max(0, TARGET_KRW - readyTotal)) }
    ],
    commands: buildCommands(month)
  };
}

function buildCommands(month) {
  const ledgerPath = "path/to/brief30-launch-ledger.csv";
  const paymentTextPath = "path/to/payment-text.txt";
  return [
    `save raw payment text as ${paymentTextPath}`,
    `npm run money:paid -- ${ledgerPath} ${paymentTextPath} --out=${ledgerPath} --month=${month || "YYYY-MM"} --report-out=outreach/generated`,
    `npm run audit:revenue -- ${ledgerPath} --month=${month || "YYYY-MM"}`
  ].join("\n");
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function clean(value) {
  return String(value || "").trim();
}
