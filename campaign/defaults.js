const ORDER_URLS = {
  team: "../order/index.html?offer=team",
  self: "../order/index.html?offer=self",
  setup: "../order/index.html?offer=setup",
  service: "../service/index.html"
};

const MATH = {
  team: { headline: "팀 스프린트 1건", intro: "팀 스프린트 1건으로", detail: "1건 x 300,000원 = 300,000원" },
  self: { headline: "셀프툴 16건", intro: "셀프툴 16건으로", detail: "16건 x 19,000원 = 304,000원" },
  setup: { headline: "셋업팩 7건", intro: "셋업팩 7건으로", detail: "7건 x 49,000원 = 343,000원" },
  service: { headline: "대행팩 4건", intro: "대행팩 4건으로", detail: "4건 x 99,000원 = 396,000원" }
};

export function defaultOrderUrl(offer) {
  return ORDER_URLS[offer] || ORDER_URLS.team;
}

export function campaignMath(offer) {
  return MATH[offer] || MATH.team;
}

export function shouldReplaceOrderUrl(value) {
  const current = String(value || "").trim();
  return !current || Object.values(ORDER_URLS).includes(current);
}
