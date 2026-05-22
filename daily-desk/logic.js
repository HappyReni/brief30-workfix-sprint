import { buildDayPack, formatDayPack } from "../operator/day-pack.js";
import { formatKrw } from "../operator/model.js";

export const sampleLedger = [
  "# leads",
  "name,segment,source,offer,status,next_touch,note",
  "김팀장,직장인,referral,team,replied,2026-05-22,팀 주간보고 예산 확인",
  "이PM,직장인,previous_client,service,tester,2026-05-22,고객사 업데이트 대행 관심",
  "",
  "# payments",
  "paid_at,buyer,offer,amount,ref"
].join("\n");

export function buildDailyDesk(input = {}, options = {}) {
  const date = clean(input.date || options.date) || today();
  const publicUrl = normalizeRoot(input.publicUrl || options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const focus = clean(input.focus || options.focus) || "team";
  const pack = buildDayPack(input.ledger || "", {
    publicUrl,
    paymentRoute: input.paymentRoute || options.paymentRoute,
    date,
    month: input.month || options.month || date.slice(0, 7),
    days: input.days || options.days || 14,
    focus,
    count: input.count || options.count,
    replyRate: input.replyRate || options.replyRate,
    closeRateScale: input.closeRateScale || options.closeRateScale,
    names: input.names || options.names
  });
  return {
    date,
    publicUrl,
    pack,
    next: nextAction(pack),
    metrics: metricsFromPack(pack),
    checklist: pack.checklist,
    sendCards: pack.sendPack.rows.slice(0, 8).map(sendCard),
    operatorCsv: pack.sendPack.operatorCsv,
    messages: pack.sendPack.messages,
    fullText: formatDayPack(pack),
    commandBlock: buildCommands(pack)
  };
}

function nextAction(pack) {
  if (!pack.paymentReady) {
    return { level: "blocked", label: "결제 루트 먼저 설정", detail: "공개 발송 전에 실제 입금 안내 또는 결제 URL을 넣으세요." };
  }
  if (pack.pipeline.gap <= 0) {
    return { level: "done", label: "매출 감사 확인", detail: "증거 CSV를 보관하고 납품/후기 루프로 넘기세요." };
  }
  return {
    level: "send",
    label: `오늘 ${pack.sendPack.rows.length}명 발송`,
    detail: `${pack.pipeline.focus} focus로 ${formatKrw(pack.pipeline.gap)} gap을 줄입니다.`
  };
}

function metricsFromPack(pack) {
  return [
    { label: "REVENUE", value: formatKrw(pack.pipeline.revenue) },
    { label: "GAP", value: formatKrw(pack.pipeline.gap) },
    { label: "PIPELINE", value: formatKrw(pack.pipeline.pipelineValue) },
    { label: "DAILY SENDS", value: String(pack.pipeline.dailySends) },
    { label: "GENERATED", value: String(pack.sendPack.rows.length) }
  ];
}

function sendCard(row) {
  return {
    name: row.name,
    offer: row.offerLabel,
    note: row.note,
    message: row.message
  };
}

function buildCommands(pack) {
  return [
    `npm run ops:day -- path/to/brief30-launch-ledger.csv --url=${pack.publicUrl} --focus=${pack.pipeline.focus}`,
    "open outbox/index.html and send generated messages",
    "copy operator CSV into operator/index.html",
    "open followup-desk/index.html tomorrow",
    `npm run audit:revenue -- path/to/brief30-launch-ledger.csv --month=${pack.pipeline.month}`
  ].join("\n");
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
