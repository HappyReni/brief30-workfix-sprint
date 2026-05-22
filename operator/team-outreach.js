import { csvCell } from "./model.js";
import { buildMoneyPaidCommand, revenueProofNote } from "./payment-command.js";
import { buildTeamPack, teamPackFiles, TEAM_PACKAGE } from "./team-pack.js";

export function buildTeamOutreachPack(text = "", options = {}) {
  const date = clean(options.date) || today();
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const contacts = parseContacts(text)
    .map((contact, index) => enrichContact(contact, { ...options, date, publicUrl, paymentRoute, index }))
    .filter((row) => row.buyer)
    .sort((a, b) => b.score - a.score)
    .slice(0, boundedLimit(options.limit));
  const rows = contacts.map((contact, index) => buildRow(contact, { date, publicUrl, paymentRoute, index }));

  return {
    date,
    source: options.source || "",
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    parsed: parseContacts(text).length,
    rows,
    messageText: buildMessages(rows),
    operatorCsv: buildOperatorCsv(rows),
    commandCsv: buildCommandCsv(rows)
  };
}

export function formatTeamOutreachPack(pack) {
  return [
    "# Brief30 team outreach",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Parsed contacts: ${pack.parsed}`,
    `Team asks: ${pack.rows.length}`,
    `One close target: ${TEAM_PACKAGE.label}`,
    "",
    "## Priority asks",
    ...pack.rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.buyer} / ${row.company} / score ${row.score} / ${row.pack.offer.label}`),
    "",
    "## Copy block",
    pack.messageText || "보낼 팀 후보가 없습니다.",
    "",
    "## Operator import CSV",
    "```csv",
    pack.operatorCsv,
    "```",
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `Do not merge this outreach pack into revenue. ${revenueProofNote()}`
  ].join("\n");
}

export function teamOutreachFiles(pack) {
  const date = String(pack.date || today());
  const core = [
    { name: `brief30-team-outreach-${date}.md`, content: `${formatTeamOutreachPack(pack)}\n` },
    { name: `brief30-team-outreach-messages-${date}.txt`, content: `${pack.messageText}\n` },
    { name: `brief30-team-outreach-import-${date}.csv`, content: `${pack.operatorCsv}\n` },
    { name: `brief30-team-outreach-commands-${date}.csv`, content: `${pack.commandCsv}\n` }
  ];
  const pages = pack.rows.flatMap((row) => teamPackFiles(row.pack).filter((file) => !file.name.endsWith("-update.csv") && !file.name.endsWith("-commands.csv")));
  return [...core, ...pages];
}

function parseContacts(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = csvHeader(lines[0]);
  if (header) return lines.slice(1).map((line) => contactFromHeader(header, line)).filter(Boolean);
  return lines.map(contactFromLine).filter(Boolean);
}

function contactFromHeader(header, line) {
  const cells = parseLine(line, ",");
  const row = Object.fromEntries(header.map((name, index) => [name, cells[index] || ""]));
  return {
    buyer: clean(row.buyer || row.name || row.contact),
    company: clean(row.company || row.team || row.org),
    approver: clean(row.approver || row.manager || row.decision_maker),
    relation: clean(row.relation || row.source || row.channel),
    useCase: clean(row.use_case || row.usecase || row.pain || row.context),
    note: clean(row.note || row.memo)
  };
}

function contactFromLine(line) {
  const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
  const [buyer, company, approver, ...rest] = parseLine(line, separator);
  return {
    buyer: clean(buyer),
    company: clean(company),
    approver: clean(approver),
    relation: "",
    useCase: clean(rest.join(" ")),
    note: ""
  };
}

function enrichContact(contact, options) {
  const text = [contact.buyer, contact.company, contact.approver, contact.relation, contact.useCase, contact.note].join(" ");
  return {
    buyer: contact.buyer,
    company: contact.company || inferCompany(text),
    approver: contact.approver || inferApprover(text),
    useCase: useCaseFor(text),
    note: [contact.relation, contact.useCase, contact.note].filter(Boolean).join(" / "),
    score: score(text, contact),
    ref: `B30-TEAM-${options.date.replaceAll("-", "")}-${String(options.index + 1).padStart(2, "0")}`
  };
}

function buildRow(contact, context) {
  const pack = buildTeamPack({
    buyer: contact.buyer,
    company: contact.company,
    approver: contact.approver,
    useCase: contact.useCase,
    publicUrl: context.publicUrl,
    paymentRoute: context.paymentRoute,
    date: context.date,
    ref: contact.ref
  });
  return {
    ...contact,
    pack,
    message: buildMessage(pack, contact)
  };
}

