import { OFFERS, formatKrw } from "./model.js";
import { parseActionLeads } from "./sales-action.js";

const STATUS_PRIORITY = {
  tester: 90,
  replied: 78,
  contacted: 46,
  prospect: 16
};

const SOURCE_PRIORITY = {
  referral: 18,
  previous_client: 16,
  direct_dm: 10,
  community: 6,
  social_post: 5
};

export function buildFollowupPack(text = "", options = {}) {
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const date = options.date || today();
  const statuses = normalizeStatuses(options.status || options.statuses);
  const limit = boundedLimit(options.limit);
  const paymentRoute = clean(options.paymentRoute);
  const leads = parseActionLeads(text);
  const followups = rankLeads(leads, statuses, date)
    .slice(0, limit)
    .map((lead) => followupFromLead(lead, { publicUrl, paymentRoute, date }));

  return {
    source: options.source || "",
    date,
    publicUrl,
    paymentRoute,
    paymentReady: Boolean(paymentRoute),
    leads,
    statuses,
    followups,
    statusCounts: countStatuses(followups),
    updateCsv: buildUpdateCsv(followups)
  };
}

export function formatFollowupPack(pack) {
  return [
    "# Brief30 follow-up pack",
    "",
    `Date: ${pack.date}`,
    `Source: ${pack.source || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentReady ? pack.paymentRoute : "missing"}`,
    `Leads parsed: ${pack.leads.length}`,
    `Follow-ups: ${pack.followups.length}`,
    "",
    "## Status mix",
    ...statusLines(pack.statusCounts),
    "",
    "## Send now",
    ...sendBlocks(pack.followups),
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Commands",
    ...commandLines(pack)
  ].join("\n");
}

export function followupPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    {
      name: `brief30-followups-${date}.md`,
      content: `${formatFollowupPack(pack)}\n`
    },
    {
      name: `brief30-followup-updates-${date}.csv`,
      content: `${pack.updateCsv}\n`
    }
  ];
}

function followupFromLead(lead, context) {
  const status = normalizeStatus(lead.status);
  const offer = normalizeOffer(lead.offer);
  const nextTouch = nextTouchDate(status, context.date);
  const closeUrl = buildCloseUrl(lead, offer, context.publicUrl);
  const serviceUrl = `${context.publicUrl}service/index.html`;
  const diagnosticUrl = `${context.publicUrl}diagnostic/index.html`;
  const orderUrl = `${context.publicUrl}order/index.html?offer=${offer}`;
  const message = messageForStatus({
    lead,
    status,
    offer,
    closeUrl,
    serviceUrl,
    diagnosticUrl,
    orderUrl,
    paymentRoute: context.paymentRoute
  });

  return {
    ...lead,
    status,
    offer,
    nextTouch,
    closeUrl,
    message,
    updateStatus: status === "prospect" ? "contacted" : status
  };
}

function messageForStatus({ lead, status, offer, closeUrl, serviceUrl, diagnosticUrl, orderUrl, paymentRoute }) {
  if (status === "tester") {
    return closeNudge(lead, offer, closeUrl, paymentRoute, "테스트 이야기드린 건 오늘 진행 가능하실까요?");
  }
  if (status === "replied") {
    return closeNudge(lead, offer, closeUrl, paymentRoute, "관심 주신 내용 기준으로 다음 단계만 짧게 정리드립니다.");
  }
  if (status === "contacted") {
    return softNudge(lead, offer, { diagnosticUrl, serviceUrl, orderUrl });
  }
  return prospectNudge(lead, offer, diagnosticUrl);
}

function closeNudge(lead, offer, closeUrl, paymentRoute, opener) {
  const routeLine = paymentRoute
    ? `결제/입금 안내: ${paymentRoute}`
    : "결제/입금 안내: 진행 의사 확인되면 바로 보내겠습니다.";
  return [
    `${lead.name}, ${opener}`,
    `${offerLabel(offer)} 기준으로 진행하면 됩니다.`,
    `업무 상황: ${lead.note || lead.segment || "업무 메모 정리"}`,
    `견적/제출 링크: ${closeUrl}`,
    routeLine,
    "오늘 가능하면 '진행'이라고 답 주시고, 어렵다면 보류라고만 알려주세요."
  ].join("\n");
}

function softNudge(lead, offer, urls) {
  const offerUrl = offer === "service" ? urls.serviceUrl : urls.orderUrl;
  const ask =
    offer === "service"
      ? "툴 사용보다 결과물이 필요하면 첫 메모 3개를 제가 정리하는 쪽이 빠릅니다."
      : "맞으면 첫 메모 1개 기준으로 바로 써먹을 포맷까지 맞춰드릴 수 있습니다.";
  return [
    `${lead.name}, 어제 보낸 Brief30 관련해서 한 번만 더 여쭙습니다.`,
    `${lead.note || lead.segment || "반복 보고/회의록 정리"} 쪽이면 무료 진단으로 감만 봐도 충분합니다.`,
    `무료 진단: ${urls.diagnosticUrl}`,
    `${offerLabel(offer)}: ${offerUrl}`,
    ask,
    "필요 없으면 보류라고 답 주셔도 됩니다."
  ].join("\n");
}

