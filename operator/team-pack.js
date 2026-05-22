import { csvCell, formatKrw } from "./model.js";
import { buildMoneyPaidCommand, DEFAULT_LEDGER_PATH, revenueProofNote } from "./payment-command.js";
import { buildTeamPage } from "./team-page.js";

export const TEAM_PACKAGE = Object.freeze({
  label: "300,000원 팀 브리핑 스프린트",
  price: 300000,
  ledgerOffer: "team",
  delivery: "팀 업무 메모 최대 10개 정리 + 주간 브리핑 4회 + 실행 액션 보드"
});

export function buildTeamPack(options = {}) {
  const date = clean(options.date) || today();
  const buyer = clean(options.buyer) || "OO님";
  const target = Number(options.target || TEAM_PACKAGE.price);
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const data = {
    buyer,
    company: clean(options.company) || "OO팀",
    approver: clean(options.approver) || "결재권자",
    seller: clean(options.seller) || "Brief30",
    contact: clean(options.contact),
    useCase: clean(options.useCase) || "팀 주간보고/회의록 반복 정리",
    publicUrl,
    sampleUrl: buildUrl(publicUrl, "team/sample.html"),
    paymentRoute: clean(options.paymentRoute),
    deliveryWindow: clean(options.deliveryWindow) || "입금 확인 후 3영업일 내 1차 납품, 4주 내 마감",
    date,
    dueDate: clean(options.due) || addDays(date, 1),
    ref: clean(options.ref) || makeRef(date, buyer),
    target
  };

  return {
    ...data,
    offer: TEAM_PACKAGE,
    routeReady: Boolean(data.paymentRoute),
    oneDealClosesTarget: TEAM_PACKAGE.price >= target,
    dealRoomUrl: buildUrl(data.publicUrl, "dealroom/index.html", {
      ref: data.ref,
      offer: TEAM_PACKAGE.ledgerOffer,
      buyer: data.buyer,
      company: data.company,
      useCase: data.useCase,
      date: data.date
    }),
    orderUrl: buildUrl(data.publicUrl, "order/index.html", { offer: TEAM_PACKAGE.ledgerOffer }),
    intakeUrl: buildUrl(data.publicUrl, "intake/index.html", {
      ref: data.ref,
      offer: TEAM_PACKAGE.ledgerOffer,
      buyer: data.buyer,
      useCase: data.useCase
    }),
    proposalMemo: buildProposalMemo(data),
    approverForward: buildApproverForward(data),
    orderMessage: buildOrderMessage(data),
    proofRequest: buildProofRequest(data),
    buyerProofTemplate: buildBuyerProofTemplate(data),
    updateCsv: buildUpdateCsv(data),
    commandCsv: buildCommandCsv(data)
  };
}

export function formatTeamPack(pack) {
  const page = pack.page || buildTeamPage(pack);
  return [
    "# Brief30 team package",
    "",
    `Buyer: ${pack.buyer}`,
    `Company: ${pack.company}`,
    `Approver: ${pack.approver}`,
    `Offer: ${pack.offer.label}`,
    `Amount: ${formatKrw(pack.offer.price)}`,
    `Target covered by one order: ${pack.oneDealClosesTarget ? "yes" : "no"}`,
    `Payment route: ${pack.routeReady ? pack.paymentRoute : "missing"}`,
    `Ref: ${pack.ref}`,
    `Sample URL: ${pack.sampleUrl}`,
    `Deal room URL: ${pack.dealRoomUrl}`,
    `Page file: ${page.fileName}`,
    `Order URL: ${pack.orderUrl}`,
    `Intake URL: ${pack.intakeUrl}`,
    "",
    "## Proposal memo",
    pack.proposalMemo,
    "",
    "## Approver forward",
    pack.approverForward,
    "",
    "## Order message",
    pack.orderMessage,
    "",
    "## Payment proof request",
    pack.proofRequest,
    "",
    "## Buyer proof reply template",
    pack.buyerProofTemplate,
    "",
    "## Share text",
    page.shareText,
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Next command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    `Do not merge this team pack into revenue. ${revenueProofNote()}`
  ].join("\n");
}

