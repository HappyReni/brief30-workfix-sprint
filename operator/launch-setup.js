import { buildCheckoutCommand, buildOrderCommand, buildShareCopy } from "../preflight/commands.js";
import { isUsableCheckoutUrl, isUsableEmail, isUsablePaymentInstruction, parseConfigArgs, sellerRoute } from "../scripts/seller-config.js";
import { buildTeamShareText } from "../team/links.js";
import { csvCell } from "./model.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

export function buildLaunchSetupPack(options = {}) {
  const values = normalizeValues(options);
  const route = sellerRoute(values);
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const date = clean(options.date) || today();
  const routeInfo = routeStatus(values, route);
  return {
    date,
    publicUrl,
    values,
    route,
    ready: Boolean(route),
    routeInfo,
    setupCommands: buildSetupCommands(values, route),
    shareCopy: buildShareCopy(publicUrl, `${publicUrl}preflight/index.html`),
    teamShareCopy: buildTeamShareText({ primary: values.teamUrl || `${publicUrl}order/index.html?offer=team` }, `${publicUrl}team/index.html`),
    teamLinks: buildTeamLinks(publicUrl),
    checklist: buildChecklist({ publicUrl, route, routeInfo }),
    commandCsv: buildCommandCsv({ publicUrl, route, values, date })
  };
}

export function formatLaunchSetupPack(pack) {
  return [
    "# Brief30 launch setup pack",
    "",
    `Date: ${pack.date}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.ready ? pack.route : "missing"}`,
    `Missing: ${pack.routeInfo.missing.length ? pack.routeInfo.missing.join(", ") : "none"}`,
    "",
    "## Setup commands",
    "```bash",
    pack.setupCommands,
    "```",
    "",
    "## Public share copy",
    pack.shareCopy,
    "",
    "## Team sprint share copy",
    pack.teamShareCopy,
    "",
    "## Team sprint links",
    ...pack.teamLinks.map((item) => `- ${item.label}: ${item.url}`),
    "",
    "## Launch checklist",
    pack.checklist.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    "Do not merge this setup pack into revenue. Revenue only counts after money:paid processes actual payment proof."
  ].join("\n");
}

export function launchSetupFiles(pack) {
  return [
    {
      name: `brief30-launch-setup-${pack.date}.md`,
      content: `${formatLaunchSetupPack(pack)}\n`
    },
    {
      name: `brief30-launch-setup-commands-${pack.date}.csv`,
      content: `${pack.commandCsv}\n`
    }
  ];
}

function normalizeValues(options) {
  return parseConfigArgs([], {
    BRIEF30_SELLER_NAME: options.sellerName || options.seller || "Brief30",
    BRIEF30_SUPPORT_EMAIL: options.supportEmail || options.email || "",
    BRIEF30_BANK_ACCOUNT: options.bankAccount || options.payment || "",
    BRIEF30_CONTACT_LINE: options.contactLine || options.contact || "",
    BRIEF30_DELIVERY_WINDOW: options.deliveryWindow || options.delivery || "입금 확인 후 24시간 이내",
    BRIEF30_BUY_URL: options.buyUrl || options.self || "",
    BRIEF30_SETUP_URL: options.setupUrl || options.setup || "",
    BRIEF30_SERVICE_URL: options.serviceUrl || options.service || "",
    BRIEF30_TEAM_URL: options.teamUrl || options.team || "",
    BRIEF30_WORKFIX_URL: options.workfixUrl || options.workfix || "",
    BRIEF30_TESTER_URL: options.testerUrl || options.tester || ""
  });
}

function routeStatus(values, route) {
  if (route === "direct") {
    return { label: "direct order ready", missing: [] };
  }
  if (route === "checkout") {
    return { label: "external checkout ready", missing: [] };
  }
  const directMissing = [
    isUsableEmail(values.supportEmail) ? "" : "real support email",
    isUsablePaymentInstruction(values.bankAccount) ? "" : "real bank/payment instruction"
  ].filter(Boolean);
  const checkoutMissing = [
    isUsableCheckoutUrl(values.teamUrl) || isUsableCheckoutUrl(values.workfixUrl) || (isUsableCheckoutUrl(values.buyUrl) && isUsableCheckoutUrl(values.setupUrl))
      ? ""
      : "team/workfix checkout URL or self+setup checkout URLs"
  ].filter(Boolean);
  return {
    label: "payment route missing",
    missing: directMissing.length <= checkoutMissing.length ? directMissing : checkoutMissing
  };
}

