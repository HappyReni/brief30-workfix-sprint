import { CLOSE_OFFERS } from "../closing/followup.js";
import { csvCell, formatKrw } from "./model.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

export function buildProcurementPack(options = {}) {
  const offerKey = CLOSE_OFFERS[options.offer] ? options.offer : "team";
  const offer = CLOSE_OFFERS[offerKey];
  const date = clean(options.date) || today();
  const data = {
    buyer: clean(options.buyer) || "OO님",
    company: clean(options.company) || "OO팀",
    approver: clean(options.approver) || "결재권자",
    seller: clean(options.seller) || "Brief30",
    useCase: clean(options.useCase) || defaultUseCase(offerKey),
    paymentRoute: clean(options.paymentRoute),
    publicUrl: normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/"),
    deliveryWindow: clean(options.deliveryWindow) || defaultDelivery(offerKey),
    date,
    dueDate: clean(options.due) || addDays(date, 1),
    ref: clean(options.ref) || makeRef(date),
    offerKey,
    offer
  };

  return {
    ...data,
    routeReady: Boolean(data.paymentRoute),
    requestMemo: buildRequestMemo(data),
    vendorReply: buildVendorReply(data),
    forwardMessage: buildForwardMessage(data),
    documentChecklist: buildDocumentChecklist(data),
    updateCsv: buildUpdateCsv(data),
    commandCsv: buildCommandCsv(data)
  };
}

export function formatProcurementPack(pack) {
  return [
    "# Brief30 procurement close pack",
    "",
    `Buyer: ${pack.buyer}`,
    `Company: ${pack.company}`,
    `Approver: ${pack.approver}`,
    `Offer: ${pack.offer.label}`,
    `Amount: ${formatKrw(pack.offer.price)}`,
    `Payment route: ${pack.routeReady ? pack.paymentRoute : "missing"}`,
    `Ref: ${pack.ref}`,
    "",
    "## Internal purchase request",
    pack.requestMemo,
    "",
    "## Vendor reply",
    pack.vendorReply,
    "",
    "## Forward message",
    pack.forwardMessage,
    "",
    "## Document checklist",
    pack.documentChecklist,
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
    "Do not merge this procurement pack into revenue. Count only actual payment proof processed through money:paid or audit:revenue."
  ].join("\n");
}

export function procurementPackFiles(pack) {
  const base = `brief30-procurement-${slug(pack.buyer)}-${pack.date}`;
  return [
    { name: `${base}.md`, content: `${formatProcurementPack(pack)}\n` },
    { name: `${base}-update.csv`, content: `${pack.updateCsv}\n` },
    { name: `${base}-commands.csv`, content: `${pack.commandCsv}\n` }
  ];
}

function buildRequestMemo(data) {
  const payment = data.paymentRoute
    ? `결제/입금 안내: ${data.paymentRoute}`
    : "결제/입금 안내: 실제 결제 URL 또는 계좌 확인 후 진행";
  return [
    `[Brief30 구매요청 메모] ${data.ref}`,
    "",
    `요청 부서/팀: ${data.company}`,
    `요청자: ${data.buyer}`,
    `승인자: ${data.approver}`,
    `상품/범위: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `사용 목적: ${data.useCase}`,
    `납품 기준: ${data.deliveryWindow}`,
    payment,
    "",
    "구매 사유:",
    "- 반복되는 주간보고, 회의록, 고객 업데이트, 후속 액션 정리 시간을 줄이기 위함",
    "- 회사명, 고객명, 실명, 계정 정보, 계약 금액을 제거한 익명 업무 메모만 전달",
    "- 결과물은 내부 문서 초안이며 최종 검토는 요청자가 진행",
    "",
    `승인 기한: ${data.dueDate}`,
    `주문번호: ${data.ref}`
  ].join("\n");
}

function buildVendorReply(data) {
  return [
    `${data.company} 구매/결재 확인용으로 아래 기준을 공유드립니다.`,
    "",
    `공급/진행명: ${data.seller}`,
    `제안 항목: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `작업 범위: ${data.useCase}`,
    `납품 기준: ${data.deliveryWindow}`,
    `주문번호: ${data.ref}`,
    data.paymentRoute ? `결제/입금 안내: ${data.paymentRoute}` : "결제/입금 안내: 실제 결제 루트 확인 후 회신",
    "",
    "가능한 확인 자료:",
    "- 견적 메모와 작업 범위 설명",
    "- 개인정보/민감정보 제거 기준",
    "- 결제 확인 후 작업 시작 및 납품 예정 안내",
    "- 입금/결제 확인 메시지",
    "",
    "사업자등록증, 세금계산서, 공식 계약서 등 법적/회계 문서가 필요하면 실제 발행 가능 여부를 먼저 확인한 뒤 진행합니다."
  ].join("\n");
}

