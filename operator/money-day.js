import { buildChannelPack } from "./channel-pack.js";
import { buildFollowupPack } from "./followup-pack.js";
import { buildHotlist } from "./hotlist-pack.js";
import { buildLaunchSetupPack } from "./launch-setup.js";
import { csvCell, formatKrw } from "./model.js";
import { buildRevenueRecoveryPack } from "./revenue-recovery.js";
import { buildTeamPack, TEAM_PACKAGE } from "./team-pack.js";

const UPDATE_HEADER = '"name","status","offer","next_touch","note"';

export function buildMoneyDay(input = {}, options = {}) {
  const ledgerText = String(input.ledgerText || "");
  const replyText = String(input.replyText || "");
  const paymentText = String(input.paymentText || "");
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const date = options.date || today();
  const month = options.month || date.slice(0, 7);
  const paymentRoute = clean(options.paymentRoute);
  const target = Number(options.target || 300000);
  const launch = buildLaunchSetupPack({ publicUrl, date, payment: paymentRoute, email: options.email || options.supportEmail || "" });
  const recovery = buildRevenueRecoveryPack(
    { ledgerText, paymentText },
    { ...options, publicUrl, date, month, paymentRoute, target }
  );
  const hotlist = buildHotlist(
    { ledgerText, replyText },
    { ...options, publicUrl, date, month, paymentRoute, limit: options.hotLimit || 5 }
  );
  const followups = buildFollowupPack(ledgerText, {
    ...options,
    publicUrl,
    date,
    paymentRoute,
    limit: options.followupLimit || 5
  });
  const channels = buildChannelPack({
    publicUrl,
    date,
    focus: options.focus || "team",
    count: sendCountFor(recovery.afterRecoveryGap, options.count),
    sources: options.sources,
    segments: options.segments
  });
  const teamPack = buildTeamClosePack(hotlist, { ...options, publicUrl, date, paymentRoute, target, gap: recovery.audit.gap });
  const pack = {
    date,
    month,
    source: options.source || "",
    replySource: options.replySource || "",
    paymentSource: options.paymentSource || "",
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    target,
    launch,
    recovery,
    hotlist,
    teamPack,
    followups,
    channels,
    updateCsv: combineUpdates([hotlist.updateCsv, followups.updateCsv]),
    commandCsv: buildCommandCsv({
      publicUrl,
      paymentRoute,
      paymentReady: Boolean(paymentRoute),
      recovery,
      hotlist,
      teamPack,
      channels,
      ledgerPath: options.source,
      replyPath: options.replySource,
      paymentPath: options.paymentSource,
      month
    })
  };
  return { ...pack, actions: buildActions(pack) };
}

