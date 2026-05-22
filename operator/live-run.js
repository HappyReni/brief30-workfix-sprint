import { auditRevenueEvidence } from "./revenue-proof.js";
import { parseOperatorLedger } from "./close-plan.js";
import { buildMoneyNow, moneyNowAttachmentFiles, moneyNowFiles } from "./money-now.js";
import { buildMoneyPaid } from "./money-paid.js";
import { buildReplyClose, replyCloseAttachmentFiles, replyCloseFiles } from "./reply-close.js";
import { csvCell, formatKrw, TARGET_KRW } from "./model.js";
import { buildMoneyPaidCommand } from "./payment-command.js";
import { paymentRouteReady } from "../scripts/live-send-gate.mjs";

export function buildLiveRun(input = {}, options = {}) {
  const date = clean(options.date) || today();
  const month = clean(options.month) || date.slice(0, 7);
  const publicUrl = normalizeRoot(options.publicUrl || options.url || "https://happyreni.github.io/brief30-workfix-sprint/");
  const paymentRoute = clean(options.paymentRoute);
  const target = Number(options.target || TARGET_KRW);
  const ledgerText = String(input.ledgerText || "");
  const explicitPeopleText = String(input.peopleText || "");
  const replyText = String(input.replyText || "");
  const paymentText = String(input.paymentText || "");
  const derivedPeopleText = explicitPeopleText ? "" : peopleTextFromLedger(ledgerText);
  const peopleText = explicitPeopleText || derivedPeopleText;
  const peopleDerived = Boolean(derivedPeopleText);
  const peopleCount = countPeopleRows(peopleText);
  const routeReady = paymentRouteReady(paymentRoute);
  const moneyPaid = paymentText ? buildMoneyPaid(ledgerText, paymentText, { ...options, date, month, target, paymentRoute }) : null;
  const audit = moneyPaid?.auditResult || auditRevenueEvidence(ledgerText, { month, target, date: new Date(`${date}T00:00:00Z`) });
  const moneyNow = peopleText ? buildMoneyNow(peopleText, { ...options, date, publicUrl, paymentRoute, offline: true, zip: true, requirePayment: true }) : null;
  const replyClose = replyText ? buildReplyClose(replyText, { ...options, date, publicUrl, paymentRoute, offline: true, zip: true, requirePayment: true }) : null;
  const pack = {
    date,
    month,
    publicUrl,
    paymentRoute,
    routeReady,
    blocked: !routeReady,
    peopleDerived,
    peopleCount,
    target,
    ledgerPath: clean(options.ledgerPath || options.source),
    peoplePath: clean(options.peoplePath),
    replyPath: clean(options.replyPath),
    paymentPath: clean(options.paymentPath),
    audit,
    moneyPaid,
    moneyNow,
    replyClose
  };
  return { ...pack, actions: buildActions(pack), commandCsv: buildCommandCsv(pack) };
}

export function formatLiveRun(pack) {
  return [
    "# Brief30 live money run",
    "",
    `Date: ${pack.date}`,
    `Month: ${pack.month}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.routeReady ? pack.paymentRoute : "missing"}`,
    `Revenue: ${formatKrw(pack.audit.revenue)} / ${formatKrw(pack.target)}`,
    `Gap: ${formatKrw(pack.audit.gap)}`,
    `People source: ${pack.peoplePath || (pack.peopleDerived ? `ledger fallback (${pack.peopleCount} candidates)` : "none")}`,
    `Replies source: ${pack.replyPath || "none"}`,
    `Payments source: ${pack.paymentPath || "none"}`,
    "",
    "## Do now",
    ...pack.actions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Selected new buyer",
    ...moneyNowLines(pack.moneyNow, pack),
    "",
    "## Selected reply buyer",
    ...replyLines(pack.replyClose),
    "",
    "## Payment proof",
    ...paymentLines(pack.moneyPaid),
    "",
    "## Command CSV",
    "```csv",
    pack.commandCsv,
    "```",
    "",
    "This run is live-send oriented. It still counts revenue only after money:paid and audit:revenue prove current-month payment."
  ].join("\n");
}

