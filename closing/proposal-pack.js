import { CLOSE_OFFERS, buildFallbackClose, buildPaymentNudge } from "./followup.js";

export function buildProposalPack(options = {}) {
  const offerKey = CLOSE_OFFERS[options.offer] ? options.offer : "service";
  const offer = CLOSE_OFFERS[offerKey];
  const ref = options.ref || makeRef(options.date);
  const publicUrl = normalizeRoot(options.publicUrl);
  const buyer = clean(options.buyer) || "OO님";
  const useCase = clean(options.useCase) || defaultUseCase(offerKey);
  const paymentRoute = clean(options.paymentRoute);
  const routeReady = Boolean(paymentRoute);
  const deliveryWindow = clean(options.deliveryWindow) || "입금 확인 후 24시간 이내";
  const intakeUrl = buildUrl(publicUrl, "intake/index.html", { ref, offer: offerKey, buyer, useCase });
  const closeUrl = buildUrl(publicUrl, "closing/index.html", { offer: offerKey, buyer, useCase });
  const dealRoomUrl = buildUrl(publicUrl, "dealroom/index.html", { ref, offer: offerKey, buyer, useCase });

  const data = { buyer, offer: offerKey, useCase, ref, payment: paymentRoute, deliveryWindow, intakeUrl };
  return {
    ref,
    buyer,
    useCase,
    offerKey,
    offer,
    publicUrl,
    routeReady,
    paymentRoute,
    intakeUrl,
    closeUrl,
    dealRoomUrl,
    proposal: buildProposal({ buyer, useCase, offer, deliveryWindow, routeReady, paymentRoute, intakeUrl, closeUrl, dealRoomUrl }),
    confirmation: buildConfirmation({ buyer, useCase, offer, deliveryWindow, intakeUrl, ref }),
    nudge: routeReady ? buildPaymentNudge(data) : buildRouteMissingNudge(data),
    fallback: buildFallbackClose(data),
    evidenceCsv: buildEvidenceCsv({ ref, buyer, offer, useCase, paymentRoute })
  };
}

export function formatProposalPack(pack) {
  return [
    "# Brief30 proposal pack",
    "",
    `Buyer: ${pack.buyer}`,
    `Offer: ${pack.offer.label}`,
    `Amount: ${formatKrw(pack.offer.price)}`,
    `Payment route: ${pack.routeReady ? pack.paymentRoute : "missing"}`,
    `Deal room URL: ${pack.dealRoomUrl}`,
    `Close URL: ${pack.closeUrl}`,
    "",
    "## Proposal message",
    pack.proposal,
    "",
    "## Confirmation message",
    pack.confirmation,
    "",
    "## 24-hour follow-up",
    pack.nudge,
    "",
    "## Fallback close",
    pack.fallback,
    "",
    "## Operator evidence CSV",
    "```csv",
    pack.evidenceCsv,
    "```"
  ].join("\n");
}

function buildProposal({ buyer, useCase, offer, deliveryWindow, routeReady, paymentRoute, intakeUrl, closeUrl, dealRoomUrl }) {
  const paymentLine = routeReady
    ? `결제/입금 안내: ${paymentRoute}`
    : "결제/입금 안내: 아직 미설정입니다. 진행 의사 확인 후 바로 결제 루트를 보내겠습니다.";
  return [
    `${buyer}, 말씀하신 ${useCase}${topicParticle(useCase)} ${offer.label}${instrumentalParticle(offer.label)} 진행하면 됩니다.`,
    "",
    `금액: ${formatKrw(offer.price)}`,
    `전달물: ${offer.delivery}`,
    `전달 시간: ${deliveryWindow}`,
    paymentLine,
    "",
    "진행 방식:",
    "1. 회사명/고객명/개인정보를 지운 메모를 보냅니다.",
    "2. 제가 요약, 보고서/회의록, 후속 액션 포맷으로 정리합니다.",
    "3. 결과 확인 후 수정 요청 1회까지 반영합니다.",
    "",
    `익명 메모 제출: ${intakeUrl}`,
    `개인 진행룸: ${dealRoomUrl}`,
    `상세/견적 링크: ${closeUrl}`,
    "",
    routeReady ? "진행하실 거면 결제 후 메모를 보내주세요." : "진행 가능하면 '진행'이라고만 답 주세요. 결제 루트부터 바로 정리해 보내겠습니다."
  ].join("\n");
}

function buildConfirmation({ buyer, useCase, offer, deliveryWindow, intakeUrl, ref }) {
  return [
    `[Brief30 진행 확인] ${ref}`,
    "",
    `${buyer}, 확인 감사합니다.`,
    `${offer.label} 기준으로 ${useCase} 작업을 진행하겠습니다.`,
    "",
    "다음 단계:",
    `1. 익명 메모 제출: ${intakeUrl}`,
    `2. 전달 예정: ${deliveryWindow}`,
    "3. 결과 확인 후 수정 요청 1회 반영"
  ].join("\n");
}

function buildRouteMissingNudge(data) {
  return [
    `${data.buyer}, 아까 보낸 ${CLOSE_OFFERS[data.offer].label} 범위만 다시 올립니다.`,
    "",
    `진행 범위: ${data.useCase}`,
    `주문번호: ${data.ref}`,
    "결제 루트는 아직 연결 전이라, 진행 의사 주시면 바로 결제 안내를 붙여 보내겠습니다.",
    "",
    `먼저 익명 메모를 준비해두려면 ${data.intakeUrl} 를 쓰시면 됩니다.`
  ].join("\n");
}

function buildEvidenceCsv({ ref, buyer, offer, useCase, paymentRoute }) {
  return [
    "ref,buyer,offer,amount,contact,use_case,payment_route,date",
    [ref, buyer, offer.label, offer.price, "", useCase, paymentRoute || "PAYMENT_ROUTE_MISSING", today()].map(csvCell).join(",")
  ].join("\n");
}

function defaultUseCase(offer) {
  if (offer === "team") return "팀 주간보고/회의록 반복 정리";
  return offer === "service" ? "업무 메모 3개 정리" : "첫 업무 메모 셋업";
}

function buildUrl(root, path, params) {
  const url = new URL(path, root);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function makeRef(date = new Date()) {
  const raw = date instanceof Date ? date.toISOString() : String(date);
  const stamp = raw.replace(/[^\d]/gu, "").slice(0, 14) || today().replaceAll("-", "");
  return `B30-PROP-${stamp}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function clean(value) {
  return String(value || "").trim();
}

function topicParticle(value) {
  const text = clean(value);
  const code = text.charCodeAt(text.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "은";
  return (code - 0xac00) % 28 === 0 ? "는" : "은";
}

function instrumentalParticle(value) {
  const text = clean(value);
  const code = text.charCodeAt(text.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "으로";
  const jong = (code - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}
