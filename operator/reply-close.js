import { buildReplyPack, formatReplyPack } from "../replydesk/reply-pack.js";
import { buildBuyerClosePack, buyerCloseAttachmentFiles, buyerCloseFiles } from "./buyer-close.js";
import { csvCell, formatKrw, OFFERS } from "./model.js";
import { buildMoneyPaidCommand, DEFAULT_LEDGER_PATH, revenueProofNote } from "./payment-command.js";

export function buildReplyClose(text = "", options = {}) {
  const date = clean(options.date) || today();
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const defaultOffer = clean(options.offer) || "team";
  const requirePayment = Boolean(options.requirePayment || options.live);
  const baseReplyPack = buildReplyPack(text, { publicUrl, offer: defaultOffer });
  const selectedBase = selectCloseRow(baseReplyPack.rows, options);
  const closePack = selectedBase
    ? buildBuyerClosePack({
        buyer: selectedBase.name,
        company: clean(options.company) || "OO팀",
        approver: clean(options.approver) || "결재권자",
        useCase: clean(options.useCase) || useCaseFor(selectedBase),
        publicUrl,
        paymentRoute,
        offline: Boolean(options.offline) || isPlaceholderUrl(publicUrl),
        date
      })
    : null;
  const replyPack = closePack?.portable ? portableReplyPack(baseReplyPack, paymentRoute) : baseReplyPack;
  const selected = selectedBase ? replyPack.rows.find((row) => row.name === selectedBase.name && row.reply === selectedBase.reply) || selectedBase : null;

  return {
    date,
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    defaultOffer,
    attachZip: Boolean(options.zip || options.attachZip),
    requirePayment,
    attachmentName: attachmentName(selected, date),
    replyPack,
    selected,
    closePack,
    target: OFFERS.team.price,
    commandCsv: buildCommandCsv({ date, publicUrl, paymentRoute, selected, requirePayment })
  };
}

export function formatReplyClose(pack, sourcePath = "") {
  return [
    "# Brief30 reply close",
    "",
    `Source: ${sourcePath || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Default offer: ${pack.defaultOffer}`,
    `Target close: ${formatKrw(pack.target)}`,
    `Replies: ${pack.replyPack.rows.length}`,
    `Close candidates: ${pack.replyPack.closeQueue.length}`,
    `Selected buyer: ${pack.selected ? `${pack.selected.name} / ${pack.selected.type}` : "none"}`,
    `Attachment zip: ${pack.attachZip && pack.selected ? pack.attachmentName : "off (add --zip)"}`,
    `Live payment gate: ${pack.requirePayment ? "required" : "draft"}`,
    "",
    "## Send next",
    ...sendNext(pack),
    "",
    "## Selected response",
    pack.selected ? pack.selected.response : "- 결제 후보가 없습니다.",
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `This is a reply close pack, not revenue proof. ${revenueProofNote()}`
  ].join("\n");
}

export function replyCloseFiles(pack, sourcePath = "") {
  const files = [
    { name: `brief30-reply-close-${pack.date}.md`, content: `${formatReplyClose(pack, sourcePath)}\n` },
    { name: `brief30-reply-close-responses-${pack.date}.md`, content: `${formatReplyPack(pack.replyPack, sourcePath)}\n` },
    { name: `brief30-reply-close-update-${pack.date}.csv`, content: `${pack.replyPack.updateCsv}\n` },
    { name: `brief30-reply-close-commands-${pack.date}.csv`, content: `${pack.commandCsv}\n` }
  ];
  if (pack.closePack) files.push(...buyerCloseFiles(pack.closePack));
  if (pack.closePack && pack.attachZip) files.push(...replyCloseAttachmentFiles(pack));
  return dedupeFiles(files);
}

export function replyCloseAttachmentFiles(pack) {
  return pack.closePack ? buyerCloseAttachmentFiles(pack.closePack) : [];
}

