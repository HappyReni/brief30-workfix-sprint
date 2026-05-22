export const OFFER_LABELS = {
  self: "19,000원 셀프툴",
  setup: "49,000원 셋업팩",
  service: "99,000원 대행팩",
  team: "300,000원 팀 브리핑 스프린트"
};

export function parseReplies(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, reply] = splitReplyLine(line, index);
      return triageReply({ name, reply });
    });
}

export function triageReply(item) {
  const text = item.reply.toLowerCase();
  if (/(팀|부서|파트|조직|여러 명|여러명|승인|결재|품의|예산|월간|월례|브리핑|스프린트|300[, ]?000|30만)/u.test(text)) {
    return { ...item, type: "team", offer: "team", status: "tester", priority: 0 };
  }
  if (/(비싸|가격|얼마|할인|부담|애매)/u.test(text)) {
    return { ...item, type: "price", offer: "self", status: "replied", priority: 2 };
  }
  if (/(보안|자료|민감|회사|외부|유출|개인정보)/u.test(text)) {
    return { ...item, type: "privacy", offer: "setup", status: "replied", priority: 2 };
  }
  if (/(대신|대행|맡|해주|정리해|바빠|시간 없어)/u.test(text)) {
    return { ...item, type: "service", offer: "service", status: "tester", priority: 1 };
  }
  if (/(싫|필요 없|안 써|관심 없|괜찮)/u.test(text)) {
    return { ...item, type: "lost", offer: "setup", status: "lost", priority: 5 };
  }
  return { ...item, type: "interested", offer: "setup", status: "tester", priority: 1 };
}

export function buildResponse(row, urls, defaultOffer) {
  const offer = row.offer || defaultOffer || "setup";
  const orderUrl = urls.order[offer] || urls.order.setup;
  const closeUrl = buildCloseUrl(row, urls);
  const lines = {
    interested: [
      `${row.name}, 봐주셔서 감사합니다. 실제 업무 메모 1개로 확인하면 감이 제일 빠릅니다.`,
      `무료 진단: ${urls.diagnostic}`,
      `맞으면 ${OFFER_LABELS.setup}으로 첫 보고 포맷까지 같이 맞춰드릴게요.`,
      `주문/결제 요청: ${orderUrl}`,
      `제가 바로 결제 안내 문안 보내드리면 진행할까요? ${closeUrl}`
    ],
    price: [
      `${row.name}, 가격이 애매하면 셋업보다 ${OFFER_LABELS.self}로 먼저 보는 쪽이 낫습니다.`,
      `무료 진단: ${urls.diagnostic}`,
      `셀프툴 주문: ${urls.order.self}`,
      "반복해서 쓰게 되면 그때 셋업팩으로 업무 포맷을 같이 맞추면 됩니다."
    ],
    privacy: [
      `${row.name}, 보안 때문에 걱정되는 지점 이해했습니다.`,
      "Brief30은 로그인/API 없이 브라우저에서 실행되고, 그래도 회사명/고객명/실명/계약 금액은 지우고 넣는 기준으로 안내합니다.",
      `무료 진단: ${urls.diagnostic}`,
      `익명 메모 1개로 괜찮으면 ${OFFER_LABELS.setup}으로 첫 포맷만 같이 잡아드릴게요. ${orderUrl}`
    ],
    service: [
      `${row.name}, 직접 쓰는 툴보다 결과물이 필요하면 ${OFFER_LABELS.service}으로 진행하는 게 맞습니다.`,
      "업무 메모 3개를 받아서 보고서/회의록/후속 메일 포맷까지 정리해드립니다.",
      `대행팩 안내: ${urls.service}`,
      `직접 주문: ${urls.order.service}`,
      `바로 진행할 수 있게 결제/입금 안내 문안도 여기서 만들 수 있습니다: ${closeUrl}`
    ],
    team: [
      `${row.name}, 팀 단위로 승인 가능하면 ${OFFER_LABELS.team} 한 건으로 진행하는 쪽이 제일 빠릅니다.`,
      "익명화한 업무 메모를 최대 10개까지 받아서 주간 브리핑, 회의록, 리스크, 후속 액션 보드로 묶어드립니다.",
      `팀 주문 페이지: ${urls.order.team}`,
      `결제/입금 안내 문안: ${closeUrl}`,
      "진행 가능하면 결재권자 확인 후 주문번호가 보이게 결제 확인 메시지만 남겨주세요."
    ],
    lost: [
      `${row.name}, 확인 감사합니다. 지금은 맞지 않는 것으로 기록해둘게요.`,
      "나중에 주간보고/회의록 정리 시간이 다시 커지면 무료 진단만 먼저 보셔도 됩니다.",
      `무료 진단: ${urls.diagnostic}`
    ]
  };
  return lines[row.type].join("\n");
}

