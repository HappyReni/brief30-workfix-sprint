import { csvCell, OFFERS } from "./model.js";
import { buildMoneyPaidCommand, revenueProofNote } from "./payment-command.js";
import { buildReferralPack } from "./referral-pack.js";
import { buildTeamOutreachPack } from "./team-outreach.js";

export function buildNetworkSprint(text = "", options = {}) {
  const date = clean(options.date) || today();
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const limit = boundedLimit(options.limit);
  const people = parsePeople(text).map(enrichPerson).filter((person) => person.name);
  const directPeople = topRows(people, "directScore", limit);
  const connectorPeople = topRows(people, "connectorScore", limit);
  const teamInputCsv = buildTeamInputCsv(directPeople);
  const referralLedgerCsv = buildReferralLedgerCsv(connectorPeople, date);
  const teamPack = buildTeamOutreachPack(teamInputCsv, {
    source: "warm network",
    publicUrl,
    paymentRoute,
    date,
    limit
  });
  const referralPack = buildReferralPack(referralLedgerCsv, {
    source: "warm network",
    publicUrl,
    offer: "team",
    date,
    limit
  });

  return {
    date,
    source: options.source || "",
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    parsed: people.length,
    directPeople,
    connectorPeople,
    teamInputCsv,
    referralLedgerCsv,
    teamPack,
    referralPack,
    operatorCsv: teamPack.operatorCsv,
    commandCsv: buildCommandCsv({ publicUrl, paymentRoute, date }),
    scoreCsv: buildScoreCsv(people)
  };
}

export function formatNetworkSprint(pack) {
  return [
    "# Brief30 warm network sprint",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Parsed people: ${pack.parsed}`,
    `Direct team asks: ${pack.teamPack.rows.length}`,
    `Intro asks: ${pack.referralPack.advocates.length}`,
    `Target close: ${OFFERS.team.label}`,
    "",
    "## First 60 minutes",
    ...firstHourLines(pack),
    "",
    "## Direct team asks",
    pack.teamPack.messageText || "직접 보낼 팀 구매 후보가 없습니다.",
    "",
    "## Intro asks",
    pack.referralPack.askMessages.join("\n\n") || "소개 요청 후보가 없습니다.",
    "",
    "## Team outreach input",
    "```csv",
    pack.teamInputCsv,
    "```",
    "",
    "## Referral advocate ledger",
    "```csv",
    pack.referralLedgerCsv,
    "```",
    "",
    "## Operator import CSV",
    "```csv",
    pack.operatorCsv,
    "```",
    "",
    "## Score CSV",
    "```csv",
    pack.scoreCsv,
    "```",
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `This is only an outreach sprint. ${revenueProofNote()}`
  ].join("\n");
}

