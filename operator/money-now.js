import { buildBuyerClosePack, buyerCloseAttachmentFiles, buyerCloseFiles } from "./buyer-close.js";
import { buildNetworkSprint, formatNetworkSprint, networkSprintFiles } from "./network-sprint.js";
import { csvCell, formatKrw, OFFERS } from "./model.js";
import { buildMoneyPaidCommand, DEFAULT_LEDGER_PATH, revenueProofNote } from "./payment-command.js";

export function buildMoneyNow(text = "", options = {}) {
  const date = clean(options.date) || today();
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const portable = Boolean(options.offline) || isPlaceholderUrl(publicUrl);
  const attachZip = Boolean(options.zip || options.attachZip);
  const requirePayment = Boolean(options.requirePayment || options.live);
  const limit = boundedLimit(options.limit);
  const network = buildNetworkSprint(text, {
    source: options.source || "",
    publicUrl,
    paymentRoute,
    date,
    limit
  });
  const selected = selectedBuyer(network, options);
  const closePack = selected ? buildBuyerClosePack({
    buyer: selected.name,
    company: selected.company,
    approver: selected.role,
    useCase: selected.useCase,
    publicUrl,
    paymentRoute,
    offline: portable,
    date
  }) : null;

  return {
    date,
    source: options.source || "",
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    portable,
    attachZip,
    requirePayment,
    attachmentName: attachmentName({ selected, date }),
    target: OFFERS.team.price,
    network,
    selected,
    closePack,
    commandCsv: buildCommandCsv({ publicUrl, paymentRoute, date, selected, attachZip, requirePayment })
  };
}

