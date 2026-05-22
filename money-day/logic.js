import { buildMoneyDay, formatMoneyDay } from "../operator/money-day.js";
import { formatKrw } from "../operator/model.js";

export function buildMoneyDayConsole(input = {}, options = {}) {
  const pack = buildMoneyDay(input, options);
  return {
    pack,
    metrics: buildMetrics(pack),
    priority: pack.actions[0] || "오늘 할 일이 없습니다.",
    paymentGate: pack.paymentReady ? "결제 루트 입력됨" : "결제 루트 필요",
    teamClose: buildTeamClose(pack.teamPack),
    hotAsks: pack.hotlist.rows.slice(0, 3).map((row) => ({
      name: row.name,
      signal: row.signal?.label || row.status,
      score: row.score,
      message: row.message
    })),
    followups: pack.followups.followups.slice(0, 3).map((row) => ({
      name: row.name,
      status: row.status,
      message: row.message
    })),
    newSends: pack.channels.rows.slice(0, 5).map((row) => ({
      name: row.name,
      offer: row.offerLabel,
      note: row.note
    })),
    evidenceCsv: pack.recovery.evidenceCsv,
    commandCsv: pack.commandCsv,
    fullText: formatMoneyDay(pack)
  };
}

export function buildSampleReplies() {
  return [
    "Lead 20 | 팀에서 보고서 정리 시간을 줄일 수 있으면 예산 확인해볼게요.",
    "Lead 13 | 고객사 상태 보고 대행 가능하면 범위와 금액 주세요.",
    "Lead 24 | 결제하려면 계좌와 진행 절차가 필요합니다."
  ].join("\n");
}

export function buildSamplePayments() {
  return "2026-05-22 Lead 24 99,000원 B30-ORD-SAMPLE service";
}

function buildMetrics(pack) {
  return [
    { label: "Revenue", value: `${formatKrw(pack.recovery.audit.revenue)} / ${formatKrw(pack.target)}` },
    { label: "Gap", value: formatKrw(pack.recovery.audit.gap) },
    { label: "Ready evidence", value: String(pack.recovery.payments.ready.length) },
    { label: "Hot asks", value: String(pack.hotlist.rows.length) },
    { label: "New sends", value: String(pack.channels.rows.length) }
  ];
}

function buildTeamClose(teamPack) {
  if (!teamPack) {
    return {
      title: "팀 한 건 후보 없음",
      amount: "0원",
      message: "답장 또는 warm 리드가 생기면 팀 스프린트 한 건 클로징 문안이 여기에 뜹니다."
    };
  }
  return {
    title: `${teamPack.buyer} / ${teamPack.company}`,
    amount: formatKrw(teamPack.offer.price),
    message: teamPack.approverForward,
    dealRoomUrl: teamPack.dealRoomUrl,
    orderUrl: teamPack.orderUrl
  };
}
