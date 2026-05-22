import { buildInvoicePack } from "./invoice-pack.js";
import { buildOrderHandoff } from "./order-handoff.js";
import { buildProcurementPack } from "./procurement-pack.js";
import { buildTeamPack, teamPackFiles } from "./team-pack.js";
import { buildBuyerClosePage } from "./buyer-close-page.js";
import { csvCell, formatKrw } from "./model.js";
import { buildMoneyPaidCommand, DEFAULT_LEDGER_PATH, revenueProofNote } from "./payment-command.js";

export function buildBuyerClosePack(options = {}) {
  const date = clean(options.date) || today();
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const portable = Boolean(options.offline) || isPlaceholderUrl(publicUrl);
  const buyer = clean(options.buyer) || "김PM";
  const company = clean(options.company) || "OO팀";
  const approver = clean(options.approver) || "이팀장";
  const useCase = clean(options.useCase) || "팀 주간보고/회의록 반복 정리";
  const paymentRoute = clean(options.paymentRoute);
  const deliveryWindow = clean(options.deliveryWindow) || "입금 확인 후 3영업일 내 1차 납품, 4주 내 마감";
  const ref = clean(options.ref) || makeRef(date, buyer);
  const common = {
    buyer,
    company,
    approver,
    useCase,
    paymentRoute,
    deliveryWindow,
    publicUrl,
    portable,
    date,
    ref,
    offer: "team"
  };
  const team = buildTeamPack(common);
  const procurement = buildProcurementPack(common);
  const invoice = buildInvoicePack(common);
  const handoff = buildOrderHandoff(common);
  const core = {
    date,
    publicUrl,
    buyer,
    company,
    approver,
    useCase,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    ref,
    amount: team.offer.price,
    team,
    procurement,
    invoice,
    handoff,
    portable,
    buyerMessage: buildBuyerMessage({ ...common, team, invoice }),
    approverMessage: buildApproverMessage({ ...common, team })
  };

  return {
    ...core,
    closePage: buildBuyerClosePage(core),
    proofCommand: buildMoneyPaidCommand({ month: date.slice(0, 7) }),
    commandCsv: buildCommandCsv({ ...common, team }),
    updateCsv: team.updateCsv
  };
}

export function formatBuyerClosePack(pack) {
  return [
    "# Brief30 one-buyer close pack",
    "",
    `Buyer: ${pack.buyer}`,
    `Company: ${pack.company}`,
    `Approver: ${pack.approver}`,
    `Offer: ${pack.team.offer.label}`,
    `Amount: ${formatKrw(pack.amount)}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Ref: ${pack.ref}`,
    `Deal room: ${pack.team.dealRoomUrl}`,
    `Portable close room: ${pack.closePage.fileName}`,
    `Share mode: ${pack.portable ? "file" : "public URL"}`,
    "",
    "## Send first",
    pack.buyerMessage,
    "",
    "## Approver forward",
    pack.approverMessage,
    "",
    "## Internal purchase request",
    pack.procurement.requestMemo,
    "",
    "## Payment request",
    pack.invoice.paymentRequest,
    "",
    "## Order handoff",
    pack.handoff.orderMessage,
    "",
    "## Payment proof request",
    pack.handoff.proofRequest,
    "",
    "## Buyer proof reply template",
    pack.team.buyerProofTemplate,
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Next command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `Do not merge this close pack into revenue. ${revenueProofNote()}`
  ].join("\n");
}

export function buyerCloseFiles(pack) {
  const base = `brief30-buyer-close-${slug(pack.buyer)}-${pack.date}`;
  const pageFiles = teamPackFiles(pack.team).filter((file) => file.name.endsWith(".html") || file.name.endsWith("-share.md"));
  return [
    { name: `${base}.md`, content: `${formatBuyerClosePack(pack)}\n` },
    { name: pack.closePage.fileName, content: pack.closePage.html },
    { name: pack.closePage.fileName.replace(/\.html$/u, "-share.md"), content: `${pack.closePage.shareText}\n` },
    { name: `${base}-send.txt`, content: `${pack.buyerMessage}\n` },
    { name: `${base}-approver.txt`, content: `${pack.approverMessage}\n` },
    { name: `${base}-purchase-request.txt`, content: `${pack.procurement.requestMemo}\n` },
    { name: `${base}-payment-request.txt`, content: `${pack.invoice.paymentRequest}\n` },
    { name: `${base}-proof-request.txt`, content: `${pack.handoff.proofRequest}\n` },
    { name: `${base}-update.csv`, content: `${pack.updateCsv}\n` },
    { name: `${base}-commands.csv`, content: `${pack.commandCsv}\n` },
    ...pageFiles
  ];
}

