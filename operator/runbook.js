import { formatKrw } from "./model.js";
import { buildClosePlan } from "./close-plan.js";
import { buildTodaySalesPack } from "./sales-action.js";
import { auditRevenueEvidence } from "./revenue-proof.js";
import { buildMoneyPaidCommand } from "./payment-command.js";

export function buildOperatorRunbook(text, options = {}) {
  const target = Number(options.target || 300000);
  const month = options.month || new Date().toISOString().slice(0, 7);
  const publicUrl = options.publicUrl || "https://your-site.example.com/";
  const limit = Number(options.limit || 5);
  const audit = auditRevenueEvidence(text, { target, month });
  const closePlan = buildClosePlan(text, { target, month, limit });
  const salesPack = buildTodaySalesPack(text, { target, month, publicUrl, limit });
  const paymentRoute = options.paymentRoute || "";

  return {
    target,
    month,
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    audit,
    closePlan,
    salesPack,
    nextSteps: nextSteps({ audit, closePlan, salesPack, paymentRoute })
  };
}

export function formatOperatorRunbook(runbook, sourcePath = "") {
  return [
    "# Brief30 operator runbook",
    "",
    `Source: ${sourcePath || "stdin"}`,
    `Month: ${runbook.month}`,
    `Payment route: ${runbook.paymentReady ? runbook.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(runbook.audit.revenue)} / ${formatKrw(runbook.target)}`,
    `Gap: ${formatKrw(runbook.audit.gap)}`,
    `Qualified payments: ${runbook.audit.qualified.length}`,
    `Warm candidates: ${runbook.closePlan.candidates.length}`,
    `Send actions: ${runbook.salesPack.actions.length}`,
    "",
    "## Next 60 minutes",
    ...runbook.nextSteps.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Best close paths",
    ...runbook.closePlan.combos.map((combo, index) => `${index + 1}. ${combo.label} / ${formatKrw(combo.total)}`),
    "",
    "## First send",
    firstSend(runbook.salesPack.actions),
    "",
    "## Commands",
    commandLines()
  ].join("\n");
}

function nextSteps({ audit, closePlan, salesPack, paymentRoute }) {
  if (!paymentRoute) {
    return [
      "결제 루트부터 설정: npm run prepare:seller -- --email=... --payment=\"...\" 또는 --self/--setup/--service URL 입력",
      "설정 후 npm run audit:release:strict 실행",
      "그 다음 team:live 또는 plan:send --focus=team으로 팀 스프린트 후보부터 발송"
    ];
  }
  if (audit.reached) {
    return [
      "목표 달성 증거 CSV 보관",
      "fulfill:packet으로 미납품 주문 처리",
      "aftercare에서 후기/소개 요청"
    ];
  }
  if (closePlan.candidates.length) {
    return [
      `${closePlan.candidates[0].name}에게 결제 요청 링크 발송`,
      "나머지 warm 후보에게 24시간 후속 문안 발송",
      "입금 확인 즉시 money:paid로 증빙 파싱, ledger 병합, audit:revenue 실행"
    ];
  }
  return [
    salesPack.actions.length ? `${salesPack.actions.length}명에게 오늘 발송 메시지 복사` : "plan:channels --focus=team으로 새 팀 후보 20명 추가",
    closePlan.nextAction,
    "답장 오면 plan:replies --offer=team으로 결제 요청 CSV 생성"
  ];
}

function firstSend(actions) {
  if (!actions.length) {
    return "발송 후보가 없습니다. outreach/prospect-seed.csv 또는 operator ledger를 보강하세요.";
  }
  const first = actions[0];
  return [`### ${first.name} / ${first.type}`, "", first.message].join("\n");
}

function commandLines() {
  return [
    "npm run plan:today -- path/to/ledger.csv --url=https://happyreni.github.io/brief30-workfix-sprint",
    "npm run ops:money -- path/to/ledger.csv --replies=path/to/replies.txt --payments=path/to/payment-text.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run prepare:launch -- --email=seller@domain.kr --payment=\"은행명 실제계좌 예금주명\" --url=https://happyreni.github.io/brief30-workfix-sprint",
    "npm run team:live -- --email=seller@domain.kr --payment=\"은행명 실제계좌 예금주명\" --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:approval -- --buyer=김PM --company=OO팀 --approver=이팀장 --offer=team --use-case=팀 주간보고 --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run payment:handoff -- --buyer=김PM --company=OO팀 --offer=team --use-case=팀 주간보고 --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run ops:close -- path/to/ledger.csv --replies=path/to/replies.txt --payments=path/to/payment-text.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run ops:sprint -- path/to/ledger.csv --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:channels -- --count=20 --focus=team --sources=previous_client,referral,direct_dm --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:contacts -- path/to/contacts.txt --ledger=path/to/ledger.csv --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:demo -- path/to/prospect-note.txt --buyer=김PM --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:deals -- path/to/ledger.csv --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:followups -- path/to/ledger.csv --url=https://happyreni.github.io/brief30-workfix-sprint",
    "npm run plan:hotlist -- path/to/ledger.csv --replies=path/to/replies.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:pipeline -- path/to/ledger.csv --days=30 --focus=team",
    "npm run ops:day -- path/to/ledger.csv --days=30 --focus=team --url=https://happyreni.github.io/brief30-workfix-sprint",
    "npm run plan:proposal -- --buyer=김PM --use-case=팀 주간보고 --offer=team --url=https://happyreni.github.io/brief30-workfix-sprint",
    "npm run plan:quote-page -- path/to/prospect-note.txt --buyer=김PM --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:referrals -- path/to/ledger.csv --url=https://happyreni.github.io/brief30-workfix-sprint --referrals=path/to/referrals.txt --out=outreach/generated",
    "npm run plan:replies -- path/to/replies.txt --url=https://happyreni.github.io/brief30-workfix-sprint --offer=team",
    "npm run plan:team -- --buyer=김PM --company=OO팀 --approver=이팀장 --use-case=팀 주간보고 --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run plan:team-outreach -- path/to/team-contacts.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    buildMoneyPaidCommand({ ledgerPath: "path/to/ledger.csv" }),
    "npm run ops:recovery -- path/to/ledger.csv --payments=path/to/payment-text.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run payment:invoice -- --buyer=김PM --company=OO팀 --offer=team --use-case=팀 주간보고 --payment-route=\"은행명 실제계좌 예금주명\"",
    "npm run plan:objections -- path/to/objections.txt --url=https://happyreni.github.io/brief30-workfix-sprint --out=outreach/generated",
    "npm run audit:revenue -- path/to/ledger.csv"
  ].join("\n");
}
