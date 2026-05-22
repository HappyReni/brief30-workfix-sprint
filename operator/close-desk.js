import { buildReplyPack } from "../replydesk/reply-pack.js";
import { buildClosePlan } from "./close-plan.js";
import { buildDealPack } from "./deal-pack.js";
import { buildFollowupPack } from "./followup-pack.js";
import { formatKrw } from "./model.js";
import { buildObjectionPack } from "./objection-pack.js";
import { buildPaymentEvidencePack } from "./payment-evidence.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

const UPDATE_HEADER = '"name","status","offer","next_touch","note"';
const EVIDENCE_HEADER = "ref,buyer,offer,amount,contact,use_case,payment_route,date";

export function buildCloseDesk(input = {}, options = {}) {
  const ledgerText = String(input.ledgerText || "");
  const replyText = String(input.replyText || "");
  const paymentText = String(input.paymentText || "");
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const month = options.month || today().slice(0, 7);
  const date = options.date || today();
  const closePlan = buildClosePlan(ledgerText, { ...options, month, limit: options.limit || 5 });
  const deals = buildDealPack(ledgerText, { ...options, month, date, publicUrl, paymentRoute, limit: options.limit || 5 });
  const followups = buildFollowupPack(ledgerText, { ...options, date, publicUrl, paymentRoute, limit: options.followupLimit || 5 });
  const replies = replyText ? buildReplyPack(replyText, { publicUrl, offer: options.offer || "service" }) : emptyReplies(publicUrl);
  const objections = buildObjectionPack(objectionText(replyText), { source: options.replySource, publicUrl, paymentRoute });
  const payments = paymentText
    ? buildPaymentEvidencePack(paymentText, { source: options.paymentSource, date, paymentRoute })
    : emptyPayments(date);
  const updateCsv = combineCsv([replies.updateCsv, objections.updateCsv, followups.updateCsv], UPDATE_HEADER);

  const desk = {
    date,
    month,
    source: options.source || "",
    replySource: options.replySource || "",
    paymentSource: options.paymentSource || "",
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    closePlan,
    deals,
    followups,
    replies,
    objections,
    payments,
    updateCsv
  };
  return { ...desk, actions: closeDeskActions(desk) };
}

export function formatCloseDesk(desk) {
  return [
    "# Brief30 close desk",
    "",
    `Date: ${desk.date}`,
    `Ledger: ${desk.source || "stdin"}`,
    `Replies: ${desk.replySource || "none"}`,
    `Payments: ${desk.paymentSource || "none"}`,
    `Public URL: ${desk.publicUrl}`,
    `Payment route: ${desk.paymentReady ? desk.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(desk.closePlan.revenue)} / ${formatKrw(desk.closePlan.target)}`,
    `Gap: ${formatKrw(desk.closePlan.gap)}`,
    `Ready payment evidence: ${desk.payments.ready.length}`,
    `Warm deals: ${desk.deals.deals.length}`,
    `Fresh replies: ${desk.replies.rows.length}`,
    `Objections: ${desk.objections.rows.length}`,
    "",
    "## Do now",
    ...desk.actions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Warm payment asks",
    ...dealLines(desk.deals.deals),
    "",
    "## Fresh reply handling",
    ...replyLines(desk.replies.rows),
    "",
    "## Objection handling",
    ...objectionLines(desk.objections.rows),
    "",
    "## Actual payment evidence CSV",
    "```csv",
    desk.payments.evidenceCsv,
    "```",
    "",
    "## Operator update CSV",
    "```csv",
    desk.updateCsv,
    "```",
    "",
    "## Commands",
    ...commandLines(desk)
  ].join("\n");
}

export function closeDeskFiles(desk) {
  const date = String(desk.date || today());
  return [
    { name: `brief30-close-desk-${date}.md`, content: `${formatCloseDesk(desk)}\n` },
    { name: `brief30-close-desk-updates-${date}.csv`, content: `${desk.updateCsv}\n` },
    { name: `brief30-close-desk-payment-evidence-${date}.csv`, content: `${desk.payments.evidenceCsv}\n` }
  ];
}

