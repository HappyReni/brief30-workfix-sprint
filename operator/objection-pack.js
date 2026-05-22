import { CLOSE_OFFERS } from "../closing/followup.js";
import { csvCell } from "./model.js";

const TYPES = {
  approval: {
    label: "내부승인",
    offer: "service",
    status: "tester",
    pattern: /(승인|결재|품의|견적|영수증|증빙|회사|팀 비용|처리|세금계산서)/u
  },
  payment: {
    label: "결제방법",
    offer: "service",
    status: "tester",
    pattern: /(입금|계좌|카드|결제|송금|주문|구매)/u
  },
  privacy: {
    label: "보안",
    offer: "setup",
    status: "replied",
    pattern: /(보안|민감|자료|외부|유출|개인정보|회사 정책)/u
  },
  price: {
    label: "가격",
    offer: "self",
    status: "replied",
    pattern: /(비싸|가격|얼마|할인|부담|애매|예산)/u
  },
  timing: {
    label: "납기",
    offer: "service",
    status: "tester",
    pattern: /(언제|오늘|내일|가능|납기|시간|급|빨리)/u
  },
  scope: {
    label: "범위",
    offer: "setup",
    status: "tester",
    pattern: /(범위|어디까지|포함|수정|몇 개|분량|메모)/u
  }
};

export function buildObjectionPack(text = "", options = {}) {
  const publicUrl = normalizeRoot(options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const defaultOffer = normalizeOffer(options.offer || "service");
  const rows = parseObjections(text)
    .map((row) => classifyObjection(row, defaultOffer))
    .map((row) => ({ ...row, response: buildResponse(row, { ...options, publicUrl }) }));

  return {
    source: options.source || "",
    publicUrl,
    paymentRoute: clean(options.paymentRoute),
    defaultOffer,
    rows,
    updateCsv: buildUpdateCsv(rows),
    commandCsv: buildCommandCsv(rows, { publicUrl, paymentRoute: options.paymentRoute })
  };
}

export function formatObjectionPack(pack) {
  return [
    "# Brief30 objection pack",
    "",
    `Source: ${pack.source || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Payment route: ${pack.paymentRoute || "missing"}`,
    `Objections: ${pack.rows.length}`,
    "",
    "## Responses",
    ...pack.rows.map(responseBlock),
    "",
    "## Operator update CSV",
    "```csv",
    pack.updateCsv,
    "```",
    "",
    "## Next command CSV",
    "```csv",
    pack.commandCsv,
    "```"
  ].join("\n");
}

export function objectionPackFiles(pack) {
  const date = today();
  return [
    {
      name: `brief30-objection-pack-${date}.md`,
      content: `${formatObjectionPack(pack)}\n`
    },
    {
      name: `brief30-objection-updates-${date}.csv`,
      content: `${pack.updateCsv}\n`
    },
    {
      name: `brief30-objection-commands-${date}.csv`,
      content: `${pack.commandCsv}\n`
    }
  ];
}

function parseObjections(text) {
  return String(text || "").split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
    const [name, ...rest] = line.split(separator);
    return {
      name: clean(name) || `Lead ${index + 1}`,
      text: clean(rest.join(separator)) || line
    };
  });
}

function classifyObjection(row, defaultOffer) {
  const type = Object.entries(TYPES).find(([, info]) => info.pattern.test(row.text))?.[0] || "scope";
  const info = TYPES[type];
  return {
    ...row,
    type,
    label: info.label,
    offer: offerForType(type, info.offer, defaultOffer),
    status: info.status
  };
}