export function buildCloseQueue(rows, urls) {
  return rows
    .filter((row) => row.status === "tester")
    .map((row) => ({
      name: row.name,
      type: row.type,
      offer: row.offer,
      amount: offerAmount(row.offer),
      serviceUrl: row.offer === "service" ? urls.service : row.offer === "team" ? urls.order.team : "",
      closeUrl: buildCloseUrl(row, urls),
      prompt: `${row.name}에게 ${OFFER_LABELS[row.offer] || OFFER_LABELS.setup} 결제 요청`
    }));
}

export function buildCloseCsv(rows, urls) {
  return [
    ["name", "offer", "amount", "service_url", "close_url", "prompt"],
    ...buildCloseQueue(rows, urls).map((row) => [row.name, row.offer, row.amount, row.serviceUrl, row.closeUrl, row.prompt])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function applyOfferStrategy(row, defaultOffer) {
  const offer = normalizeOffer(defaultOffer);
  if (offer === "team" && row.status !== "lost") {
    return { ...row, offer: "team", status: "tester", type: "team", priority: 0 };
  }
  if (offer === "service" && row.type === "interested") {
    return { ...row, offer: "service", status: "tester", type: "service" };
  }
  return row;
}

export function buildUpdateCsv(rows) {
  return [
    ["name", "status", "offer", "next_touch", "note"],
    ...rows.map((row) => [row.name, row.status, row.offer, nextTouch(row.status), `${typeLabel(row.type)} / ${row.reply}`])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function normalizeUrls(root) {
  const base = String(root || "").trim().replace(/\/?$/u, "/");
  return {
    diagnostic: `${base}diagnostic/index.html`,
    close: {
      self: `${base}closing/index.html?offer=self`,
      setup: `${base}closing/index.html?offer=setup`,
      service: `${base}closing/index.html?offer=service`,
      team: `${base}closing/index.html?offer=team`
    },
    order: {
      self: `${base}order/index.html?offer=self`,
      setup: `${base}order/index.html?offer=setup`,
      service: `${base}order/index.html?offer=service`,
      team: `${base}order/index.html?offer=team`
    },
    service: `${base}service/index.html`
  };
}

function buildCloseUrl(row, urls) {
  const offer = row.offer || "setup";
  const base = urls.close[offer] || urls.close.setup;
  const params = new URLSearchParams({
    buyer: row.name,
    useCase: useCaseFor(row),
    source: "replydesk"
  });
  return `${base}&${params.toString()}`;
}

function useCaseFor(row) {
  if (row.type === "team") return "팀 주간보고/회의록 반복 정리";
  if (row.type === "service") return "고객사 업데이트";
  if (row.type === "privacy") return "주간보고";
  if (row.type === "price") return "주간보고";
  return "주간보고";
}

function offerAmount(offer) {
  return { self: 19000, setup: 49000, service: 99000, team: 300000 }[offer] || 49000;
}

export function typeLabel(type) {
  return {
    interested: "관심",
    price: "가격",
    privacy: "보안",
    service: "대행",
    team: "팀",
    lost: "보류"
  }[type] || "관심";
}

function splitReplyLine(line, index) {
  const separator = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ",";
  const [name, ...reply] = line.split(separator);
  return [name?.trim() || `Reply ${index + 1}`, reply.join(separator).trim() || line];
}

function nextTouch(status) {
  if (status === "lost") return "";
  const date = new Date();
  date.setDate(date.getDate() + (status === "tester" ? 1 : 2));
  return date.toISOString().slice(0, 10);
}

function normalizeOffer(value) {
  return OFFER_LABELS[value] ? value : "setup";
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}
