import { paymentRouteStatus, parseConfigArgs, sellerRoute } from "../scripts/seller-config.js";
import { csvCell } from "./model.js";

const DEFAULT_COUNT = 20;
const DEFAULT_SOURCES = "previous_client,referral,direct_dm";

export function buildTeamLivePlan(options = {}) {
  const values = normalizeValues(options);
  const route = sellerRoute(values);
  const status = paymentRouteStatus(values);
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const outDir = clean(options.outDir || options.out || "outreach/generated");
  const count = boundedCount(options.count);
  const sources = clean(options.sources) || DEFAULT_SOURCES;
  const sellerArgs = route ? sellerCliArgs(values, route) : [];
  const commands = buildCommands({ count, outDir, publicUrl, route, sellerArgs, sources });

  return {
    count,
    outDir,
    publicUrl,
    ready: Boolean(route),
    route,
    sellerArgs,
    sources,
    status,
    values,
    commands,
    commandCsv: buildCommandCsv(commands),
    nextAction: route
      ? "Run these commands in order to go from payment config to live team send pack."
      : `Add payment route first: ${status.detail}`
  };
}

export function formatTeamLivePlan(plan) {
  return [
    "# Brief30 team live plan",
    "",
    `Public URL: ${plan.publicUrl}`,
    `Payment route: ${plan.ready ? plan.status.label : "missing"}`,
    `Detail: ${plan.status.detail}`,
    `Team sends: ${plan.count}`,
    `Sources: ${plan.sources}`,
    "",
    "## Next action",
    plan.nextAction,
    "",
    "## Commands",
    "```bash",
    ...plan.commands.map((item) => item.command),
    "```",
    "",
    "## Command CSV",
    "```csv",
    plan.commandCsv,
    "```",
    "",
    "Revenue still requires actual payment proof processed through money:paid."
  ].join("\n");
}

export function sellerCliArgs(values, route) {
  const direct = [
    ["seller", values.sellerName],
    ["email", values.supportEmail],
    ["payment", values.bankAccount],
    ["contact", values.contactLine],
    ["delivery", values.deliveryWindow]
  ];
  const checkout = [
    ["seller", values.sellerName],
    ["team", values.teamUrl],
    ["workfix", values.workfixUrl],
    ["self", values.buyUrl],
    ["setup", values.setupUrl],
    ["service", values.serviceUrl],
    ["tester", values.testerUrl]
  ];
  return (route === "checkout" ? checkout : direct)
    .filter(([, value]) => clean(value))
    .map(([flag, value]) => `--${flag}=${clean(value)}`);
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

function buildCommands({ count, outDir, publicUrl, route, sellerArgs, sources }) {
  const prepare = route
    ? npmCommand("prepare:seller", [...sellerArgs, "--skip-package", "--skip-audit"])
    : "MISSING_PAYMENT_ROUTE";
  const launchSetupArgs = route ? [...sellerArgs, `--url=${publicUrl}`, `--out=${outDir}`] : [`--url=${publicUrl}`, `--out=${outDir}`];
  return [
    { key: "prepare_seller", ready: Boolean(route), command: prepare },
    { key: "package_release", ready: Boolean(route), command: "npm run package:release" },
    { key: "strict_audit", ready: Boolean(route), command: "npm run audit:release:strict" },
    { key: "launch_setup", ready: true, command: npmCommand("prepare:launch", launchSetupArgs) },
    {
      key: "team_channels",
      ready: true,
      command: npmCommand("plan:channels", [`--focus=team`, `--count=${count}`, `--sources=${sources}`, `--url=${publicUrl}`, `--out=${outDir}`])
    },
    {
      key: "team_send",
      ready: Boolean(route),
      command: npmCommand("plan:send", [
        "--focus=team",
        `--count=${count}`,
        `--sources=${sources}`,
        `--url=${publicUrl}`,
        `--out=${outDir}`,
        "--require-payment"
      ])
    }
  ];
}

function npmCommand(script, args = []) {
  return `npm run ${script} -- ${args.map(shellArg).join(" ")}`.trim();
}

function buildCommandCsv(commands) {
  return [
    ["type", "ready", "command"],
    ...commands.map((item) => [item.key, item.ready ? "yes" : "no", item.command])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function shellArg(value) {
  const text = clean(value);
  return /[\s"]/u.test(text) ? `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"` : text;
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function boundedCount(value) {
  return Math.max(1, Math.min(80, Number(value || DEFAULT_COUNT)));
}

function clean(value) {
  return String(value || "").trim();
}
