import { csvCell, formatKrw } from "./model.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

export const WORKFIX_OFFER = {
  label: "300,000원 Workfix Sprint",
  price: 300000,
  delivery: "반복 업무 1개를 24시간 안에 실행 가능한 작은 도구/스크립트/템플릿으로 납품",
  proof: "시연 영상 또는 before/after 결과물, 실행 파일/HTML/스크립트, 인수인계 노트"
};

export function buildWorkfixSprintPack(text = "", options = {}) {
  const date = options.date || today();
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const targets = parseTargets(text);
  const rows = targets
    .map((target, index) => enrichTarget(target, { date, publicUrl, paymentRoute, index }))
    .filter((row) => row.name)
    .sort((left, right) => right.score - left.score)
    .slice(0, boundedLimit(options.limit));
  return {
    date,
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    parsed: targets.length,
    rows,
    closeRunText: closeRun(rows[0], { date, publicUrl, paymentRoute }),
    oneBuyerText: oneBuyerClose(rows[0], { date, publicUrl, paymentRoute }),
    messageText: rows.map((row, index) => [`## ${index + 1}. ${row.name}`, row.message].join("\n")).join("\n\n"),
    operatorCsv: operatorCsv(rows, date),
    commandCsv: commandCsv(rows, date)
  };
}

export function formatWorkfixSprintPack(pack) {
  return [
    "# Brief30 Workfix Sprint pack",
    "",
    `Date: ${pack.date}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Parsed targets: ${pack.parsed}`,
    `Prepared asks: ${pack.rows.length}`,
    `One close target: ${WORKFIX_OFFER.label}`,
    "",
    "## Priority targets",
    ...(pack.rows.length ? pack.rows.slice(0, 8).map((row, index) => `${index + 1}. ${row.name} / ${row.segment} / score ${row.score} / ${row.pain}`) : ["No targets."]),
    "",
    "## First close run",
    pack.closeRunText || "No first target.",
    "",
    "## One-buyer send packet",
    pack.oneBuyerText || "No first target.",
    "",
    "## Copy block",
    pack.messageText || "보낼 대상이 없습니다.",
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
    "Revenue only counts after `money:paid` verifies current-month paid evidence."
  ].join("\n");
}

