import { buildLiveRun, formatLiveRun, liveRunFiles, liveRunZipSpecs } from "../operator/live-run.js";
import { formatKrw, TARGET_KRW } from "../operator/model.js";
import { paymentRouteReady } from "../scripts/live-send-gate.mjs";

export const sampleLedger = [
  "# leads",
  "name,segment,source,offer,status,next_touch,last_touch,paid_at,paid_amount,payment_ref,note",
  "김PM,직장인,referral,team,replied,2026-05-23,,,,팀 주간보고 반복 / 팀장 승인 가능",
  "박팀장,직장인,previous_client,team,tester,2026-05-23,,,,회의록과 프로젝트 리스크 보고 예산 있음",
  "",
  "# payments",
  "paid_at,buyer,offer,amount,ref"
].join("\n");

export const samplePeople = [
  "name,company,role,relation,note",
  "박팀장,AA파트,팀장,소개,회의록과 프로젝트 리스크 보고 예산 있음"
].join("\n");

export const sampleReplies = "김PM | 팀 결재 올릴 수 있게 범위랑 금액 알려주세요.";

export function buildLiveDesk(input = {}, options = {}) {
  const date = clean(options.date) || today();
  const month = clean(options.month) || date.slice(0, 7);
  const ledgerPath = clean(options.ledgerPath) || "outreach/prospect-seed.csv";
  const inputsPath = clean(options.inputsPath) || "outreach/generated/brief30-live-inputs.json";
  const outDir = clean(options.outDir) || "outreach/generated/live";
  const pack = buildLiveRun(
    {
      ledgerText: input.ledgerText || "",
      peopleText: input.peopleText || "",
      replyText: input.replyText || "",
      paymentText: input.paymentText || ""
    },
    {
      ledgerPath,
      publicUrl: options.publicUrl,
      paymentRoute: options.paymentRoute,
      date,
      month,
      target: options.target || TARGET_KRW
    }
  );
  const inputsJson = buildInputsJson(input, options, date, month);
  const command = buildCommand({ ledgerPath, inputsPath, outDir, date, month });
  const fileNames = liveRunFiles(pack).map((file) => file.name);
  const zipNames = liveRunZipSpecs(pack).map((zip) => zip.name);

  return {
    pack,
    command,
    inputsPath,
    inputsJson,
    fullText: formatLiveRun(pack),
    metrics: metricsFor(pack),
    selectedBuyer: pack.moneyNow?.selected || null,
    selectedReply: pack.replyClose?.selected || null,
    paymentReady: paymentRouteReady(options.paymentRoute),
    fileNames,
    zipNames,
    nextSend: nextSend(pack, command, inputsPath)
  };
}

function buildInputsJson(input, options, date, month) {
  return `${JSON.stringify(
    {
      date,
      month,
      publicUrl: clean(options.publicUrl),
      paymentRoute: clean(options.paymentRoute),
      ledgerText: clean(input.ledgerText),
      peopleText: clean(input.peopleText),
      replyText: clean(input.replyText),
      paymentText: clean(input.paymentText)
    },
    null,
    2
  )}\n`;
}

function buildCommand({ ledgerPath, inputsPath, outDir, date, month }) {
  return [
    "npm run money:live --",
    ledgerPath,
    `--inputs=${inputsPath}`,
    `--date=${date}`,
    `--month=${month}`,
    `--out=${outDir}`
  ].join(" ");
}

function metricsFor(pack) {
  return [
    { label: "REVENUE", value: formatKrw(pack.audit.revenue) },
    { label: "GAP", value: formatKrw(pack.audit.gap) },
    { label: "PAYMENT", value: pack.routeReady ? "ready" : "missing" },
    { label: "NEW BUYER", value: pack.moneyNow?.selected?.name || "none" },
    { label: "REPLY BUYER", value: pack.replyClose?.selected?.name || "none" },
    { label: "FILES", value: String(liveRunFiles(pack).length + liveRunZipSpecs(pack).length) }
  ];
}

function nextSend(pack, command, inputsPath) {
  if (!pack.routeReady) {
    return [
      "실제 결제 URL 또는 계좌를 먼저 넣어야 live 발송이 열립니다.",
      "입력 번들을 저장한 뒤 결제 루트를 채우고 다시 실행하세요."
    ].join(" ");
  }
  if (pack.moneyPaid?.canMerge) {
    return "결제 증빙이 먼저입니다. 생성된 command CSV의 money_paid 행을 실행해 원장과 audit:revenue를 닫으세요.";
  }
  if (pack.replyClose?.selected) {
    return `${pack.replyClose.selected.name} 답장 클로징 ZIP부터 보냅니다. 입력 번들은 ${inputsPath}로 저장하고 ${command}를 실행하세요.`;
  }
  if (pack.moneyNow?.selected) {
    return `${pack.moneyNow.selected.name} 신규 클로징 ZIP부터 보냅니다. 입력 번들은 ${inputsPath}로 저장하고 ${command}를 실행하세요.`;
  }
  return "후보가 없습니다. 원장 또는 people 메모에 warm buyer를 넣고 다시 봅니다.";
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
