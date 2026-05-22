export const STORAGE_KEY = "brief30.prospecting.v1";

export const SEGMENTS = {
  office: {
    label: "직장인",
    roles: ["PM", "팀 리드", "기획자", "운영 매니저", "주니어 실무자"],
    pains: ["주간보고", "회의록", "후속 메일", "임원 공유", "리스크 정리"],
    offer: "setup"
  },
  freelancer: {
    label: "프리랜서",
    roles: ["1인 사업자", "디자이너", "개발 프리랜서", "마케터", "콘텐츠 운영자"],
    pains: ["고객사 업데이트", "작업 로그", "진행 공유", "검수 요청", "정산 전 보고"],
    offer: "service"
  },
  agency: {
    label: "에이전시",
    roles: ["프로젝트 매니저", "어카운트 매니저", "운영 리드", "콘텐츠 팀장", "CS 리드"],
    pains: ["고객사 상태 보고", "이슈 공유", "액션아이템", "검수 메일", "리스크 요약"],
    offer: "service"
  },
  founder: {
    label: "창업자",
    roles: ["초기 대표", "공동창업자", "사업개발", "프로덕트 리드", "운영 담당"],
    pains: ["팀 업데이트", "투자자 공유", "고객 피드백", "운영 이슈", "주간 회고"],
    offer: "setup"
  },
  consultant: {
    label: "컨설턴트",
    roles: ["전략 컨설턴트", "PMO", "리서처", "업무 개선 코치", "B2B 자문"],
    pains: ["클라이언트 미팅", "임원 보고", "프로젝트 리스크", "결정사항", "후속 액션"],
    offer: "service"
  }
};

export const SOURCES = {
  direct_dm: {
    label: "직접 DM",
    query: "{role} {pain} 자주 쓰는 사람 10명 떠올리기",
    note: "가장 빠른 답장은 이미 대화한 사람에게서 나온다."
  },
  referral: {
    label: "소개 요청",
    query: "{role} 중 {pain} 때문에 힘들어하는 사람 소개 가능한지 묻기",
    note: "소개 요청은 판매 문구보다 문제 상황을 먼저 말한다."
  },
  community: {
    label: "커뮤니티",
    query: "\"{pain}\" \"{role}\" \"업무\"",
    note: "도움글/질문글에 반응한 사람만 수동으로 기록한다."
  },
  social_post: {
    label: "소셜 포스트",
    query: "{pain} 줄이는 Before/After 짧은 글에 반응한 사람",
    note: "좋아요보다 댓글/저장/DM을 우선한다."
  },
  previous_client: {
    label: "기존 거래/동료",
    query: "이전에 {pain} 문서를 주고받은 사람",
    note: "거래 경험이 있으면 99,000원 대행팩까지 바로 묻는다."
  }
};

export const OFFERS = {
  team: {
    label: "300,000원 팀 브리핑 스프린트",
    ask: "팀 메모 10개와 4주 브리핑으로 내부 공유 시간을 줄일지"
  },
  service: {
    label: "99,000원 대행팩",
    ask: "메모 3개를 대신 정리받는 방식이면 맡길지"
  },
  setup: {
    label: "49,000원 셋업팩",
    ask: "첫 업무 메모 1개를 같이 셋업하면 살지"
  },
  self: {
    label: "19,000원 셀프툴",
    ask: "혼자 계속 써볼지"
  }
};

export function generateProspects({ segmentKey, sourceKey, segment: formSegment, source: formSource, count, offer }) {
  segmentKey = segmentKey || formSegment;
  sourceKey = sourceKey || formSource;
  const segmentId = SEGMENTS[segmentKey] ? segmentKey : "office";
  const sourceId = SOURCES[sourceKey] ? sourceKey : "direct_dm";
  const segment = SEGMENTS[segmentId];
  const source = SOURCES[sourceId];
  const size = Math.max(1, Math.min(80, Number(count || 20)));
  return Array.from({ length: size }, (_, index) => {
    const role = pick(segment.roles, index);
    const pain = pick(segment.pains, index);
    const leadNo = String(index + 1).padStart(2, "0");
    return {
      name: `${segment.label}-${role}-${leadNo}`,
      segment: segment.label,
      source: sourceId,
      offer: offer || segment.offer,
      role,
      pain,
      note: `${role} / ${pain} 반복 가능성. ${source.note}`,
      query: fill(source.query, { role, pain })
    };
  });
}

export function buildCsv(rows) {
  return [
    ["name", "segment", "source", "offer", "note"],
    ...rows.map((row) => [row.name, row.segment, row.source, row.offer, row.note])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildSearchPack(rows) {
  return rows
    .slice(0, 12)
    .map((row, index) => `${index + 1}. [${row.segment}/${SOURCES[row.source].label}] ${row.query}`)
    .join("\n");
}

export function buildDm(row) {
  const offer = OFFERS[row?.offer] || OFFERS.setup;
  return `${row.role} 중 ${row.pain}에 시간 쓰는 분들께 작은 로컬 도구 Brief30을 테스트 중입니다. 익명 메모 1개로 무료 진단을 돌려보고, 맞으면 ${offer.label} 기준으로 ${offer.ask} 확인하려고 합니다. 10분만 보고 실제로 쓸 상황이 있는지 알려주실 수 있을까요?`;
}

function pick(items, index) {
  return items[index % items.length];
}

function fill(template, data) {
  return template.replaceAll("{role}", data.role).replaceAll("{pain}", data.pain);
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}
