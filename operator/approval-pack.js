import { CLOSE_OFFERS } from "../closing/followup.js";
import { buildInvoicePack } from "./invoice-pack.js";
import { csvCell, formatKrw } from "./model.js";

export function buildApprovalPack(options = {}) {
  const offerKey = CLOSE_OFFERS[options.offer] ? options.offer : "service";
  const offer = CLOSE_OFFERS[offerKey];
  const issueDate = clean(options.date) || today();
  const data = {
    buyer: clean(options.buyer) || "OO님",
    company: clean(options.company) || "OO팀",
    approver: clean(options.approver) || "결재권자",
    seller: clean(options.seller) || "Brief30",
    contact: clean(options.contact),
    useCase: clean(options.useCase) || defaultUseCase(offerKey),
    publicUrl: normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/"),
    paymentRoute: clean(options.paymentRoute),
    deliveryWindow: clean(options.deliveryWindow) || "승인/입금 확인 후 24시간 이내",
    issueDate,
    dueDate: clean(options.due) || addDays(issueDate, 1),
    ref: clean(options.ref) || makeRef(issueDate),
    offerKey,
    offer
  };

  const invoice = buildInvoicePack({
    ...data,
    offer: data.offerKey,
    date: data.issueDate,
    due: data.dueDate
  });

  return {
    ...data,
    routeReady: Boolean(data.paymentRoute),
    approvalMemo: buildApprovalMemo(data),
    securityNote: buildSecurityNote(data),
    forwardMessage: buildForwardMessage(data),
    paymentRequest: invoice.paymentRequest,
    updateCsv: buildUpdateCsv(data),
    commandCsv: buildCommandCsv(data)
  };
}

export function formatApprovalPack(pack) {
  return [
    "# Brief30 approval pack",
    "",
    `Buyer: ${pack.buyer}`,
    `Company: ${pack.company}`,
    `Approver: ${pack.approver}`,
    `Offer: ${pack.offer.label}`,
    `Amount: ${formatKrw(pack.offer.price)}`,
    `Payment route: ${pack.routeReady ? pack.paymentRoute : "missing"}`,
    `Ref: ${pack.ref}`,
    "",
    "## Approval memo",
    pack.approvalMemo,
    "",
    "## Security note",
    pack.securityNote,
    "",
    "## Buyer forward message",
    pack.forwardMessage,
    "",
    "## Payment request",
    pack.paymentRequest,
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Next command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    "Do not merge this approval pack into revenue. Count only actual payment evidence with buyer, amount, date, and payment/order reference."
  ].join("\n");
}

export function approvalPackFiles(pack) {
  const base = `brief30-approval-${slug(pack.buyer)}-${pack.issueDate}`;
  return [
    {
      name: `${base}.md`,
      content: `${formatApprovalPack(pack)}\n`
    },
    {
      name: `${base}-update.csv`,
      content: `${pack.updateCsv}\n`
    },
    {
      name: `${base}-commands.csv`,
      content: `${pack.commandCsv}\n`
    }
  ];
}

