export function parseConfigArgs(argv = [], env = {}) {
  const flags = Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );
  return {
    sellerName: flags.seller || env.BRIEF30_SELLER_NAME || "Brief30",
    supportEmail: flags.email || env.BRIEF30_SUPPORT_EMAIL || "",
    bankAccount: flags.payment || env.BRIEF30_BANK_ACCOUNT || "",
    contactLine: flags.contact || env.BRIEF30_CONTACT_LINE || "",
    deliveryWindow: flags.delivery || env.BRIEF30_DELIVERY_WINDOW || "입금 확인 후 24시간 이내",
    buyUrl: flags.self || env.BRIEF30_BUY_URL || "",
    setupUrl: flags.setup || env.BRIEF30_SETUP_URL || "",
    serviceUrl: flags.service || env.BRIEF30_SERVICE_URL || "",
    teamUrl: flags.team || env.BRIEF30_TEAM_URL || "",
    workfixUrl: flags.workfix || env.BRIEF30_WORKFIX_URL || "",
    testerUrl: flags.tester || env.BRIEF30_TESTER_URL || "",
    dryRun: argv.includes("--dry-run"),
    skipPackage: argv.includes("--skip-package"),
    skipAudit: argv.includes("--skip-audit")
  };
}

export function sellerRoute(values) {
  const directReady = isUsableEmail(values.supportEmail) && isUsablePaymentInstruction(values.bankAccount);
  const teamCheckoutReady = isUsableCheckoutUrl(values.teamUrl);
  const workfixCheckoutReady = isUsableCheckoutUrl(values.workfixUrl);
  const checkoutReady = teamCheckoutReady || workfixCheckoutReady || (isUsableCheckoutUrl(values.buyUrl) && isUsableCheckoutUrl(values.setupUrl));
  if (directReady) return "direct";
  if (checkoutReady) return "checkout";
  return "";
}

export function sellerConfigs(values) {
  const route = sellerRoute(values);
  if (!route) return null;
  return {
    route,
    order: {
      sellerName: values.sellerName,
      supportEmail: values.supportEmail,
      bankAccount: values.bankAccount,
      contactLine: values.contactLine || (values.supportEmail ? `문의: ${values.supportEmail}` : "DM 또는 이메일로 주문 메시지를 보내주세요."),
      deliveryWindow: values.deliveryWindow,
      intakeUrl: "../intake/index.html",
      demoUrl: "../diagnostic/index.html"
    },
    marketing: {
      buyUrl: values.buyUrl,
      setupUrl: values.setupUrl,
      serviceUrl: isUsableCheckoutUrl(values.serviceUrl) ? values.serviceUrl : "",
      teamUrl: isUsableCheckoutUrl(values.teamUrl) ? values.teamUrl : "",
      workfixUrl: isUsableCheckoutUrl(values.workfixUrl) ? values.workfixUrl : "",
      testerUrl: isUsableCheckoutUrl(values.testerUrl) ? values.testerUrl : "",
      orderUrl: "./../order/index.html",
      demoUrl: "./../diagnostic/index.html"
    }
  };
}

export function paymentRouteStatus(values = {}) {
  const route = sellerRoute(values);
  if (route === "direct") {
    return {
      ready: true,
      route,
      label: "manual order configured",
      missing: [],
      detail: `${values.supportEmail} + bank/payment instruction`
    };
  }
  if (route === "checkout") {
    const detail = checkoutRouteDetail(values);
    return {
      ready: true,
      route,
      label: "external checkout configured",
      missing: [],
      detail
    };
  }
  const directMissing = [
    isUsableEmail(values.supportEmail) ? "" : "real support email",
    isUsablePaymentInstruction(values.bankAccount) ? "" : "real bank/payment instruction"
  ].filter(Boolean);
  const checkoutMissing = [
    isUsableCheckoutUrl(values.buyUrl) ? "" : "self checkout URL",
    isUsableCheckoutUrl(values.setupUrl) ? "" : "setup checkout URL"
  ].filter(Boolean);
  const premiumMissing = [isUsableCheckoutUrl(values.teamUrl) || isUsableCheckoutUrl(values.workfixUrl) ? "" : "team/workfix checkout URL"].filter(Boolean);
  const missing = shortestMissing([directMissing, premiumMissing, checkoutMissing]);
  return {
    ready: false,
    route: "",
    label: "payment route missing",
    missing,
    detail: missing.length ? missing.join(", ") : "payment route"
  };
}

export function configValuesFromText(orderConfig = "", marketingConfig = "") {
  return {
    sellerName: configStringValue(orderConfig, "sellerName") || "Brief30",
    supportEmail: configStringValue(orderConfig, "supportEmail"),
    bankAccount: configStringValue(orderConfig, "bankAccount"),
    contactLine: configStringValue(orderConfig, "contactLine"),
    deliveryWindow: configStringValue(orderConfig, "deliveryWindow"),
    buyUrl: configStringValue(marketingConfig, "buyUrl"),
    setupUrl: configStringValue(marketingConfig, "setupUrl"),
    serviceUrl: configStringValue(marketingConfig, "serviceUrl"),
    teamUrl: configStringValue(marketingConfig, "teamUrl"),
    workfixUrl: configStringValue(marketingConfig, "workfixUrl"),
    testerUrl: configStringValue(marketingConfig, "testerUrl")
  };
}

export function paymentRouteStatusFromConfig(orderConfig = "", marketingConfig = "") {
  return paymentRouteStatus(configValuesFromText(orderConfig, marketingConfig));
}

export function missingSellerConfigMessage() {
  return [
    "Missing payment route.",
    "",
    "Direct order:",
    "  npm run prepare:seller -- --email=your-real-email@domain.kr --payment=\"은행명 실제계좌 예금주명\"",
    "",
    "External checkout:",
    "  npm run prepare:seller -- --team=https://pay.domain.kr/team",
    "  npm run prepare:seller -- --workfix=https://pay.domain.kr/workfix",
    "  npm run prepare:seller -- --self=https://pay.domain.kr/self --setup=https://pay.domain.kr/setup --service=https://pay.domain.kr/service",
    "",
    "Environment variables also work: BRIEF30_SUPPORT_EMAIL, BRIEF30_BANK_ACCOUNT, BRIEF30_TEAM_URL, BRIEF30_WORKFIX_URL, BRIEF30_BUY_URL, BRIEF30_SETUP_URL."
  ].join("\n");
}

function checkoutRouteDetail(values) {
  if (isUsableCheckoutUrl(values.teamUrl)) return values.teamUrl;
  if (isUsableCheckoutUrl(values.workfixUrl)) return values.workfixUrl;
  return `${values.buyUrl} + ${values.setupUrl}`;
}

function shortestMissing(groups) {
  return groups
    .filter((group) => group.length)
    .sort((left, right) => left.length - right.length)[0] || [];
}

export function configStringValue(source, key) {
  const match = String(source || "").match(new RegExp(`["']?${key}["']?\\s*:\\s*"([^"]*)"`, "u"));
  return match?.[1] || "";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(String(value || ""));
}

export function isUsableEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return isEmail(email) && !email.endsWith("@example.com") && !email.endsWith("@example.co.kr");
}

export function isUsablePaymentInstruction(value) {
  const payment = String(value || "").trim();
  if (!payment) return false;
  return !/(은행\s*0|000-0000|0000-0000|예금주\s*$)/u.test(payment);
}

export function isUsableCheckoutUrl(value) {
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
