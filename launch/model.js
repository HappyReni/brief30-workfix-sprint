export const TARGET_KRW = 300000;
export const STORAGE_KEY = "brief30.launch.v2";

export const OFFERS = {
  team: { label: "300,000원 팀 브리핑 스프린트", price: 300000, ask: "팀 예산으로 한 번에 닫을 수 있는지" },
  self: { label: "19,000원 셀프툴", price: 19000, ask: "혼자 바로 써볼 수 있는지" },
  setup: { label: "49,000원 셋업팩", price: 49000, ask: "첫 업무 포맷까지 같이 맞추면 살지" },
  service: { label: "99,000원 대행팩", price: 99000, ask: "결과물을 맡길 의향이 있는지" }
};

export const CHANNELS = [
  {
    id: "network",
    label: "지인/이전 고객 DM",
    url: "",
    goal: "가장 빠른 1차 구매 의사 확인",
    quota: "하루 8명",
    guardrail: "친분 팔이 대신 실제 반복 업무가 있는 사람만 보낸다."
  },
  {
    id: "linkedin",
    label: "LinkedIn 피드/1촌",
    url: "https://www.linkedin.com/feed/",
    goal: "업무 문서/생산성 관심층에게 짧은 데모 공개",
    quota: "피드 1개 + DM 5명",
    guardrail: "홍보글만 올리지 말고 Before/After와 배운 점을 같이 쓴다."
  },
  {
    id: "careerly",
    label: "커리어리",
    url: "https://www.careerly.co.kr/",
    goal: "개발자/기획자 업무 루틴 피드백 확보",
    quota: "질문/회고 1개 + DM 3명",
    guardrail: "판매 문구보다 업무 메모를 어떻게 정리하는지 묻는다."
  },
  {
    id: "okky",
    label: "OKKY",
    url: "https://okky.kr/",
    goal: "실무자 피드백과 보안/로컬 실행 반응 확인",
    quota: "도움글 1개 + 댓글 대화 5개",
    guardrail: "광고처럼 쓰지 말고 익명화/로컬 실행 문제를 먼저 다룬다."
  },
  {
    id: "disquiet",
    label: "DISQUIET 피드백",
    url: "https://disquiet.io/",
    goal: "메이커 관점의 가격/포지셔닝 피드백",
    quota: "피드백 요청 1개",
    guardrail: "결제 페이지 준비 전에는 피드백 요청으로만 쓴다."
  }
];

export const PERSONAS = [
  "주간보고를 매주 쓰는 직장인",
  "회의록과 후속메일을 맡는 PM",
  "고객사 업데이트를 보내는 프리랜서",
  "여러 프로젝트를 굴리는 에이전시 운영자",
  "투자자/팀 업데이트를 쓰는 창업자",
  "프로젝트 리스크 보고가 많은 컨설턴트"
];

export const SPRINT_DAYS = Array.from({ length: 14 }, (_, index) => {
  const day = index + 1;
  return {
    day,
    title: titleForDay(day),
    target: targetForDay(day),
    tasks: tasksForDay(day)
  };
});

export function defaultState() {
  return {
    paid: 0,
    currentDay: 1,
    completed: {},
    proofUrl: "../diagnostic/index.html",
    orderUrl: "../order/index.html?offer=team",
    persona: PERSONAS[0],
    channel: CHANNELS[0].id,
    offer: "team"
  };
}

export function formatKrw(value) {
  return `${Math.max(0, Number(value || 0)).toLocaleString("ko-KR")}원`;
}

export function buyersNeeded(paid, offerKey) {
  const price = OFFERS[offerKey]?.price || OFFERS.setup.price;
  return Math.ceil(Math.max(TARGET_KRW - Number(paid || 0), 0) / price);
}

export function progressPercent(paid) {
  return Math.min(100, Math.round((Number(paid || 0) / TARGET_KRW) * 100));
}

export function channelById(id) {
  return CHANNELS.find((channel) => channel.id === id) || CHANNELS[0];
}

export function sprintDate(day) {
  const date = new Date();
  date.setDate(date.getDate() + Number(day || 1) - 1);
  return date.toISOString().slice(0, 10);
}

