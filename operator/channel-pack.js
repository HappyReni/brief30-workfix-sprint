import { generateProspects, SEGMENTS, SOURCES } from "../prospecting/data.js";
import { buildAllMessages, buildOperatorCsv, buildOutboxRows, normalizeUrls } from "../outbox/messages.js";

const CHANNELS = {
  previous_client: {
    label: "기존 거래/동료",
    weight: 4,
    angle: "예전에 문서를 주고받은 사람에게 빠르게 재접촉",
    ask: "최근에도 보고/회의록 정리 시간이 걸리면 익명 메모 1개로 바로 진단해드리겠다고 묻습니다."
  },
  referral: {
    label: "소개 요청",
    weight: 4,
    angle: "직접 판매보다 문제 상황을 아는 사람 소개 요청",
    ask: "주간보고나 고객사 업데이트를 자주 쓰는 사람 1명만 떠오르는지 묻습니다."
  },
  direct_dm: {
    label: "직접 DM",
    weight: 3,
    angle: "이미 대화 가능한 사람에게 짧게 문제 확인",
    ask: "무료 진단 링크를 보내고 실제 업무에 쓸 상황이 있는지만 확인합니다."
  },
  community: {
    label: "커뮤니티 도움글",
    weight: 2,
    angle: "질문/고민글에 답변형으로 접근",
    ask: "홍보보다 before/after 예시와 익명 메모 진단을 먼저 줍니다."
  },
  social_post: {
    label: "소셜 포스트",
    weight: 2,
    angle: "반복 보고 시간을 줄이는 공개 글",
    ask: "댓글/DM으로 익명 메모 1개를 받아 무료 진단으로 넘깁니다."
  }
};

const FOCUS_SEGMENTS = {
  mixed: ["agency", "consultant", "freelancer", "office", "founder"],
  service: ["agency", "consultant", "freelancer"],
  team: ["office", "founder", "agency", "consultant"],
  setup: ["office", "founder", "consultant"],
  self: ["office", "freelancer", "founder"]
};

export function buildChannelPack(options = {}) {
  const count = boundedCount(options.count);
  const focus = normalizeFocus(options.focus);
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const sources = normalizeSources(options.sources);
  const segments = normalizeSegments(options.segments, FOCUS_SEGMENTS[focus]);
  const quotas = allocateQuotas(count, sources);
  const prospects = buildProspects({ focus, quotas, segments });
  const rows = buildOutboxRows(prospects, normalizeNames(options.names), normalizeUrls(publicUrl));

  return {
    date: options.date || today(),
    count,
    focus,
    publicUrl,
    sources,
    quotas,
    rows,
    expectedReplies: Math.max(1, Math.round(rows.length * 0.12)),
    channelBlocks: sources.filter((source) => quotas[source] > 0).map((source) => buildChannelBlock(source, publicUrl, focus, quotas[source])),
    operatorCsv: buildOperatorCsv(rows),
    messages: buildAllMessages(rows)
  };
}

export function formatChannelPack(pack) {
  return [
    "# Brief30 channel pack",
    "",
    `Date: ${pack.date}`,
    `Public URL: ${pack.publicUrl}`,
    `Focus: ${pack.focus}`,
    `Planned sends: ${pack.rows.length}`,
    `Expected replies: ${pack.expectedReplies}`,
    "",
    "## Channel quotas",
    ...pack.sources.map((source) => `- ${CHANNELS[source].label}: ${pack.quotas[source] || 0}`),
    "",
    "## Channel copy",
    ...pack.channelBlocks.map(formatChannelBlock),
    "",
    "## First 5 sends",
    ...pack.rows.slice(0, 5).map((row, index) => `${index + 1}. ${row.name} / ${row.offerLabel} / ${row.note}`),
    "",
    "## Copy block",
    pack.messages,
    "",
    "## Operator import CSV",
    "```csv",
    pack.operatorCsv,
    "```"
  ].join("\n");
}

export function channelPackFiles(pack) {
  const date = String(pack.date || today());
  return [
    {
      name: `brief30-channel-pack-${date}.md`,
      content: `${formatChannelPack(pack)}\n`
    },
    {
      name: `brief30-channel-messages-${date}.txt`,
      content: `${pack.messages}\n`
    },
    {
      name: `brief30-channel-import-${date}.csv`,
      content: `${pack.operatorCsv}\n`
    }
  ];
}