function closeDeskActions(desk) {
  const actions = [];
  if (!desk.paymentReady) {
    actions.push("P0 결제 루트 설정: npm run prepare:seller -- --email=실제이메일 --payment=\"은행명 실제계좌 예금주명\"");
  }
  if (desk.payments.ready.length) {
    actions.push("P0 money:paid로 결제 증빙 파싱 -> ledger 병합 -> audit:revenue까지 한 번에 확인");
  }
  if (desk.deals.deals.length) {
    const first = desk.deals.deals[0].lead;
    actions.push(`P1 ${first.name}에게 결제 요청 발송: npm run plan:proposal -- --buyer="${quote(first.name)}" --offer=${first.offer} --url=${desk.publicUrl}`);
  }
  if (desk.objections.rows.length) {
    actions.push(`P1 ${desk.objections.rows[0].name} 반론 답장 먼저 발송: plan:objections 결과 사용`);
  }
  if (desk.replies.closeQueue.length) {
    actions.push(`P2 ${desk.replies.closeQueue[0].name} replydesk close 링크 발송`);
  }
  if (desk.followups.followups.length) {
    actions.push(`P2 ${desk.followups.followups.length}명 후속 발송 후 update CSV import`);
  }
  if (!actions.length) {
    actions.push(`P1 신규 발송: npm run plan:channels -- --count=20 --focus=team --sources=previous_client,referral,direct_dm --url=${desk.publicUrl}`);
  }
  actions.push("P3 실제 입금 확인 전에는 proposal/deal evidence를 매출 ledger에 병합하지 않습니다.");
  return actions;
}

function dealLines(deals) {
  if (!deals.length) return ["- warm deal 후보가 없습니다."];
  return deals.slice(0, 3).map(({ lead, pack }, index) => [
    `### ${index + 1}. ${lead.name} / ${lead.status} / ${pack.offer.label}`,
    "",
    pack.proposal
  ].join("\n"));
}

function replyLines(rows) {
  if (!rows.length) return ["- 새 reply 입력이 없습니다."];
  return rows.slice(0, 3).map((row, index) => [
    `### ${index + 1}. ${row.name} / ${row.type} / ${row.offer}`,
    "",
    row.response
  ].join("\n"));
}

function objectionLines(rows) {
  if (!rows.length) return ["- 처리할 반론이 없습니다."];
  return rows.slice(0, 3).map((row, index) => [
    `### ${index + 1}. ${row.name} / ${row.label} / ${row.offer}`,
    "",
    row.response
  ].join("\n"));
}

function commandLines(desk) {
  return [
    `npm run plan:deals -- path/to/ledger.csv --url=${desk.publicUrl}`,
    `npm run plan:replies -- path/to/replies.txt --url=${desk.publicUrl} --offer=team`,
    `npm run plan:objections -- path/to/replies.txt --url=${desk.publicUrl} --offer=team`,
    buildMoneyPaidCommand({ ledgerPath: "path/to/ledger.csv", month: desk.month }),
    "npm run audit:revenue -- path/to/ledger.csv"
  ];
}

function objectionText(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => /(승인|결재|품의|견적|영수증|증빙|회사|팀 비용|세금계산서|입금|계좌|카드|결제|송금|주문|구매|보안|민감|자료|외부|유출|개인정보|비싸|가격|얼마|할인|부담|예산|언제|오늘|내일|가능|납기|시간|급|빨리|범위|포함|수정|분량)/u.test(line))
    .join("\n");
}

function combineCsv(values, header) {
  const rows = values.flatMap((value) => bodyRows(value, header));
  return [header, ...rows].join("\n");
}

function bodyRows(value, header) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== header);
}

function emptyReplies(publicUrl) {
  return { publicUrl, defaultOffer: "service", rows: [], closeQueue: [], closeCsv: "", updateCsv: UPDATE_HEADER };
}

function emptyPayments(date) {
  return { source: "", date, rows: [], ready: [], review: [], evidenceCsv: EVIDENCE_HEADER };
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
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