export function teamPackFiles(pack) {
  const base = `brief30-team-pack-${slug(pack.buyer)}-${pack.date}`;
  const page = pack.page || buildTeamPage(pack);
  return [
    { name: page.fileName, content: page.html },
    { name: page.fileName.replace(/\.html$/u, "-share.md"), content: `${page.shareText}\n` },
    { name: `${base}.md`, content: `${formatTeamPack(pack)}\n` },
    { name: `${base}-update.csv`, content: `${pack.updateCsv}\n` },
    { name: `${base}-commands.csv`, content: `${pack.commandCsv}\n` }
  ];
}

function buildProposalMemo(data) {
  return [
    `[Brief30 팀 브리핑 스프린트 제안] ${data.ref}`,
    "",
    `대상: ${data.company} / ${data.buyer}`,
    `가격: ${formatKrw(TEAM_PACKAGE.price)}`,
    `목표 적합성: 한 건 결제 증거만 확보해도 ${formatKrw(data.target)} 목표를 채웁니다.`,
    `사용 목적: ${data.useCase}`,
    `승인 기한: ${data.dueDate}`,
    "",
    "제공 범위:",
    `- ${TEAM_PACKAGE.delivery}`,
    "- 익명화한 업무 메모를 보고서, 회의록, 고객 업데이트, 후속 액션으로 변환",
    "- 30분 킥오프 또는 메시지 기반 자료 접수",
    "- 결과물 검토 후 수정 요청 1회 포함",
    `- 샘플 산출물: ${data.sampleUrl}`,
    `- 개인 진행룸: ${buildUrl(data.publicUrl, "dealroom/index.html", { ref: data.ref, offer: TEAM_PACKAGE.ledgerOffer, buyer: data.buyer, company: data.company, useCase: data.useCase, date: data.date })}`,
    "",
    "운영 기준:",
    "- 회사명, 고객명, 실명, 연락처, 계약 금액 등 민감 정보는 제거한 메모만 받습니다.",
    "- 결과물은 내부 업무 문서 초안이며 최종 검토는 요청자가 진행합니다.",
    "- 실제 결제 확인 전에는 매출로 기록하지 않습니다."
  ].join("\n");
}

function buildApproverForward(data) {
  const paymentLine = data.paymentRoute
    ? `승인되면 결제/입금 안내는 ${data.paymentRoute}입니다.`
    : "승인되면 실제 결제 루트를 확인한 뒤 진행하겠습니다.";
  return [
    `${data.approver}님, ${data.company}의 ${data.useCase} 부담을 줄이기 위해 Brief30 팀 브리핑 스프린트 승인 요청드립니다.`,
    "",
    `금액은 ${formatKrw(TEAM_PACKAGE.price)}이고, 범위는 ${TEAM_PACKAGE.delivery}입니다.`,
    `일정은 ${data.deliveryWindow} 기준입니다.`,
    "회사명/고객명/개인정보는 제거한 메모로 진행하고, 원문 민감 자료는 받지 않습니다.",
    `샘플 산출물: ${data.sampleUrl}`,
    `개인 진행룸: ${buildUrl(data.publicUrl, "dealroom/index.html", { ref: data.ref, offer: TEAM_PACKAGE.ledgerOffer, buyer: data.buyer, company: data.company, useCase: data.useCase, date: data.date })}`,
    paymentLine,
    "",
    `승인용 주문번호: ${data.ref}`
  ].join("\n");
}

