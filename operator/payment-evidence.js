import { OFFERS, csvCell, formatKrw, normalizeOffer } from "./model.js";

const FIELD_KEYS = {
  buyer: ["buyer", "name", "구매자", "입금자", "주문자", "이름", "보낸사람"],
  offer: ["offer", "product", "상품", "플랜", "옵션"],
  amount: ["amount", "price", "금액", "입금액", "결제금액"],
  ref: ["ref", "order_ref", "payment_ref", "주문번호", "거래번호", "입금메모", "메모"],
  contact: ["contact", "email", "phone", "연락처", "이메일"],
  useCase: ["use_case", "usecase", "용도", "사용처", "업무"],
  paymentRoute: ["payment_route", "route", "결제수단", "입금계좌"],
  paidAt: ["paid_at", "date", "paid", "입금일", "결제일", "날짜"]
};

export function buildPaymentEvidencePack(text = "", options = {}) {
  const blocks = splitPaymentBlocks(text);
  const rows = blocks.map((block, index) => parsePaymentBlock(block, index, options)).filter((row) => row.hasSignal);
  const ready = rows.filter((row) => !row.issues.length);
  const review = rows.filter((row) => row.issues.length);
  return {
    source: options.source || "",
    date: options.date || today(),
    rows,
    ready,
    review,
    evidenceCsv: buildEvidenceCsv(ready)
  };
}

export function formatPaymentEvidencePack(pack) {
  return [
    "# Brief30 payment evidence",
    "",
    `Source: ${pack.source || "stdin"}`,
    `Parsed rows: ${pack.rows.length}`,
    `Ready evidence rows: ${pack.ready.length}`,
    `Needs review: ${pack.review.length}`,
    `Ready total: ${formatKrw(pack.ready.reduce((sum, row) => sum + row.amount, 0))}`,
    "",
    "## Ready evidence CSV",
    "```csv",
    pack.evidenceCsv,
    "```",
    "",
    "## Needs review",
    ...reviewLines(pack.review),
    "",
    "## Next",
    "1. Save the ready CSV.",
    "2. Run `npm run ledger:merge -- path/to/ledger.csv path/to/payment-evidence.csv --out=path/to/ledger.csv`.",
    "3. Run `npm run audit:revenue -- path/to/ledger.csv`."
  ].join("\n");
}

export function paymentEvidenceFiles(pack) {
  const date = String(pack.date || today());
  return [
    {
      name: `brief30-payment-evidence-report-${date}.md`,
      content: `${formatPaymentEvidencePack(pack)}\n`
    },
    {
      name: `brief30-payment-evidence-${date}.csv`,
      content: `${pack.evidenceCsv}\n`
    }
  ];
}

function parsePaymentBlock(block, index, options) {
  const fields = extractFields(block);
  const amount = parseAmount(fields.amount || block);
  const offer = parseOffer(fields.offer || block, amount);
  const row = {
    index: index + 1,
    raw: block,
    buyer: clean(fields.buyer) || inferBuyer(block),
    offer,
    amount,
    ref: clean(fields.ref) || inferRef(block),
    contact: clean(fields.contact),
    useCase: clean(fields.useCase),
    paymentRoute: clean(fields.paymentRoute) || clean(options.paymentRoute),
    paidAt: parseDate(fields.paidAt || block) || clean(options.date),
    hasSignal: hasPaymentSignal(block, fields)
  };
  row.issues = paymentIssues(row);
  return row;
}

function splitPaymentBlocks(text) {
  const blocks = String(text || "").split(/\n\s*\n/u).map((block) => block.trim()).filter(Boolean);
  return blocks.flatMap((block) => {
    if (hasFieldLabels(block)) return splitLabeledBlock(block);
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.length > 1 ? lines : [block];
  });
}

function splitLabeledBlock(block) {
  const groups = [];
  let current = [];
  for (const line of block.split("\n").map((item) => item.trim()).filter(Boolean)) {
    if (lineHasLabel(line)) {
      current.push(line);
      continue;
    }
    if (current.length) {
      groups.push(current.join("\n"));
      current = [];
    }
    groups.push(line);
  }
  if (current.length) groups.push(current.join("\n"));
  return groups;
}

function extractFields(block) {
  const output = {};
  for (const rawLine of block.split("\n")) {
    const match = rawLine.match(/^\s*([^:=：]+)\s*[:=：]\s*(.+?)\s*$/u);
    if (!match) continue;
    const key = canonicalKey(match[1]);
    if (key) output[key] = match[2].trim();
  }
  return output;
}