export function networkSprintFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-network-sprint-${date}.md`, content: `${formatNetworkSprint(pack)}\n` },
    { name: `brief30-network-direct-messages-${date}.txt`, content: `${pack.teamPack.messageText}\n` },
    { name: `brief30-network-intro-asks-${date}.txt`, content: `${pack.referralPack.askMessages.join("\n\n")}\n` },
    { name: `brief30-network-team-input-${date}.csv`, content: `${pack.teamInputCsv}\n` },
    { name: `brief30-network-referral-ledger-${date}.csv`, content: `${pack.referralLedgerCsv}\n` },
    { name: `brief30-network-operator-import-${date}.csv`, content: `${pack.operatorCsv}\n` },
    { name: `brief30-network-commands-${date}.csv`, content: `${pack.commandCsv}\n` },
    { name: `brief30-network-score-${date}.csv`, content: `${pack.scoreCsv}\n` }
  ];
}

function parsePeople(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = csvHeader(lines[0]);
  return header ? lines.slice(1).map((line) => personFromHeader(header, line)).filter(Boolean) : lines.map(personFromLine);
}

function personFromHeader(header, line) {
  const cells = parseLine(line, ",");
  const row = Object.fromEntries(header.map((name, index) => [name, cells[index] || ""]));
  return {
    name: clean(row.name || row.buyer || row.contact),
    company: clean(row.company || row.team || row.org),
    role: clean(row.role || row.title || row.approver || row.position),
    relation: clean(row.relation || row.source || row.channel),
    note: clean(row.note || row.memo || row.context || row.use_case || row.pain)
  };
}

function personFromLine(line) {
  const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
  const [name, second, third, ...rest] = parseLine(line, separator);
  const hasCompany = looksLikeCompany(second);
  return {
    name: clean(name),
    company: hasCompany ? clean(second) : "",
    role: hasCompany ? clean(third) : "",
    relation: hasCompany ? "" : clean(second),
    note: [hasCompany ? "" : third, ...rest].filter(Boolean).join(" ")
  };
}

function enrichPerson(person) {
  const text = [person.name, person.company, person.role, person.relation, person.note].join(" ");
  const source = sourceFor(person.relation || text);
  const company = person.company || inferCompany(text);
  const role = person.role || inferRole(text);
  const useCase = useCaseFor(text);
  return {
    ...person,
    company,
    role,
    source,
    useCase,
    directScore: directScore({ source, company, role, text }),
    connectorScore: connectorScore({ source, text })
  };
}

function topRows(people, field, limit) {
  return [...people]
    .sort((a, b) => b[field] - a[field] || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildTeamInputCsv(people) {
  return [
    ["name", "company", "approver", "relation", "use_case", "note"],
    ...people.map((person) => [
      person.name,
      person.company,
      person.role || inferRole(person.note),
      person.source,
      person.useCase,
      person.note || "팀 브리핑 반복 정리"
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildReferralLedgerCsv(people, date) {
  return [
    ["name", "segment", "source", "offer", "status", "next_touch", "last_touch", "paid_at", "paid_amount", "payment_ref", "note"],
    ...people.map((person) => [
      person.name,
      segmentFor([person.role, person.note].join(" ")),
      person.source,
      "team",
      "contacted",
      date,
      "",
      "",
      "",
      "",
      person.note || `${person.company} ${person.useCase}`
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildScoreCsv(people) {
  return [
    ["name", "company", "role", "source", "use_case", "direct_score", "connector_score", "note"],
    ...people.map((person) => [
      person.name,
      person.company,
      person.role,
      person.source,
      person.useCase,
      person.directScore,
      person.connectorScore,
      person.note
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv({ publicUrl, paymentRoute, date }) {
  const route = paymentRoute ? ` --payment-route="${quoteArg(paymentRoute)}"` : "";
  return [
    ["step", "command"],
    ["configure_payment", "npm run prepare:seller -- --team=\"https://pay.domain.kr/team\""],
    ["direct_team_asks", `npm run plan:team-outreach -- outreach/generated/brief30-network-team-input-${date}.csv --url=${publicUrl}${route} --out=outreach/generated`],
    ["intro_asks", `npm run plan:referrals -- outreach/generated/brief30-network-referral-ledger-${date}.csv --url=${publicUrl} --offer=team --out=outreach/generated`],
    ["approval_packet", `npm run plan:procurement -- --buyer=김PM --company=OO팀 --approver=이팀장 --use-case=팀주간보고 --url=${publicUrl}${route} --out=outreach/generated`],
    ["money_paid", buildMoneyPaidCommand({ month: date.slice(0, 7) })],
    ["close_desk", `npm run ops:money -- outreach/prospect-seed.csv --replies=path/to/replies.txt --payments=path/to/payment-text.txt --url=${publicUrl} --out=outreach/generated`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function firstHourLines(pack) {
  const payment = pack.paymentReady
    ? "- 결제 루트가 있으니 직접 팀 제안 메시지부터 보냅니다."
    : "- 먼저 실제 팀 결제 URL이나 계좌/이메일을 `prepare:seller`로 연결합니다.";
  return [
    payment,
    `- 직접 구매 가능성이 높은 ${Math.min(3, pack.teamPack.rows.length)}명에게 Direct team asks 상단 메시지를 보냅니다.`,
    `- 소개자로 점수가 높은 ${Math.min(3, pack.referralPack.advocates.length)}명에게 Intro asks 상단 메시지를 보냅니다.`,
    "- 답장이 오면 `plan:procurement`로 내부 승인 자료를 보내고, 입금/결제 문자는 `money:paid`로만 매출 처리합니다."
  ];
}

function directScore({ source, company, role, text }) {
  return sourceScore(source) + roleScore(role || text) + painScore(text) + budgetScore(text) + (company !== "OO팀" ? 10 : 0);
}

function connectorScore({ source, text }) {
  const intro = /(소개|추천|연결|지인|아는 분|네트워크|동료|전 직장|같이)/u.test(text) ? 36 : 8;
  return sourceScore(source) + intro + painScore(text);
}

function sourceScore(source) {
  return { previous_client: 34, referral: 30, direct_dm: 20, community: 12, social_post: 10 }[source] || 8;
}

function roleScore(text) {
  if (/(대표|임원|결재|승인|예산|구매|팀장|파트장|리드|PM|매니저|manager|lead)/iu.test(text)) return 32;
  if (/(기획|운영|컨설|PMO|어카운트|고객사)/u.test(text)) return 20;
  return 8;
}

function painScore(text) {
  return /(주간보고|회의록|고객사|상태 보고|리스크|반복|매주|브리핑|업데이트|임원 보고)/u.test(text) ? 30 : 10;
}

function budgetScore(text) {
  return /(예산|결재|승인|구매|정산|견적|계산서|입금|비용)/u.test(text) ? 18 : 0;
}

function sourceFor(text) {
  if (/(기존|거래|고객|동료|전 직장|예전|이전|같이)/u.test(text)) return "previous_client";
  if (/(소개|추천|지인|친구|아는 분|연결)/u.test(text)) return "referral";
  if (/(커뮤니티|카페|오픈채팅|댓글|게시글)/u.test(text)) return "community";
  if (/(SNS|소셜|링크드인|블로그|포스트|트위터|스레드)/iu.test(text)) return "social_post";
  return "direct_dm";
}

function useCaseFor(text) {
  if (/고객사|업데이트|상태/u.test(text)) return "고객사 업데이트/상태 보고";
  if (/회의|미팅|결정/u.test(text)) return "팀 회의록/결정사항 정리";
  if (/리스크|이슈/u.test(text)) return "프로젝트 리스크 보고";
  return "팀 주간보고/브리핑 반복 정리";
}

function segmentFor(text) {
  if (/(대표|창업|사업)/u.test(text)) return "창업자";
  if (/(컨설|PMO|프로젝트)/u.test(text)) return "컨설턴트";
  if (/(에이전시|고객사|어카운트)/u.test(text)) return "에이전시";
  return "직장인";
}

function inferCompany(text) {
  const match = String(text || "").match(/([가-힣A-Za-z0-9]+팀|[가-힣A-Za-z0-9]+파트|[가-힣A-Za-z0-9]+실|[가-힣A-Za-z0-9]+랩)/u);
  return match?.[1] || "OO팀";
}

function inferRole(text) {
  if (/대표/u.test(text)) return "대표";
  if (/팀장/u.test(text)) return "팀장";
  if (/리드|lead/iu.test(text)) return "리드";
  if (/PM|프로젝트/u.test(text)) return "PM";
  if (/매니저|manager/iu.test(text)) return "매니저";
  return "결재권자";
}

function looksLikeCompany(value) {
  return /(팀|파트|실|랩|회사|스튜디오|agency|inc|corp|llc)/iu.test(String(value || ""));
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
  return Math.max(1, Math.min(20, Number(value || 8)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
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
