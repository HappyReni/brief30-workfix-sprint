export const INVOICE_OFFERS = {
  setup: {
    label: "49,000원 셋업팩",
    price: 49000,
    delivery: "첫 업무 메모 1개 정리 + 반복 보고 포맷 셋업",
    window: "입금 확인 후 24시간 이내"
  },
  service: {
    label: "99,000원 대행팩",
    price: 99000,
    delivery: "업무 메모 3개 정리 + 반복 포맷",
    window: "입금 확인 후 24시간 이내"
  },
  team: {
    label: "300,000원 팀 브리핑 스프린트",
    price: 300000,
    delivery: "팀 업무 메모 최대 10개 정리 + 주간 브리핑 4회 + 실행 액션 보드",
    window: "입금 확인 후 3영업일 내 1차 납품, 4주 내 마감"
  },
  workfix: {
    label: "300,000원 Workfix Sprint",
    price: 300000,
    delivery: "반복 업무 1개를 24시간 안에 작은 도구/스크립트/템플릿으로 납품",
    window: "입금 확인 후 24시간 내 1차 자동화 산출물 납품"
  }
};

export function buildInvoiceState({ params = new URLSearchParams(), orderConfig = {}, now = new Date() } = {}) {
  const offerKey = normalizeOffer(params.get("offer") || "team");
  const offer = INVOICE_OFFERS[offerKey];
  const issueDate = clean(params.get("date")) || isoDate(now);
  const data = {
    offerKey,
    offer,
    seller: clean(params.get("seller")) || clean(orderConfig.sellerName) || "Brief30",
    buyer: clean(params.get("buyer")) || "OO님",
    company: clean(params.get("company")),
    useCase: clean(params.get("useCase") || params.get("use-case")) || defaultUseCase(offerKey),
    ref: clean(params.get("ref")) || makeRef(issueDate, offerKey),
    issueDate,
    dueDate: clean(params.get("due")) || addDays(issueDate, 1),
    contact: clean(params.get("contact")) || clean(orderConfig.supportEmail),
    paymentRoute: paymentRoute(params, orderConfig),
    deliveryWindow: clean(params.get("delivery")) || configuredDelivery(offerKey, orderConfig.deliveryWindow, offer.window)
  };
  return {
    ...data,
    ready: Boolean(data.paymentRoute),
    amountText: formatKrw(offer.price),
    quoteText: buildQuoteText(data),
    paymentText: buildPaymentText(data),
    proofText: buildProofText(data),
    orderUrl: buildRelativeUrl("../order/index.html", { offer: offerKey, buyer: data.buyer, useCase: data.useCase }),
    intakeUrl: buildRelativeUrl("../intake/index.html", { offer: offerKey, ref: data.ref, buyer: data.buyer, useCase: data.useCase }),
    paidUrl: buildRelativeUrl("../paid/index.html", {
      offer: offerKey,
      ref: data.ref,
      buyer: data.buyer,
      amount: offer.price,
      useCase: data.useCase,
      date: issueDate
    }),
    sampleUrl: "../team/sample.html"
  };
}

export function buildShareText(state) {
  return [
    state.quoteText,
    "",
    state.paymentText,
    "",
    state.proofText
  ].join("\n");
}

function buildQuoteText(data) {
  return [
    `[Brief30 견적/청구 메모] ${data.ref}`,
    "",
    `수신: ${data.company ? `${data.company} / ${data.buyer}` : data.buyer}`,
    `공급/진행: ${data.seller}`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `범위: ${data.useCase}`,
    `전달물: ${data.offer.delivery}`,
    `전달 예정: ${data.deliveryWindow}`,
    `결제 기한: ${data.dueDate}`,
    "",
    "진행 기준:",
    "- 회사명, 고객명, 실명, 연락처, 계약 금액은 제거한 메모만 받습니다.",
    "- 결과물은 내부 업무 문서 초안이며 최종 검토는 요청자가 진행합니다.",
    "- 실제 결제 확인 전에는 매출로 기록하지 않습니다."
  ].join("\n");
}

function buildPaymentText(data) {
  const route = data.paymentRoute
    ? `입금/결제 안내: ${data.paymentRoute}`
    : "입금/결제 안내: 판매자가 실제 계좌 또는 결제 URL을 확인한 뒤 발송합니다.";
  return [
    `[Brief30 결제 요청] ${data.ref}`,
    "",
    `${data.buyer}, 아래 내용으로 진행하면 됩니다.`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    route,
    data.contact ? `문의/회신: ${data.contact}` : "",
    "",
    `결제 메모에 주문번호 ${data.ref}를 남겨주세요.`
  ].filter(Boolean).join("\n");
}

function buildProofText(data) {
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
    `예상 금액: ${formatKrw(data.offer.price)}`
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

function normalizeOffer(value) {
  const text = clean(value).toLowerCase();
  if (text.includes("workfix") || text.includes("자동화") || text.includes("워크픽스")) return "workfix";
  if (text.includes("team") || text.includes("팀") || text.includes("300")) return "team";
  if (text.includes("setup") || text.includes("셋업") || text.includes("49")) return "setup";
  return text.includes("self") || text.includes("셀프") ? "setup" : "service";
}

function defaultUseCase(offerKey) {
  if (offerKey === "team") return "팀 주간보고/회의록 반복 정리";
  if (offerKey === "workfix") return "반복 업무 1개 자동화";
  if (offerKey === "service") return "업무 메모 3개 정리";
  return "첫 업무 메모 정리";
}

function buildRelativeUrl(path, values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value)) params.set(key, value);
  });
  return `${path}?${params.toString()}`;
}

function makeRef(date, offerKey) {
  return `B30-INV-${String(date).replace(/[^\d]/gu, "")}-${offerKey.toUpperCase()}`;
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

function clean(value) {
  return String(value || "").trim();
}