export function formatMoneyDay(pack) {
  return [
    "# Brief30 money day",
    "",
    `Date: ${pack.date}`,
    `Ledger: ${pack.source || "stdin"}`,
    `Replies: ${pack.replySource || "none"}`,
    `Payments: ${pack.paymentSource || "none"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(pack.recovery.audit.revenue)} / ${formatKrw(pack.target)}`,
    `Gap: ${formatKrw(pack.recovery.audit.gap)}`,
    `Ready evidence: ${pack.recovery.payments.ready.length} / ${formatKrw(pack.recovery.readyTotal)}`,
    `Repair asks: ${pack.recovery.repairRows.length}`,
    `Hot asks: ${pack.hotlist.rows.length}`,
    `One-order team close: ${pack.teamPack ? `${pack.teamPack.buyer} / ${formatKrw(pack.teamPack.offer.price)}` : "none"}`,
    `Follow-ups: ${pack.followups.followups.length}`,
    `New sends: ${pack.channels.rows.length}`,
    "",
    "## Priority order",
    ...pack.actions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Ready payment evidence CSV",
    "```csv",
    pack.recovery.evidenceCsv,
    "```",
    "",
    "## Repair first",
    ...repairLines(pack.recovery.repairRows),
    "",
    "## Hot money asks",
    ...hotLines(pack.hotlist.rows),
    "",
    "## One-order team close",
    ...teamLines(pack.teamPack),
    "",
    "## Follow-up first",
    ...followupLines(pack.followups.followups),
    "",
    "## New send first 5",
    ...pack.channels.rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.name} / ${row.offerLabel} / ${row.note}`),
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    "Do not merge this money-day pack into revenue. Only merge the ready payment evidence CSV after checking actual payment proof."
  ].join("\n");
}

export function moneyDayFiles(pack) {
  const date = String(pack.date || today());
  return [
    { name: `brief30-money-day-${date}.md`, content: `${formatMoneyDay(pack)}\n` },
    { name: `brief30-money-day-updates-${date}.csv`, content: `${pack.updateCsv}\n` },
    { name: `brief30-money-day-commands-${date}.csv`, content: `${pack.commandCsv}\n` },
    { name: `brief30-money-day-evidence-${date}.csv`, content: `${pack.recovery.evidenceCsv}\n` }
  ];
}

function buildActions(pack) {
  const actions = [];
  if (!pack.paymentReady) {
    actions.push("P0 결제 루트 설정: prepare:launch 또는 prepare:seller 실행 후 strict audit");
  }
  if (pack.recovery.payments.ready.length) {
    actions.push("P0 money:paid로 결제 증빙 파싱 -> ledger 병합 -> audit:revenue까지 한 번에 확인");
  }
  if (pack.recovery.repairRows.length) {
    actions.push(`P0 불완전 결제 증거 ${pack.recovery.repairRows.length}건 복구 요청`);
  }
  if (pack.hotlist.rows.length) {
    actions.push(`P1 money:reply로 ${pack.hotlist.rows[0].name}에게 핫 결제 요청 발송`);
  }
  if (pack.teamPack) {
    actions.push(`P1 ${pack.teamPack.buyer}에게 ${formatKrw(TEAM_PACKAGE.price)} 팀 스프린트 제안으로 한 건 클로징 시도`);
  }
  if (pack.followups.followups.length) {
    actions.push(`P1 후속 ${pack.followups.followups.length}건 발송 후 update CSV import`);
  }
  actions.push(`P2 money:now 또는 plan:channels로 신규 ${pack.channels.rows.length}명에게 team 중심 발송`);
  actions.push("P3 실제 결제 증거 없는 proposal/order/approval 자료는 revenue ledger에 병합하지 않습니다.");
  return actions;
}

function buildCommandCsv({ publicUrl, paymentRoute, paymentReady, recovery, hotlist, teamPack, channels, ledgerPath, replyPath, paymentPath, month }) {
  const ledgerArg = pathArg(ledgerPath, "path/to/ledger.csv");
  const replyArg = pathArg(replyPath, "path/to/replies.txt");
  const paymentArg = pathArg(paymentPath, "path/to/payment-text.txt");
  const route = paymentRoute ? ` --payment-route="${quoteArg(paymentRoute)}"` : "";
  return [
    ["type", "ready", "command"],
    ["payment_setup", paymentReady ? "yes" : "no", paymentSetupCommand({ publicUrl, paymentRoute, paymentReady })],
    ["money_paid", recovery.payments.ready.length ? "yes" : "no", `npm run money:paid -- ${ledgerArg} ${paymentArg} --out=${ledgerArg} --month=${month} --report-out=outreach/generated`],
    ["money_reply", hotlist.rows.length ? "yes" : "no", `npm run money:reply -- ${replyArg} --offline${route} --zip --require-payment --out=outreach/generated`],
    ["money_now", "yes", `npm run money:now -- path/to/people.txt --offline${route} --zip --require-payment --out=outreach/generated`],
    ["recover_missing_proof", recovery.repairRows.length ? "yes" : "no", `npm run ops:recovery -- ${ledgerArg} --payments=${paymentArg} --url=${publicUrl} --out=outreach/generated`],
    ["hotlist", hotlist.rows.length ? "yes" : "no", `npm run plan:hotlist -- ${ledgerArg} --replies=${replyArg} --url=${publicUrl} --out=outreach/generated`],
    ["procurement_pack", teamPack ? "yes" : "no", teamPack ? procurementCommand(teamPack) : `npm run plan:procurement -- --buyer=김PM --company=OO팀 --approver=이팀장 --use-case=팀주간보고 --url=${publicUrl} --out=outreach/generated`],
    ["team_pack", teamPack ? "yes" : "no", teamPack ? teamCommand(teamPack) : `npm run plan:team -- --buyer=김PM --company=OO팀 --approver=이팀장 --use-case=팀주간보고 --url=${publicUrl} --out=outreach/generated`],
    ["new_sends", "yes", `npm run plan:channels -- --count=${channels.rows.length} --focus=team --sources=previous_client,referral,direct_dm --url=${publicUrl} --out=outreach/generated`],
    ["audit_revenue", "yes", `npm run audit:revenue -- ${ledgerArg} --month=${month}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function paymentSetupCommand({ publicUrl, paymentRoute, paymentReady }) {
  if (paymentReady) {
    return `payment route provided in this pack: ${paymentRoute}`;
  }
  return `open ${publicUrl}payment-setup/index.html or run npm run prepare:launch with a real email and payment route`;
}

function buildTeamClosePack(hotlist, options) {
  if (Number(options.gap || 0) < TEAM_PACKAGE.price || !hotlist.rows.length) return null;
  const candidate = hotlist.rows[0];
  return buildTeamPack({
    buyer: candidate.name,
    company: options.company || "OO팀",
    approver: options.approver || "결재권자",
    useCase: teamUseCaseFor(candidate),
    publicUrl: options.publicUrl,
    paymentRoute: options.paymentRoute,
    date: options.date,
    target: options.target
  });
}

function teamLines(teamPack) {
  if (!teamPack) return ["- 현재 갭을 한 건으로 닫을 warm 후보가 없습니다."];
  return [
    `### ${teamPack.buyer} / ${teamPack.offer.label}`,
    "",
    teamPack.approverForward,
    "",
    `샘플 산출물: ${teamPack.sampleUrl}`,
    `팀 주문 링크: ${teamPack.orderUrl}`,
    `익명 메모 제출: ${teamPack.intakeUrl}`,
    "",
    "결제 확인 요청:",
    teamPack.proofRequest,
    "",
    `Procurement command: ${procurementCommand(teamPack)}`,
    `Command: ${teamCommand(teamPack)}`,
    "",
    "실제 결제 확인 전에는 매출로 기록하지 않습니다."
  ];
}

function procurementCommand(teamPack) {
  const route = teamPack.paymentRoute ? ` --payment-route="${quoteArg(teamPack.paymentRoute)}"` : "";
  return `npm run plan:procurement -- --buyer="${quoteArg(teamPack.buyer)}" --company="${quoteArg(teamPack.company)}" --approver="${quoteArg(teamPack.approver)}" --use-case="${quoteArg(teamPack.useCase)}" --url=${teamPack.publicUrl}${route} --out=outreach/generated`;
}

function teamCommand(teamPack) {
  const route = teamPack.paymentRoute ? ` --payment-route="${quoteArg(teamPack.paymentRoute)}"` : "";
  return `npm run plan:team -- --buyer="${quoteArg(teamPack.buyer)}" --company="${quoteArg(teamPack.company)}" --approver="${quoteArg(teamPack.approver)}" --use-case="${quoteArg(teamPack.useCase)}" --url=${teamPack.publicUrl}${route} --out=outreach/generated`;
}

function teamUseCaseFor(candidate) {
  const text = [candidate.reply, candidate.note, candidate.proposal?.useCase].filter(Boolean).join(" ");
  if (/고객사|상태|업데이트/u.test(text)) return "팀 고객사 업데이트/주간 보고 정리";
  if (/회의|미팅|결정/u.test(text)) return "팀 회의록/결정사항/후속 액션 정리";
  if (/리스크|이슈|장애/u.test(text)) return "팀 리스크/이슈 브리핑 정리";
  return "팀 주간보고/회의록 반복 정리";
}

function combineUpdates(values) {
  const rows = values.flatMap((value) => String(value || "").split("\n").map((line) => line.trim()).filter(Boolean).filter((line) => line !== UPDATE_HEADER));
  return [UPDATE_HEADER, ...rows].join("\n");
}

function repairLines(rows) {
  if (!rows.length) return ["- 복구할 결제 증거가 없습니다."];
  return rows.slice(0, 3).map((row, index) => [`### ${index + 1}. ${row.buyer}`, "", row.message].join("\n"));
}

function hotLines(rows) {
  if (!rows.length) return ["- hot ask가 없습니다."];
  return rows.slice(0, 3).map((row, index) => [`### ${index + 1}. ${row.name} / score ${row.score}`, "", row.message].join("\n"));
}

function followupLines(rows) {
  if (!rows.length) return ["- 후속 발송 후보가 없습니다."];
  return rows.slice(0, 3).map((row, index) => [`### ${index + 1}. ${row.name} / ${row.status}`, "", row.message].join("\n"));
}

function sendCountFor(gap, explicit) {
  if (explicit) return Math.max(1, Math.min(80, Number(explicit)));
  if (gap <= 0) return 5;
  return Math.max(10, Math.min(50, Math.ceil(gap / 300000) * 20));
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function quoteArg(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function pathArg(value, fallback) {
  const text = clean(value) || fallback;
  return /[\s"']/u.test(text) ? `"${quoteArg(text)}"` : text;
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
