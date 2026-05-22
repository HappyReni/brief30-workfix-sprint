const OFFER_LABELS = {
  self: "19,000원 셀프툴",
  setup: "49,000원 셋업팩",
  service: "99,000원 대행팩",
  team: "300,000원 팀 브리핑 스프린트"
};

export function buildOutboxRows(prospects, names, urls) {
  return prospects.map((prospect, index) => {
    const name = names[index % names.length] || prospect.name;
    const offerLabel = OFFER_LABELS[prospect.offer] || OFFER_LABELS.setup;
    const dealRoomUrl = buildDealRoomUrl(urls, { ...prospect, name });
    const message = buildMessage({ ...prospect, name, offerLabel, dealRoomUrl, urls }, index);
    return {
      ...prospect,
      id: `${prospect.segment}-${prospect.role}-${index}`,
      name,
      offerLabel,
      dealRoomUrl,
      message,
      note: buildOperatorNote(prospect)
    };
  });
}

export function buildMessage({ name, role, pain, offer, offerLabel, dealRoomUrl, urls }, index) {
  const opener = index % 3 === 0 ? "혹시" : index % 3 === 1 ? "갑자기 DM 죄송합니다." : "짧게 여쭙습니다.";
  const ask =
    offer === "team"
      ? "팀 예산으로 한 번에 닫을 수 있으면 개인 진행룸에서 승인, 청구, 증빙, 메모 전달까지 바로 확인할 수 있습니다."
      : offer === "service"
      ? "툴을 배울 시간이 없으면 대행팩으로 첫 메모 3개를 제가 정리해드립니다."
      : offer === "self"
        ? "혼자 써볼 수 있으면 셀프툴로 먼저 열어두었습니다."
        : "맞으면 첫 업무 메모 1개를 셋업팩으로 같이 맞춰드립니다.";
  const proofLine =
    offer === "team"
      ? `팀 샘플: ${urls.teamSample}`
      : offer === "service"
      ? `대행팩 안내: ${urls.service}`
      : `결과 예시: ${urls.proof}`;

  return [
    `${name}, ${opener} ${role} 업무 중 ${pain} 정리에 시간 많이 쓰시나요?`,
    "Brief30이라는 로컬 브라우저 도구를 테스트 중입니다. 회사명/고객명을 지운 메모 1개를 넣으면 3줄 요약과 보고서 미리보기가 바로 나옵니다.",
    `무료 진단: ${urls.diagnostic}`,
    proofLine,
    `${offerLabel}: ${offerUrl(urls, offer)}`,
    offer === "team" ? `개인 진행룸: ${dealRoomUrl}` : "",
    ask,
    "10분만 보고 실제 업무에 쓸 상황이 있는지 알려주시면 됩니다."
  ].filter(Boolean).join("\n");
}

export function buildOperatorCsv(rows) {
  return [
    ["name", "segment", "source", "offer", "status", "next_touch", "note"],
    ...rows.map((row) => [row.name, row.segment, row.source, row.offer, "contacted", nextTouchDate(), row.note])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildAllMessages(rows) {
  return rows.map((row, index) => `[${String(index + 1).padStart(2, "0")}] ${row.name}\n${row.message}`).join("\n\n");
}

export function normalizeUrls(root) {
  const base = root.trim().replace(/\/?$/u, "/");
  return {
    hub: base,
    diagnostic: `${base}diagnostic/index.html`,
    proof: `${base}proof/index.html`,
    teamSample: `${base}team/sample.html`,
    order: {
      self: `${base}order/index.html?offer=self`,
      setup: `${base}order/index.html?offer=setup`,
      service: `${base}order/index.html?offer=service`,
      team: `${base}order/index.html?offer=team`
    },
    dealroom: `${base}dealroom/index.html`,
    service: `${base}service/index.html`
  };
}

function offerUrl(urls, offer) {
  if (offer === "service") return urls.service;
  if (offer === "team") return urls.order.team;
  return urls.order[offer] || urls.order.setup;
}

function buildOperatorNote(prospect) {
  const closeHint =
    prospect.offer === "team"
      ? "팀 스프린트 진행룸 발송. 승인/예산 답장이면 바로 결제 루트 확인."
      : prospect.offer === "service"
        ? "대행팩 페이지 발송. 시간 부족/결과물 필요 답장이면 바로 결제 요청."
        : "Outbox 발송 대상.";
  return `${prospect.role} / ${prospect.pain}. ${closeHint}`;
}

function buildDealRoomUrl(urls, prospect) {
  const params = new URLSearchParams({
    offer: prospect.offer || "setup",
    buyer: prospect.name || "",
    useCase: `${prospect.role || ""} ${prospect.pain || ""}`.trim()
  });
  return `${urls.dealroom}?${params.toString()}`;
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function nextTouchDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