function buildMessage(pack, contact) {
  const routeLine = pack.paymentRoute ? `승인되면 결제/입금 안내는 ${pack.paymentRoute}입니다.` : "진행 의사만 주시면 결제 루트를 붙여 보내겠습니다.";
  return [
    `[${pack.company}] ${pack.buyer}님께`,
    "",
    `${contact.useCase}가 반복되면 Brief30 팀 브리핑 스프린트로 4주 동안 메모를 대신 정리해볼 수 있습니다.`,
    `범위: ${pack.offer.delivery}`,
    `금액: ${formatKrw(pack.offer.price)}`,
    `개인 진행룸: ${pack.dealRoomUrl}`,
    `주문 링크: ${pack.orderUrl}`,
    `제안 페이지: ${pack.page?.fileName || `brief30-team-proposal-${slug(pack.buyer)}-${pack.date}.html`}`,
    routeLine,
    "",
    `내부 승인용 주문번호: ${pack.ref}`
  ].join("\n");
}

function buildMessages(rows) {
  return rows.map((row, index) => [`## ${index + 1}. ${row.buyer}`, row.message].join("\n")).join("\n\n");
}

function buildOperatorCsv(rows) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    ...rows.map((row) => [
      row.buyer,
      "contacted",
      "team",
      addDays(row.pack.date, 1),
      `team outreach / ${row.company} / ${row.approver} / ${row.useCase} / ${row.pack.ref}`
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(rows) {
  return [
    ["name", "type", "command"],
    ...rows.flatMap((row) => [
      [row.buyer, "team_pack", teamCommand(row.pack)],
      [row.buyer, "money_paid", buildMoneyPaidCommand({ month: row.pack.date.slice(0, 7) })]
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function teamCommand(pack) {
  const route = pack.paymentRoute ? ` --payment-route="${quoteArg(pack.paymentRoute)}"` : "";
  return `npm run plan:team -- --buyer="${quoteArg(pack.buyer)}" --company="${quoteArg(pack.company)}" --approver="${quoteArg(pack.approver)}" --use-case="${quoteArg(pack.useCase)}" --url=${pack.publicUrl}${route} --out=outreach/generated`;
}

function score(text, contact) {
  const warm = /(기존|거래|동료|소개|추천|전 직장|같이|고객)/u.test(text) ? 42 : 18;
  const role = /(팀장|리드|PM|매니저|대표|임원|결재|승인|approver|manager)/iu.test(text) ? 28 : 10;
  const pain = /(주간보고|회의록|고객사|상태 보고|리스크|반복|매주|브리핑|업데이트)/u.test(text) ? 28 : 8;
  const hasCompany = contact.company ? 12 : 0;
  return warm + role + pain + hasCompany;
}

function useCaseFor(text) {
  if (/고객사|업데이트|상태/u.test(text)) return "고객사 업데이트/상태 보고";
  if (/회의|미팅|결정/u.test(text)) return "팀 회의록/결정사항 정리";
  if (/리스크|이슈/u.test(text)) return "프로젝트 리스크 보고";
  return "팀 주간보고/브리핑 반복 정리";
}

function inferCompany(text) {
  const match = String(text || "").match(/([가-힣A-Za-z0-9]+팀|[가-힣A-Za-z0-9]+파트|[가-힣A-Za-z0-9]+실)/u);
  return match?.[1] || "OO팀";
}

function inferApprover(text) {
  if (/대표/u.test(text)) return "대표";
  if (/팀장/u.test(text)) return "팀장";
  if (/매니저|manager/iu.test(text)) return "매니저";
  return "결재권자";
}

function csvHeader(line) {
  const cells = parseLine(line, ",").map((cell) => clean(cell).toLowerCase().replaceAll(" ", "_"));
  return cells.some((cell) => ["name", "buyer", "contact"].includes(cell)) ? cells : null;
}

function parseLine(line, separator) {
  if (separator !== ",") return line.split(separator).map(clean);
  const cells = [];
  let cell = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(clean(cell));
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(clean(cell));
  return cells;
}

function boundedLimit(value) {
  return Math.max(1, Math.min(10, Number(value || 5)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return today();
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return value.toISOString().slice(0, 10);
}

function quoteArg(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "buyer";
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