export function liveRunFiles(pack) {
  const date = String(pack.date || today());
  return dedupeFiles([
    { name: `brief30-live-run-${date}.md`, content: `${formatLiveRun(pack)}\n` },
    { name: `brief30-live-run-commands-${date}.csv`, content: `${pack.commandCsv}\n` },
    ...sendTextFiles(pack),
    ...prefixedFiles("money-now", pack.moneyNow ? moneyNowFiles(pack.moneyNow) : []),
    ...prefixedFiles("money-reply", pack.replyClose ? replyCloseFiles(pack.replyClose, pack.replyPath) : [])
  ]);
}

export function liveRunZipSpecs(pack) {
  const specs = [];
  if (pack.moneyNow?.attachZip && pack.moneyNow?.closePack) {
    specs.push({
      name: pack.moneyNow.attachmentName,
      files: moneyNowAttachmentFiles(pack.moneyNow).map((file) => `money-now/${file.name}`)
    });
  }
  if (pack.replyClose?.attachZip && pack.replyClose?.closePack) {
    specs.push({
      name: pack.replyClose.attachmentName,
      files: replyCloseAttachmentFiles(pack.replyClose).map((file) => `money-reply/${file.name}`)
    });
  }
  return specs;
}

function buildActions(pack) {
  if (pack.blocked) {
    return [
      "P0 실제 결제 URL 또는 계좌/이메일을 먼저 넣습니다.",
      "P0 예: npm run prepare:seller -- --team=\"https://real-checkout.example/team\"",
      "P0 또는 money:live에 --payment-route=\"은행명 계좌번호 예금주\"를 넘깁니다."
    ];
  }
  const actions = [];
  if (pack.moneyPaid?.canMerge) {
    actions.push("P0 money:paid로 결제 증빙을 원장에 병합하고 audit:revenue 확인");
  }
  if (pack.audit.reached) {
    actions.push("P0 월 30 증빙은 이미 충족. 미납품 주문부터 fulfill:packet으로 처리");
    return actions;
  }
  if (pack.replyClose?.selected) {
    actions.push(`P1 money:reply 산출물로 ${pack.replyClose.selected.name}에게 결제 요청 발송`);
  }
  if (pack.moneyNow?.selected) {
    actions.push(`P1 money:now 산출물로 ${pack.moneyNow.selected.name}에게 300,000원 팀 스프린트 발송`);
  }
  if (!pack.replyClose?.selected && !pack.moneyNow?.selected) {
    actions.push("P1 people 파일에 warm buyer 10명 이상을 넣고 다시 실행");
  }
  actions.push("P2 답장/입금 문자는 다음 money:live 실행 때 --replies/--payments로 넣기");
  return actions;
}

