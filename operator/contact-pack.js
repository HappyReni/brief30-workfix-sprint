import { buildAllMessages, buildOperatorCsv, buildOutboxRows, normalizeUrls } from "../outbox/messages.js";
import { parseActionLeads } from "./sales-action.js";
import { csvCell } from "./model.js";

const SEGMENT_RULES = [
  { key: "agency", label: "에이전시", role: "프로젝트 매니저", pain: "고객사 상태 보고", offer: "service", pattern: /(에이전시|대행사|고객사|어카운트|콘텐츠|CS)/u },
  { key: "consultant", label: "컨설턴트", role: "컨설턴트", pain: "클라이언트 미팅", offer: "service", pattern: /(컨설|자문|PMO|리서치|프로젝트)/u },
  { key: "freelancer", label: "프리랜서", role: "프리랜서", pain: "고객사 업데이트", offer: "service", pattern: /(프리랜서|1인|외주|디자이너|개발자|마케터)/u },
  { key: "founder", label: "창업자", role: "창업자", pain: "팀 업데이트", offer: "setup", pattern: /(대표|창업|스타트업|사업개발|투자자)/u },
  { key: "office", label: "직장인", role: "팀 리드", pain: "주간보고", offer: "setup", pattern: /(회사|팀|PM|기획|운영|보고|회의록|메일)/iu }
];

const SOURCE_RULES = [
  { key: "previous_client", pattern: /(기존|거래|고객|동료|전 직장|예전|이전|같이)/u },
  { key: "referral", pattern: /(소개|추천|지인|친구|아는 분|연결)/u },
  { key: "community", pattern: /(커뮤니티|카페|오픈채팅|댓글|게시글)/u },
  { key: "social_post", pattern: /(SNS|소셜|링크드인|블로그|포스트|트위터|스레드)/iu },
  { key: "direct_dm", pattern: /./u }
];

export function buildContactPack(text = "", options = {}) {
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const existing = existingNames(options.ledgerText || "");
  const parsed = parseContacts(text);
  const contacts = parsed
    .map((item) => enrichContact(item, options))
    .filter((item) => item.name && !existing.has(key(item.name)))
    .sort((a, b) => b.score - a.score)
    .slice(0, boundedLimit(options.limit));
  const rows = buildOutboxRows(contacts, [], normalizeUrls(publicUrl));

  return {
    source: options.source || "",
    ledgerSource: options.ledgerSource || "",
    date: options.date || today(),
    publicUrl,
    parsed: parsed.length,
    skippedExisting: parsed.filter((item) => existing.has(key(item.name))).length,
    contacts,
    rows,
    messages: buildAllMessages(rows),
    operatorCsv: buildOperatorCsv(rows),
    reviewCsv: buildReviewCsv(parsed, existing),
    sourceCounts: countBy(contacts, "source"),
    offerCounts: countBy(contacts, "offer")
  };
}

export function formatContactPack(pack) {
  return [
    "# Brief30 contact pack",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Ledger: ${pack.ledgerSource || "none"}`,
    `Public URL: ${pack.publicUrl}`,
    `Parsed contacts: ${pack.parsed}`,
    `Ready sends: ${pack.rows.length}`,
    `Skipped existing: ${pack.skippedExisting}`,
    "",
    "## Offer mix",
    ...mixLines(pack.offerCounts),
    "",
    "## Source mix",
    ...mixLines(pack.sourceCounts),
    "",
    "## First sends",
    ...pack.rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.name} / ${row.offerLabel} / ${row.note}`),
    "",
    "## Copy block",
    pack.messages || "보낼 대상이 없습니다.",
    "",
    "## Operator import CSV",
    "```csv",
    pack.operatorCsv,
    "```",
    "",
    "## Review CSV",
    "```csv",
    pack.reviewCsv,
    "```"
  ].join("\n");
}