function selectCloseRow(rows, options) {
  const buyer = clean(options.buyer);
  const candidates = rows.filter((row) => row.status === "tester");
  const matched = buyer ? candidates.find((row) => row.name === buyer) : null;
  if (matched) return matched;
  return candidates.sort((a, b) => offerAmount(b.offer) - offerAmount(a.offer) || a.priority - b.priority)[0] || null;
}

function sendNext(pack) {
  if (!pack.selected || !pack.closePack) return ["- 결제 후보가 없습니다. 답장 원문에 구매 의사, 승인, 팀 예산 신호가 있어야 합니다."];
  const lines = [];
  if (!pack.paymentReady) lines.push("- 실제 결제 URL 또는 계좌/이메일을 먼저 붙입니다. 그래도 승인 안내용 파일은 생성됩니다.");
  lines.push(`- ${pack.selected.name}에게 Selected response를 먼저 보냅니다.`);
  lines.push(`- 이어서 ${pack.closePack.closePage.fileName}의 첫 메시지 또는 first-send.txt를 보냅니다.`);
  if (pack.attachZip) lines.push(`- ${pack.attachmentName} 하나만 첨부하면 승인문, 구매요청, 입금 요청, 진행룸이 같이 전달됩니다.`);
  lines.push("- 입금/결제 답장이 오면 money:paid로 증빙을 파싱/병합/감사하고 audit:revenue로만 매출 인정합니다.");
  return lines;
}

function buildCommandCsv({ date, publicUrl, paymentRoute, selected, requirePayment }) {
  const route = paymentRoute ? ` --payment-route="${quoteArg(paymentRoute)}"` : "";
  const buyer = selected ? ` --buyer="${quoteArg(selected.name)}"` : "";
  const paymentGate = requirePayment ? " --require-payment" : "";
  return [
    ["step", "command"],
    ["reply_close", `npm run money:reply -- path/to/replies.txt --url=${publicUrl}${route}${buyer} --zip${paymentGate} --out=outreach/generated`],
    ["money_paid", buildMoneyPaidCommand({ month: date.slice(0, 7) })],
    ["audit_revenue", `npm run audit:revenue -- ${DEFAULT_LEDGER_PATH} --month=${date.slice(0, 7)}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function portableReplyPack(pack, paymentRoute) {
  const rows = pack.rows.map((row) => ({ ...row, response: portableResponse(row, paymentRoute) }));
  return {
    ...pack,
    rows,
    closeCsv: buildPortableCloseCsv(rows)
  };
}

function portableResponse(row, paymentRoute) {
  const lines = String(row.response || "")
    .split("\n")
    .filter((line) => !/https?:\/\//iu.test(line));
  const payment = paymentRoute
    ? `결제/입금 안내는 ${paymentRoute}입니다.`
    : "승인 의사만 주시면 실제 결제 URL 또는 계좌를 붙여 바로 보내겠습니다.";
  return [
    ...lines,
    "세부 자료는 첨부 zip의 close-room.html에 첫 메시지, 승인문, 구매요청, 입금 요청으로 묶었습니다.",
    payment
  ].join("\n");
}

function buildPortableCloseCsv(rows) {
  return [
    ["name", "offer", "amount", "next_step"],
    ...rows
      .filter((row) => row.status === "tester")
      .map((row) => [row.name, row.offer, offerAmount(row.offer), "send selected response plus buyer attachment zip"])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function useCaseFor(row) {
  if (row.type === "team") return "팀 주간보고/회의록 반복 정리";
  if (row.type === "service") return "고객사 업데이트와 팀 공유 정리";
  return "팀 주간보고/브리핑 반복 정리";
}

function attachmentName(selected, date) {
  return `brief30-reply-send-pack-${asciiSlug(selected?.name || "buyer")}-${date}.zip`;
}

function offerAmount(offer) {
  return OFFERS[offer]?.price || OFFERS.setup.price;
}

function dedupeFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.name)) return false;
    seen.add(file.name);
    return true;
  });
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function isPlaceholderUrl(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("happyreni.github.io/brief30-workfix-sprint") || text.includes("example.test");
}

function asciiSlug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 32) || "buyer";
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
