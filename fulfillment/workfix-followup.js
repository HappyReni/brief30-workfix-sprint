import { csvCell, formatKrw } from "../operator/model.js";
import { WORKFIX_OFFER } from "../operator/workfix-sprint.js";

export function buildWorkfixFollowupPack(text = "", options = {}) {
  const date = options.date || today();
  const buyer = clean(options.buyer) || "Workfix buyer";
  const ref = clean(options.ref) || `B30-FOLLOW-${date.replaceAll("-", "")}`;
  const rows = parseRows(text)
    .map((row, index) => enrichRow(row, { date, index }))
    .filter((row) => row.client)
    .sort((left, right) => right.priority - left.priority || left.client.localeCompare(right.client))
    .slice(0, boundedLimit(options.limit));
  return {
    date,
    buyer,
    ref,
    price: WORKFIX_OFFER.price,
    rows,
    markdown: buildMarkdown({ date, buyer, ref, rows }),
    csv: buildCsv(rows),
    sendText: buildSendText(rows)
  };
}

export function formatWorkfixFollowupPack(pack) {
  return [
    "# Workfix follow-up delivery",
    "",
    `Date: ${pack.date}`,
    `Buyer: ${pack.buyer}`,
    `Ref: ${pack.ref}`,
    `Price basis: ${formatKrw(pack.price)} Workfix Sprint`,
    `Prepared contacts: ${pack.rows.length}`,
    "",
    "## Delivery note",
    pack.markdown,
    "",
    "## Send blocks",
    pack.sendText || "No send blocks.",
    "",
    "## Action CSV",
    "```csv",
    pack.csv,
    "```"
  ].join("\n");
}

export function workfixFollowupFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-workfix-followup-${date}.md`, content: `${formatWorkfixFollowupPack(pack)}\n` },
    { name: `brief30-workfix-followup-send-${date}.txt`, content: `${pack.sendText}\n` },
    { name: `brief30-workfix-followup-actions-${date}.csv`, content: `${pack.csv}\n` }
  ];
}

function parseRows(text) {
  const lines = String(text || "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = headerCells(lines[0]);
  if (header) return lines.slice(1).map((line) => rowFromHeader(header, line));
  return lines.map(rowFromLine);
}

function rowFromHeader(header, line) {
  const cells = parseCsvLine(line);
  const row = Object.fromEntries(header.map((name, index) => [name, cells[index] || ""]));
  return {
    client: clean(row.client || row.name || row.buyer || row.contact),
    context: clean(row.context || row.note || row.notes || row.pain),
    segment: clean(row.segment || row.persona || row.role || row.company),
    channel: clean(row.channel || row.source || row.relation),
    lastTouch: clean(row.last_touch || row.lasttouch || row.status),
    nextStep: clean(row.next_step || row.nextstep || row.output || row.ask),
    blocker: clean(row.blocker || row.risk || row.issue),
    owner: clean(row.owner || row.manager),
    due: clean(row.due || row.next_touch || row.deadline),
    tone: clean(row.tone)
  };
}

function rowFromLine(line) {
  const cells = line.includes("|") ? line.split("|").map(clean) : parseCsvLine(line);
  const [client, segment, channel, ...rest] = cells;
  return {
    client: clean(client),
    segment: clean(segment),
    channel: clean(channel),
    context: clean(rest.join(" ")),
    lastTouch: "",
    nextStep: "",
    blocker: "",
    owner: "",
    due: "",
    tone: ""
  };
}

function enrichRow(row, context) {
  const due = row.due || addDays(context.date, context.index % 3);
  const pain = classifyPain([row.context, row.nextStep, row.blocker].join(" "));
  const priority = scoreRow(row, due, context.date);
  const ask = row.nextStep || defaultAsk(pain);
  const subject = `${row.client}님, ${pain} 관련 다음 단계만 짧게 확인드립니다`;
  const email = [
    `${row.client}님, 안녕하세요.`,
    "",
    `${row.context || "지난 논의"} 기준으로 다음 단계가 끊기지 않게 짧게 정리드립니다.`,
    `- 확인할 것: ${ask}`,
    `- 제가 준비할 것: ${deliveryLine(pain)}`,
    row.blocker ? `- 막힌 부분: ${row.blocker}` : "",
    "",
    "가능하시면 샘플 1개나 현재 상태만 보내주세요. 그 기준으로 바로 다음 초안을 정리하겠습니다."
  ].filter(Boolean).join("\n");
  const dm = `${row.client}님, ${pain} 건 다음 단계만 확인드려요. ${ask} 가능하시면 샘플 1개만 보내주세요.`;
  return {
    ...row,
    due,
    pain,
    priority,
    subject,
    email,
    dm,
    action: `${row.owner || "owner"}: ${ask}`,
    proof: `${row.client} follow-up draft + action row`
  };
}

function buildMarkdown({ date, buyer, ref, rows }) {
  return [
    `${buyer}님 Workfix Sprint 납품 초안입니다.`,
    `Ref: ${ref}`,
    `Date: ${date}`,
    "",
    "### 오늘 처리 순서",
    ...(rows.length ? rows.map((row, index) => `${index + 1}. ${row.client} / priority ${row.priority} / due ${row.due} / ${row.pain}`) : ["처리할 행이 없습니다."]),
    "",
    "### 인수 기준",
    "- 각 고객별 발송문 1개와 짧은 DM 1개가 있어야 합니다.",
    "- 내부 액션 CSV에는 담당자, 마감, 다음 단계가 있어야 합니다.",
    "- 입금/증빙 확인 전에는 매출로 집계하지 않습니다."
  ].join("\n");
}

function buildSendText(rows) {
  return rows.map((row, index) => [
    `## ${index + 1}. ${row.client}`,
    `Subject: ${row.subject}`,
    "",
    row.email,
    "",
    `DM: ${row.dm}`
  ].join("\n")).join("\n\n");
}

