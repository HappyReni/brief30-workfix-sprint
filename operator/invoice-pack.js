import { CLOSE_OFFERS } from "../closing/followup.js";
import { csvCell } from "./model.js";

export function buildInvoicePack(options = {}) {
  const offerKey = CLOSE_OFFERS[options.offer] ? options.offer : "service";
  const offer = CLOSE_OFFERS[offerKey];
  const buyer = clean(options.buyer) || "OO님";
  const company = clean(options.company);
  const seller = clean(options.seller) || "Brief30";
  const useCase = clean(options.useCase) || defaultUseCase(offerKey);
  const ref = clean(options.ref) || makeRef(options.date);
  const issueDate = clean(options.date) || today();
  const dueDate = clean(options.due) || addDays(issueDate, 1);
  const deliveryWindow = clean(options.deliveryWindow) || defaultDeliveryWindow(offerKey);
  const paymentRoute = clean(options.paymentRoute);
  const contact = clean(options.contact);
  const routeReady = Boolean(paymentRoute);

  const data = { buyer, company, seller, useCase, ref, issueDate, dueDate, deliveryWindow, paymentRoute, contact, offerKey, offer, routeReady };
  return {
    ...data,
    quote: buildQuote(data),
    paymentRequest: buildPaymentRequest(data),
    receipt: buildReceipt(data),
    evidenceCsv: buildEvidenceCsv(data)
  };
}

export function formatInvoicePack(pack) {
  return [
    "# Brief30 invoice pack",
    "",
    `Buyer: ${pack.buyer}`,
    `Company: ${pack.company || "not provided"}`,
    `Offer: ${pack.offer.label}`,
    `Amount: ${formatKrw(pack.offer.price)}`,
    `Payment route: ${pack.routeReady ? pack.paymentRoute : "missing"}`,
    `Ref: ${pack.ref}`,
    "",
    "## Quote memo",
    pack.quote,
    "",
    "## Payment request",
    pack.paymentRequest,
    "",
    "## Payment received memo",
    pack.receipt,
    "",
    "## Operator evidence CSV",
    "```csv",
    pack.evidenceCsv,
    "```"
  ].join("\n");
}

export function invoicePackFiles(pack) {
  const date = String(pack.issueDate || today());
  return [
    {
      name: `brief30-invoice-pack-${date}.md`,
      content: `${formatInvoicePack(pack)}\n`
    },
    {
      name: `brief30-invoice-evidence-${date}.csv`,
      content: `${pack.evidenceCsv}\n`
    }
  ];
}

function buildQuote(data) {
  return [
    `[Brief30 견적 메모] ${data.ref}`,
    "",
    `수신: ${buyerLine(data)}`,
    `공급/진행: ${data.seller}`,
    `범위: ${data.useCase}`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `전달물: ${data.offer.delivery}`,
    `전달 예정: ${data.deliveryWindow}`,
    "",
    "진행 방식:",
    ...processSteps(data.offerKey),
    "",
    "진행 가능하면 이 주문번호로 입금/결제 후 메모를 보내주세요.",
    `주문번호: ${data.ref}`
  ].join("\n");
}

function buildPaymentRequest(data) {
  const route = data.routeReady
    ? `입금/결제 안내: ${data.paymentRoute}`
    : "입금/결제 안내: 아직 미설정입니다. 실제 결제 루트를 넣은 뒤 보내세요.";
  return [
    `[Brief30 입금 요청] ${data.ref}`,
    "",
    `${data.buyer}, 아래 내용으로 진행하면 됩니다.`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `기한: ${data.dueDate}`,
    route,
    data.contact ? `문의/회신: ${data.contact}` : "",
    "",
    "입금/결제 후 이 주문번호를 같이 보내주시면 바로 작업 시작하겠습니다.",
    `주문번호: ${data.ref}`
  ].filter(Boolean).join("\n");
}

function buildReceipt(data) {
  return [
    `[Brief30 입금 확인] ${data.ref}`,
    "",
    `${data.buyer}, 입금/결제 확인했습니다.`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `작업 범위: ${data.useCase}`,
    `전달 예정: ${data.deliveryWindow}`,
    "",
    "다음 단계:",
    ...receiptSteps(data.offerKey)
  ].join("\n");
}

function buildEvidenceCsv(data) {
  return [
    "ref,buyer,offer,amount,contact,use_case,payment_route,date",
    [
      data.ref,
      data.buyer,
      data.offer.label,
      data.offer.price,
      data.contact,
      data.useCase,
      data.paymentRoute || "PAYMENT_ROUTE_MISSING",
      data.issueDate
    ].map(csvCell).join(",")
  ].join("\n");
}

function buyerLine(data) {
  return data.company ? `${data.company} / ${data.buyer}` : data.buyer;
}

function defaultUseCase(offer) {
  if (offer === "team") return "팀 주간보고/회의록 반복 정리";
  if (offer === "workfix") return "반복 업무 1개 자동화";
  return offer === "service" ? "업무 메모 3개 정리" : "첫 업무 메모 셋업";
}

function defaultDeliveryWindow(offer) {
  if (offer === "workfix") return "입금 확인 후 24시간 내 1차 자동화 산출물 납품";
  return "입금 확인 후 24시간 이내";
}

function processSteps(offer) {
  if (offer === "workfix") {
    return [
      "1. 현재 반복 업무, 샘플 입력 1개, 원하는 결과 형태를 받습니다.",
      "2. 작은 도구/스크립트/템플릿 중 가장 빠른 납품 형태로 만듭니다.",
      "3. 실행 방법과 수정 요청 1회까지 반영합니다."
    ];
  }
  return [
    "1. 회사명/고객명/개인정보를 지운 메모를 받습니다.",
    "2. 보고서/회의록/후속 액션 포맷으로 정리합니다.",
    "3. 결과 확인 후 수정 요청 1회까지 반영합니다."
  ];
}

function receiptSteps(offer) {
  if (offer === "workfix") {
    return [
      "1. 현재 반복 업무와 샘플 입력 1개를 보내주세요.",
      "2. 24시간 내 1차 자동화 산출물과 실행 방법을 전달합니다.",
      "3. 확인 후 수정 요청 1회를 반영합니다."
    ];
  }
  return [
    "1. 익명화한 업무 메모를 보내주세요.",
    "2. 결과물을 확인한 뒤 수정 요청 1회를 반영합니다.",
    "3. 납품 후 짧은 후기/소개 요청을 드릴 수 있습니다."
  ];
}

function makeRef(date = today()) {
  return `B30-INV-${String(date || today()).replace(/[^\d]/gu, "")}`;
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return today();
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return value.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function clean(value) {
  return String(value || "").trim();
}