function buildResponse(row, options) {
  const offer = CLOSE_OFFERS[row.offer] || CLOSE_OFFERS.service;
  const approvalCommand = approvalCommandFor(row, options);
  const procurementCommand = procurementCommandFor(row, options);
  const proposalCommand = proposalCommandFor(row, options.publicUrl);
  const approvalNext = row.offer === "team" ? procurementCommand : approvalCommand;
  const shared = [
    `${row.name}, 말씀하신 부분 기준으로 짧게 정리드립니다.`,
    `현재 제안: ${offer.label}`,
    `다음 단계: ${nextStep(row, approvalNext, proposalCommand)}`
  ];
  const lines = {
    approval: [
      ...shared,
      "",
      "회사/팀 내부 공유용으로는 승인 메모, 보안/개인정보 메모, 결제 요청 문구를 한 번에 드릴 수 있습니다.",
      "세금계산서처럼 공식 발행이 필요한 문서는 실제 발행 가능 여부를 먼저 확인해야 합니다.",
      row.offer === "team" ? `구매요청/조달팩 생성: ${procurementCommand}` : `바로 만들 명령: ${approvalCommand}`
    ],
    payment: [
      ...shared,
      "",
      options.paymentRoute ? `입금/결제 안내는 ${options.paymentRoute} 입니다.` : "결제 루트는 실제 계좌/결제 URL 확인 후 보내겠습니다.",
      `주문번호 포함 결제 요청 생성: ${proposalCommand}`
    ],
    privacy: [
      ...shared,
      "",
      "Brief30은 로그인/API 없이 브라우저에서 실행됩니다. 그래도 회사명, 고객명, 실명, 계약 금액은 지우고 넣는 기준으로 진행합니다.",
      `익명 메모 1개만 먼저 확인: ${options.publicUrl}diagnostic/index.html`
    ],
    price: [
      ...shared,
      "",
      "금액이 부담되면 바로 상위 옵션을 강요하지 않고 19,000원 셀프툴 또는 49,000원 셋업팩으로 낮춰서 시작할 수 있습니다.",
      `낮춘 제안/결제 요청 생성: ${proposalCommand}`
    ],
    timing: [
      ...shared,
      "",
      "대행팩은 입금 확인 후 24시간 이내 전달 기준으로 잡겠습니다. 급하면 메모 1개부터 먼저 받고 나머지는 이어서 정리합니다.",
      `진행 확인 문안 생성: ${proposalCommand}`
    ],
    scope: [
      ...shared,
      "",
      "범위는 익명 메모 기준으로 잡고, 결과 확인 후 수정 요청 1회까지 포함합니다.",
      `견적/범위 문안 생성: ${proposalCommand}`
    ]
  };
  return lines[row.type].join("\n");
}

function nextStep(row, approvalCommand, proposalCommand) {
  if (row.type === "approval" && row.offer === "team") return `구매요청/승인 자료 발송 (${approvalCommand})`;
  if (row.type === "approval") return `내부 공유용 승인 메모 발송 (${approvalCommand})`;
  if (row.type === "privacy") return "익명 메모 1개로 무료 진단 후 결제 요청";
  return `결제 요청 또는 낮춘 제안 발송 (${proposalCommand})`;
}

function buildUpdateCsv(rows) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    ...rows.map((row) => [row.name, row.status, row.offer, nextTouch(row.status), `${row.label} / ${row.text}`])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildCommandCsv(rows, options) {
  return [
    ["name", "type", "command"],
    ...rows.map((row) => [
      row.name,
      row.type,
      commandFor(row, options)
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

function responseBlock(row, index) {
  return [
    `### ${index + 1}. ${row.name} / ${row.label} / ${row.offer}`,
    "",
    row.response
  ].join("\n");
}

function proposalCommandFor(row, publicUrl) {
  return `npm run plan:proposal -- --buyer="${quoteArg(row.name)}" --use-case=주간보고 --offer=${row.offer} --url=${publicUrl}`;
}

function commandFor(row, options) {
  if (row.type === "approval" && row.offer === "team") return procurementCommandFor(row, options);
  if (row.type === "approval") return approvalCommandFor(row, options);
  return proposalCommandFor(row, options.publicUrl);
}

function procurementCommandFor(row, options) {
  const route = clean(options.paymentRoute) ? ` --payment-route="${quoteArg(options.paymentRoute)}"` : "";
  const url = clean(options.publicUrl) ? ` --url=${options.publicUrl}` : "";
  return `npm run plan:procurement -- --buyer="${quoteArg(row.name)}" --company=OO팀 --approver=결재권자 --use-case=주간보고${url}${route}`;
}

function approvalCommandFor(row, options) {
  const route = clean(options.paymentRoute) ? ` --payment-route="${quoteArg(options.paymentRoute)}"` : "";
  const url = clean(options.publicUrl) ? ` --url=${options.publicUrl}` : "";
  return `npm run plan:approval -- --buyer="${quoteArg(row.name)}" --offer=${row.offer} --use-case=주간보고${url}${route}`;
}

function nextTouch(status) {
  if (status === "lost") return "";
  const date = new Date();
  date.setDate(date.getDate() + (status === "tester" ? 1 : 2));
  return date.toISOString().slice(0, 10);
}

function normalizeOffer(value) {
  return CLOSE_OFFERS[value] ? value : "service";
}

function offerForType(type, fallbackOffer, defaultOffer) {
  if (defaultOffer === "team" && ["approval", "payment", "timing", "scope"].includes(type)) {
    return "team";
  }
  return normalizeOffer(type === "scope" ? defaultOffer : fallbackOffer);
}

function normalizeRoot(value) {
  const root = clean(value) || "https://happyreni.github.io/brief30-workfix-sprint/";
  return root.endsWith("/") ? root : `${root}/`;
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