export function workfixSprintFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-workfix-sprint-${date}.md`, content: `${formatWorkfixSprintPack(pack)}\n` },
    { name: `brief30-workfix-sprint-close-${date}.txt`, content: `${pack.closeRunText}\n` },
    { name: `brief30-workfix-sprint-one-buyer-${date}.txt`, content: `${pack.oneBuyerText}\n` },
    { name: `brief30-workfix-sprint-messages-${date}.txt`, content: `${pack.messageText}\n` },
    { name: `brief30-workfix-sprint-import-${date}.csv`, content: `${pack.operatorCsv}\n` },
    { name: `brief30-workfix-sprint-commands-${date}.csv`, content: `${pack.commandCsv}\n` }
  ];
}

function parseTargets(text) {
  const lines = String(text || "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const header = headerCells(lines[0]);
  if (header) return lines.slice(1).map((line) => targetFromHeader(header, line)).filter(Boolean);
  return lines.map(targetFromLine).filter(Boolean);
}

function targetFromHeader(header, line) {
  const cells = parseCsvLine(line);
  const row = Object.fromEntries(header.map((name, index) => [name, cells[index] || ""]));
  return {
    name: clean(row.name || row.buyer || row.contact),
    segment: clean(row.segment || row.persona || row.role),
    source: clean(row.source || row.channel || row.relation),
    note: clean(row.note || row.notes || row.pain || row.context)
  };
}

function targetFromLine(line) {
  const cells = line.includes("|") ? line.split("|").map(clean) : parseCsvLine(line);
  const [name, segment, source, ...note] = cells;
  return {
    name: clean(name),
    segment: clean(segment),
    source: clean(source),
    note: clean(note.join(" "))
  };
}

function enrichTarget(target, context) {
  const combined = [target.name, target.segment, target.source, target.note].join(" ");
  const pain = classifyPain(combined);
  const ref = `B30-WORKFIX-${context.date.replaceAll("-", "")}-${String(context.index + 1).padStart(2, "0")}`;
  const row = {
    ...target,
    pain,
    ref,
    score: scoreTarget(combined),
    dealRoomUrl: publicUrl(context.publicUrl, "dealroom/index.html", { offer: "workfix", buyer: target.name, company: target.segment, useCase: pain, ref }),
    invoiceUrl: publicUrl(context.publicUrl, "invoice/index.html", { offer: "workfix", buyer: target.name, company: target.segment, useCase: pain, ref, date: context.date }),
    orderUrl: publicUrl(context.publicUrl, "order/index.html", {
      offer: "workfix",
      buyer: target.name,
      company: target.segment,
      useCase: pain,
      intentStatus: context.paymentRoute ? "approved_pending_payment" : "payment_route_needed",
      memo: target.note,
      ref
    }),
    sampleUrl: publicUrl(context.publicUrl, "fulfillment/index.html", { offer: "workfix", buyer: target.name, ref })
  };
  return { ...row, message: messageFor(row, context) };
}

function messageFor(target, context) {
  const routeLine = context.paymentRoute
    ? `진행 시 결제/입금 안내: ${context.paymentRoute}`
    : "진행 의사만 주시면 결제 루트를 붙여 보내겠습니다.";
  return [
    `${target.name}님, 보고서 도구 말고 더 직접적인 걸 하나 제안드려요.`,
    "",
    `${target.pain}처럼 반복되는 업무가 있으면 300,000원 Workfix Sprint로 24시간 안에 작은 자동화 산출물까지 만들어드립니다.`,
    `범위: ${WORKFIX_OFFER.delivery}`,
    `납품물: ${WORKFIX_OFFER.proof}`,
    `금액: ${formatKrw(WORKFIX_OFFER.price)}`,
    `참고 허브: ${context.publicUrl}`,
    `개인 진행룸: ${target.dealRoomUrl}`,
    `청구/결제 메모: ${target.invoiceUrl}`,
    `주문/결제 정보 요청: ${target.orderUrl}`,
    `납품 작업대: ${target.sampleUrl}`,
    routeLine,
    "",
    "가능한 첫 입력은 딱 3개면 됩니다: 현재 반복 업무, 샘플 파일/문장 1개, 원하는 결과 형태.",
    "원하시면 고객 후속 메일/액션 CSV 샘플 납품물도 바로 보여드릴 수 있습니다.",
    `내부 승인/추적번호: ${target.ref}`
  ].join("\n");
}

function operatorCsv(rows, date) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    ...rows.map((row) => [
      row.name,
      "contacted",
      "workfix",
      addDays(date, 1),
      `workfix sprint / ${row.segment} / ${row.source} / ${row.pain} / ${row.ref}`
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function commandCsv(rows, date) {
  return [
    ["name", "type", "command"],
    ...rows.flatMap((row) => [
      [row.name, "buyer_room", row.dealRoomUrl],
      [row.name, "invoice_url", row.invoiceUrl],
      [row.name, "payment_invoice", `npm run payment:invoice -- --buyer="${quote(row.name)}" --company="${quote(row.segment || "OO팀")}" --offer=workfix --use-case="${quote(row.pain)}" --date=${date} --ref=${row.ref} --out=outreach/generated`],
      [row.name, "delivery_sample", `npm run fulfill:workfix-followup -- --file=outreach/prospect-seed.csv --buyer="${quote(row.name)}" --ref=${row.ref} --date=${date} --limit=8 --out=outreach/generated`],
      [row.name, "money_paid", buildMoneyPaidCommand({ month: date.slice(0, 7) })]
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function closeRun(row, context) {
  if (!row) return "";
  const paymentStep = context.paymentRoute
    ? `결제 안내 포함: ${context.paymentRoute}`
    : "결제 루트 없음: 진행 의사를 받으면 즉시 `prepare:seller -- --workfix=...` 또는 실제 계좌를 설정한 뒤 청구하세요.";
  return [
    `Target: ${row.name} / ${row.segment || "segment missing"} / score ${row.score}`,
    `Pain: ${row.pain}`,
    `Ref: ${row.ref}`,
    `Payment: ${paymentStep}`,
    "",
    "Send now:",
    row.message,
    "",
    "If they reply yes:",
    `1. Send personal room: ${row.dealRoomUrl}`,
    `2. Run: npm run payment:invoice -- --buyer="${quote(row.name)}" --company="${quote(row.segment || "OO팀")}" --offer=workfix --use-case="${quote(row.pain)}" --date=${context.date} --ref=${row.ref} --out=outreach/generated`,
    `3. If they ask for proof, run: npm run fulfill:workfix-followup -- --file=outreach/prospect-seed.csv --buyer="${quote(row.name)}" --ref=${row.ref} --date=${context.date} --limit=8 --out=outreach/generated`,
    "4. Ask for 3 inputs: repeated workflow, one sample input, desired output shape.",
    "5. After payment proof arrives, run the money_paid command from the command CSV.",
    "",
    "2-hour follow-up:",
    `${row.name}님, 이건 큰 시스템 구축이 아니라 오늘 반복 업무 하나만 24시간 안에 작게 자동화하는 제안입니다. 가능하면 샘플 1개만 보내주세요. 맞지 않으면 보류라고 답 주셔도 괜찮습니다.`,
    "",
    "Stop rule:",
    "Do not count this as revenue until payment proof is processed by money:paid."
  ].join("\n");
}

function oneBuyerClose(row, context) {
  if (!row) return "";
  return [
    `[Brief30 Workfix one-buyer packet] ${row.ref}`,
    "",
    "Send this first:",
    row.message,
    "",
    "Buyer links:",
    `- Personal room: ${row.dealRoomUrl}`,
    `- Invoice memo: ${row.invoiceUrl}`,
    `- Order/payment request: ${row.orderUrl}`,
    `- Fulfillment desk: ${row.sampleUrl}`,
    "",
    context.paymentRoute
      ? `Payment route already detected: ${context.paymentRoute}`
      : "Payment route missing: configure Workfix checkout or direct payment before sending a final payment request.",
    "",
    "Operator next:",
    `1. Proof sample: npm run fulfill:workfix-followup -- --file=outreach/prospect-seed.csv --buyer="${quote(row.name)}" --ref=${row.ref} --date=${context.date} --limit=8 --out=outreach/generated`,
    `2. Invoice pack: npm run payment:invoice -- --buyer="${quote(row.name)}" --company="${quote(row.segment || "OO팀")}" --offer=workfix --use-case="${quote(row.pain)}" --date=${context.date} --ref=${row.ref} --out=outreach/generated`,
    "3. Count revenue only after money:paid verifies current-month payment proof."
  ].join("\n");
}

function classifyPain(text) {
  if (/csv|엑셀|excel|sheet|정산|집계|분류/iu.test(text)) return "엑셀/CSV 정리와 반복 집계";
  if (/메일|email|고객|follow|후속/iu.test(text)) return "고객 메일/후속 연락 초안 반복";
  if (/회의|미팅|녹취|메모/iu.test(text)) return "회의 메모를 액션/보고로 바꾸는 반복";
  if (/보고|업데이트|브리핑|weekly|주간/iu.test(text)) return "주간 업데이트와 보고 문안 작성";
  if (/스크래핑|수집|리서치|검색/iu.test(text)) return "웹 리서치/자료 수집 반복";
  return "반복 업무 하나를 도구화하는 작업";
}

function scoreTarget(text) {
  const warm = /(previous|기존|거래|동료|소개|추천|referral)/iu.test(text) ? 36 : 14;
  const budget = /(대표|팀장|리드|manager|PM|컨설턴트|에이전시|창업자)/iu.test(text) ? 28 : 10;
  const pain = /(반복|매주|보고|회의|고객|csv|엑셀|메일|자동|정리|리서치)/iu.test(text) ? 34 : 12;
  const urgency = /(오늘|이번주|급|마감|바로|24)/iu.test(text) ? 18 : 0;
  return warm + budget + pain + urgency;
}

function headerCells(line) {
  const cells = parseCsvLine(line).map((cell) => clean(cell).toLowerCase().replaceAll(" ", "_"));
  return cells.some((cell) => ["name", "buyer", "contact"].includes(cell)) ? cells : null;
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

function boundedLimit(value) {
  return Math.max(1, Math.min(20, Number(value || 10)));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function publicUrl(root, path, values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value)) params.set(key, value);
  });
  const query = params.toString();
  return `${normalizeRoot(root)}${path}${query ? `?${query}` : ""}`;
}

function addDays(date, days) {
  const [year, month, day] = String(date || today()).split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function quote(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
