export function serviceCtaLinks({ marketingConfig = {}, orderConfig = {} } = {}) {
  const serviceUrl = clean(marketingConfig.serviceUrl);
  const orderUrl = clean(marketingConfig.orderUrl) || "../order/index.html";
  const intakeUrl = clean(orderConfig.intakeUrl) || "../intake/index.html";
  return {
    primary: isHttpUrl(serviceUrl) ? serviceUrl : withParam(orderUrl, "offer", "service"),
    order: withParam(orderUrl, "offer", "service"),
    close: "../closing/index.html?offer=service&useCase=%EA%B3%A0%EA%B0%9D%EC%82%AC%20%EC%97%85%EB%8D%B0%EC%9D%B4%ED%8A%B8&source=service",
    intake: withParam(intakeUrl, "offer", "service")
  };
}

export function servicePaymentState({ marketingConfig = {}, orderConfig = {} } = {}) {
  if (isHttpUrl(marketingConfig.serviceUrl)) {
    return "대행팩 checkout 연결됨";
  }
  if (orderConfig.supportEmail && orderConfig.bankAccount) {
    return "직접 주문 연결됨";
  }
  return "결제 루트 설정 필요";
}

export function buildServiceShareText(links, currentHref) {
  const serviceUrl = absoluteUrl(links.primary, currentHref);
  const diagnosticUrl = absoluteUrl("../diagnostic/index.html", currentHref);
  return [
    "보고서/회의록/고객사 업데이트가 밀려 있으면 Brief30 대행팩으로 메모 3개만 보내주세요.",
    "",
    "회사명과 고객명은 지우고 보내면, 24시간 안에 요약/보고서/후속메일 포맷으로 정리합니다.",
    `무료 진단: ${diagnosticUrl}`,
    `대행팩 요청: ${serviceUrl}`,
    "",
    "툴을 배우기보다 이번 주 결과물이 먼저 필요한 분에게 맞습니다."
  ].join("\n");
}

function withParam(url, key, value) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function absoluteUrl(path, currentHref) {
  return new URL(path, currentHref).toString();
}

function clean(value) {
  return String(value || "").trim();
}

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/u.test(clean(value));
}
