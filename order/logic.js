export const ORDER_OFFERS = {
  self: {
    label: "19,000원 셀프툴",
    short: "Brief30 단일 HTML 앱, 예시팩, 구매자 안내 문서",
    price: 19000,
    math: "셀프툴 16건",
    mathCopy: "19,000원 x 16 = 304,000원"
  },
  setup: {
    label: "49,000원 셋업팩",
    short: "툴 + 실제 업무 메모 1개를 보고 포맷으로 셋업",
    price: 49000,
    math: "셋업팩 7건",
    mathCopy: "49,000원 x 7 = 343,000원"
  },
  service: {
    label: "99,000원 대행팩",
    short: "업무 메모 3개 정리 + 반복 보고 포맷 제안",
    price: 99000,
    math: "대행팩 4건",
    mathCopy: "99,000원 x 4 = 396,000원"
  },
  team: {
    label: "300,000원 팀 브리핑 스프린트",
    short: "팀 업무 메모 최대 10개 + 주간 브리핑 4회 + 실행 액션 보드",
    price: 300000,
    math: "팀 스프린트 1건",
    mathCopy: "300,000원 x 1 = 300,000원"
  },
  workfix: {
    label: "300,000원 Workfix Sprint",
    short: "반복 업무 1개를 24시간 안에 작은 도구/스크립트/템플릿으로 납품",
    price: 300000,
    math: "Workfix 1건",
    mathCopy: "300,000원 x 1 = 300,000원"
  }
};

export const DEFAULT_ORDER_OFFER = "team";

const INTENTS = {
  approval_request: {
    label: "내부 승인 요청",
    stage: "replied",
    note: "approval request"
  },
  approved_pending_payment: {
    label: "승인됨/결제 대기",
    stage: "tester",
    note: "approved pending payment"
  },
  payment_route_needed: {
    label: "결제 정보 요청",
    stage: "tester",
    note: "payment route needed"
  }
};

export function buildOrderState({
  form = {},
  selectedOffer = DEFAULT_ORDER_OFFER,
  config = {},
  orderRef = makeRef(),
  now = new Date(),
  currentUrl = ""
} = {}) {
  const offerKey = normalizeOffer(selectedOffer);
  const offer = ORDER_OFFERS[offerKey];
  const issueDate = isoDate(now);
  const rootUrl = publicRoot(config, currentUrl);
  const data = {
    offerKey,
    offer,
    orderRef,
    issueDate,
    nextTouch: addDays(issueDate, 1),
    buyer: clean(form.buyer) || "[이름/입금자명]",
    company: clean(form.company) || (offerKey === "team" ? "OO팀" : ""),
    approver: clean(form.approver) || "결재권자",
    contact: clean(form.contact) || "[회신 연락처]",
    useCase: clean(form.useCase) || defaultUseCase(offerKey),
    memo: clean(form.memo) || "아직 없음",
    intentKey: normalizeIntent(form.intentStatus),
    paymentRoute: paymentRoute(config),
    deliveryWindow: deliveryWindow(config, offerKey),
    supportEmail: clean(config.supportEmail),
    rootUrl,
    demoUrl: clean(config.demoUrl) || "../diagnostic/index.html",
    intakeBaseUrl: clean(config.intakeUrl) || "../intake/index.html"
  };
  const links = buyerLinks(data);

  return {
    ...data,
    ...links,
    intentLabel: INTENTS[data.intentKey].label,
    paymentConfigured: hasConfiguredPayment(data.paymentRoute),
    paymentStatusLabel: hasConfiguredPayment(data.paymentRoute) ? "결제 안내 준비됨" : "결제 정보 확인 필요",
    amountText: formatKrw(offer.price),
    orderMessage: buildOrderMessage(data, links),
    approvalMessage: buildApprovalMessage(data, links),
    paymentRequestMessage: buildPaymentRequestMessage(data, links),
    operatorCsv: buildOperatorCsv(data),
    mailtoUrl: buildMailto(data)
  };
}