function buildApprovalMemo(data) {
  return [
    `[Brief30 내부 승인 요청] ${data.ref}`,
    "",
    `요청자: ${data.buyer}`,
    `회사/팀: ${data.company}`,
    `승인자: ${data.approver}`,
    `공급/진행: ${data.seller}`,
    `구매 항목: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `사용 목적: ${data.useCase}`,
    `승인 기한: ${data.dueDate}`,
    "",
    "필요 사유:",
    "- 반복 업무 메모를 보고서, 회의록, 후속 액션으로 빠르게 정리하기 위함입니다.",
    "- 외부 공유 전에 요약 품질과 누락 액션을 확인하는 업무 보조 용도입니다.",
    "- 대행팩은 결과물을 바로 받는 옵션이라 내부 공유 시간이 줄어듭니다.",
    "",
    "제공 범위:",
    `- 전달물: ${data.offer.delivery}`,
    `- 일정: ${data.deliveryWindow}`,
    "- 결과 확인 후 수정 요청 1회 포함",
    "",
    "승인 기준:",
    "- 회사명, 고객명, 실명, 계약 금액 등 민감 정보는 제거한 메모로 진행합니다.",
    "- 결과물은 내부 업무 문서 초안이며 최종 검토는 요청자가 진행합니다.",
    "- 공식 증빙이나 세금계산서가 필요하면 실제 발행 가능 여부를 먼저 확인합니다."
  ].join("\n");
}

function buildSecurityNote(data) {
  return [
    `[Brief30 보안/개인정보 메모] ${data.ref}`,
    "",
    "운영 기준:",
    "- 구매자용 Brief30은 로그인 없이 브라우저에서 실행됩니다.",
    "- 업무 메모는 회사명, 고객명, 개인식별정보를 제거한 뒤 전달받습니다.",
    "- 외부 API 전송이 필요한 방식으로 안내하지 않습니다.",
    "- 민감한 원문, 계약서, 고객 개인정보 원본은 받지 않는 기준입니다.",
    "",
    "내부 공유 문구:",
    `${data.company} 내부 공유용 자료에는 익명화한 예시와 결과물 범위만 포함합니다.`,
    `문의/회신: ${data.contact || "기존 대화방"}`
  ].join("\n");
}

function buildForwardMessage(data) {
  const paymentLine = data.paymentRoute
    ? `승인되면 결제/입금 안내는 ${data.paymentRoute}입니다.`
    : "승인되면 실제 결제 루트를 확인한 뒤 진행하겠습니다.";
  return [
    `${data.approver}님, ${data.useCase} 정리를 위해 Brief30 ${data.offer.label} 승인 요청드립니다.`,
    "",
    `금액은 ${formatKrw(data.offer.price)}이고, 범위는 ${data.offer.delivery}입니다.`,
    `일정은 ${data.deliveryWindow} 기준입니다.`,
    "회사명/고객명/개인정보는 제거한 메모로 진행하고, 로그인이나 외부 API 전송이 필요한 방식은 쓰지 않습니다.",
    paymentLine,
    "",
    `승인용 주문번호: ${data.ref}`
  ].join("\n");
}

function buildUpdateCsv(data) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    [
      data.buyer,
      "tester",
      data.offerKey,
      addDays(data.issueDate, 1),
      `approval pack sent / ${data.company} / ${data.approver} / ${data.useCase}`
    ]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(data) {
  return [
    ["name", "type", "command"],
    [data.buyer, "approval_handoff", handoffCommand(data)],
    [data.buyer, "approval_invoice", invoiceCommand(data)],
    [data.buyer, "approval_proposal", proposalCommand(data)],
    [data.buyer, "approval_hotlist", hotlistCommand(data)]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function invoiceCommand(data) {
  const route = data.paymentRoute ? ` --payment-route="${quoteArg(data.paymentRoute)}"` : "";
  return `npm run payment:invoice -- --buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --offer=${data.offerKey} --use-case="${quoteArg(data.useCase)}"${route}`;
}

function handoffCommand(data) {
  const route = data.paymentRoute ? ` --payment-route="${quoteArg(data.paymentRoute)}"` : "";
  return `npm run payment:handoff -- --buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --offer=${data.offerKey} --use-case="${quoteArg(data.useCase)}" --url=${data.publicUrl}${route}`;
}

function proposalCommand(data) {
  return `npm run plan:proposal -- --buyer="${quoteArg(data.buyer)}" --use-case="${quoteArg(data.useCase)}" --offer=${data.offerKey} --url=${data.publicUrl}`;
}

function hotlistCommand(data) {
  return `npm run plan:hotlist -- path/to/brief30-launch-ledger.csv --replies=path/to/replies.txt --url=${data.publicUrl} --out=outreach/generated`;
}

function defaultUseCase(offer) {
  return offer === "service" ? "주간보고/회의록 대행 정리" : "첫 업무 메모 정리 셋업";
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function makeRef(date = today()) {
  return `B30-APP-${String(date || today()).replace(/[^\d]/gu, "")}`;
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return today();
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return value.toISOString().slice(0, 10);
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "buyer";
}

function quoteArg(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
