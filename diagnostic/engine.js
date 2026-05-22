export const STORAGE_KEY = "brief30.diagnostic.v1";

export const SAMPLE_NOTE = `월: 고객사 A 주간 미팅. 일정 2일 지연 가능성 있음
화: 디자인 시안 3개 중 2개 승인. 남은 1개는 금요일까지 수정
수: 개발 QA에서 로그인 오류 4건 발견, 3건 수정 완료
목: 고객 담당자가 임원 공유용 짧은 요약 요청
금: 다음 주 화요일까지 리스크와 액션아이템 정리 필요`;

export function diagnose(input) {
  const note = String(input.note || "").trim();
  const lines = note.split("\n").map((line) => line.trim()).filter(Boolean);
  const metrics = lines.filter((line) => /[0-9０-９]/u.test(line));
  const risks = lines.filter((line) => /지연|오류|리스크|이슈|불가|차단|문제|확인 필요/u.test(line));
  const actions = lines.filter((line) => /필요|예정|해야|요청|정리|수정|공유|완료/u.test(line));
  const score = buildScore(lines, metrics, risks, actions);
  const title = input.title || "업무 메모";
  const audience = input.audience || "팀장/고객사";
  const outputType = input.outputType || "고객사 업데이트";
  const summary = first(lines, 3, "메모를 조금 더 넣으면 요약 품질이 올라갑니다.");

  return {
    score,
    headline: `${title} → ${outputType}`,
    executive: [
      `${audience}에게 공유할 핵심은 ${sentence(summary[0])}`,
      `수치 근거는 ${metrics[0] ? sentence(metrics[0]) : "아직 부족합니다. 건수, 일정, 금액 중 하나를 추가하세요."}`,
      `관리 포인트는 ${risks[0] ? sentence(risks[0]) : "현재 명확한 리스크가 적혀 있지 않습니다."}`
    ],
    report: buildReport({ title, audience, outputType, summary, metrics, risks, actions }),
    locked: [
      "구매 후에는 주간보고, 회의록, 후속메일, 액션아이템 표를 한 번에 받습니다.",
      "셋업팩은 실제 업무 메모 1개를 반복 사용 가능한 보고 포맷으로 맞춥니다.",
      "대행팩은 익명화된 메모 3개를 받아 바로 보낼 수 있는 초안으로 정리합니다."
    ],
    risks: buildAdvice({ note, lines, metrics, risks, actions })
  };
}

export function buildOrderUrl(offer) {
  return `../order/index.html?offer=${encodeURIComponent(offer || "setup")}`;
}

export function buildIntakeUrl(offer) {
  return `../intake/index.html?offer=${encodeURIComponent(offer || "setup")}`;
}

export function resultMarkdown(result) {
  return [
    `# ${result.headline}`,
    "",
    `Score: ${result.score.overall}/100`,
    "",
    "## 3-line brief",
    ...result.executive.map((item) => `- ${item}`),
    "",
    "## Preview",
    result.report,
    "",
    "## Improve before sending",
    ...result.risks.map((item) => `- ${item}`)
  ].join("\n");
}

function buildScore(lines, metrics, risks, actions) {
  const density = clamp(lines.length * 14 + metrics.length * 8);
  const metric = clamp(metrics.length * 22);
  const action = clamp(actions.length * 18);
  const risk = clamp(risks.length ? 82 : 48);
  const overall = Math.round(density * 0.28 + metric * 0.2 + action * 0.28 + risk * 0.24);
  return { overall, density, metric, action, risk };
}

function buildReport({ title, audience, outputType, summary, metrics, risks, actions }) {
  return [
    `# ${title} - ${outputType}`,
    "",
    `대상: ${audience}`,
    "",
    "## 요약",
    ...first(summary, 3, "요약할 메모가 부족합니다.").map((item) => `- ${sentence(item)}`),
    "",
    "## 숫자/근거",
    ...first(metrics, 3, "수치 근거가 없습니다. 일정, 건수, 금액, 전환율을 추가하세요.").map((item) => `- ${sentence(item)}`),
    "",
    "## 리스크",
    ...first(risks, 3, "현재 명시된 리스크는 없습니다.").map((item) => `- ${sentence(item)}`),
    "",
    "## 다음 액션",
    ...first(actions, 4, "다음 액션을 1개 이상 추가하세요.").map((item) => `- ${sentence(item)}`)
  ].join("\n");
}

function buildAdvice({ note, lines, metrics, risks, actions }) {
  const advice = [];
  if (note.length < 120) {
    advice.push("메모가 짧습니다. 날짜, 진행, 결정, 이슈를 줄마다 나눠 넣으면 설득력이 올라갑니다.");
  }
  if (!metrics.length) {
    advice.push("숫자가 없습니다. 보고용이면 건수, 일정, 금액, 전환율 중 하나는 넣어야 합니다.");
  }
  if (!risks.length) {
    advice.push("리스크가 보이지 않습니다. 지연 가능성, 고객 확인 필요, 차단 이슈를 명시하세요.");
  }
  if (actions.length < 2) {
    advice.push("다음 액션이 부족합니다. 담당자와 기한이 보이면 바로 보낼 수 있는 문서가 됩니다.");
  }
  return advice.length ? advice : ["초안으로 보내기 전 회사명, 고객명, 개인정보가 남아 있지 않은지만 확인하세요."];
}

function first(items, count, fallback) {
  return items.length ? items.slice(0, count) : [fallback];
}

function sentence(value) {
  const text = String(value || "").replace(/^[-*•\s]+/u, "").trim();
  return /[.!?。]$/.test(text) ? text : `${text}.`;
}

function clamp(value) {
  return Math.max(20, Math.min(100, Math.round(value)));
}
