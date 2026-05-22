import { buildProposalPack } from "../closing/proposal-pack.js";
import { parseReplies } from "../replydesk/logic.js";
import { OFFERS, csvCell, formatKrw } from "./model.js";
import { buildClosePlan, parseOperatorLedger } from "./close-plan.js";

const STATUS_SCORE = { tester: 70, replied: 55, contacted: 28, prospect: 8 };
const SOURCE_SCORE = { previous_client: 18, referral: 16, direct_dm: 9, community: 5, social_post: 4 };
const SIGNALS = [
  { key: "pay", label: "결제", score: 90, offer: "service", pattern: /(결제|입금|계좌|송금|구매|주문|진행할게|진행하겠습니다)/u },
  { key: "approval", label: "내부승인", score: 72, offer: "service", pattern: /(견적|결재|승인|품의|증빙|영수증|세금계산서|회사 처리)/u },
  { key: "urgent", label: "긴급", score: 64, offer: "service", pattern: /(오늘|내일|이번 주|급|빨리|바로|가능할까요|언제)/u },
  { key: "service", label: "대행", score: 58, offer: "service", pattern: /(대행|맡|해주|정리해|바빠|시간 없어|결과물)/u },
  { key: "price", label: "가격", score: 32, offer: "self", pattern: /(비싸|가격|얼마|할인|부담|예산)/u },
  { key: "privacy", label: "보안", score: 28, offer: "setup", pattern: /(보안|민감|외부|유출|개인정보|회사 정책)/u }
];

export function buildHotlist(input = {}, options = {}) {
  const ledgerText = String(input.ledgerText || "");
  const replyText = String(input.replyText || "");
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const date = options.date || today();
  const month = options.month || date.slice(0, 7);
  const paymentRoute = clean(options.paymentRoute);
  const closePlan = buildClosePlan(ledgerText, { ...options, month, limit: 20 });
  const ledger = parseOperatorLedger(ledgerText);
  const replies = parseReplies(replyText);
  const candidates = mergeCandidates(ledger.leads, replies)
    .map((candidate) => scoreCandidate(candidate, { date }))
    .filter((candidate) => !["closed", "lost"].includes(candidate.status))
    .sort((a, b) => b.score - a.score)
    .slice(0, boundedLimit(options.limit));
  const rows = candidates.map((candidate, index) => buildHotAction(candidate, { publicUrl, paymentRoute, date, index }));

  return {
    source: options.source || "",
    replySource: options.replySource || "",
    date,
    month,
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    closePlan,
    replies,
    rows,
    updateCsv: buildUpdateCsv(rows),
    commandCsv: buildCommandCsv(rows)
  };
}

export function formatHotlist(pack) {
  return [
    "# Brief30 hotlist",
    "",
    `Date: ${pack.date}`,
    `Ledger: ${pack.source || "stdin"}`,
    `Replies: ${pack.replySource || "none"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(pack.closePlan.revenue)} / ${formatKrw(pack.closePlan.target)}`,
    `Gap: ${formatKrw(pack.closePlan.gap)}`,
    `Hot leads: ${pack.rows.length}`,
    "",
    "## Ask for money now",
    ...hotBlocks(pack.rows),
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    "Do not merge this hotlist into revenue. Only actual payment proof processed through money:paid counts."
  ].join("\n");
}

