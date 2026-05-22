import { INVOICE_OFFERS } from "../invoice/logic.js";

export function buildApprovalState({ params = new URLSearchParams(), orderConfig = {}, now = new Date() } = {}) {
  const offerKey = normalizeOffer(params.get("offer") || "team");
  const offer = INVOICE_OFFERS[offerKey] || INVOICE_OFFERS.team;
  const issueDate = clean(params.get("date")) || isoDate(now);
  const data = {
    offerKey,
    offer,
    buyer: clean(params.get("buyer")) || "OO님",
    company: clean(params.get("company")) || "OO팀",
    approver: clean(params.get("approver")) || "결재권자",
    seller: clean(params.get("seller")) || clean(orderConfig.sellerName) || "Brief30",
    contact: clean(params.get("contact")) || clean(orderConfig.supportEmail),
    useCase: clean(params.get("useCase") || params.get("use-case")) || defaultUseCase(offerKey),
    issueDate,
    dueDate: clean(params.get("due")) || addDays(issueDate, 1),
    ref: clean(params.get("ref")) || makeRef(issueDate, offerKey),
    people: numberInRange(params.get("people"), 1, 30, 4),
    weeklyHours: numberInRange(params.get("hours"), 1, 40, 6),
    paymentRoute: paymentRoute(params, orderConfig),
    deliveryWindow: clean(params.get("delivery")) || configuredDelivery(offerKey, orderConfig.deliveryWindow, offer.window)
  };
  return {
    ...data,
    ready: Boolean(data.paymentRoute),
    amountText: formatKrw(offer.price),
    memoText: buildMemoText(data),
    forwardText: buildForwardText(data),
    securityText: buildSecurityText(data),
    updateCsv: buildUpdateCsv(data),
    orderUrl: buildRelativeUrl("../order/index.html", { offer: offerKey, buyer: data.buyer, useCase: data.useCase }),
    invoiceUrl: buildRelativeUrl("../invoice/index.html", {
      offer: offerKey,
      ref: data.ref,
      buyer: data.buyer,
      company: data.company,
      useCase: data.useCase,
      date: issueDate
    }),
    paidUrl: buildRelativeUrl("../paid/index.html", {
      offer: offerKey,
      ref: data.ref,
      buyer: data.buyer,
      amount: offer.price,
      useCase: data.useCase,
      date: issueDate
    }),
    sampleUrl: "../team/sample.html",
    teamUrl: "../team/index.html"
  };
}

export function buildApprovalShareText(state) {
  return [state.forwardText, "", "승인 메모:", state.memoText, "", "보안 기준:", state.securityText].join("\n");
}

function buildMemoText(data) {
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
    `- ${data.company}에서 매주 약 ${data.weeklyHours}시간 쓰는 보고/회의 정리 시간을 줄이기 위함입니다.`,
    `- 팀원 ${data.people}명이 공유할 수 있는 주간 브리핑, 회의록, 리스크, 후속 액션 초안을 받습니다.`,
    "- 기능 구매가 아니라 실제 내부 공유 문서 초안을 받는 4주 스프린트입니다.",
    "",
    "제공 범위:",
    `- 전달물: ${data.offer.delivery}`,
    `- 일정: ${data.deliveryWindow}`,
    "- 결과 확인 후 수정 요청 1회 포함",
    "",
    "승인 기준:",
    "- 회사명, 고객명, 실명, 계약 금액 등 민감 정보는 제거한 메모로 진행합니다.",
    "- 결과물은 내부 업무 문서 초안이며 최종 검토는 요청자가 진행합니다.",
    "- 실제 결제 확인 전에는 매출 또는 완료 건으로 기록하지 않습니다."
  ].join("\n");
}

function buildForwardText(data) {
  const paymentLine = data.paymentRoute
    ? `승인되면 결제/입금 안내는 ${data.paymentRoute}입니다.`
    : "승인되면 실제 결제 루트를 확인한 뒤 진행하겠습니다.";
  return [
    `${data.approver}님, ${data.company}의 ${data.useCase} 정리를 위해 Brief30 ${data.offer.label} 승인 요청드립니다.`,
    "",
    `금액은 ${formatKrw(data.offer.price)}이고, 범위는 ${data.offer.delivery}입니다.`,
    `일정은 ${data.deliveryWindow} 기준입니다.`,
    "회사명/고객명/개인정보는 제거한 메모로 진행하고, 민감 원문은 공유하지 않습니다.",
    paymentLine,
    "",
    `승인용 주문번호: ${data.ref}`
  ].join("\n");
}

function buildSecurityText(data) {
  return [
    `[Brief30 보안/개인정보 메모] ${data.ref}`,
    "",
    "운영 기준:",
    "- 구매자용 Brief30은 로그인 없이 브라우저에서 실행됩니다.",
    "- 업무 메모는 회사명, 고객명, 개인식별정보를 제거한 뒤 전달합니다.",
    "- 민감한 원문, 계약서, 고객 개인정보 원본은 받지 않는 기준입니다.",
    "- 결과물은 내부 검토용 초안이며 공식 보고 전 요청자가 최종 확인합니다.",
    "",
    "내부 공유 문구:",
    `${data.company} 내부 공유용 자료에는 익명화한 예시와 결과물 범위만 포함합니다.`,
    `문의/회신: ${data.contact || "기존 대화방"}`
  ].join("\n");
}

function buildUpdateCsv(data) {
  return [
    "name,status,offer,next_touch,note",
    [data.buyer, "replied", data.offerKey, data.dueDate, `approval memo sent / ${data.company} / ${data.approver}`].map(csvCell).join(",")
  ].join("\n");
}

function paymentRoute(params, orderConfig) {
  const explicit = clean(params.get("payment") || params.get("paymentRoute") || params.get("payment-route"));
  if (explicit) return explicit;
  if (clean(orderConfig.bankAccount)) {
    return `${clean(orderConfig.bankAccount)} / 문의: ${clean(orderConfig.supportEmail) || clean(orderConfig.contactLine) || "기존 대화방"}`;
  }
  return "";
}

function configuredDelivery(offerKey, value, fallback) {
  const delivery = clean(value);
  if (!delivery) return fallback;
  if (offerKey === "workfix" && /24\s*시간/u.test(delivery)) return fallback;
  if (offerKey === "team" && /24\s*시간/u.test(delivery)) return fallback;
  return delivery;
}

function defaultUseCase(offerKey) {
  if (offerKey === "team") return "팀 주간보고/회의록 반복 정리";
  if (offerKey === "workfix") return "반복 업무 1개 자동화";
  if (offerKey === "service") return "업무 메모 3개 정리";
  return "첫 업무 메모 정리";
}

function normalizeOffer(value) {
  const text = clean(value).toLowerCase();
  if (text.includes("workfix") || text.includes("자동화") || text.includes("워크픽스")) return "workfix";
  if (text.includes("team") || text.includes("팀") || text.includes("300")) return "team";
  if (text.includes("setup") || text.includes("셋업") || text.includes("49")) return "setup";
  if (text.includes("self") || text.includes("셀프") || text.includes("19")) return "setup";
  return "service";
}

function buildRelativeUrl(path, values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value)) params.set(key, value);
  });
  return `${path}?${params.toString()}`;
}

function numberInRange(value, min, max, fallback) {
  const parsed = Number(String(value || "").replace(/[^\d.]/gu, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function makeRef(date, offerKey) {
  return `B30-APP-${String(date).replace(/[^\d]/gu, "")}-${offerKey.toUpperCase()}`;
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return isoDate(new Date());
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return value.toISOString().slice(0, 10);
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
