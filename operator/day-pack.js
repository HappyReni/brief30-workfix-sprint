import { buildPipelinePlan } from "./pipeline-plan.js";
import { buildSendPack } from "./send-pack.js";
import { formatKrw } from "./model.js";

export function buildDayPack(text = "", options = {}) {
  const pipeline = buildPipelinePlan(text, options);
  const count = boundedCount(options.count || pipeline.dailySends || 1);
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const sendPack = buildSendPack({
    count,
    focus: pipeline.focus,
    publicUrl,
    segments: options.segments,
    sources: options.sources,
    names: options.names
  });
  return {
    date: options.date || today(),
    source: options.source || "",
    publicUrl,
    paymentReady: Boolean(options.paymentRoute),
    paymentRoute: options.paymentRoute || "",
    pipeline,
    sendPack,
    checklist: buildChecklist({ pipeline, sendPack, paymentRoute: options.paymentRoute })
  };
}

export function formatDayPack(pack) {
  return [
    "# Brief30 daily sales pack",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(pack.pipeline.revenue)} / ${formatKrw(pack.pipeline.target)}`,
    `Gap: ${formatKrw(pack.pipeline.gap)}`,
    `Expected open pipeline: ${formatKrw(pack.pipeline.pipelineValue)}`,
    `Daily sends required: ${pack.pipeline.dailySends}`,
    `Messages generated: ${pack.sendPack.rows.length}`,
    "",
    "## Today checklist",
    ...pack.checklist.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Pipeline math",
    `- Revenue still to create: ${formatKrw(pack.pipeline.requiredRevenue)}`,
    `- Expected value per send: ${formatKrw(pack.pipeline.expectedValuePerSend)}`,
    `- Sends needed: ${pack.pipeline.sendsNeeded}`,
    `- Weekly sends: ${pack.pipeline.weeklySends}`,
    "",
    "## First 5 sends",
    ...pack.sendPack.firstActions.map((row, index) => `${index + 1}. ${row.name} / ${row.offerLabel} / ${row.note}`),
    "",
    "## Copy block",
    pack.sendPack.messages,
    "",
    "## Operator import CSV",
    "```csv",
    pack.sendPack.operatorCsv,
    "```"
  ].join("\n");
}

export function dayPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    {
      name: `brief30-day-pack-${date}.md`,
      content: `${formatDayPack(pack)}\n`
    },
    {
      name: `brief30-day-messages-${date}.txt`,
      content: `${pack.sendPack.messages}\n`
    },
    {
      name: `brief30-day-operator-import-${date}.csv`,
      content: `${pack.sendPack.operatorCsv}\n`
    }
  ];
}

function buildChecklist({ pipeline, sendPack, paymentRoute }) {
  const steps = [];
  if (!paymentRoute) {
    steps.push("결제 루트 설정 전입니다. preflight에서 prepare:seller를 먼저 끝내야 공개 공유가 안전합니다.");
  }
  steps.push(`${sendPack.rows.length}명에게 ${pipeline.focus} 중심 메시지를 보냅니다.`);
  steps.push("답장이 오면 같은 날 plan:replies로 분류합니다.");
  steps.push("관심 답장은 10분 안에 plan:proposal로 견적/결제 요청을 보냅니다.");
  steps.push("입금 확인 즉시 money:paid로 증빙 파싱, ledger 병합, audit:revenue를 한 번에 실행합니다.");
  return steps;
}

function boundedCount(value) {
  return Math.max(1, Math.min(80, Number(value || 1)));
}

function normalizeRoot(value) {
  const root = String(value || "").trim();
  return root.endsWith("/") ? root : `${root}/`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