export function hotlistFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-hotlist-${date}.md`, content: `${formatHotlist(pack)}\n` },
    { name: `brief30-hotlist-updates-${date}.csv`, content: `${pack.updateCsv}\n` },
    { name: `brief30-hotlist-commands-${date}.csv`, content: `${pack.commandCsv}\n` }
  ];
}

function mergeCandidates(leads, replies) {
  const byName = new Map(leads.map((lead) => [key(lead.name), { ...lead, reply: "", signal: null }]));
  for (const reply of replies) {
    const id = key(reply.name);
    const current = byName.get(id) || {
      name: reply.name,
      segment: "직장인",
      source: "direct_dm",
      offer: reply.offer,
      status: reply.status,
      note: "",
      nextTouch: today()
    };
    byName.set(id, {
      ...current,
      offer: strongerOffer(current.offer, reply.offer),
      status: strongerStatus(current.status, reply.status),
      reply: reply.reply,
      signal: detectSignal(reply.reply)
    });
  }
  return [...byName.values()];
}

function scoreCandidate(candidate, context) {
  const signal = candidate.signal || detectSignal(candidate.note || "");
  const offer = normalizeOffer(signal?.offer || candidate.offer);
  const due = !candidate.nextTouch || candidate.nextTouch <= context.date ? 14 : 0;
  const score =
    (STATUS_SCORE[candidate.status] || 0) +
    (SOURCE_SCORE[candidate.source] || 0) +
    (OFFERS[offer]?.price || 0) / 2000 +
    (signal?.score || 0) +
    due;
  return { ...candidate, offer, signal, score: Math.round(score) };
}

function buildHotAction(candidate, context) {
  const proposal = buildProposalPack({
    buyer: candidate.name,
    offer: candidate.offer,
    useCase: useCaseFor(candidate),
    publicUrl: context.publicUrl,
    paymentRoute: context.paymentRoute,
    ref: `B30-HOT-${context.date.replaceAll("-", "")}-${String(context.index + 1).padStart(2, "0")}`
  });
  const message = messageFor(candidate, proposal);
  return {
    ...candidate,
    proposal,
    message,
    nextStatus: candidate.signal?.key === "pay" || candidate.status === "tester" ? "tester" : "replied",
    nextTouch: addDays(context.date, 1)
  };
}

function messageFor(candidate, proposal) {
  if (candidate.signal?.key === "approval") {
    return [
      `${candidate.name}, 내부 공유용으로 바로 붙일 수 있게 범위/금액만 정리드립니다.`,
      `제안: ${proposal.offer.label}`,
      `금액: ${formatKrw(proposal.offer.price)}`,
      `진행 범위: ${proposal.useCase}`,
      proposal.routeReady ? `결제/입금 안내: ${proposal.paymentRoute}` : "진행 의사 주시면 결제 루트 붙여 보내겠습니다.",
      `상세/견적 링크: ${proposal.closeUrl}`
    ].join("\n");
  }
  if (candidate.signal?.key === "price") {
    return proposal.fallback;
  }
  return proposal.proposal;
}

function hotBlocks(rows) {
  if (!rows.length) return ["- hot lead가 없습니다. plan:contacts 또는 plan:channels로 새 후보를 만드세요."];
  return rows.map((row, index) => [
    `### ${index + 1}. ${row.name} / ${row.signal?.label || row.status} / score ${row.score} / ${row.proposal.offer.label}`,
    "",
    row.reply ? `Reply: ${row.reply}` : `Note: ${row.note || "n/a"}`,
    "",
    row.message
  ].join("\n"));
}

function buildUpdateCsv(rows) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    ...rows.map((row) => [
      row.name,
      row.nextStatus,
      row.offer,
      row.nextTouch,
      `hotlist ${row.signal?.label || row.status} / score ${row.score}`
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(rows) {
  return [
    ["name", "command"],
    ...rows.map((row) => [
      row.name,
      `npm run plan:proposal -- --buyer="${quote(row.name)}" --use-case="${quote(row.proposal.useCase)}" --offer=${row.offer} --url=${row.proposal.publicUrl}`
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function detectSignal(text) {
  return SIGNALS.find((signal) => signal.pattern.test(String(text || ""))) || null;
}

function useCaseFor(candidate) {
  const text = [candidate.reply, candidate.note].filter(Boolean).join(" ");
  if (/고객사|상태|업데이트/u.test(text)) return "고객사 업데이트";
  if (/회의|미팅|결정/u.test(text)) return "회의록";
  return candidate.offer === "service" ? "업무 메모 3개 정리" : "첫 업무 메모 셋업";
}

function strongerOffer(a, b) {
  const order = { self: 1, setup: 2, service: 3 };
  return (order[b] || 0) > (order[a] || 0) ? b : a;
}

function strongerStatus(a, b) {
  const order = { prospect: 1, contacted: 2, replied: 3, tester: 4, closed: 5, lost: 0 };
  return (order[b] || 0) > (order[a] || 0) ? b : a;
}

function normalizeOffer(value) {
  return OFFERS[value] ? value : "setup";
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  const value = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
    : new Date();
  if (!match) value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function boundedLimit(value) {
  return Math.max(1, Math.min(20, Number(value || 5)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function quote(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function key(value) {
  return clean(value).toLowerCase();
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
