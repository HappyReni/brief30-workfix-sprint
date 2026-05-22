export const OUTPUTS = {
  weekly: { label: "주간보고", sections: ["요약", "진행", "리스크", "다음 액션"] },
  minutes: { label: "회의록", sections: ["논의 내용", "결정 사항", "액션 아이템", "남은 질문"] },
  client: { label: "고객사 업데이트", sections: ["완료된 일", "진행 중", "확인 요청", "다음 일정"] },
  followup: { label: "후속 메일", sections: ["메일 목적", "핵심 메시지", "요청 사항", "마감/다음 단계"] },
  risk: { label: "리스크 보고", sections: ["리스크", "영향", "완화책", "결정 필요"] }
};

const OFFER_NOTES = {
  self: "셀프툴 구매자에게 실행 방법과 예시 사용 순서를 짧게 전달합니다.",
  setup: "첫 메모 1개를 정리하고 반복 사용 포맷을 제안합니다.",
  service: "메모 3개까지 대신 정리하고 다음 반복 보고 포맷을 제안합니다.",
  team: "팀 메모 10개까지 정리하고 4주 브리핑 흐름과 실행 액션 보드를 제안합니다."
};

export function buildPacket(data) {
  const output = OUTPUTS[normalizeOutput(data.output)] || OUTPUTS.weekly;
  const memos = splitMemos(data.memo || "", data.offer);
  const buyer = data.buyer || "구매자";
  const orderRef = data.orderRef || "주문번호";
  const audience = data.audience || "보고 대상";
  const offerNote = OFFER_NOTES[data.offer] || OFFER_NOTES.setup;
  const offerLabel = data.offerLabel || offerNote;
  const result = buildResultPack(output, memos, audience);

  return {
    email: [
      `${buyer}님, Brief30 구매 감사합니다.`,
      "",
      `주문번호 ${orderRef} 기준으로 요청하신 ${output.label} 초안을 정리했습니다.`,
      `${offerNote} 처리 메모 수: ${memos.length}개.`,
      "",
      "첨부/전달 항목:",
      "- Brief30 buyer package",
      `- ${output.label} 초안`,
      "- 반복 사용 가이드",
      "",
      "민감한 정보는 제거한 상태로 최종 전송 전 한 번 더 확인해주세요."
    ].join("\n"),
    result,
    setup: [
      `# ${buyer}님 반복 포맷 제안`,
      "",
      `주문번호: ${orderRef}`,
      `구매 오퍼: ${offerLabel}`,
      `추천 출력: ${output.label}`,
      `보고 대상: ${audience}`,
      `원하는 톤: ${data.tone || "간결하게"}`,
      `반드시 포함할 내용: ${data.must || "숫자, 결정 필요 사항, 다음 액션"}`,
      "",
      "Brief30 입력 팁:",
      "- 날짜/숫자/상태를 줄 단위로 붙여넣기",
      "- 결정 필요 사항은 '결정 필요:'로 표시",
      "- 리스크는 영향과 완화책을 함께 적기",
      "",
      `이번 구매 처리 메모: ${offerNote}`
    ].join("\n"),
    checklist: [
      "1. 원문에서 회사명, 고객명, 개인정보 제거 여부 확인",
      `2. 운영판 Payment evidence에 ${orderRef} 기록`,
      `3. ${output.label} 초안과 Brief30 파일 전달`,
      `4. 마감 희망(${data.deadline || "24시간 이내"}) 안에 전송`,
      "5. 3일 뒤 사용 여부 follow-up",
      "6. 반복 사용 의사가 있으면 셋업팩 후기 또는 다음 메모 요청"
    ].join("\n")
  };
}

export function parseIntakeMessage(value) {
  const source = String(value || "");
  return {
    buyer: field(source, "구매자"),
    orderRef: intakeRef(source),
    offer: normalizeOffer(field(source, "구매 오퍼")),
    output: normalizeOutput(field(source, "원하는 결과물")),
    audience: field(source, "보고 대상"),
    tone: field(source, "원하는 톤"),
    must: field(source, "반드시 포함할 내용"),
    deadline: field(source, "마감 희망"),
    memo: memoBody(source)
  };
}