function prospectNudge(lead, offer, diagnosticUrl) {
  return [
    `${lead.name}, 혹시 ${lead.note || lead.segment || "업무 메모 정리"} 관련 업무는 아직 자주 하시나요?`,
    "Brief30은 브라우저에서만 돌아가는 업무 메모 정리 도구라 민감한 내용을 외부 서비스에 넣지 않아도 됩니다.",
    `무료 진단: ${diagnosticUrl}`,
    `${offerLabel(offer)} 기준으로 필요하면 오늘 바로 맞춰드릴게요.`
  ].join("\n");
}

function rankLeads(leads, statuses, date) {
  return [...leads]
    .filter((lead) => statuses.includes(normalizeStatus(lead.status)))
    .filter((lead) => !["closed", "lost"].includes(normalizeStatus(lead.status)))
    .sort((a, b) => scoreLead(b, date) - scoreLead(a, date));
}

function scoreLead(lead, date) {
  const status = normalizeStatus(lead.status);
  const offer = normalizeOffer(lead.offer);
  const offerScore = offer === "team" ? 70 : offer === "service" ? 34 : offer === "setup" ? 18 : 6;
  const dueScore = !lead.nextTouch || lead.nextTouch <= date ? 14 : 0;
  return (STATUS_PRIORITY[status] || 0) + (SOURCE_PRIORITY[lead.source] || 0) + offerScore + dueScore;
}

function buildUpdateCsv(followups) {
  const rows = [
    ["name", "status", "offer", "next_touch", "note"],
    ...followups.map((item) => [
      item.name,
      item.updateStatus,
      item.offer,
      item.nextTouch,
      `follow-up sent / ${item.note || ""}`.trim()
    ])
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCloseUrl(lead, offer, publicUrl) {
  const params = new URLSearchParams({
    offer,
    buyer: lead.name || "",
    useCase: useCaseForOffer(offer),
    source: "followup-pack"
  });
  return `${publicUrl}closing/index.html?${params.toString()}`;
}

function useCaseForOffer(offer) {
  if (offer === "team") return "팀 주간보고/회의록 반복 정리";
  if (offer === "service") return "업무 메모 3개 정리";
  return "첫 업무 메모 셋업";
}

function commandLines(pack) {
  const first = pack.followups[0];
  const buyer = first?.name || "김PM";
  const offer = first?.offer || "service";
  return [
    `npm run plan:proposal -- --buyer="${quoteArg(buyer)}" --use-case=주간보고 --offer=${offer} --url=${pack.publicUrl}`,
    "npm run ledger:merge -- path/to/ledger.csv path/to/close-evidence.csv --out=path/to/ledger.csv",
    "npm run audit:revenue -- path/to/ledger.csv"
  ];
}

function sendBlocks(followups) {
  if (!followups.length) {
    return ["후속 발송 후보가 없습니다. 먼저 plan:send 또는 replydesk로 contacted/replied/tester 리드를 만드세요."];
  }
  return followups.map((item, index) => [
    `### ${index + 1}. ${item.name} / ${item.status} / ${offerLabel(item.offer)} / next ${item.nextTouch}`,
    "",
    item.message
  ].join("\n"));
}

function statusLines(counts) {
  const rows = Object.entries(counts);
  return rows.length ? rows.map(([status, count]) => `- ${status}: ${count}`) : ["- no follow-ups"];
}

function countStatuses(items) {
  return items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
}

function normalizeStatuses(value) {
  const raw = String(value || "tester,replied,contacted")
    .split(",")
    .map((item) => normalizeStatus(item))
    .filter((item) => ["tester", "replied", "contacted", "prospect"].includes(item));
  return raw.length ? [...new Set(raw)] : ["tester", "replied", "contacted"];
}

function nextTouchDate(status, date) {
  const days = status === "tester" || status === "replied" ? 1 : 2;
  return addDaysFrom(date, days);
}

function addDaysFrom(date, days) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return today();
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return value.toISOString().slice(0, 10);
}

function offerLabel(offer) {
  const info = OFFERS[offer] || OFFERS.setup;
  return info.label || formatKrw(info.price);
}

function quoteArg(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function normalizeOffer(value) {
  return OFFERS[value] ? value : "setup";
}

function normalizeStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status.includes("tester")) return "tester";
  if (status.includes("replied")) return "replied";
  if (status.includes("contacted")) return "contacted";
  if (status.includes("closed")) return "closed";
  if (status.includes("lost")) return "lost";
  return "prospect";
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function boundedLimit(value) {
  return Math.max(1, Math.min(40, Number(value || 12)));
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