export function contactPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-contact-pack-${date}.md`, content: `${formatContactPack(pack)}\n` },
    { name: `brief30-contact-messages-${date}.txt`, content: `${pack.messages}\n` },
    { name: `brief30-contact-import-${date}.csv`, content: `${pack.operatorCsv}\n` },
    { name: `brief30-contact-review-${date}.csv`, content: `${pack.reviewCsv}\n` }
  ];
}

function parseContacts(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = csvHeader(lines[0]);
  if (header) {
    return lines.slice(1).map((line) => contactFromHeader(header, line)).filter(Boolean);
  }
  return lines.map(contactFromLine).filter(Boolean);
}

function contactFromHeader(header, line) {
  const cells = parseLine(line, ",");
  const row = Object.fromEntries(header.map((name, index) => [name, cells[index] || ""]));
  return {
    name: clean(row.name || row.buyer || row.contact),
    relation: clean(row.relation || row.source || row.channel),
    note: clean(row.note || row.pain || row.context || row.memo),
    segment: clean(row.segment),
    source: clean(row.source),
    offer: clean(row.offer)
  };
}

function contactFromLine(line) {
  const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
  const [name, relation, ...rest] = parseLine(line, separator);
  return {
    name: clean(name),
    relation: clean(relation),
    note: clean(rest.join(" ")),
    segment: "",
    source: "",
    offer: ""
  };
}

function enrichContact(contact, options) {
  const text = [contact.name, contact.relation, contact.note].join(" ");
  const segment = segmentFor(contact.segment || text);
  const source = sourceFor(contact.source || contact.relation || text);
  const offer = normalizeOffer(contact.offer || options.offer || offerFor(text, segment.offer));
  const pain = painFor(text, segment.pain);
  return {
    name: contact.name,
    segment: segment.label,
    source,
    offer,
    role: segment.role,
    pain,
    note: [contact.relation, contact.note].filter(Boolean).join(" / ") || `${segment.role} / ${pain}`,
    query: "",
    score: score({ source, offer, text })
  };
}

function csvHeader(line) {
  const cells = parseLine(line, ",").map((cell) => clean(cell).toLowerCase().replaceAll(" ", "_"));
  return cells.includes("name") || cells.includes("contact") || cells.includes("buyer") ? cells : null;
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

function segmentFor(value) {
  return SEGMENT_RULES.find((rule) => rule.pattern.test(value)) || SEGMENT_RULES.at(-1);
}

function sourceFor(value) {
  return SOURCE_RULES.find((rule) => rule.pattern.test(value))?.key || "direct_dm";
}

function offerFor(text, fallback) {
  if (/(대행|맡|바빠|시간 없|결과물|고객사)/u.test(text)) return "service";
  if (/(셀프|혼자|개인|싸게|가격)/u.test(text)) return "self";
  return fallback;
}

function painFor(text, fallback) {
  const match = text.match(/(주간보고|회의록|후속 메일|고객사 업데이트|상태 보고|임원 보고|투자자 공유|작업 로그|프로젝트 리스크)/u);
  return match?.[1] || fallback;
}

function score({ source, offer, text }) {
  const sourceScore = { previous_client: 42, referral: 38, direct_dm: 24, community: 16, social_post: 12 }[source] || 10;
  const offerScore = offer === "team" ? 48 : offer === "service" ? 34 : offer === "setup" ? 20 : 8;
  const painScore = /(매주|자주|반복|바빠|급|오늘|내일|고객사|임원|대표)/u.test(text) ? 16 : 0;
  return sourceScore + offerScore + painScore;
}

function existingNames(text) {
  return new Set(parseActionLeads(text).map((lead) => key(lead.name)).filter(Boolean));
}

function buildReviewCsv(parsed, existing) {
  return [
    ["name", "status", "note"],
    ...parsed.map((item) => [item.name, existing.has(key(item.name)) ? "existing" : item.name ? "ready" : "missing_name", item.note || item.relation])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    acc[item[field]] = (acc[item[field]] || 0) + 1;
    return acc;
  }, {});
}

function mixLines(counts) {
  const rows = Object.entries(counts);
  return rows.length ? rows.map(([keyName, count]) => `- ${keyName}: ${count}`) : ["- none"];
}

function normalizeOffer(value) {
  return ["self", "setup", "service", "team"].includes(value) ? value : "setup";
}

function boundedLimit(value) {
  return Math.max(1, Math.min(80, Number(value || 30)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
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
