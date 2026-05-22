import { buildClosePlan } from "./close-plan.js";
import { buildFollowupPack } from "./followup-pack.js";
import { buildPipelinePlan } from "./pipeline-plan.js";
import { buildSendPack } from "./send-pack.js";
import { TARGET_KRW, formatKrw } from "./model.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

export function buildCashSprint(text = "", options = {}) {
  const target = Number(options.target || TARGET_KRW);
  const month = options.month || today().slice(0, 7);
  const days = clamp(Number(options.days || 30), 1, 90);
  const focus = options.focus || "service";
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const pipeline = buildPipelinePlan(text, { ...options, target, month, days, focus });
  const closePlan = buildClosePlan(text, { target, month, limit: options.closeLimit || 5 });
  const sendCount = clamp(Number(options.count || pipeline.dailySends || 1), 1, 80);
  const sendPack = buildSendPack({
    count: sendCount,
    focus: pipeline.focus,
    publicUrl,
    segments: options.segments,
    sources: options.sources,
    names: options.names
  });
  const followups = buildFollowupPack(text, {
    source: options.source,
    publicUrl,
    limit: options.followupLimit || 8,
    status: options.followupStatus,
    paymentRoute
  });

  return {
    date: options.date || today(),
    source: options.source || "",
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    target,
    month,
    days,
    pipeline,
    closePlan,
    sendPack,
    followups,
    checklist: buildChecklist({ paymentRoute, pipeline, closePlan, sendPack, followups })
  };
}

export function formatCashSprint(sprint) {
  return [
    "# Brief30 cash sprint",
    "",
    `Date: ${sprint.date}`,
    `Source: ${sprint.source || "stdin"}`,
    `Public URL: ${sprint.publicUrl}`,
    `Payment route: ${sprint.paymentReady ? sprint.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(sprint.pipeline.revenue)} / ${formatKrw(sprint.target)}`,
    `Gap: ${formatKrw(sprint.pipeline.gap)}`,
    `Expected open pipeline: ${formatKrw(sprint.pipeline.pipelineValue)}`,
    `Daily sends required: ${sprint.pipeline.dailySends}`,
    `New messages generated: ${sprint.sendPack.rows.length}`,
    `Follow-ups generated: ${sprint.followups.followups.length}`,
    `Warm close candidates: ${sprint.closePlan.candidates.length}`,
    "",
    "## Next 90 minutes",
    ...sprint.checklist.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Close first",
    ...closeLines(sprint),
    "",
    "## Follow-up first 3",
    ...followupLines(sprint.followups.followups),
    "",
    "## New send first 5",
    ...sprint.sendPack.firstActions.map((row, index) => `${index + 1}. ${row.name} / ${row.offerLabel} / ${row.note}`),
    "",
    "## Revenue paths",
    ...sprint.closePlan.combos.slice(0, 3).map((combo, index) => `${index + 1}. ${combo.label} = ${formatKrw(combo.total)}`),
    "",
    "## Commands",
    ...commandLines(sprint)
  ].join("\n");
}

export function cashSprintFiles(sprint) {
  const date = String(sprint.date || today());
  return [
    {
      name: `brief30-cash-sprint-${date}.md`,
      content: `${formatCashSprint(sprint)}\n`
    },
    {
      name: `brief30-cash-sprint-sends-${date}.txt`,
      content: `${sprint.sendPack.messages}\n`
    },
    {
      name: `brief30-cash-sprint-import-${date}.csv`,
      content: `${sprint.sendPack.operatorCsv}\n`
    },
    {
      name: `brief30-cash-sprint-followups-${date}.csv`,
      content: `${sprint.followups.updateCsv}\n`
    }
  ];
}

function buildChecklist({ paymentRoute, pipeline, closePlan, sendPack, followups }) {
  const steps = [];
  if (!paymentRoute) {
    steps.push("결제 루트가 없습니다. 공개 공유 전 prepare:seller로 실제 이메일/계좌 또는 결제 URL을 넣습니다.");
  }
  if (closePlan.candidates.length) {
    steps.push(`${closePlan.candidates[0].name}부터 plan:proposal로 결제 요청을 보냅니다.`);
  }
  if (followups.followups.length) {
    steps.push(`${followups.followups.length}명에게 24시간 후속 문안을 먼저 보냅니다.`);
  }
  steps.push(`${sendPack.rows.length}명에게 ${pipeline.focus} 중심 신규 메시지를 보냅니다.`);
  steps.push("답장은 10분 안에 plan:replies 또는 plan:proposal로 처리합니다.");
  steps.push("입금 확인 즉시 money:paid로 증빙 파싱, ledger 병합, audit:revenue를 한 번에 실행합니다.");
  return steps;
}

function closeLines(sprint) {
  if (!sprint.closePlan.candidates.length) {
    return ["- warm close 후보가 없습니다. follow-up 또는 신규 발송으로 replied/tester를 먼저 만드세요."];
  }
  return sprint.closePlan.candidates.slice(0, 5).map((item, index) => {
    const command = `npm run plan:proposal -- --buyer="${quoteArg(item.name)}" --use-case=주간보고 --offer=${item.offer} --url=${sprint.publicUrl}`;
    return `${index + 1}. ${item.name} / ${item.status} / ${item.offer} / ${command}`;
  });
}

function followupLines(items) {
  if (!items.length) {
    return ["- 후속 후보가 없습니다."];
  }
  return items.slice(0, 3).map((item, index) => [
    `### ${index + 1}. ${item.name} / ${item.status}`,
    "",
    item.message
  ].join("\n"));
}

function commandLines(sprint) {
  return [
    `npm run plan:followups -- path/to/ledger.csv --url=${sprint.publicUrl}`,
    `npm run plan:channels -- --count=${sprint.sendPack.rows.length} --focus=${sprint.pipeline.focus} --url=${sprint.publicUrl}`,
    `npm run plan:send -- --count=${sprint.sendPack.rows.length} --focus=${sprint.pipeline.focus} --url=${sprint.publicUrl}`,
    `npm run plan:replies -- path/to/replies.txt --url=${sprint.publicUrl} --offer=service`,
    buildMoneyPaidCommand({ ledgerPath: "path/to/ledger.csv", month: sprint.month }),
    "npm run audit:revenue -- path/to/ledger.csv",
    `npm run plan:deals -- path/to/ledger.csv --url=${sprint.publicUrl}`
  ];
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
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