function buildCommandCsv(pack) {
  const ledgerPath = pack.ledgerPath || "path/to/brief30-launch-ledger.csv";
  const peoplePath = pack.peoplePath || (pack.peopleDerived ? ledgerPath : "path/to/people.txt");
  const replyPath = pack.replyPath || "path/to/replies.txt";
  const paymentPath = pack.paymentPath || "path/to/payment-text.txt";
  const route = pack.paymentRoute ? ` --payment-route="${quoteArg(pack.paymentRoute)}"` : "";
  return [
    ["step", "ready", "command"],
    ["configure_payment", pack.routeReady ? "yes" : "no", paymentSetupCommand(pack)],
    ["money_paid", pack.moneyPaid?.canMerge ? "yes" : "no", buildMoneyPaidCommand({ ledgerPath, paymentTextPath: paymentPath, month: pack.month })],
    ["money_reply", pack.replyClose?.selected ? "yes" : "no", `npm run money:reply -- ${replyPath} --offline${route} --zip --require-payment --out=outreach/generated`],
    ["money_now", pack.moneyNow?.selected ? "yes" : "no", `npm run money:now -- ${peoplePath} --offline${route} --zip --require-payment --out=outreach/generated`],
    ["audit_revenue", "yes", `npm run audit:revenue -- ${ledgerPath} --month=${pack.month}`]
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function paymentSetupCommand(pack) {
  if (pack.routeReady) return `payment route provided in this run: ${pack.paymentRoute}`;
  return "npm run prepare:seller -- --team=\"https://real-checkout.example/team\"";
}

function moneyNowLines(pack, run) {
  if (!pack) return ["- people 파일과 원장 후보가 없습니다."];
  if (!pack.selected) return ["- 선택된 신규 buyer가 없습니다."];
  return [
    `- Buyer: ${pack.selected.name} / ${pack.selected.company}`,
    `- Source: ${run.peopleDerived ? `ledger fallback (${run.peopleCount} candidates)` : "people file"}`,
    `- Attachment: ${pack.attachmentName}`,
    `- First file: ${pack.closePack.closePage.fileName}`,
    `- Amount: ${formatKrw(pack.closePack.amount)}`
  ];
}

function replyLines(pack) {
  if (!pack) return ["- replies 파일이 없습니다."];
  if (!pack.selected) return ["- 결제 요청으로 전환할 reply가 없습니다."];
  return [
    `- Buyer: ${pack.selected.name}`,
    `- Attachment: ${pack.attachmentName}`,
    "",
    pack.selected.response
  ];
}

function paymentLines(pack) {
  if (!pack) return ["- payment proof 파일이 없습니다."];
  return [
    `- Ready rows: ${pack.evidencePack.ready.length}`,
    `- Review rows: ${pack.evidencePack.review.length}`,
    `- Would merge: ${pack.canMerge ? "yes" : "no"}`,
    `- Revenue after merge: ${formatKrw(pack.auditResult.revenue)}`
  ];
}

function sendTextFiles(pack) {
  const files = [];
  if (pack.moneyNow?.closePack) {
    files.push({ name: `brief30-live-run-money-now-${pack.date}.txt`, content: `${pack.moneyNow.closePack.buyerMessage}\n` });
  }
  if (pack.replyClose?.selected) {
    files.push({ name: `brief30-live-run-money-reply-${pack.date}.txt`, content: `${pack.replyClose.selected.response}\n` });
  }
  return files;
}

function prefixedFiles(prefix, files) {
  return files.map((file) => ({ ...file, name: `${prefix}/${file.name}` }));
}

function dedupeFiles(files) {
  const seen = new Set();
  return files.filter((file) => {
    if (seen.has(file.name)) return false;
    seen.add(file.name);
    return true;
  });
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function peopleTextFromLedger(ledgerText) {
  const leads = parseOperatorLedger(ledgerText).leads
    .filter((lead) => !["closed", "lost"].includes(lead.status))
    .slice(0, 30);
  if (!leads.length) return "";
  return [
    "name,company,role,relation,note",
    ...leads.map((lead) => [
      lead.name,
      companyFor(lead),
      roleFor(lead),
      lead.source || "direct_dm",
      noteFor(lead)
    ].map(csvCell).join(","))
  ].join("\n");
}

function companyFor(lead) {
  const match = String(lead.note || "").match(/([가-힣A-Za-z0-9]+팀|[가-힣A-Za-z0-9]+파트|[가-힣A-Za-z0-9]+실|[가-힣A-Za-z0-9]+랩)/u);
  return match?.[1] || "OO팀";
}

function roleFor(lead) {
  const text = [lead.segment, lead.note, lead.status].join(" ");
  if (/대표/u.test(text)) return "대표";
  if (/팀장|리드|PM|매니저|결재|승인|tester|replied/iu.test(text)) return "결재권자";
  return "팀 리드";
}

function noteFor(lead) {
  const status = lead.status ? `status ${lead.status}` : "";
  const offer = lead.offer ? `offer ${lead.offer}` : "";
  const teamHint = lead.offer === "team" || ["replied", "tester"].includes(lead.status)
    ? "300,000원 팀 예산 결재/승인 후보"
    : "팀 브리핑 업셀 후보";
  return [lead.segment, lead.note, offer, status, teamHint].filter(Boolean).join(" / ");
}

function countPeopleRows(text) {
  const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
  return Math.max(0, lines.length - 1);
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
