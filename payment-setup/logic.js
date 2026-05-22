import { buildCheckoutCommand, buildOrderCommand, clean, normalizeRoot, paymentRouteState } from "../preflight/commands.js";

const DEFAULT_DELIVERY = "입금 확인 후 24시간 이내";

export function buildPaymentSetup(values = {}) {
  const normalized = normalizeValues(values);
  const direct = {
    sellerName: normalized.sellerName,
    supportEmail: normalized.supportEmail,
    bankAccount: normalized.bankAccount,
    contactLine: normalized.contactLine,
    deliveryWindow: normalized.deliveryWindow
  };
  const checkout = {
    buyUrl: normalized.buyUrl,
    setupUrl: normalized.setupUrl,
    serviceUrl: normalized.serviceUrl,
    teamUrl: normalized.teamUrl,
    workfixUrl: normalized.workfixUrl,
    testerUrl: normalized.testerUrl
  };
  const route = paymentRouteState(direct, checkout);
  const mode = chooseMode(normalized.mode, route, direct, checkout);
  const closeMode = checkout.workfixUrl && !checkout.teamUrl && !route.directReady ? "workfix" : "team";
  const rawSetupCommand = mode === "checkout" ? buildCheckoutCommand(checkout) : buildOrderCommand(direct);
  const setupCommand = route.ready ? firstPrepareCommand(rawSetupCommand) : rawSetupCommand;
  return {
    ...normalized,
    mode,
    route,
    ready: route.ready,
    statusLabel: route.ready ? route.label : "실결제 경로 필요",
    setupCommand,
    orderConfig: buildOrderConfig(direct),
    marketingConfig: buildMarketingConfig(checkout),
    liveCommands: buildLiveCommands(setupCommand, normalized.publicUrl, route.ready, closeMode),
    nextAction: route.ready
      ? "이 명령을 실행한 뒤 팀 발송팩을 live로 생성하세요."
      : "실제 이메일+입금 안내, 팀 결제 URL, 또는 self/setup 결제 URL을 먼저 채우세요."
  };
}

export function buildConfigSnippet(name, value) {
  return `window.${name} = ${JSON.stringify(value, null, 2)};`;
}

function normalizeValues(values) {
  return {
    mode: clean(values.mode) || "direct",
    sellerName: clean(values.sellerName) || "Brief30",
    supportEmail: clean(values.supportEmail),
    bankAccount: clean(values.bankAccount),
    contactLine: clean(values.contactLine),
    deliveryWindow: clean(values.deliveryWindow) || DEFAULT_DELIVERY,
    buyUrl: clean(values.buyUrl),
    setupUrl: clean(values.setupUrl),
    serviceUrl: clean(values.serviceUrl),
    teamUrl: clean(values.teamUrl),
    workfixUrl: clean(values.workfixUrl),
    testerUrl: clean(values.testerUrl),
    publicUrl: normalizeRoot(values.publicUrl) || "https://your-public-url/"
  };
}

function chooseMode(mode, route, direct, checkout) {
  if (mode === "direct" && route.checkoutReady && !route.directReady) return "checkout";
  if (mode === "checkout" && route.directReady && !route.checkoutReady) return "direct";
  if (mode === "checkout") return "checkout";
  if (mode === "direct") return "direct";
  if (route.checkoutReady) return "checkout";
  if (route.directReady) return "direct";
  return checkout.buyUrl || checkout.setupUrl ? "checkout" : "direct";
}

function buildOrderConfig(values) {
  return buildConfigSnippet("BRIEF30_ORDER_CONFIG", {
    sellerName: values.sellerName,
    supportEmail: values.supportEmail,
    bankAccount: values.bankAccount,
    contactLine: values.contactLine || (values.supportEmail ? `문의: ${values.supportEmail}` : "DM 또는 이메일로 주문 메시지를 보내주세요."),
    deliveryWindow: values.deliveryWindow,
    intakeUrl: "../intake/index.html",
    demoUrl: "../diagnostic/index.html"
  });
}

function buildMarketingConfig(values) {
  return buildConfigSnippet("BRIEF30_MARKETING_CONFIG", {
    buyUrl: values.buyUrl,
    setupUrl: values.setupUrl,
    serviceUrl: values.serviceUrl,
    teamUrl: values.teamUrl,
    workfixUrl: values.workfixUrl,
    testerUrl: values.testerUrl,
    orderUrl: "./../order/index.html",
    demoUrl: "./../diagnostic/index.html"
  });
}

function buildLiveCommands(setupCommand, publicUrl, ready, closeMode = "team") {
  const prepareCommand = firstPrepareCommand(setupCommand);
  const liveCommand = closeMode === "workfix"
    ? `npm run plan:workfix -- outreach/prospect-seed.csv --url=${publicUrl} --out=outreach/generated`
    : `npm run plan:send -- --focus=team --count=20 --url=${publicUrl} --out=outreach/generated --require-payment`;
  const commands = [
    prepareCommand,
    "npm run package:release",
    "npm run audit:release:strict",
    liveCommand
  ];
  return ready ? commands.join("\n") : setupCommand;
}

function firstPrepareCommand(text) {
  return String(text || "").split("\n").find((line) => line.startsWith("npm run prepare:seller")) || text;
}
