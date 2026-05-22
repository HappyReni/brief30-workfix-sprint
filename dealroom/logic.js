const OFFERS = {
  self: {
    key: "self",
    label: "19,000원 셀프툴",
    shortLabel: "셀프툴",
    amount: 19000,
    delivery: "앱, 예시팩, 구매자 안내"
  },
  setup: {
    key: "setup",
    label: "49,000원 셋업팩",
    shortLabel: "셋업팩",
    amount: 49000,
    delivery: "첫 업무 메모 1개 셋업과 반복 포맷"
  },
  service: {
    key: "service",
    label: "99,000원 대행팩",
    shortLabel: "대행팩",
    amount: 99000,
    delivery: "업무 메모 3개 정리와 공유 포맷"
  },
  team: {
    key: "team",
    label: "300,000원 팀 브리핑 스프린트",
    shortLabel: "팀 스프린트",
    amount: 300000,
    delivery: "팀 업무 메모 최대 10개, 주간 브리핑 4회, 실행 액션 보드"
  },
  workfix: {
    key: "workfix",
    label: "300,000원 Workfix Sprint",
    shortLabel: "Workfix",
    amount: 300000,
    delivery: "반복 업무 1개를 24시간 안에 작은 도구/스크립트/템플릿으로 납품"
  }
};

export function buildDealRoomState(search = "", orderConfig = {}, marketingConfig = {}, options = {}) {
  const params = toParams(search);
  const offerKey = normalizeOffer(params.get("offer") || options.offer);
  const offer = OFFERS[offerKey];
  const buyer = clean(params.get("buyer") || options.buyer) || "OO님";
  const company = clean(params.get("company") || options.company) || "";
  const useCase = clean(params.get("useCase") || options.useCase) || defaultUseCase(offerKey);
  const date = isoDate(params.get("date") || options.date);
  const ref = clean(params.get("ref") || options.ref) || makeRef(date, offerKey);
  const roomUrl = clean(options.currentUrl || params.get("roomUrl")) || "";
  const route = paymentRouteFor(offerKey, orderConfig, marketingConfig);
  const urls = dealUrls({ ref, offerKey, buyer, company, useCase });
  const primaryCta = route.href
    ? { label: "결제 링크 열기", href: route.href }
    : { label: "주문/진행 확인", href: urls.order };

  return {
    offer,
    buyer,
    company,
    useCase,
    date,
    ref,
    amountText: formatKrw(offer.amount),
    roomUrl,
    route,
    primaryCta,
    urls,
    offerPhrase: withInstrumental(offer.label),
    shortOfferPhrase: withInstrumental(offer.shortLabel),
    steps: buildSteps(offerKey, urls, route),
    shareText: buildShareText({ buyer, company, useCase, offer, ref, route, urls, roomUrl }),
    securityText: buildSecurityText({ buyer, company, useCase, offer, ref }),
    operatorCsv: buildOperatorCsv({ buyer, company, useCase, offerKey, ref, date, route })
  };
}

export function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function withInstrumental(value) {
  return `${value}${instrumentalParticle(value)}`;
}

function buildSteps(offerKey, urls, route) {
  const steps = [
    {
      title: "결과 확인",
      body: "무료 진단 또는 Before/After 예시로 결과물 형태를 먼저 봅니다.",
      href: urls.proof,
      label: "예시 보기"
    },
    {
      title: offerKey === "team" ? "승인/청구" : "주문 확인",
      body: offerKey === "team"
        ? "내부 승인 메모와 청구서로 결재권자에게 범위, 금액, 보안 기준을 전달합니다."
        : "주문 링크에서 상품, 금액, 전달 시간을 확인합니다.",
      href: offerKey === "team" ? urls.approval : urls.order,
      label: offerKey === "team" ? "승인 메모" : "주문 보기"
    },
    {
      title: "결제 증거",
      body: route.ready
        ? "결제 후 주문번호, 금액, 결제일이 보이는 증빙을 남깁니다."
        : "아직 실제 결제 루트가 없으므로 진행 의사만 먼저 확인합니다.",
      href: urls.paid,
      label: "증빙 양식"
    },
    {
      title: "메모 전달",
      body: "회사명, 고객명, 개인정보, 계약 금액을 지운 업무 메모를 보냅니다.",
      href: urls.intake,
      label: "메모 보내기"
    }
  ];
  return steps;
}

function buildShareText({ buyer, company, useCase, offer, ref, route, urls, roomUrl }) {
  const lines = [
    `${buyer}, ${company ? `${company}의 ` : ""}${useCase} 건은 ${withInstrumental(offer.label)} 진행하면 됩니다.`,
    "",
    `금액: ${formatKrw(offer.amount)}`,
    `전달물: ${offer.delivery}`,
    `주문번호: ${ref}`,
    `개인 진행룸: ${roomUrl || urls.room}`,
    route.ready ? `결제/입금 안내: ${route.instruction}` : "결제/입금 안내: 진행 의사 확인 후 실제 루트를 붙여 보내겠습니다.",
    "",
    offer.key === "team" ? `내부 승인 메모: ${urls.approval}` : `주문 확인: ${urls.order}`,
    `결제 증빙: ${urls.paid}`,
    `익명 메모 제출: ${urls.intake}`,
    "",
    "실제 결제 확인 전에는 매출 또는 완료 건으로 기록하지 않습니다."
  ];
  return lines.join("\n");
}