export function buildCsv(state) {
  const rows = [["day", "date", "task", "done"]];
  SPRINT_DAYS.forEach((day) => {
    day.tasks.forEach((task) => {
      rows.push([day.day, sprintDate(day.day), task.label, state.completed[taskKey(day.day, task.id)] ? "yes" : "no"]);
    });
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function taskKey(day, taskId) {
  return `d${day}-${taskId}`;
}

export function buildMessage(state) {
  const channel = channelById(state.channel);
  const offer = OFFERS[state.offer] || OFFERS.setup;
  const proof = state.proofUrl ? `\n무료 진단/결과 예시: ${state.proofUrl}` : "";
  const order = state.orderUrl ? `\n주문/신청: ${state.orderUrl}` : "";
  if (channel.id === "linkedin") {
    return `업무 메모를 보고서로 바꾸는 작은 로컬 도구 Brief30을 만들었습니다.\n\n대상은 ${state.persona}입니다. 회사명/고객명을 지운 메모를 붙여넣으면 주간보고, 회의록, 후속메일 형태로 바로 정리됩니다.\n\n이번 주에는 ${offer.label} 기준으로 실제 반복 사용 의사가 있는지만 검증합니다.${proof}${order}`;
  }
  if (channel.id === "careerly" || channel.id === "okky") {
    return `${state.persona} 분들께 질문드립니다.\n\n민감한 업무 메모를 외부 AI에 넣기 어려울 때, 브라우저 안에서만 주간보고/회의록 초안을 구조화하는 도구를 만들고 있습니다. 실제로 필요한 건 더 자연스러운 문장인가요, 아니면 빠르게 복사 가능한 구조인가요?\n\n원하시면 익명화된 샘플 메모 1개 기준으로 ${offer.label} 테스트를 열어두겠습니다.${proof}`;
  }
  if (channel.id === "disquiet") {
    return `Brief30 피드백을 받고 싶습니다.\n\n${state.persona}가 업무 메모를 붙여넣고 주간보고/회의록/고객사 업데이트를 바로 복사하는 로컬 브라우저 도구입니다. 지금 검증 질문은 단순합니다. ${offer.label} 기준이면 ${offer.ask}입니다.\n\n특히 가격, 첫 화면, Before/After 설득력에 대한 피드백이 필요합니다.${proof}`;
  }
  return `${state.persona} 대상으로 작은 로컬 도구 Brief30을 만들었습니다. 업무 메모를 붙여넣으면 주간보고, 회의록, 후속메일, 액션아이템으로 바로 정리됩니다.\n\n이번 주에 ${offer.label} 기준으로 실제 구매 의사가 있는지 확인하고 있습니다. 10분만 보고 ${offer.ask} 알려주실 수 있을까요?${proof}${order}`;
}

function titleForDay(day) {
  if (day <= 2) {
    return "가까운 사람에게 첫 반응 받기";
  }
  if (day <= 5) {
    return "Before/After로 공개 피드백 받기";
  }
  if (day <= 9) {
    return "관심 답장을 팀/대행 결제로 전환";
  }
  return "결제 증거와 납품 루프 고정";
}

function targetForDay(day) {
  if (day <= 2) {
    return "리드 20명, 답장 4개";
  }
  if (day <= 5) {
    return "테스터 5명, 구매 의사 2개";
  }
  if (day <= 9) {
    return "유료 2건 또는 대행 문의 2건";
  }
  return "누적 300,000원까지 결제 기록";
}

function tasksForDay(day) {
  const shared = [
    { id: "new-leads", label: "새 리드 10명 추가", impact: "운영판 Prospect를 비운 채로 하루를 끝내지 않는다." },
    { id: "dm", label: "맞춤 DM 10개 발송", impact: "관계 있는 사람부터 시작해서 답장률을 올린다." },
    { id: "follow", label: "어제 답장/미응답 5명 후속", impact: "관심 신호를 결제 질문으로 닫는다." }
  ];
  if (day <= 2) {
    return [...shared, { id: "proof", label: "Before/After 예시 1개 보강", impact: "말보다 결과를 먼저 보여준다." }];
  }
  if (day <= 5) {
    return [...shared, { id: "post", label: "채널 1곳에 도움글/회고 게시", impact: "광고보다 문제 정의로 반응을 얻는다." }];
  }
  if (day <= 9) {
    return [...shared, { id: "close", label: "관심 답장에 가격 포함 응답", impact: "좋다는 말과 구매 의사를 분리한다." }];
  }
  return [...shared, { id: "paid", label: "결제 증거/납품 상태 정리", impact: "Paid ledger 없이는 매출로 세지 않는다." }];
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