export function normalizeOffer(value) {
  const text = clean(value).toLowerCase();
  if (text.includes("workfix") || text.includes("자동화") || text.includes("워크픽스")) return "workfix";
  if (text.includes("team") || text.includes("팀") || text.includes("300")) return "team";
  if (text.includes("service") || text.includes("대행") || text.includes("99")) return "service";
  if (text.includes("self") || text.includes("셀프") || text.includes("19")) return "self";
  if (text.includes("setup") || text.includes("셋업") || text.includes("49")) return "setup";
  return DEFAULT_ORDER_OFFER;
}

export function makeRef(now = new Date()) {
  const date = isoDate(now).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `B30-${date}-${suffix}`;
}

export function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function buildOrderMessage(data, links) {
  return [
    `[Brief30 주문/승인 요청] ${data.orderRef}`,
    `상태: ${INTENTS[data.intentKey].label}`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `구매자/입금자명: ${data.buyer}`,
    data.company ? `회사/팀: ${data.company}` : "",
    `회신 연락처: ${data.contact}`,
    `필요한 결과물: ${data.useCase}`,
    `제공 범위: ${data.offer.short}`,
    `메모: ${data.memo}`,
    `결제/입금 안내: ${data.paymentRoute}`,
    `전달 시간: ${data.deliveryWindow}`,
    `개인 진행룸: ${links.dealRoomUrl}`,
    `청구/결제 메모: ${links.invoiceUrl}`,
    `결제 증빙: ${links.paidUrl}`,
    `구매 후 intake: ${links.intakeUrl}`,
    "",
    "실제 결제 확인 전에는 매출로 기록하지 않습니다.",
    "민감한 회사명, 고객명, 개인정보는 제거해서 전달하겠습니다."
  ].filter(Boolean).join("\n");
}

function buildApprovalMessage(data, links) {
  const paymentLine = hasConfiguredPayment(data.paymentRoute)
    ? `승인 후 결제/입금 안내: ${data.paymentRoute}`
    : "승인 후 실제 결제 계좌 또는 결제 URL을 확인해 진행하겠습니다.";
  return [
    `[Brief30 내부 승인 공유] ${data.orderRef}`,
    "",
    `${data.approver}님, ${data.company || data.buyer}의 ${data.useCase} 정리를 위해 ${data.offer.label} 진행 승인 요청드립니다.`,
    `금액: ${formatKrw(data.offer.price)}`,
    `범위: ${data.offer.short}`,
    `전달: ${data.deliveryWindow}`,
    paymentLine,
    "",
    "진행 기준:",
    "- 회사명, 고객명, 실명, 계약 금액 등 민감 정보는 제거한 메모로 진행합니다.",
    "- 결과물은 내부 업무 문서 초안이며 최종 검토는 요청자가 진행합니다.",
    "- 승인/주문 의사만으로는 매출 처리하지 않고 실제 결제 증거가 있어야 합니다.",
    "",
    `주문/승인 번호: ${data.orderRef}`,
    `회신 연락처: ${data.contact}`,
    `진행룸: ${links.dealRoomUrl}`,
    `청구/결제 메모: ${links.invoiceUrl}`
  ].join("\n");
}

