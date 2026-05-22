const OFFER_LABELS = {
  self: "19,000원 셀프툴",
  setup: "49,000원 셋업팩",
  service: "99,000원 대행팩"
};

const OFFER_PRICE = {
  self: 19000,
  setup: 49000,
  service: 99000
};

export function parseReferralNames(value) {
  return String(value || "").split("\n").map((row) => row.trim()).filter(Boolean);
}

export function buildReferralCsv(data, date = new Date()) {
  const offer = normalizeOffer(data.referralOffer || data.offer || "service");
  const nextTouch = date.toISOString().slice(0, 10);
  return [
    ["name", "segment", "source", "offer", "status", "next_touch", "note"],
    ...parseReferralNames(data.referrals).map((name) => [
      name,
      "소개",
      "referral",
      offer,
      "prospect",
      nextTouch,
      `${data.buyer || "구매자"} 구매자 소개 후보 / ${data.result || "납품 결과물"} / ${OFFER_LABELS[offer]} 제안`
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function referralValue(data) {
  const offer = normalizeOffer(data.referralOffer || data.offer || "service");
  return parseReferralNames(data.referrals).length * OFFER_PRICE[offer];
}

export function buildReferralIntroMessages(data) {
  const root = normalizeRoot(data.publicUrl);
  const offer = normalizeOffer(data.referralOffer || data.offer || "service");
  const offerUrl = referralOfferUrl(root, offer);
  return parseReferralNames(data.referrals).map((name) => [
    `${name}님, ${data.buyer || "기존 구매자"}님이 Brief30을 써보시고 비슷하게 도움될 분으로 떠올라 짧게 연락드립니다.`,
    "",
    `${data.result || "보고서/회의록 정리"}처럼 업무 메모를 바로 보낼 수 있는 결과물로 정리하는 도구/서비스입니다.`,
    `무료 진단: ${root}diagnostic/index.html`,
    `${OFFER_LABELS[offer]} 안내: ${offerUrl}`,
    "",
    "회사명/고객명은 지운 익명 메모 1개로 먼저 확인해보셔도 됩니다."
  ].join("\n"));
}

export function referralOfferUrl(root, offer) {
  return offer === "service" ? `${root}service/index.html` : `${root}order/index.html?offer=${offer}`;
}

function normalizeOffer(value) {
  return ["self", "setup", "service"].includes(value) ? value : "service";
}

function normalizeRoot(value) {
  const root = String(value || "").trim();
  return root.endsWith("/") ? root : `${root}/`;
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}