function buildForwardMessage(data) {
  return [
    `${data.approver}님, ${data.company} 업무 메모 정리 반복 비용을 줄이기 위해 ${data.offer.label} 구매 승인 요청드립니다.`,
    "",
    `금액은 ${formatKrw(data.offer.price)}이고, 범위는 ${data.offer.delivery}입니다.`,
    `용도는 ${data.useCase}이며, 납품 기준은 ${data.deliveryWindow}입니다.`,
    "민감정보는 제거한 메모만 전달하고 결과물은 내부 초안으로 검토 후 사용합니다.",
    `승인되면 주문번호 ${data.ref}로 결제/입금 후 시작하겠습니다.`
  ].join("\n");
}

function buildDocumentChecklist(data) {
  return [
    "- 구매 승인자와 결제자 이름 확인",
    "- 실제 결제 URL 또는 입금계좌 확인",
    "- 카드/계좌/영수증 중 필요한 증빙 형태 확인",
    "- 사업자등록증, 세금계산서, 계약서 필요 여부 확인",
    "- 익명화 기준을 통과한 업무 메모만 intake로 전달",
    `- 결제 후 money:paid에 넣을 원문 증빙에 주문번호 ${data.ref}, 구매자, 금액, 실제 결제일이 보이는지 확인`
  ].join("\n");
}

function buildUpdateCsv(data) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    [
      data.buyer,
      "tester",
      data.offerKey,
      addDays(data.date, 1),
      `procurement requested / ${data.company} / ${data.approver} / ${data.ref} / ${data.useCase}`
    ]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(data) {
  const route = data.paymentRoute ? ` --payment-route="${quoteArg(data.paymentRoute)}"` : "";
  const shared = `--buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --offer=${data.offerKey} --use-case="${quoteArg(data.useCase)}"`;
  return [
    ["name", "type", "command"],
    [data.buyer, "team_pack", `npm run plan:team -- --buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --approver="${quoteArg(data.approver)}" --use-case="${quoteArg(data.useCase)}" --url=${data.publicUrl}${route}`],
    [data.buyer, "approval_pack", `npm run plan:approval -- ${shared} --approver="${quoteArg(data.approver)}" --url=${data.publicUrl}${route}`],
    [data.buyer, "payment_handoff", `npm run payment:handoff -- ${shared} --url=${data.publicUrl}${route}`],
    [data.buyer, "money_paid", buildMoneyPaidCommand({ month: data.date.slice(0, 7) })],
    [data.buyer, "audit_revenue", `npm run audit:revenue -- path/to/brief30-launch-ledger.csv --month=${data.date.slice(0, 7)}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function defaultUseCase(offer) {
  return offer === "team" ? "팀 주간보고/회의록 반복 정리" : "업무 메모 정리";
}

function defaultDelivery(offer) {
  return offer === "team" ? "입금 확인 후 3영업일 내 1차 납품, 4주 내 마감" : "입금 확인 후 24시간 이내";
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function makeRef(date) {
  return `B30-PROC-${String(date || today()).replace(/[^\d]/gu, "")}`;
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
