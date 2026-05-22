import { buildClosePlan } from "./close-plan.js";
import { csvCell, formatKrw } from "./model.js";
import { buildPaymentEvidencePack } from "./payment-evidence.js";
import { buildMoneyPaidCommand } from "./payment-command.js";
import { closeCombos } from "./revenue-plan.js";
import { auditRevenueEvidence } from "./revenue-proof.js";

const EVIDENCE_HEADER = "ref,buyer,offer,amount,contact,use_case,payment_route,date";
const RECOVERY_HEADER = ["buyer", "source", "missing", "amount", "message", "command"];

export function buildRevenueRecoveryPack(input = {}, options = {}) {
  const ledgerText = String(input.ledgerText || "");
  const paymentText = String(input.paymentText || "");
  const target = Number(options.target || 300000);
  const month = options.month || today().slice(0, 7);
  const date = options.date || today();
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const audit = auditRevenueEvidence(ledgerText, { target, month });
  const closePlan = buildClosePlan(ledgerText, { ...options, target, month, limit: options.limit || 5 });
  const payments = paymentText
    ? buildPaymentEvidencePack(paymentText, { source: options.paymentSource, date, paymentRoute })
    : emptyPaymentPack(date);
  const repairRows = [
    ...audit.unverified.map((row, index) => repairFromAudit(row, index, month)),
    ...payments.review.map((row) => repairFromPayment(row, month))
  ];
  const readyTotal = payments.ready.reduce((sum, row) => sum + row.amount, 0);
  const recoverableTotal = repairRows.reduce((sum, row) => sum + row.amount, 0);
  const afterRecoveryGap = Math.max(target - audit.revenue - readyTotal - recoverableTotal, 0);

  const pack = {
    date,
    month,
    target,
    publicUrl,
    paymentRoute,
    source: options.source || "",
    paymentSource: options.paymentSource || "",
    audit,
    closePlan,
    payments,
    repairRows,
    readyTotal,
    recoverableTotal,
    afterRecoveryGap,
    afterRecoveryCombos: closeCombos(afterRecoveryGap),
    recoveryCsv: buildRecoveryCsv(repairRows),
    evidenceCsv: payments.evidenceCsv || EVIDENCE_HEADER
  };
  return { ...pack, actions: recoveryActions(pack) };
}

export function formatRevenueRecoveryPack(pack) {
  return [
    "# Brief30 revenue recovery",
    "",
    `Date: ${pack.date}`,
    `Ledger: ${pack.source || "stdin"}`,
    `Payments: ${pack.paymentSource || "none"}`,
    `Month: ${pack.month}`,
    `Qualified revenue: ${formatKrw(pack.audit.revenue)} / ${formatKrw(pack.target)}`,
    `Current gap: ${formatKrw(pack.audit.gap)}`,
    `Ready evidence to merge: ${pack.payments.ready.length} / ${formatKrw(pack.readyTotal)}`,
    `Recoverable if fixed: ${pack.repairRows.length} / ${formatKrw(pack.recoverableTotal)}`,
    `Gap after ready+repaired: ${formatKrw(pack.afterRecoveryGap)}`,
    "",
    "## Do now",
    ...pack.actions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Repair asks",
    ...repairLines(pack.repairRows),
    "",
    "## Remaining close paths",
    ...comboLines(pack.afterRecoveryCombos),
    "",
    "## Ready payment evidence CSV",
    "```csv",
    pack.evidenceCsv,
    "```",
    "",
    "## Recovery CSV",
    "```csv",
    pack.recoveryCsv,
    "```",
    "",
    "Do not merge recovery asks into revenue. Only merge the ready payment evidence CSV after checking it came from actual payment proof."
  ].join("\n");
}