export function splitMemos(value, offer = "setup") {
  const cleaned = String(value || "").trim();
  if (!cleaned) {
    return ["원문 메모가 비어 있습니다."];
  }
  const marked = cleaned.replace(/(?:^|\n)\s*(?:---+|#{1,3}\s*메모\s*\d+|메모\s*\d+\s*:)\s*\n/giu, "\n\n");
  const chunks = marked
    .split(/\n{2,}/u)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const limit = offer === "team" ? 10 : offer === "service" ? 3 : 1;
  return chunks.slice(0, limit);
}

function buildResultPack(output, memos, audience) {
  if (memos.length === 1) {
    return buildResult(output, parseMemo(memos[0]), audience, 1, false);
  }
  return [
    `# ${output.label} 대행팩 초안`,
    "",
    `대상: ${audience}`,
    "",
    ...memos.map((memo, index) => buildResult(output, parseMemo(memo), audience, index + 1, true))
  ].join("\n");
}

function buildResult(output, parsed, audience, index, nested) {
  const heading = nested ? "##" : "#";
  const section = nested ? "###" : "##";
  const [a, b, c, d] = output.sections;
  return [
    `${heading} ${nested ? `메모 ${index} - ` : ""}${output.label} 초안`,
    "",
    nested ? "" : `대상: ${audience}`,
    nested ? "" : "",
    `${section} ${a}`,
    `- ${first(parsed.progress, "핵심 진행 내용을 정리했습니다.")}`,
    `- ${metricLine(parsed)}`,
    "",
    `${section} ${b}`,
    ...list(parsed.progress.slice(1, 4), "추가 진행 항목은 원문 메모 보강 후 반영합니다."),
    "",
    `${section} ${c}`,
    ...list(parsed.risks, "현재 명확한 리스크는 없습니다."),
    "",
    `${section} ${d}`,
    ...list(parsed.actions, "다음 액션을 1개 이상 확정하세요.")
  ].filter((line) => line !== null).join("\n");
}

function parseMemo(value) {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    progress: lines.filter((line) => !isRisk(line) && !isAction(line)),
    risks: lines.filter(isRisk),
    actions: lines.filter(isAction),
    metrics: lines.filter((line) => /\d|%|원|건|명|회/u.test(line))
  };
}

function field(source, label) {
  const match = source.match(new RegExp(`${label}:\\s*([^\\n]+)`, "u"));
  return match?.[1]?.trim() || "";
}

function memoBody(source) {
  const marker = "원문 메모:";
  const index = source.indexOf(marker);
  return index >= 0 ? source.slice(index + marker.length).trim() : "";
}

function intakeRef(source) {
  const match = source.match(/\[Brief30 intake\]\s*([^\n]+)/u);
  return match?.[1]?.trim() || field(source, "주문번호");
}

function normalizeOutput(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("회의") || text.includes("minutes")) return "minutes";
  if (text.includes("고객") || text.includes("client")) return "client";
  if (text.includes("후속") || text.includes("mail") || text.includes("email")) return "followup";
  if (text.includes("리스크") || text.includes("risk")) return "risk";
  return "weekly";
}

function normalizeOffer(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("team") || text.includes("팀") || text.includes("스프린트")) return "team";
  if (text.includes("service") || text.includes("대행")) return "service";
  if (text.includes("self") || text.includes("셀프")) return "self";
  return "setup";
}

function isRisk(line) {
  return /리스크|지연|이슈|실패|버그|확인 필요/u.test(line);
}

function isAction(line) {
  return /다음|예정|필요|액션|확인 요청/u.test(line);
}

function first(items, fallback) {
  return items[0] || fallback;
}

function list(items, fallback) {
  return (items.length ? items : [fallback]).map((item) => `- ${item}`);
}

function metricLine(parsed) {
  const firstProgress = parsed.progress[0] || "";
  return parsed.metrics.find((item) => item !== firstProgress) || "수치 근거는 추가 확인이 필요합니다.";
}