function buildSetupCommands(values, route) {
  if (route === "direct") return buildOrderCommand(values);
  if (route === "checkout") return buildCheckoutCommand(values);
  return [
    "# Missing payment route.",
    "# Direct order example:",
    "npm run prepare:seller -- --email=your-real-email@domain.kr --payment=\"은행명 실제계좌 예금주명\"",
    "# External checkout example:",
    "npm run prepare:seller -- --team=https://pay.domain.kr/team",
    "npm run prepare:seller -- --workfix=https://pay.domain.kr/workfix",
    "npm run prepare:seller -- --self=https://pay.domain.kr/self --setup=https://pay.domain.kr/setup --service=https://pay.domain.kr/service"
  ].join("\n");
}

function buildChecklist({ publicUrl, route, routeInfo }) {
  const setup = route
    ? "Run the setup command above, then confirm audit:release:strict passes."
    : `Fill the missing payment fields first: ${routeInfo.missing.join(", ") || "payment route"}.`;
  return [
    setup,
    "Run npm run package:release after any config change.",
    `Run npm run check:public -- ${publicUrl}`,
    "Open team/index.html and copy the 300,000원 team sprint share text for warm team buyers.",
    "Send the public share copy to 10 warm contacts before broad cold outreach.",
    "Send the team sprint page to 2 warm buyers who can approve a small team budget.",
    "When a buyer says approval is done, run payment:handoff for their order/intake instructions.",
    "When money arrives, run money:paid to parse proof, merge the ledger, and audit revenue."
  ];
}

function buildCommandCsv({ publicUrl, route, values, date }) {
  const prepare = route ? firstCommand(buildSetupCommands(values, route)) : "MISSING_PAYMENT_ROUTE";
  const teamReady = supportsTeamClose(values, route);
  const workfixReady = supportsWorkfixClose(values, route);
  return [
    ["type", "ready", "command"],
    ["prepare_seller", route ? "yes" : "no", prepare],
    ["package_release", "yes", "npm run package:release"],
    ["strict_audit", route ? "yes" : "no", "npm run audit:release:strict"],
    ["public_check", "yes", `npm run check:public -- ${publicUrl}`],
    ["team_page", "yes", `${publicUrl}team/index.html`],
    ["team_channel_pack", "yes", `npm run plan:channels -- --focus=team --count=20 --sources=previous_client,referral,direct_dm --url=${publicUrl} --out=outreach/generated`],
    ["live_team_send", teamReady ? "yes" : "no", `npm run plan:send -- --focus=team --count=20 --sources=previous_client,referral,direct_dm --url=${publicUrl} --out=outreach/generated --require-payment`],
    ["workfix_pack", workfixReady ? "yes" : "no", `npm run plan:workfix -- outreach/prospect-seed.csv --url=${publicUrl} --out=outreach/generated`],
    ["team_outreach", "yes", `npm run plan:team-outreach -- path/to/team-contacts.txt --url=${publicUrl} --out=outreach/generated`],
    ["team_replies", "yes", `npm run plan:replies -- path/to/team-replies.txt --url=${publicUrl} --offer=team`],
    ["first_send", "yes", `npm run plan:today -- outreach/prospect-seed.csv --url=${publicUrl}`],
    ["approved_buyer", teamReady ? "yes" : "no", `npm run payment:handoff -- --buyer=김PM --company=OO팀 --offer=team --use-case=팀 주간보고 --url=${publicUrl}`],
    ["workfix_invoice", workfixReady ? "yes" : "no", `npm run payment:invoice -- --buyer=Lead --offer=workfix --use-case="반복 업무 1개 자동화" --out=outreach/generated`],
    ["money_paid", "yes", buildMoneyPaidCommand({ month: date.slice(0, 7) })],
    ["revenue_audit", "yes", "npm run audit:revenue -- path/to/brief30-launch-ledger.csv"]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function supportsTeamClose(values, route) {
  return route === "direct" || isUsableCheckoutUrl(values.teamUrl);
}

function supportsWorkfixClose(values, route) {
  return route === "direct" || isUsableCheckoutUrl(values.workfixUrl);
}

function firstCommand(text) {
  return String(text || "").split("\n").find((line) => line.startsWith("npm run prepare:seller")) || "MISSING_PAYMENT_ROUTE";
}

function buildTeamLinks(publicUrl) {
  return [
    { label: "team page", url: `${publicUrl}team/index.html` },
    { label: "team order", url: `${publicUrl}order/index.html?offer=team` },
    { label: "team close", url: `${publicUrl}closing/index.html?offer=team` },
    { label: "team intake", url: `${publicUrl}intake/index.html?offer=team` }
  ];
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
