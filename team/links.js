export function teamCtaLinks({ marketingConfig = {}, orderConfig = {} } = {}) {
  const orderUrl = clean(marketingConfig.orderUrl) || "../order/index.html";
  const intakeUrl = clean(orderConfig.intakeUrl) || "../intake/index.html";
  const teamUrl = clean(marketingConfig.teamUrl);
  return {
    primary: teamUrl || withParam(orderUrl, "offer", "team"),
    order: teamUrl || withParam(orderUrl, "offer", "team"),
    close: "../closing/index.html?offer=team&useCase=%ED%8C%80%20%EC%A3%BC%EA%B0%84%EB%B3%B4%EA%B3%A0&source=team",
    invoice: "../invoice/index.html?offer=team",
    approval: "../approval/index.html?offer=team",
    intake: withParam(intakeUrl, "offer", "team"),
    sample: "./sample.html",
    serviceFallback: "../service/index.html"
  };
}

export function teamPaymentState({ marketingConfig = {}, orderConfig = {} } = {}) {
  if (marketingConfig.teamUrl) return "팀 결제 URL 연결됨";
  if (orderConfig.supportEmail && orderConfig.bankAccount) return "직접 주문 연결됨";
  if (orderConfig.contactLine && !/DM 또는 이메일/u.test(orderConfig.contactLine)) return "연락 주문 연결됨";
  return "결제 루트 설정 필요";
}

export function buildTeamShareText(links, currentHref) {
  const teamUrl = absoluteUrl(links.primary, currentHref);
  const sampleUrl = absoluteUrl(links.sample || "./sample.html", currentHref);
  const approvalUrl = absoluteUrl(links.approval || "../approval/index.html?offer=team", currentHref);
  return [
    "팀 주간보고/회의록 정리가 매주 밀리면 Brief30 팀 브리핑 스프린트로 한 번에 처리하세요.",
    "",
    "300,000원으로 익명화한 업무 메모 최대 10개를 받아 주간 브리핑, 회의록, 리스크, 후속 액션 보드로 묶어드립니다.",
    `샘플 산출물: ${sampleUrl}`,
    `내부 승인 메모: ${approvalUrl}`,
    `팀 주문/승인: ${teamUrl}`,
    "",
    "회사명, 고객명, 개인정보, 계약 정보는 지우고 보내는 기준으로 진행합니다."
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