function buildSecurityText({ buyer, company, useCase, offer, ref }) {
  return [
    `[Brief30 진행 보안 메모] ${ref}`,
    "",
    `대상: ${buyer}${company ? ` / ${company}` : ""}`,
    `범위: ${useCase}`,
    `상품: ${offer.label}`,
    "",
    "보내지 않을 정보:",
    "- 회사명, 고객명, 실명, 연락처, 계약 금액",
    "- 원문 전체가 없어도 이해되는 내부 맥락",
    "- 외부 공유가 곤란한 파일, 계정, 시스템 링크",
    "",
    "보낼 정보:",
    "- 익명화한 업무 메모",
    "- 원하는 출력 형태",
    "- 마감일과 확인해야 할 결정사항"
  ].join("\n");
}

function buildOperatorCsv({ buyer, company, useCase, offerKey, ref, date, route }) {
  return [
    "name,status,offer,next_touch,note",
    [
      buyer,
      "replied",
      offerKey,
      addDays(date, 1),
      `dealroom sent / ${company || "no company"} / ${useCase} / ${ref} / ${route.label}`
    ].map(csvCell).join(",")
  ].join("\n");
}

function dealUrls({ ref, offerKey, buyer, company, useCase }) {
  const common = { ref, offer: offerKey, buyer, useCase };
  return {
    room: `../dealroom/index.html?${query({ ...common, company })}`,
    proof: "../proof/index.html",
    diagnostic: "../diagnostic/index.html",
    order: `../order/index.html?${query({ offer: offerKey, buyer, useCase })}`,
    invoice: `../invoice/index.html?${query(common)}`,
    approval: `../approval/index.html?${query({ ...common, company })}`,
    paid: `../paid/index.html?${query({ offer: offerKey, ref, buyer, amount: OFFERS[offerKey].amount })}`,
    intake: `../intake/index.html?${query(common)}`
  };
}

function paymentRouteFor(offerKey, orderConfig = {}, marketingConfig = {}) {
  const checkout = checkoutUrlFor(offerKey, marketingConfig);
  if (isHttpUrl(checkout)) {
    return {
      ready: true,
      type: "checkout",
      label: "외부 결제 가능",
      instruction: checkout,
      href: checkout
    };
  }

  const email = clean(orderConfig.supportEmail);
  const bankAccount = clean(orderConfig.bankAccount);
  if (isEmail(email) && isPaymentInstruction(bankAccount)) {
    return {
      ready: true,
      type: "direct",
      label: "직접 입금 가능",
      instruction: `${bankAccount} / 문의: ${email}`,
      href: ""
    };
  }

  return {
    ready: false,
    type: "missing",
    label: "결제 루트 확인 필요",
    instruction: clean(orderConfig.contactLine) || "진행 의사 확인 후 실제 결제 안내를 보내드립니다.",
    href: ""
  };
}

function checkoutUrlFor(offerKey, marketingConfig = {}) {
  const map = {
    self: marketingConfig.buyUrl,
    setup: marketingConfig.setupUrl,
    service: marketingConfig.serviceUrl,
    team: marketingConfig.teamUrl || marketingConfig.serviceUrl,
    workfix: marketingConfig.workfixUrl || marketingConfig.teamUrl || marketingConfig.serviceUrl
  };
  return clean(map[offerKey]);
}

function normalizeOffer(value) {
  return OFFERS[value] ? value : "team";
}

function defaultUseCase(offerKey) {
  if (offerKey === "team") return "팀 주간보고와 회의록 정리";
  if (offerKey === "workfix") return "반복 업무 1개 자동화";
  if (offerKey === "service") return "업무 메모 3개 정리";
  if (offerKey === "self") return "첫 업무 메모 셀프 정리";
  return "첫 업무 메모 셋업";
}

function makeRef(date, offerKey) {
  return `B30-ROOM-${date.replaceAll("-", "")}-${offerKey.toUpperCase()}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + Number(days || 0));
  return value.toISOString().slice(0, 10);
}

function isoDate(value) {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/u.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function toParams(value) {
  if (value instanceof URLSearchParams) return value;
  return new URLSearchParams(String(value || "").replace(/^\?/u, ""));
}

function query(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value)) params.set(key, value);
  });
  return params.toString();
}

function clean(value) {
  return String(value || "").trim();
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function isEmail(value) {
  const email = clean(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) && !email.endsWith("@example.com") && !email.endsWith("@example.co.kr");
}

function isPaymentInstruction(value) {
  const payment = clean(value);
  return Boolean(payment) && !/(은행\s*0|000-0000|0000-0000|예금주\s*$)/u.test(payment);
}

function isHttpUrl(value) {
  try {
    const url = new URL(clean(value));
    const host = url.hostname.toLowerCase();
    const placeholder = /(^|\.)example\./u.test(host);
    return ["http:", "https:"].includes(url.protocol) && host.includes(".") && !placeholder;
  } catch {
    return false;
  }
}

function instrumentalParticle(value) {
  const text = clean(value);
  const code = text.charCodeAt(text.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "으로";
  const jong = (code - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}