function buildPaymentRequestMessage(data, links) {
  const paymentLine = hasConfiguredPayment(data.paymentRoute)
    ? `현재 결제 안내: ${data.paymentRoute}`
    : "필요 조치: 결제 계좌 또는 결제 URL을 회신해 주세요.";
  return [
    `[Brief30 결제 정보 요청] ${data.orderRef}`,
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.offer.price)}`,
    `구매자/입금자명: ${data.buyer}`,
    data.company ? `회사/팀: ${data.company}` : "",
    `회신 연락처: ${data.contact}`,
    `필요한 결과물: ${data.useCase}`,
    paymentLine,
    `청구/결제 메모: ${links.invoiceUrl}`,
    `개인 진행룸: ${links.dealRoomUrl}`,
    "",
    "이 메시지는 구매 의사 확인용이며, 실제 결제 증빙 확인 전에는 매출로 기록하지 않습니다."
  ].filter(Boolean).join("\n");
}

function buildOperatorCsv(data) {
  const intent = INTENTS[data.intentKey];
  return [
    "name,status,offer,next_touch,note",
    [
      data.buyer,
      intent.stage,
      data.offerKey,
      data.nextTouch,
      `${intent.note} / ${data.company || "no company"} / ${data.approver} / ${data.orderRef} / ${data.useCase}`
    ].map(csvCell).join(",")
  ].join("\n");
}

function buildMailto(data) {
  const subject = encodeURIComponent(`[Brief30 주문] ${data.orderRef}`);
  const body = encodeURIComponent(buildOrderMessage(data, buyerLinks(data)));
  return `mailto:${data.supportEmail}?subject=${subject}&body=${body}`;
}

function buyerLinks(data) {
  return {
    dealRoomUrl: orderUrl(data, "dealroom/index.html", {
      offer: data.offerKey,
      buyer: data.buyer,
      company: data.company,
      useCase: data.useCase,
      ref: data.orderRef
    }),
    invoiceUrl: orderUrl(data, "invoice/index.html", {
      offer: data.offerKey,
      buyer: data.buyer,
      company: data.company,
      useCase: data.useCase,
      ref: data.orderRef,
      date: data.issueDate
    }),
    paidUrl: orderUrl(data, "paid/index.html", {
      offer: data.offerKey,
      ref: data.orderRef,
      buyer: data.buyer,
      amount: data.offer.price,
      useCase: data.useCase,
      date: data.issueDate
    }),
    intakeUrl: orderUrl(data, "intake/index.html", {
      ref: data.orderRef,
      offer: data.offerKey,
      buyer: data.buyer,
      useCase: data.useCase
    }, data.intakeBaseUrl)
  };
}

function orderUrl(data, path, values, fallbackBase = "") {
  const base = data.rootUrl ? `${data.rootUrl}${path}` : fallbackBase || `../${path}`;
  return buildUrl(base, values);
}

function publicRoot(config, currentUrl) {
  const configured = normalizeRoot(config.publicUrl);
  if (configured) return configured;
  if (!currentUrl) return "";
  try {
    return new URL("../", currentUrl).href;
  } catch {
    return "";
  }
}

function normalizeRoot(value) {
  const root = clean(value);
  return root ? (root.endsWith("/") ? root : `${root}/`) : "";
}

function buildUrl(base, values) {
  const separator = base.includes("?") ? "&" : "?";
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value) && !String(value).startsWith("[")) params.set(key, value);
  });
  return `${base}${separator}${params.toString()}`;
}

function paymentRoute(config) {
  if (clean(config.bankAccount)) {
    return `${clean(config.bankAccount)} / ${clean(config.sellerName) || "Brief30"}`;
  }
  return clean(config.contactLine) || "결제 전 판매자에게 계좌를 확인하세요.";
}

function hasConfiguredPayment(value) {
  return !String(value || "").includes("계좌를 확인");
}

function deliveryWindow(config, offerKey) {
  const configured = clean(config.deliveryWindow);
  if (offerKey === "workfix" && (!configured || /24\s*시간/u.test(configured))) {
    return "입금 확인 후 24시간 내 1차 자동화 산출물 납품";
  }
  if (offerKey === "team" && (!configured || /24\s*시간/u.test(configured))) {
    return "입금 확인 후 3영업일 내 1차 납품, 4주 내 마감";
  }
  return configured || "입금 확인 후 24시간 이내";
}

function defaultUseCase(offerKey) {
  if (offerKey === "team") return "팀 주간보고/회의록 반복 정리";
  if (offerKey === "workfix") return "반복 업무 1개 자동화";
  if (offerKey === "service") return "업무 메모 3개 정리";
  if (offerKey === "self") return "보고서 정리 셀프 실행";
  return "첫 업무 메모 정리";
}

function normalizeIntent(value) {
  return INTENTS[value] ? value : "approval_request";
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

function csvCell(value) {
  return `"${String(value || "").replaceAll("\"", "\"\"")}"`;
}

function clean(value) {
  return String(value || "").trim();
}
