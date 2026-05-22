import { buildContactPack, formatContactPack } from "../operator/contact-pack.js";

export const sampleContacts = [
  "박대표 | 소개받은 초기 대표 | 팀 업데이트와 고객사 공유를 매주 정리해야 함",
  "이PM | 전 직장 동료 | 회의록과 후속 메일을 계속 직접 씀",
  "최컨설턴트 | 예전 프로젝트 | 임원 보고 전 결정사항 정리가 반복됨",
  "김프리 | 커뮤니티 댓글 | 고객사 업데이트 메일이 밀린다고 함",
  "정팀장 | 지인 추천 | 주간보고와 액션아이템 정리에 시간 많이 씀"
].join("\n");

export const sampleLedger = [
  "name,segment,source,offer,status,next_touch,note",
  "이PM,직장인,previous_client,setup,contacted,2026-05-23,이미 무료 진단 발송"
].join("\n");

export function buildContactDesk(input = {}, options = {}) {
  const pack = buildContactPack(input.contacts || "", {
    ledgerText: input.ledger || "",
    publicUrl: options.publicUrl,
    source: "contact-desk",
    ledgerSource: input.ledger ? "pasted ledger" : "",
    date: options.date,
    limit: options.limit,
    offer: options.offer
  });

  return {
    ...pack,
    fullText: formatContactPack(pack),
    metrics: buildMetrics(pack),
    topAsk: pack.rows[0] || null,
    sendableRows: pack.rows
  };
}

function buildMetrics(pack) {
  const serviceCount = pack.rows.filter((row) => row.offer === "service").length;
  const teamLikeCount = pack.contacts.filter((row) => /팀|대표|임원|회사|결재|승인/u.test(row.note)).length;
  return [
    { label: "PARSED", value: String(pack.parsed) },
    { label: "READY SENDS", value: String(pack.rows.length) },
    { label: "SKIPPED", value: String(pack.skippedExisting) },
    { label: "SERVICE ASKS", value: String(serviceCount) },
    { label: "TEAM SIGNAL", value: String(teamLikeCount) }
  ];
}