function canonicalKey(value) {
  const key = String(value || "").trim().toLowerCase().replaceAll(" ", "_");
  return Object.entries(FIELD_KEYS).find(([, aliases]) => aliases.includes(key))?.[0] || "";
}

function hasFieldLabels(block) {
  return block.split("\n").some(lineHasLabel);
}

function lineHasLabel(line) {
  return Boolean(canonicalKey(String(line || "").split(/[:=：]/u)[0]));
}

function hasPaymentSignal(block, fields) {
  return Boolean(fields.buyer || fields.ref || fields.amount || /\bB30-[A-Z0-9-]+\b/u.test(block) || parseAmount(block));
}

function parseAmount(value) {
  let text = String(value || "");
  text = text.replace(/\d{4}[-./년]\s*\d{1,2}[-./월]\s*\d{1,2}일?/gu, " ");
  text = text.replace(/\bB30-[A-Z0-9-]+\b/gu, " ");
  const match = text.match(/(?:₩|KRW\s*)?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:원|krw)/iu) || text.match(/\b(19000|49000|99000|300000)\b/u);
  return match ? Number(match[1].replace(/[^\d]/gu, "")) : 0;
}

function parseOffer(value, amount) {
  const text = String(value || "").toLowerCase();
  if (text.includes("workfix") || text.includes("자동화") || text.includes("워크픽스")) return "workfix";
  if (text.includes("team") || text.includes("팀") || text.includes("스프린트")) return "team";
  if (text.includes("service") || text.includes("대행")) return "service";
  if (text.includes("self") || text.includes("셀프")) return "self";
  if (text.includes("setup") || text.includes("셋업")) return "setup";
  const exact = Object.entries(OFFERS).find(([, offer]) => offer.price === amount);
  return exact?.[0] || "";
}

function inferRef(block) {
  const text = String(block || "");
  return (
    text.match(/\bB30-[A-Z0-9-]+\b/u)?.[0] ||
    text.match(/(?:주문번호|거래번호|입금메모|메모|ref)\s*[:=：]?\s*([A-Za-z0-9_-]{4,})/iu)?.[1] ||
    ""
  );
}

function inferBuyer(block) {
  let text = String(block || "");
  text = text.replace(/\d{4}[-./년]\s*\d{1,2}[-./월]\s*\d{1,2}일?/gu, " ");
  text = text.replace(/\bB30-[A-Z0-9-]+\b/gu, " ");
  text = text.replace(/\d{1,3}(?:,\d{3})+|\d{4,6}\s*원?/gu, " ");
  text = text.replace(/workfix|service|setup|self|team|자동화|워크픽스|대행팩?|셋업팩?|셀프툴?|팀|스프린트/giu, " ");
  const tokens = text.split(/\s+/u).map(clean).filter((token) => token && !/입금|결제|완료|원|krw/iu.test(token));
  return tokens.slice(0, 2).join(" ");
}

function parseDate(value) {
  const text = String(value || "");
  const numeric = text.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/u);
  if (numeric) return dateString(numeric[1], numeric[2], numeric[3]);
  const korean = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/u);
  if (korean) return dateString(korean[1], korean[2], korean[3]);
  return "";
}

function dateString(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function paymentIssues(row) {
  return [
    !row.paidAt ? "paid_at" : "",
    !row.buyer ? "buyer" : "",
    !row.offer ? "offer" : "",
    row.amount <= 0 ? "amount" : "",
    !row.ref ? "ref" : ""
  ].filter(Boolean);
}

function buildEvidenceCsv(rows) {
  return [
    "ref,buyer,offer,amount,contact,use_case,payment_route,date",
    ...rows.map((row) => [
      row.ref,
      row.buyer,
      OFFERS[normalizeOffer(row.offer)]?.label || row.offer,
      row.amount,
      row.contact,
      row.useCase,
      row.paymentRoute,
      row.paidAt
    ].map(csvCell).join(","))
  ].join("\n");
}

function reviewLines(rows) {
  if (!rows.length) return ["- 없음"];
  return rows.map((row) => {
    const preview = row.raw.replace(/\s+/gu, " ").slice(0, 80);
    return `- row ${row.index}: ${row.issues.join(", ")} / ${preview}`;
  });
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
