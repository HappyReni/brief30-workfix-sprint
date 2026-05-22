export const CLOSE_OFFERS = {
  self: { label: "19,000원 셀프툴", price: 19000, delivery: "구매자 패키지와 사용 가이드" },
  setup: { label: "49,000원 셋업팩", price: 49000, delivery: "툴 + 실제 업무 메모 1개 셋업" },
  service: { label: "99,000원 대행팩", price: 99000, delivery: "업무 메모 3개 정리 + 반복 포맷" },
  team: { label: "300,000원 팀 브리핑 스프린트", price: 300000, delivery: "팀 업무 메모 최대 10개 정리 + 주간 브리핑 4회 + 실행 액션 보드" },
  workfix: { label: "300,000원 Workfix Sprint", price: 300000, delivery: "반복 업무 1개를 24시간 안에 작은 도구/스크립트/템플릿으로 납품" }
};

export function buildPaymentNudge(data) {
  const offer = closeOffer(data.offer);
  return [
    `${buyerName(data.buyer)}, 아까 보낸 ${offer.label} 안내 한 번만 다시 올립니다.`,
    "",
    `오늘 진행하면 ${data.deliveryWindow || "입금 확인 후 24시간 이내"} 기준으로 ${data.useCase || "요청 결과물"}부터 정리하겠습니다.`,
    `주문번호: ${data.ref}`,
    `결제/입금 안내: ${data.payment || "기존 대화방으로 안내"}`,
    "",
    `진행하실 거면 결제 후 익명 메모를 ${data.intakeUrl} 로 보내주세요.`,
    "이번 주에 어렵다면 보류라고만 답 주셔도 괜찮습니다."
  ].join("\n");
}

export function buildFallbackClose(data) {
  const current = closeOffer(data.offer);
  const fallbackKey = fallbackOffer(data.offer);
  const fallback = closeOffer(fallbackKey);
  if (fallbackKey === data.offer) {
    return [
      `${buyerName(data.buyer)}, 바로 결제가 애매하면 무료 진단만 먼저 확인해도 됩니다.`,
      "",
      `${current.label}은 혼자 써볼 수 있는 최소 구매 옵션입니다.`,
      "회사명/고객명/개인정보를 지운 메모 1개로 맞는지 먼저 보시고 결정해도 됩니다.",
      `주문번호: ${data.ref}`
    ].join("\n");
  }
  return [
    `${buyerName(data.buyer)}, 금액이나 범위가 부담되면 ${fallback.label}으로 낮춰서 시작해도 됩니다.`,
    "",
    `원래 제안: ${current.label}`,
    `낮춘 제안: ${fallback.label} (${formatKrw(fallback.price)})`,
    `범위: ${fallback.delivery}`,
    "",
    "작게 시작하고 반복해서 쓰게 되면 그때 상위 옵션으로 맞추겠습니다.",
    `진행하실 경우 같은 주문번호 ${data.ref}로 답 주세요.`
  ].join("\n");
}

export function fallbackOffer(offer) {
  if (offer === "workfix") return "service";
  if (offer === "team") return "service";
  if (offer === "service") return "setup";
  if (offer === "setup") return "self";
  return "self";
}

function closeOffer(offer) {
  return CLOSE_OFFERS[offer] || CLOSE_OFFERS.setup;
}

function buyerName(value) {
  return value || "OO님";
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}
