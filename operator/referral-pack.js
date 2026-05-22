import { buildContactPack } from "./contact-pack.js";
import { formatKrw, csvCell, OFFERS } from "./model.js";
import { parseActionLeads } from "./sales-action.js";

const ADVOCATE_STATUS = {
  closed: 80,
  tester: 64,
  replied: 48,
  contacted: 20
};

const SOURCE_BOOST = {
  previous_client: 24,
  referral: 18,
  direct_dm: 8,
  community: 4,
  social_post: 3
};

export function buildReferralPack(ledgerText = "", options = {}) {
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const date = options.date || today();
  const limit = boundedLimit(options.limit);
  const offer = normalizeOffer(options.offer || "service");
  const leads = parseActionLeads(ledgerText);
  const advocates = rankAdvocates(leads).slice(0, limit);
  const normalizedReferrals = normalizeReferralText(options.referralText || "");
  const referralContacts = buildContactPack(normalizedReferrals, {
    ledgerText,
    publicUrl,
    date,
    offer,
    source: options.referralSource || "",
    ledgerSource: options.source || ""
  });

  return {
    source: options.source || "",
    referralSource: options.referralSource || "",
    date,
    publicUrl,
    offer,
    leads,
    advocates,
    askMessages: advocates.map((lead) => askMessage(lead, publicUrl, offer)),
    referralContacts,
    expectedReferralValue: estimateReferralValue(referralContacts.contacts),
    advocateUpdateCsv: buildAdvocateUpdateCsv(advocates, date),
    referralText: normalizedReferrals
  };
}

export function formatReferralPack(pack) {
  return [
    "# Brief30 referral pack",
    "",
    `Date: ${pack.date}`,
    `Ledger: ${pack.source || "stdin"}`,
    `Referral input: ${pack.referralSource || "none"}`,
    `Public URL: ${pack.publicUrl}`,
    `Focus offer: ${OFFERS[pack.offer]?.label || pack.offer}`,
    `Advocates: ${pack.advocates.length}`,
    `Ready referral sends: ${pack.referralContacts.rows.length}`,
    `Expected referral value: ${formatKrw(pack.expectedReferralValue)}`,
    "",
    "## Ask these people",
    ...askBlocks(pack),
    "",
    "## Referral intro sends",
    pack.referralContacts.messages || "아직 받은 소개명이 없습니다.",
    "",
    "## Referral import CSV",
    "```csv",
    pack.referralContacts.operatorCsv,
    "```",
    "",
    "## Advocate update CSV",
    "```csv",
    pack.advocateUpdateCsv,
    "```",
    "",
    "## Commands",
    ...commandLines(pack)
  ].join("\n");
}