export function formatMoneyNow(pack) {
  return [
    "# Brief30 money now",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Share mode: ${pack.portable ? "file" : "public URL"}`,
    `Attachment zip: ${pack.attachZip ? pack.attachmentName : "off (add --zip)"}`,
    `Live payment gate: ${pack.requirePayment ? "required" : "draft"}`,
    `Target close: ${formatKrw(pack.target)}`,
    `Parsed people: ${pack.network.parsed}`,
    `Selected buyer: ${pack.selected ? `${pack.selected.name} / ${pack.selected.company}` : "none"}`,
    "",
    "## Send in order",
    ...sendOrder(pack),
    "",
    "## Selected buyer close",
    ...selectedLines(pack),
    "",
    "## Network sprint summary",
    ...networkLines(pack),
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `This is a send pack, not revenue proof. ${revenueProofNote()}`
  ].join("\n");
}

export function moneyNowFiles(pack) {
  const date = String(pack.date || today());
  const files = [
    { name: `brief30-money-now-${date}.md`, content: `${formatMoneyNow(pack)}\n` },
    { name: `brief30-money-now-network-${date}.md`, content: `${formatNetworkSprint(pack.network)}\n` },
    { name: `brief30-money-now-commands-${date}.csv`, content: `${pack.commandCsv}\n` },
    ...networkSprintFiles(pack.network)
  ];
  if (pack.closePack) {
    files.push(...buyerCloseFiles(pack.closePack));
  }
  if (pack.attachZip) {
    files.push(...moneyNowAttachmentFiles(pack));
  }
  return dedupeFiles(files);
}

export function moneyNowAttachmentFiles(pack) {
  if (!pack.closePack) return [];
  return buyerCloseAttachmentFiles(pack.closePack);
}

function selectedBuyer(network, options) {
  if (clean(options.buyer)) {
    return {
      name: clean(options.buyer),
      company: clean(options.company) || "OO팀",
      role: clean(options.approver) || clean(options.role) || "결재권자",
      useCase: clean(options.useCase) || "팀 주간보고/브리핑 반복 정리"
    };
  }
  return network.directPeople[0] || null;
}

function sendOrder(pack) {
  const lines = [];
  if (!pack.paymentReady) {
    lines.push("- 실제 결제 URL 또는 계좌/이메일을 먼저 붙입니다. 그래도 결제 전 안내용 파일은 생성됩니다.");
  }
  if (pack.closePack) {
    lines.push(`- ${pack.closePack.closePage.fileName} 파일을 열어 첫 메시지를 복사해서 ${pack.closePack.buyer}에게 보냅니다.`);
    if (pack.attachZip) {
      lines.push(`- ${pack.attachmentName} 하나만 첨부하면 승인문, 구매요청, 입금 요청, 진행룸이 같이 전달됩니다.`);
    }
    lines.push(`- 승인자가 필요하면 ${fileBase(pack.closePack)}-approver.txt를 바로 전달합니다.`);
    lines.push(`- 구매요청/견적이 필요하면 ${fileBase(pack.closePack)}-purchase-request.txt와 payment-request 파일을 보냅니다.`);
  } else {
    lines.push("- 구매 후보가 없습니다. people.txt에 이름, 팀, 역할, 반복 보고 상황을 한 줄씩 넣습니다.");
  }
  lines.push("- 답장이 오면 money:paid로 실제 결제 증빙을 파싱/병합/감사하고, audit:revenue가 통과할 때만 매출로 봅니다.");
  return lines;
}

function selectedLines(pack) {
  if (!pack.closePack) return ["- 선택된 구매자가 없습니다."];
  return [
    `- Buyer: ${pack.closePack.buyer}`,
    `- Company: ${pack.closePack.company}`,
    `- Approver: ${pack.closePack.approver}`,
    `- Amount: ${formatKrw(pack.closePack.amount)}`,
    `- Close room: ${pack.closePack.closePage.fileName}`,
    `- Order ref: ${pack.closePack.ref}`
  ];
}

function networkLines(pack) {
  return [
    `- Direct team asks: ${pack.network.teamPack.rows.length}`,
    `- Intro asks: ${pack.network.referralPack.advocates.length}`,
    `- Operator import rows: ${Math.max(0, pack.network.operatorCsv.split("\n").length - 1)}`,
    `- Score file: brief30-network-score-${pack.date}.csv`
  ];
}

function buildCommandCsv({ publicUrl, paymentRoute, date, selected, attachZip, requirePayment }) {
  const route = paymentRoute ? ` --payment-route="${quoteArg(paymentRoute)}"` : "";
  const offline = isPlaceholderUrl(publicUrl) ? " --offline" : "";
  const zip = attachZip ? " --zip" : "";
  const paymentGate = requirePayment ? " --require-payment" : "";
  const buyerArgs = selected
    ? ` --buyer="${quoteArg(selected.name)}" --company="${quoteArg(selected.company)}" --approver="${quoteArg(selected.role)}" --use-case="${quoteArg(selected.useCase)}"`
    : "";
  return [
    ["step", "command"],
    ["configure_payment", "npm run prepare:seller -- --team=\"https://pay.domain.kr/team\""],
    ["money_now", `npm run money:now -- path/to/people.txt --url=${publicUrl}${route}${offline}${zip}${paymentGate} --out=outreach/generated`],
    ["close_selected", `npm run plan:buyer-close --${buyerArgs} --url=${publicUrl}${route}${offline} --out=outreach/generated`],
    ["network_sprint", `npm run plan:network -- path/to/people.txt --url=${publicUrl}${route} --out=outreach/generated`],
    ["money_paid", buildMoneyPaidCommand({ month: date.slice(0, 7) })],
    ["audit_revenue", `npm run audit:revenue -- ${DEFAULT_LEDGER_PATH} --month=${date.slice(0, 7)}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function dedupeFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.name)) return false;
    seen.add(file.name);
    return true;
  });
}

function fileBase(pack) {
  return `brief30-buyer-close-${slug(pack.buyer)}-${pack.date}`;
}

function attachmentName({ selected, date }) {
  return `brief30-send-pack-${asciiSlug(selected?.name || "buyer")}-${date}.zip`;
}

function asciiSlug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 32) || "buyer";
}

function boundedLimit(value) {
  return Math.max(1, Math.min(10, Number(value || 5)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function isPlaceholderUrl(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("happyreni.github.io/brief30-workfix-sprint") || text.includes("example.test");
}

function quoteArg(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "buyer";
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
