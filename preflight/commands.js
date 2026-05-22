export function paymentRouteState(orderConfig = {}, marketingConfig = {}) {
  const directReady = isEmail(orderConfig.supportEmail) && isPaymentInstruction(orderConfig.bankAccount);
  const checkoutReady = isHttpUrl(marketingConfig.teamUrl) || isHttpUrl(marketingConfig.workfixUrl) || (isHttpUrl(marketingConfig.buyUrl) && isHttpUrl(marketingConfig.setupUrl));
  return {
    directReady,
    checkoutReady,
    ready: directReady || checkoutReady,
    label: directReady ? "직접 주문 준비됨" : checkoutReady ? "외부 checkout 준비됨" : "결제 루트 필요",
    fix: "회신 이메일+결제 안내, 팀/Workfix checkout URL, 또는 self/setup checkout URL을 설정하세요."
  };
}

export function buildOrderCommand(values) {
  const direct = directCommandValues(values);
  const missing = [];
  if (!isEmail(direct.supportEmail)) missing.push("회신 이메일");
  if (!isPaymentInstruction(direct.bankAccount)) missing.push("입금/결제 안내");
  if (missing.length) {
    return `직접 주문 명령을 만들려면 다음 항목을 먼저 입력하세요: ${missing.join(", ")}`;
  }

  return [
    buildPrepareSellerCommand(direct, ["sellerName", "supportEmail", "bankAccount", "contactLine", "deliveryWindow"]),
    "npm run audit:release:strict",
    "npm run ops:runbook -- outreach/prospect-seed.csv --url=https://your-public-url"
  ].join("\n");
}

export function buildCheckoutCommand(values) {
  const links = checkoutCommandLinks(values);
  const missing = [];
  const teamReady = isHttpUrl(links.teamUrl);
  const workfixReady = isHttpUrl(links.workfixUrl);
  const ladderReady = isHttpUrl(links.buyUrl) && isHttpUrl(links.setupUrl);
  if (!teamReady && !workfixReady && !ladderReady) missing.push("팀/Workfix checkout 또는 셀프툴+셋업팩 checkout");
  if (missing.length) {
    return `외부 결제 명령을 만들려면 다음 URL을 먼저 입력하세요: ${missing.join(", ")}`;
  }

  return [
    buildPrepareSellerCommand(links, ["teamUrl", "workfixUrl", "buyUrl", "setupUrl", "serviceUrl", "testerUrl"]),
    "npm run audit:release:strict",
    "npm run ops:runbook -- outreach/prospect-seed.csv --url=https://your-public-url"
  ].join("\n");
}

export function buildShareCopy(publicUrl, currentHref) {
  const root = normalizeRoot(publicUrl);
  const hub = root ? root : absoluteUrl("../hub/index.html", currentHref);
  const diagnostic = root ? `${root}diagnostic/index.html` : absoluteUrl("../diagnostic/index.html", currentHref);
  const order = root ? `${root}order/index.html?offer=setup` : absoluteUrl("../order/index.html?offer=setup", currentHref);

  return [
    "금요일 보고서/회의록 정리에 시간 많이 쓰면 Brief30 무료 진단 한번 봐주세요.",
    "",
    "회사명, 고객명, 실명은 지우고 업무 메모 1개를 붙여넣으면 3줄 요약과 보고서 미리보기가 바로 나옵니다.",
    `허브: ${hub}`,
    `무료 진단: ${diagnostic}`,
    `셋업팩 주문: ${order}`,
    "",
    "맞으면 첫 업무 메모 1개를 보고 포맷으로 맞춰드리는 셋업팩부터 추천합니다."
  ].join("\n");
}

export function clean(value) {
  return String(value || "").trim();
}

export function quote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function isEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) && !email.endsWith("@example.com") && !email.endsWith("@example.co.kr");
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase();
    const placeholderHost = ["self-tool", "setup-pack", "done-for-you"].includes(host);
    const placeholder = /(^|\.)example\./u.test(host) || placeholderHost;
    return ["http:", "https:"].includes(url.protocol) && host.includes(".") && !placeholder;
  } catch {
    return false;
  }
}

export function normalizeRoot(value) {
  const trimmed = clean(value);
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function checkoutCommandLinks(values) {
  return {
    buyUrl: clean(values.buyUrl),
    setupUrl: clean(values.setupUrl),
    serviceUrl: cleanHttp(values.serviceUrl),
    teamUrl: cleanHttp(values.teamUrl),
    workfixUrl: cleanHttp(values.workfixUrl),
    testerUrl: cleanHttp(values.testerUrl)
  };
}

function directCommandValues(values) {
  return {
    sellerName: clean(values.sellerName) || "Brief30",
    supportEmail: clean(values.supportEmail),
    bankAccount: clean(values.bankAccount),
    contactLine: clean(values.contactLine),
    deliveryWindow: clean(values.deliveryWindow) || "입금 확인 후 24시간 이내"
  };
}

function isPaymentInstruction(value) {
  const payment = clean(value);
  if (!payment) return false;
  return !/(은행\s*0|000-0000|0000-0000|예금주\s*$)/u.test(payment);
}

function buildPrepareSellerCommand(values, keys) {
  const flags = {
    sellerName: "seller",
    supportEmail: "email",
    bankAccount: "payment",
    contactLine: "contact",
    deliveryWindow: "delivery",
    buyUrl: "self",
    setupUrl: "setup",
    serviceUrl: "service",
    teamUrl: "team",
    workfixUrl: "workfix",
    testerUrl: "tester"
  };
  const args = keys
    .map((key) => [flags[key], clean(values[key])])
    .filter(([, value]) => value)
    .map(([flag, value]) => `--${flag}=${quote(value)}`);
  return `npm run prepare:seller -- ${args.join(" ")}`;
}

function cleanHttp(value) {
  const trimmed = clean(value);
  return isHttpUrl(trimmed) ? trimmed : "";
}

function absoluteUrl(path, currentHref) {
  return new URL(path, currentHref).toString();
}