function buildCsv(rows) {
  return [
    ["rank", "priority", "client", "segment", "channel", "due", "owner", "pain", "action", "proof"],
    ...rows.map((row, index) => [
      index + 1,
      row.priority,
      row.client,
      row.segment,
      row.channel,
      row.due,
      row.owner,
      row.pain,
      row.action,
      row.proof
    ])
  ].map((row) => row.map((cell) => csvCell(String(cell ?? ""))).join(",")).join("\n");
}

function classifyPain(text) {
  if (/메일|email|고객|follow|후속/iu.test(text)) return "고객 후속 연락";
  if (/회의|미팅|메모|액션/iu.test(text)) return "미팅 후 액션 정리";
  if (/보고|업데이트|리포트|공유/iu.test(text)) return "상태 업데이트";
  if (/리스크|지연|막힘|block/iu.test(text)) return "리스크 확인";
  return "다음 단계 확인";
}

function defaultAsk(pain) {
  return {
    "고객 후속 연락": "최근 대화 맥락과 원하는 답변 방향 확인",
    "미팅 후 액션 정리": "결정사항과 담당자 확인",
    "상태 업데이트": "이번 주 진척과 다음 마감 확인",
    "리스크 확인": "막힌 원인과 필요한 지원 확인",
    "다음 단계 확인": "다음으로 진행할 1가지 확인"
  }[pain] || "다음으로 진행할 1가지 확인";
}

function deliveryLine(pain) {
  return {
    "고객 후속 연락": "발송 가능한 후속 메일과 짧은 DM",
    "미팅 후 액션 정리": "액션 리스트와 담당자별 follow-up",
    "상태 업데이트": "고객 공유용 업데이트 초안",
    "리스크 확인": "리스크 설명과 선택지 정리",
    "다음 단계 확인": "짧은 확인 메시지와 액션 행"
  }[pain] || "짧은 확인 메시지와 액션 행";
}

function scoreRow(row, due, date) {
  const text = [row.context, row.nextStep, row.blocker, row.segment, row.channel].join(" ");
  const value = /(대표|팀장|컨설턴트|에이전시|창업자|client|고객)/iu.test(text) ? 32 : 12;
  const urgency = daysUntil(due, date) <= 0 ? 30 : daysUntil(due, date) <= 1 ? 20 : 8;
  const risk = row.blocker || /리스크|지연|급|마감|막힘/iu.test(text) ? 24 : 8;
  const warmth = /(previous|기존|거래|referral|소개)/iu.test(text) ? 18 : 6;
  return value + urgency + risk + warmth;
}

function headerCells(line) {
  const cells = parseCsvLine(line).map((cell) => clean(cell).toLowerCase().replaceAll(" ", "_"));
  return cells.some((cell) => ["client", "name", "buyer", "contact"].includes(cell)) ? cells : null;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (const char of String(line || "")) {
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

function daysUntil(due, date) {
  const dueTime = Date.parse(`${due}T00:00:00Z`);
  const nowTime = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(dueTime) || !Number.isFinite(nowTime)) return 7;
  return Math.round((dueTime - nowTime) / 86400000);
}

function addDays(date, days) {
  const [year, month, day] = String(date || today()).split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function boundedLimit(value) {
  return Math.max(1, Math.min(30, Number(value || 12)));
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