export function revenueRecoveryFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-revenue-recovery-${date}.md`, content: `${formatRevenueRecoveryPack(pack)}\n` },
    { name: `brief30-revenue-recovery-${date}.csv`, content: `${pack.recoveryCsv}\n` },
    { name: `brief30-revenue-recovery-evidence-${date}.csv`, content: `${pack.evidenceCsv}\n` }
  ];
}

function repairFromAudit(row, index, month) {
  const missing = row.issues || [];
  return {
    source: "ledger",
    buyer: row.buyer || `Payment ${index + 1}`,
    amount: Number(row.amount || 0),
    missing,
    message: repairMessage(row.buyer, missing, row.ref, row.amount),
    command: buildMoneyPaidCommand({ month })
  };
}

function repairFromPayment(row, month) {
  return {
    source: "payment_text",
    buyer: row.buyer || `Payment row ${row.index}`,
    amount: Number(row.amount || 0),
    missing: row.issues,
    message: repairMessage(row.buyer, row.issues, row.ref, row.amount),
    command: `Fix the payment text, then rerun ${buildMoneyPaidCommand({ month })}`
  };
}

function repairMessage(buyer, missing, ref, amount) {
  const needs = missingLabels(missing);
  return [
    `${buyer || "구매자"}님, 결제 확인을 매출로 기록하려면 아래 항목이 한 번 더 필요합니다.`,
    `필요 항목: ${needs.join(", ")}`,
    ref ? `현재 확인된 주문번호/메모: ${ref}` : "주문번호 또는 결제 메모가 아직 비어 있습니다.",
    amount ? `현재 확인된 금액: ${formatKrw(amount)}` : "금액이 보이게 캡처/문구를 보내주세요.",
    "입금일, 입금자명, 금액, 주문번호가 보이는 메시지로 답 주시면 바로 납품 진행하겠습니다."
  ].join("\n");
}

function missingLabels(values = []) {
  const labels = {
    paid_at: "입금일/결제일",
    buyer: "입금자명/구매자명",
    offer: "상품명",
    amount: "금액",
    ref: "주문번호/거래번호"
  };
  return values.map((item) => labels[item] || item);
}

function recoveryActions(pack) {
  const actions = [];
  if (pack.payments.ready.length) {
    actions.push("P0 money:paid로 ready 증빙 파싱 -> ledger 병합 -> audit:revenue 실행");
  }
  if (pack.repairRows.length) {
    actions.push(`P0 누락 증거 ${pack.repairRows.length}건 복구 요청 발송`);
  }
  if (pack.afterRecoveryGap > 0 && pack.closePlan.candidates.length) {
    actions.push(`P1 ${pack.closePlan.candidates[0].name}에게 payment:handoff 또는 plan:proposal 발송`);
  }
  if (pack.afterRecoveryGap > 0 && !pack.closePlan.candidates.length) {
    actions.push(`P1 ${pack.afterRecoveryCombos[0]?.label || "대행팩 4건"} 기준으로 새 후보 발송`);
  }
  actions.push("P2 실제 입금 증거 없는 proposal/deal/order handoff는 revenue ledger에 병합하지 않습니다.");
  return actions;
}

function buildRecoveryCsv(rows) {
  return [
    RECOVERY_HEADER.map(csvCell).join(","),
    ...rows.map((row) => [
      row.buyer,
      row.source,
      row.missing.join("|"),
      row.amount || "",
      row.message,
      row.command
    ].map(csvCell).join(","))
  ].join("\n");
}

function repairLines(rows) {
  if (!rows.length) return ["- 복구할 불완전 증거가 없습니다."];
  return rows.map((row, index) => [`### ${index + 1}. ${row.buyer} / ${row.source}`, "", row.message].join("\n"));
}

function comboLines(combos) {
  return combos.map((combo, index) => `${index + 1}. ${combo.label} = ${formatKrw(combo.total)} (초과 ${formatKrw(combo.overage)})`);
}

function emptyPaymentPack(date) {
  return { source: "", date, rows: [], ready: [], review: [], evidenceCsv: EVIDENCE_HEADER };
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
