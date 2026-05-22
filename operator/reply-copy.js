import { OFFERS, REPLIES } from "./model.js";

export const DEFAULT_CHECKOUT_LINKS = {
  self: "../order/index.html?offer=self",
  setup: "../order/index.html?offer=setup",
  service: "../order/index.html?offer=service",
  team: "../order/index.html?offer=team",
  proof: "../proof/index.html",
  sample: "../team/sample.html"
};

export function closeUseCaseForOffer(offerKey) {
  if (offerKey === "team") return "팀 주간보고/회의록 반복 정리";
  if (offerKey === "service") return "고객사 업데이트";
  return "주간보고";
}

export function buildReplyCopy({ type = "useful", offerKey = "setup", settings = {} } = {}) {
  const offer = OFFERS[offerKey] || OFFERS.setup;
  const link = settings[offerKey] || `[${offer.label} 링크]`;
  const base = offerKey === "team" ? teamReply(type) : REPLIES[type] || REPLIES.useful;
  const proofLines = sampleLines(offerKey, settings);
  return `${base}${proofLines}\n\n${offer.label}: ${link}`;
}

export function buildOutboundScript({ item, settings = {} } = {}) {
  const offer = OFFERS[item?.offer] || OFFERS.setup;
  const segment = item?.segment || "업무 메모를 자주 정리하는 분";
  if (item?.offer === "team") {
    const sample = settings.sample ? ` 샘플 산출물은 ${settings.sample} 에서 바로 보실 수 있습니다.` : "";
    const link = settings.team ? ` 주문/승인 링크는 ${settings.team} 입니다.` : "";
    return `${segment} 대상으로 팀 주간보고/회의록 정리 스프린트를 열었습니다. 익명화한 업무 메모 최대 10개를 받아 4주 브리핑, 리스크, 결정사항, 액션 보드로 묶어드립니다.${sample} ${offer.label} 1건이면 이번 달 목표가 바로 닫혀서, 내부 공유 가능할지 10분만 봐주실 수 있을까요?${link}`;
  }
  const proof = settings.proof ? ` Before/After 예시는 ${settings.proof} 에 모아뒀습니다.` : "";
  return `${segment} 대상으로 작은 로컬 툴 Brief30을 만들었습니다. 업무 메모를 붙여넣으면 주간보고, 회의록, 후속메일, 액션아이템으로 바로 정리됩니다.${proof} ${offer.label}이면 계속 쓸 마음이 있는지 10분만 봐주실 수 있을까요?`;
}

function sampleLines(offerKey, settings) {
  if (offerKey === "team" && settings.sample) return `\n샘플 산출물: ${settings.sample}`;
  if (offerKey !== "team" && settings.proof) return `\n결과물 예시: ${settings.proof}`;
  return "";
}

function teamReply(type) {
  if (type === "price") {
    return "팀 예산으로 한 번에 보기 애매하면 샘플 산출물만 먼저 내부 공유해 주세요. 300,000원 1건으로 메모 10개와 4주 브리핑 리듬까지 잡는 방식이라, 개별 셋업 여러 건보다 승인 근거가 명확합니다.";
  }
  if (type === "privacy") {
    return "팀 스프린트도 원문 전체를 받지 않습니다. 회사명, 고객명, 실명, 계정 정보, 계약 금액은 지우고 업무 사실만 보내는 기준으로 진행합니다. 샘플처럼 익명화된 메모를 보고 브리핑으로 재구성합니다.";
  }
  if (type === "service") {
    return "직접 툴을 쓰기보다 팀 결과물이 필요하면 팀 브리핑 스프린트가 맞습니다. 업무 메모 최대 10개를 받아 주간 브리핑, 회의록, 리스크, 후속 액션 보드로 묶어드립니다.";
  }
  return "좋게 봐주셔서 감사합니다. 팀 주간보고나 회의록 정리가 매주 밀리면 300,000원 팀 브리핑 스프린트로 한 번에 정리할 수 있습니다. 내부 공유용 샘플 산출물을 먼저 보시고, 맞으면 주문/승인 링크로 진행하시면 됩니다.";
}