export function referralPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-referral-pack-${date}.md`, content: `${formatReferralPack(pack)}\n` },
    { name: `brief30-referral-asks-${date}.txt`, content: `${pack.askMessages.join("\n\n")}\n` },
    { name: `brief30-referral-import-${date}.csv`, content: `${pack.referralContacts.operatorCsv}\n` },
    { name: `brief30-referral-advocate-updates-${date}.csv`, content: `${pack.advocateUpdateCsv}\n` }
  ];
}

function rankAdvocates(leads) {
  const warm = [...leads]
    .filter((lead) => ["closed", "tester", "replied", "contacted"].includes(lead.status))
    .sort((a, b) => advocateScore(b) - advocateScore(a));
  if (warm.length) return warm;
  return [...leads]
    .filter((lead) => !["closed", "lost"].includes(lead.status))
    .filter((lead) => ["previous_client", "referral", "direct_dm"].includes(lead.source))
    .sort((a, b) => advocateScore(b) - advocateScore(a));
}

function advocateScore(lead) {
  const offerBoost = lead.offer === "team" ? 28 : lead.offer === "service" ? 18 : lead.offer === "setup" ? 10 : 4;
  return (ADVOCATE_STATUS[lead.status] || 0) + (SOURCE_BOOST[lead.source] || 0) + offerBoost;
}

function askMessage(lead, publicUrl, offer) {
  const context = lead.note || lead.segment || "업무 메모 정리";
  if (offer === "team") {
    return [
      `${lead.name}, Brief30 관련해서 팀 예산으로 살 만한 분 한 명만 떠오르는지 여쭤봐도 될까요?`,
      "",
      `${context}처럼 보고/회의록/고객사 업데이트가 팀 단위로 반복되는 곳이면, 300,000원 팀 브리핑 스프린트가 맞습니다.`,
      "회사명/고객명/개인정보를 지운 메모 최대 10개를 받아 4주 브리핑, 회의록, 리스크, 액션 보드로 묶어드립니다.",
      `팀 샘플: ${publicUrl}team/sample.html`,
      `팀 제안 페이지: ${publicUrl}team/index.html`,
      `주문/승인 링크: ${publicUrl}order/index.html?offer=team`,
      "",
      "주간보고나 고객사 업데이트를 승인할 수 있는 팀장/PM/대표님 1명만 떠오르면 성함/팀/상황만 한 줄로 부탁드립니다."
    ].join("\n");
  }
  return [
    `${lead.name}, Brief30 관련해서 하나만 부탁드려도 될까요?`,
    "",
    `${context}처럼 보고/회의록/고객사 업데이트 정리에 시간 쓰는 분이 주변에 1명만 떠오르면 소개 부탁드립니다.`,
    "바로 판매부터 하지 않고, 회사명 지운 메모 1개로 무료 진단 먼저 보여드리겠습니다.",
    `무료 진단: ${publicUrl}diagnostic/index.html`,
    `결과 예시: ${publicUrl}proof/index.html`,
    "",
    "떠오르는 분 성함/채널/업무상황만 한 줄로 주시면 제가 짧게 연락드리겠습니다."
  ].join("\n");
}

function askBlocks(pack) {
  if (!pack.advocates.length) return ["- 소개 요청 후보가 없습니다. 먼저 replied/tester/closed 리드를 만드세요."];
  return pack.advocates.map((lead, index) => [
    `### ${index + 1}. ${lead.name} / ${lead.status} / ${lead.source}`,
    "",
    pack.askMessages[index]
  ].join("\n"));
}

function normalizeReferralText(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeReferralLine)
    .join("\n");
}

function normalizeReferralLine(line) {
  const arrow = line.match(/^(.+?)\s*(?:->|=>|→)\s*([^|,\t]+)\s*(?:[|,\t]\s*(.*))?$/u);
  if (arrow) {
    return `${clean(arrow[2])} | ${clean(arrow[1])} 소개 | ${clean(arrow[3])}`;
  }
  const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
  const cells = line.split(separator).map(clean);
  if (cells.length >= 3) {
    return `${cells[1]} | ${cells[0]} 소개 | ${cells.slice(2).join(" ")}`;
  }
  if (cells.length === 2) {
    return `${cells[0]} | 소개 | ${cells[1]}`;
  }
  return `${line} | 소개 | 보고/회의록 정리 후보`;
}

function estimateReferralValue(contacts) {
  return contacts.reduce((sum, item) => sum + (OFFERS[item.offer]?.price || OFFERS.setup.price), 0);
}

function buildAdvocateUpdateCsv(advocates, date) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    ...advocates.map((lead) => [
      lead.name,
      advocateUpdateStatus(lead),
      lead.offer,
      addDays(date, 2),
      `referral ask sent / ${lead.note || ""}`.trim()
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function advocateUpdateStatus(lead) {
  return lead.status === "prospect" ? "contacted" : lead.status;
}

function commandLines(pack) {
  const base = [
    `npm run plan:referrals -- path/to/ledger.csv --url=${pack.publicUrl} --referrals=path/to/referrals.txt --out=outreach/generated`,
    `npm run plan:contacts -- path/to/referrals.txt --ledger=path/to/ledger.csv --url=${pack.publicUrl} --out=outreach/generated`,
    "npm run ops:close -- path/to/ledger.csv --replies=path/to/replies.txt --payments=path/to/payment-text.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated"
  ];
  if (pack.offer === "team") {
    return [
      base[0].replace("--out=outreach/generated", "--offer=team --out=outreach/generated"),
      `npm run plan:team-outreach -- path/to/referrals.txt --url=${pack.publicUrl} --out=outreach/generated`,
      `npm run plan:procurement -- --buyer=김PM --company=OO팀 --approver=이팀장 --use-case=팀주간보고 --url=${pack.publicUrl} --out=outreach/generated`,
      base[2]
    ];
  }
  return base;
}

function normalizeOffer(value) {
  return OFFERS[value] ? value : "service";
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
  return Math.max(1, Math.min(20, Number(value || 8)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
