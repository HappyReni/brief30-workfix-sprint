import { buildFollowupPack, formatFollowupPack } from "../operator/followup-pack.js";

export const sampleLedger = [
  "name,segment,source,offer,status,next_touch,note",
  "김팀장,직장인,referral,team,replied,2026-05-22,팀 주간보고 예산 확인",
  "이PM,직장인,previous_client,service,tester,2026-05-22,고객사 업데이트 대행 관심",
  "박대표,창업자,direct_dm,setup,contacted,2026-05-21,투자자 공유 반복"
].join("\n");

export function buildFollowupDesk(input = {}, options = {}) {
  const date = clean(input.date || options.date) || today();
  const publicUrl = normalizeRoot(input.publicUrl || options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(input.paymentRoute || options.paymentRoute || "");
  const pack = buildFollowupPack(input.ledger || "", {
    publicUrl,
    paymentRoute,
    date,
    limit: input.limit || options.limit || 12,
    status: input.statuses || options.statuses || "tester,replied,contacted"
  });
  const top = pack.followups[0] || null;
  return {
    date,
    publicUrl,
    paymentRoute,
    pack,
    top,
    next: nextAction(pack, top),
    metrics: buildMetrics(pack),
    cards: pack.followups.slice(0, 8).map(cardFromFollowup),
    commandBlock: buildCommands({ publicUrl, date, paymentRoute, top }),
    updateCsv: pack.updateCsv,
    fullText: formatFollowupPack(pack)
  };
}

function nextAction(pack, top) {
  if (!pack.leads.length) {
    return { level: "empty", label: "원장 CSV 붙여넣기", detail: "발송했거나 답장 온 리드를 먼저 붙여넣으세요." };
  }
  if (!pack.paymentReady) {
    return { level: "blocked", label: "결제 루트 먼저 설정", detail: "후속에서 바로 입금 요청하려면 실제 결제 안내가 필요합니다." };
  }
  if (top) {
    return { level: "send", label: `${top.name} 후속 발송`, detail: "문안을 복사해 보내고 업데이트 CSV를 운영판에 병합하세요." };
  }
  return { level: "done", label: "오늘 후속 없음", detail: "새 발송 또는 답장 수집으로 후보를 다시 채우세요." };
}

function buildMetrics(pack) {
  const warm = pack.followups.filter((item) => ["tester", "replied"].includes(item.status)).length;
  const team = pack.followups.filter((item) => item.offer === "team").length;
  return [
    { label: "LEADS", value: String(pack.leads.length) },
    { label: "FOLLOWUPS", value: String(pack.followups.length) },
    { label: "WARM", value: String(warm) },
    { label: "TEAM ASKS", value: String(team) },
    { label: "PAYMENT", value: pack.paymentReady ? "READY" : "MISSING" }
  ];
}

function cardFromFollowup(item) {
  return {
    name: item.name,
    status: item.status,
    offer: item.offer,
    nextTouch: item.nextTouch,
    closeUrl: item.closeUrl,
    message: item.message
  };
}

function buildCommands({ publicUrl, date, paymentRoute, top }) {
  const lines = [
    `npm run plan:followups -- path/to/brief30-launch-ledger.csv --url=${publicUrl} --limit=12`,
    paymentRoute ? "open followup-desk/index.html and send the top follow-up" : "open payment-setup/index.html",
    "copy update CSV into operator/index.html",
    "open money-day/index.html before merging payment evidence"
  ];
  if (top) {
    lines.push(`open ${top.closeUrl}`);
  }
  lines.push(`npm run audit:revenue -- path/to/brief30-launch-ledger.csv --month=${date.slice(0, 7)}`);
  return lines.join("\n");
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
