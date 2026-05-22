import { buildProposalPack } from "../closing/proposal-pack.js";
import { diagnose, resultMarkdown } from "../diagnostic/engine.js";
import { csvCell } from "./model.js";
import { buildMoneyPaidCommand, revenueProofNote } from "./payment-command.js";

export function buildDemoPack(note = "", options = {}) {
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const buyer = clean(options.buyer) || "OO님";
  const outputType = clean(options.output) || inferOutput(note);
  const offer = normalizeOffer(options.offer || inferOffer(note));
  const date = options.date || today();
  const result = diagnose({
    note,
    title: clean(options.title) || `${buyer} 샘플 메모`,
    audience: clean(options.audience) || inferAudience(note),
    outputType
  });
  const proposal = buildProposalPack({
    buyer,
    offer,
    useCase: outputType,
    publicUrl,
    paymentRoute: options.paymentRoute,
    deliveryWindow: options.deliveryWindow,
    ref: makeRef(date)
  });

  return {
    source: options.source || "",
    date,
    buyer,
    publicUrl,
    outputType,
    offer,
    score: result.score.overall,
    result,
    proposal,
    sampleMarkdown: resultMarkdown(result),
    message: buildDemoMessage({ buyer, result, proposal, publicUrl }),
    updateCsv: buildUpdateCsv({ buyer, offer, score: result.score.overall, outputType, date }),
    commandCsv: buildCommandCsv({ buyer, offer, outputType, publicUrl })
  };
}

export function formatDemoPack(pack) {
  return [
    "# Brief30 demo pack",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Buyer: ${pack.buyer}`,
    `Output: ${pack.outputType}`,
    `Offer: ${pack.proposal.offer.label}`,
    `Score: ${pack.score}/100`,
    `Payment route: ${pack.proposal.routeReady ? pack.proposal.paymentRoute : "missing"}`,
    "",
    "## Send message",
    pack.message,
    "",
    "## Sample markdown",
    pack.sampleMarkdown,
    "",
    "## Close message",
    pack.proposal.proposal,
    "",
    "## 24-hour follow-up",
    pack.proposal.nudge,
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Next commands",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `Do not merge this demo into revenue. ${revenueProofNote()}`
  ].join("\n");
}

export function demoPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-demo-pack-${date}.md`, content: `${formatDemoPack(pack)}\n` },
    { name: `brief30-demo-sample-${date}.md`, content: `${pack.sampleMarkdown}\n` },
    { name: `brief30-demo-update-${date}.csv`, content: `${pack.updateCsv}\n` },
    { name: `brief30-demo-commands-${date}.csv`, content: `${pack.commandCsv}\n` }
  ];
}

function buildDemoMessage({ buyer, result, proposal, publicUrl }) {
  return [
    `${buyer}, 보내주신 메모로 Brief30 샘플을 바로 돌려봤습니다.`,
    "",
    `진단 점수: ${result.score.overall}/100`,
    "바로 보낼 수 있는 3줄 요약:",
    ...result.executive.map((line) => `- ${line}`),
    "",
    "보완하면 좋아지는 지점:",
    ...result.risks.slice(0, 3).map((line) => `- ${line}`),
    "",
    `무료 진단 링크: ${publicUrl}diagnostic/index.html`,
    `이 포맷으로 계속 쓰려면 ${proposal.offer.label}으로 진행하면 됩니다.`,
    proposal.routeReady ? `결제/입금 안내: ${proposal.paymentRoute}` : "진행 의사 주시면 결제 루트 붙여서 보내겠습니다.",
    `상세/견적 링크: ${proposal.closeUrl}`
  ].join("\n");
}

function buildUpdateCsv({ buyer, offer, score, outputType, date }) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    [buyer, "tester", offer, addDays(date, 1), `demo sent / score ${score} / ${outputType}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv({ buyer, offer, outputType, publicUrl }) {
  return [
    ["name", "command"],
    [buyer, `npm run plan:proposal -- --buyer="${quote(buyer)}" --use-case="${quote(outputType)}" --offer=${offer} --url=${publicUrl}`],
    [buyer, buildMoneyPaidCommand()]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function inferOutput(note) {
  const text = String(note || "");
  if (/고객사|상태|업데이트/u.test(text)) return "고객사 업데이트";
  if (/회의|미팅|결정사항/u.test(text)) return "회의록";
  if (/메일|후속/u.test(text)) return "후속 메일";
  return "주간보고";
}

function inferAudience(note) {
  const text = String(note || "");
  if (/고객사|클라이언트/u.test(text)) return "고객사";
  if (/임원|대표/u.test(text)) return "임원";
  return "팀장/고객사";
}

function inferOffer(note) {
  const text = String(note || "");
  if (/(고객사|임원|대표|대행|바빠|급|오늘|내일|결과물)/u.test(text)) return "service";
  if (/(혼자|셀프|개인|가격|싸게)/u.test(text)) return "self";
  return "setup";
}

function normalizeOffer(value) {
  return ["self", "setup", "service"].includes(value) ? value : "setup";
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function makeRef(date) {
  return `B30-DEMO-${String(date || today()).replace(/[^\d]/gu, "")}`;
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  const value = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
    : new Date();
  if (!match) value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function quote(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
