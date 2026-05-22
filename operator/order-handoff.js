import { CLOSE_OFFERS } from "../closing/followup.js";
import { csvCell, formatKrw } from "./model.js";
import { buildMoneyPaidCommand, revenueProofNote } from "./payment-command.js";

export function buildOrderHandoff(options = {}) {
  const offerKey = CLOSE_OFFERS[options.offer] ? options.offer : "service";
  const offer = CLOSE_OFFERS[offerKey];
  const date = clean(options.date) || today();
  const buyer = clean(options.buyer) || "OO님";
  const useCase = clean(options.useCase) || defaultUseCase(offerKey);
  const data = {
    buyer,
    company: clean(options.company),
    contact: clean(options.contact),
    seller: clean(options.seller) || "Brief30",
    offerKey,
    offer,
    useCase,
    date,
    ref: clean(options.ref) || makeRef(date, buyer, offerKey),
    publicUrl: normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/"),
    paymentRoute: clean(options.paymentRoute),
    deliveryWindow: clean(options.deliveryWindow) || "입금 확인 후 24시간 이내"
  };
  return {
    ...data,
    paymentReady: Boolean(data.paymentRoute),
    orderUrl: buildUrl(data.publicUrl, "order/index.html", { offer: data.offerKey }),
    intakeUrl: buildUrl(data.publicUrl, "intake/index.html", {
      ref: data.ref,
      offer: data.offerKey,
      buyer: data.buyer,
      useCase: data.useCase
    }),
    orderMessage: buildOrderMessage(data),
    intakeChecklist: buildIntakeChecklist(data),
    proofRequest: buildProofRequest(data),
    updateCsv: buildUpdateCsv(data),
    commandCsv: buildCommandCsv(data)
  };
}

export function formatOrderHandoff(pack) {
  return [
    "# Brief30 order handoff",
    "",
    `Buyer: ${pack.buyer}`,
    `Company: ${pack.company || "not provided"}`,
    `Offer: ${pack.offer.label}`,
    `Amount: ${formatKrw(pack.offer.price)}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Order ref: ${pack.ref}`,
    `Order URL: ${pack.orderUrl}`,
    `Intake URL: ${pack.intakeUrl}`,
    "",
    "## Order message",
    pack.orderMessage,
    "",
    "## Intake checklist",
    pack.intakeChecklist,
    "",
    "## Payment proof request",
    pack.proofRequest,
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
    `Do not merge this handoff into revenue. ${revenueProofNote()}`
  ].join("\n");
}

export function orderHandoffFiles(pack) {
  const base = `brief30-order-handoff-${slug(pack.buyer)}-${pack.date}`;
  return [
    { name: `${base}.md`, content: `${formatOrderHandoff(pack)}\n` },
    { name: `${base}-update.csv`, content: `${pack.updateCsv}\n` },
    { name: `${base}-commands.csv`, content: `${pack.commandCsv}\n` }
  ];
}

function buildOrderMessage(data) {
  const paymentLine = data.paymentRoute
    ? `결제/입금 안내: ${data.paymentRoute}`
    : "결제/입금 안내: 실제 계좌 또는 결제 URL 확인 후 보내겠습니다.";
  return [
    `[Brief30 주문 진행 안내] ${data.ref}`,
    "",
    `${data.buyer}, 승인되면 아래 주문번호로 진행하시면 됩니다.`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `범위: ${data.useCase}`,
    `전달물: ${data.offer.delivery}`,
    `전달 시간: ${data.deliveryWindow}`,
    paymentLine,
    "",
    "진행 순서:",
    `1. 결제/입금 메모에 주문번호 ${data.ref}를 남겨주세요.`,
    `2. 결제 후 익명화한 업무 메모를 intake 링크로 보내주세요: ${buildUrl(data.publicUrl, "intake/index.html", { ref: data.ref, offer: data.offerKey, buyer: data.buyer, useCase: data.useCase })}`,
    "3. 입금자명, 금액, 주문번호가 보이는 결제 확인 메시지를 이 대화방에 남겨주세요."
  ].join("\n");
}

function buildIntakeChecklist(data) {
  const memoLimit = data.offerKey === "team"
    ? "- 팀 브리핑 스프린트는 익명화한 메모를 최대 10개까지 한 번에 보냅니다."
    : data.offerKey === "service"
      ? "- 대행팩은 최대 3개 메모를 한 번에 보냅니다."
      : "- 셋업/셀프는 첫 메모 1개로 시작합니다.";
  return [
    `[Brief30 자료 제출 체크리스트] ${data.ref}`,
    "",
    "- 회사명, 고객명, 실명, 연락처, 계약 금액은 제거합니다.",
    "- 원문 전체가 아니라 정리할 업무 메모만 붙입니다.",
    memoLimit,
    "- 원하는 결과물 유형을 같이 적습니다: 주간보고, 회의록, 고객사 업데이트, 후속 메일, 리스크 보고.",
    `- 제출 링크: ${buildUrl(data.publicUrl, "intake/index.html", { ref: data.ref, offer: data.offerKey, buyer: data.buyer, useCase: data.useCase })}`
  ].join("\n");
}

function buildProofRequest(data) {
  return [
    `[Brief30 결제 확인 요청] ${data.ref}`,
    "",
    "결제 후 아래 항목이 보이게 답장해 주세요.",
    "- 주문번호",
    "- 입금자명 또는 결제자명",
    "- 실제 입금일 또는 결제일",
    "- 금액",
    "",
    `주문번호: ${data.ref}`,
    `예상 금액: ${formatKrw(data.offer.price)}`,
    "실제 결제 확인 전에는 매출로 기록하지 않습니다."
  ].join("\n");
}

function buildUpdateCsv(data) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    [data.buyer, "tester", data.offerKey, addDays(data.date, 1), `order handoff sent / payment pending / ${data.ref} / ${data.useCase}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(data) {
  return [
    ["name", "type", "command"],
    [data.buyer, "money_paid", buildMoneyPaidCommand({ month: data.date.slice(0, 7) })],
    [data.buyer, "fulfill", `npm run fulfill:packet -- path/to/intake.md --ref=${data.ref}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildUrl(root, path, params = {}) {
  const url = new URL(path, root);
  Object.entries(params).forEach(([key, value]) => {
    if (clean(value)) url.searchParams.set(key, value);
  });
  return url.toString();
}

function makeRef(date, buyer, offer) {
  return `B30-ORD-${String(date).replace(/[^\d]/gu, "")}-${shortCode(`${buyer}-${offer}`)}`;
}

function shortCode(value) {
  const total = [...String(value || "")].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return total.toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

function defaultUseCase(offer) {
  if (offer === "team") return "팀 주간보고/회의록 반복 정리";
  return offer === "service" ? "업무 메모 3개 정리" : "첫 업무 메모 정리";
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
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

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