function buildOrderMessage(data) {
  const paymentLine = data.paymentRoute
    ? `결제/입금 안내: ${data.paymentRoute}`
    : "결제/입금 안내: 실제 계좌 또는 결제 URL 확인 후 보내겠습니다.";
  return [
    `[Brief30 팀 패키지 주문 진행] ${data.ref}`,
    "",
    `${data.buyer}, 승인되면 아래 주문번호로 진행하시면 됩니다.`,
    `상품: ${TEAM_PACKAGE.label}`,
    `금액: ${formatKrw(TEAM_PACKAGE.price)}`,
    `범위: ${TEAM_PACKAGE.delivery}`,
    `전달 시간: ${data.deliveryWindow}`,
    paymentLine,
    `개인 진행룸: ${buildUrl(data.publicUrl, "dealroom/index.html", { ref: data.ref, offer: TEAM_PACKAGE.ledgerOffer, buyer: data.buyer, company: data.company, useCase: data.useCase, date: data.date })}`,
    "",
    "진행 순서:",
    `1. 결제/입금 메모에 주문번호 ${data.ref}를 남겨주세요.`,
    `2. 결제 후 익명화한 업무 메모를 intake 링크로 보내주세요: ${buildUrl(data.publicUrl, "intake/index.html", { ref: data.ref, offer: TEAM_PACKAGE.ledgerOffer, buyer: data.buyer, useCase: data.useCase })}`,
    "3. 입금자명, 금액, 주문번호가 보이는 결제 확인 메시지를 이 대화방에 남겨주세요."
  ].join("\n");
}

function buildProofRequest(data) {
  return [
    `[Brief30 결제 확인 요청] ${data.ref}`,
    "",
    "결제 후 아래 항목이 보이게 답장해 주세요.",
    "- 주문번호",
    "- 입금자명 또는 결제자명",
    "- 실제 입금일 또는 결제일",
    "- 금액",
    "",
    `주문번호: ${data.ref}`,
    `예상 금액: ${formatKrw(TEAM_PACKAGE.price)}`,
    "실제 결제 확인 전에는 매출로 기록하지 않습니다."
  ].join("\n");
}

function buildBuyerProofTemplate(data) {
  const route = data.paymentRoute || "[실제 결제 URL 또는 입금계좌]";
  return [
    "아래 블록은 실제 결제 후 구매자가 그대로 채워 보내는 답장용입니다.",
    "입금일은 결제 승인 화면 또는 이체 내역의 실제 날짜로 바꿔야 합니다.",
    "",
    `구매자: ${data.buyer}`,
    `상품: ${TEAM_PACKAGE.label}`,
    `금액: ${formatKrw(TEAM_PACKAGE.price)}`,
    `주문번호: ${data.ref}`,
    "입금일: [실제 입금일 YYYY-MM-DD]",
    `용도: ${data.useCase}`,
    `결제수단: ${route}`
  ].join("\n");
}

function buildUpdateCsv(data) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    [
      data.buyer,
      "tester",
      TEAM_PACKAGE.ledgerOffer,
      addDays(data.date, 1),
      `team package 300000 pending / ${data.company} / ${data.approver} / ${data.ref} / ${data.useCase}`
    ]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(data) {
  const route = data.paymentRoute ? ` --payment-route="${quoteArg(data.paymentRoute)}"` : "";
  return [
    ["name", "type", "command"],
    [data.buyer, "money_paid", buildMoneyPaidCommand({ month: data.date.slice(0, 7) })],
    [data.buyer, "audit_revenue", `npm run audit:revenue -- ${DEFAULT_LEDGER_PATH} --month=${data.date.slice(0, 7)}`],
    [data.buyer, "fulfill", `npm run fulfill:packet -- path/to/intake.md --ref=${data.ref}`],
    [data.buyer, "money_day", `npm run ops:money -- path/to/brief30-launch-ledger.csv --url=${data.publicUrl}${route}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildUrl(root, path, params = {}) {
  const url = new URL(path, root);
  Object.entries(params).forEach(([key, value]) => {
    if (clean(value)) url.searchParams.set(key, value);
  });
  return url.toString();
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function makeRef(date, buyer) {
  return `B30-TEAM-${String(date).replace(/[^\d]/gu, "")}-${shortCode(buyer)}`;
}

function shortCode(value) {
  const total = [...String(value || "")].reduce((sum, char) => sum + char.codePointAt(0), 0);
  return total.toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

function addDays(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return today();
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return value.toISOString().slice(0, 10);
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "buyer";
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