function buildProspects({ focus, quotas, segments }) {
  const counters = new Map();
  const rows = [];
  Object.entries(quotas).forEach(([source, quota], sourceIndex) => {
    for (let index = 0; index < quota; index += 1) {
      const segment = segments[(sourceIndex + index) % segments.length];
      const counterKey = `${source}:${segment}`;
      const nextCount = (counters.get(counterKey) || 0) + 1;
      counters.set(counterKey, nextCount);
      const offer = focus === "mixed" ? SEGMENTS[segment].offer : focus;
      const prospect = generateProspects({ segment, source, count: nextCount, offer }).at(-1);
      rows.push({ ...prospect, name: `${SOURCES[source].label}-${prospect.name}` });
    }
  });
  return rows;
}

function buildChannelBlock(source, publicUrl, focus, quota) {
  const channel = CHANNELS[source];
  const urls = normalizeUrls(publicUrl);
  const offerLine = focus === "team"
    ? "300,000원 팀 브리핑 스프린트"
    : focus === "service"
      ? "99,000원 대행팩"
      : focus === "self"
        ? "19,000원 셀프툴"
        : "49,000원 셋업팩";
  const proofLine = focus === "team"
    ? `팀 샘플: ${urls.teamSample}\n팀 주문: ${urls.order.team}\n팀 진행룸: ${urls.dealroom}?offer=team`
    : `결과 예시: ${urls.proof}`;
  const askLine = focus === "team"
    ? "팀 예산으로 한 번에 닫을 수 있으면 승인자, 청구, 증빙, 메모 전달까지 진행룸에서 바로 확인하게 합니다."
    : channel.ask;
  return {
    label: channel.label,
    quota,
    action: channel.angle,
    copy: [
      `[Brief30] ${channel.label}용 짧은 문안`,
      "",
      "요즘 보고서/회의록/고객사 업데이트 정리에 시간이 계속 쓰이면, 회사명 지운 메모 1개로 바로 진단해드릴게요.",
      `무료 진단: ${urls.diagnostic}`,
      proofLine,
      `${offerLine}까지 필요하면 첫 결과물 기준으로 바로 맞춰드립니다.`,
      "",
      askLine
    ].join("\n")
  };
}

function formatChannelBlock(block) {
  return [
    `### ${block.label} / ${block.quota}건`,
    "",
    `Action: ${block.action}`,
    "",
    block.copy
  ].join("\n");
}

function allocateQuotas(count, sources) {
  const totalWeight = sources.reduce((sum, source) => sum + CHANNELS[source].weight, 0);
  const quotas = Object.fromEntries(sources.map((source) => [source, Math.floor((count * CHANNELS[source].weight) / totalWeight)]));
  let assigned = Object.values(quotas).reduce((sum, quota) => sum + quota, 0);
  const remainderOrder = [...sources].sort((a, b) => remainder(b, count, totalWeight) - remainder(a, count, totalWeight));
  let cursor = 0;
  while (assigned < count) {
    quotas[remainderOrder[cursor % remainderOrder.length]] += 1;
    assigned += 1;
    cursor += 1;
  }
  return quotas;
}

function remainder(source, count, totalWeight) {
  const exact = (count * CHANNELS[source].weight) / totalWeight;
  return exact - Math.floor(exact);
}

function normalizeSources(value) {
  const items = String(value || Object.keys(CHANNELS).join(",")).split(",").map(clean).filter(Boolean);
  const valid = items.filter((item) => CHANNELS[item]);
  return valid.length ? [...new Set(valid)] : Object.keys(CHANNELS);
}

function normalizeSegments(value, fallback) {
  const items = String(value || "").split(",").map(clean).filter((item) => SEGMENTS[item]);
  return items.length ? items : fallback;
}

function normalizeNames(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "").split(/\r?\n|,/u).map(clean).filter(Boolean);
}

function normalizeFocus(value) {
  return ["mixed", "service", "team", "setup", "self"].includes(value) ? value : "service";
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
}

function boundedCount(value) {
  return Math.max(1, Math.min(80, Number(value || 30)));
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