export function buyerCloseAttachmentFiles(pack) {
  const files = buyerCloseFiles(pack);
  const proposalHtml = files.find((file) => file.name.startsWith("brief30-team-proposal-") && file.name.endsWith(".html"));
  const proposalShare = files.find((file) => file.name.startsWith("brief30-team-proposal-") && file.name.endsWith("-share.md"));
  return [
    { name: "README.txt", content: attachmentReadme(pack) },
    { name: "close-room.html", content: pack.closePage.html },
    { name: "close-room-share.md", content: `${pack.closePage.shareText}\n` },
    { name: "first-send.txt", content: `${pack.buyerMessage}\n` },
    { name: "approver-forward.txt", content: `${pack.approverMessage}\n` },
    { name: "purchase-request.txt", content: `${pack.procurement.requestMemo}\n` },
    { name: "payment-request.txt", content: `${pack.invoice.paymentRequest}\n` },
    { name: "payment-proof-request.txt", content: `${pack.handoff.proofRequest}\n` },
    proposalHtml ? { name: "team-proposal.html", content: proposalHtml.content } : null,
    proposalShare ? { name: "team-proposal-share.md", content: proposalShare.content } : null
  ].filter(Boolean);
}

function buildBuyerMessage(data) {
  const payment = data.paymentRoute
    ? `승인되면 결제/입금 안내는 ${data.paymentRoute}입니다.`
    : "승인 의사만 주시면 실제 결제 URL 또는 계좌를 붙여 바로 보내겠습니다.";
  const proof = data.portable
    ? "샘플/진행룸: 첨부한 close-room HTML 파일에 첫 메시지, 승인문, 구매요청, 입금 요청을 모두 넣었습니다."
    : [`샘플: ${data.team.sampleUrl}`, `개인 진행룸: ${data.team.dealRoomUrl}`].join("\n");
  return [
    `${data.buyer}님, ${data.company}의 ${data.useCase}가 반복되면 아래 팀 패키지로 한 번에 정리해볼 수 있습니다.`,
    "",
    `상품: ${data.team.offer.label}`,
    `금액: ${formatKrw(data.team.offer.price)}`,
    `범위: ${data.team.offer.delivery}`,
    proof,
    `주문번호: ${data.ref}`,
    payment,
    "",
    "진행 가능하면 이 메시지를 승인자에게 그대로 전달해도 되고, 견적/구매요청 문구가 필요하면 바로 아래 자료로 보내겠습니다.",
    "실제 결제 확인 전에는 매출로 잡지 않고, 익명화한 메모만 받습니다."
  ].join("\n");
}

function buildApproverMessage(data) {
  if (!data.portable) return data.team.approverForward;
  const paymentLine = data.paymentRoute
    ? `승인되면 결제/입금 안내는 ${data.paymentRoute}입니다.`
    : "승인되면 실제 결제 URL 또는 계좌를 확인한 뒤 진행하겠습니다.";
  return [
    `${data.approver}님, ${data.company}의 ${data.useCase} 부담을 줄이기 위해 Brief30 팀 브리핑 스프린트 승인 요청드립니다.`,
    "",
    `금액은 ${formatKrw(data.team.offer.price)}이고, 범위는 ${data.team.offer.delivery}입니다.`,
    `일정은 ${data.deliveryWindow} 기준입니다.`,
    "회사명/고객명/개인정보는 제거한 메모로 진행하고, 원문 민감 자료는 받지 않습니다.",
    "세부 범위, 구매요청, 입금 요청, 결제 증빙 요청은 첨부된 close-room HTML 파일에 정리했습니다.",
    paymentLine,
    "",
    `승인용 주문번호: ${data.ref}`
  ].join("\n");
}

function buildCommandCsv(data) {
  const route = data.paymentRoute ? ` --payment-route="${quoteArg(data.paymentRoute)}"` : "";
  const shared = `--buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --approver="${quoteArg(data.approver)}" --use-case="${quoteArg(data.useCase)}" --url=${data.publicUrl}${route} --out=outreach/generated`;
  return [
    ["step", "command"],
    ["send_close_pack", `npm run plan:buyer-close -- ${shared}`],
    ["procurement", `npm run plan:procurement -- ${shared}`],
    ["invoice", `npm run payment:invoice -- --buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --offer=team --use-case="${quoteArg(data.useCase)}"${route}`],
    ["handoff", `npm run payment:handoff -- --buyer="${quoteArg(data.buyer)}" --company="${quoteArg(data.company)}" --offer=team --use-case="${quoteArg(data.useCase)}" --url=${data.publicUrl}${route}`],
    ["money_paid", buildMoneyPaidCommand({ month: data.date.slice(0, 7) })],
    ["audit_revenue", `npm run audit:revenue -- ${DEFAULT_LEDGER_PATH} --month=${data.date.slice(0, 7)}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function isPlaceholderUrl(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("happyreni.github.io/brief30-workfix-sprint") || text.includes("example.test");
}

function makeRef(date, buyer) {
  return `B30-CLOSE-${String(date).replace(/[^\d]/gu, "")}-${shortCode(buyer)}`;
}

function shortCode(value) {
  const total = [...String(value || "")].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return total.toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "buyer";
}

function attachmentReadme(pack) {
  return [
    "Brief30 send pack",
    "",
    `${pack.company} / ${pack.buyer}`,
    `금액: ${formatKrw(pack.amount)}`,
    `주문번호: ${pack.ref}`,
    "",
    "1. close-room HTML 파일을 열면 첫 메시지, 승인문, 구매요청, 입금 요청이 한 화면에 있습니다.",
    "2. 승인자가 있으면 approver 파일을 전달합니다.",
    "3. 결제/입금 후 proof-request 파일로 증빙 회신을 요청합니다.",
    ""
  ].join("\n");
}

function quoteArg(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
