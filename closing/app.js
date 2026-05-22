import { CLOSE_OFFERS, buildFallbackClose, buildPaymentNudge } from "./followup.js";

const OFFERS = CLOSE_OFFERS;
const FAST_DELIVERY = "입금 확인 후 24시간 이내";
const TEAM_DELIVERY = "입금 확인 후 3영업일 내 1차 납품, 4주 내 마감";

const config = window.BRIEF30_ORDER_CONFIG || {};
const params = new URLSearchParams(window.location.search);
const form = document.getElementById("closeForm");
const ref = makeRef();

form.elements.offer.value = normalizeOffer(params.get("offer") || "setup");
form.elements.buyer.value = params.get("buyer") || form.elements.buyer.value;
form.elements.contact.value = params.get("contact") || form.elements.contact.value;
if (params.get("useCase")) {
  setSelectByText(form.elements.useCase, params.get("useCase"));
}
form.elements.seller.value = config.sellerName || "Brief30";
form.elements.payment.value = config.bankAccount || config.contactLine || "DM으로 계좌/결제 링크 안내";
form.elements.deliveryWindow.value = config.deliveryWindow || defaultDeliveryWindow(form.elements.offer.value);

document.getElementById("copyRequest").addEventListener("click", () => copyText(buildPaymentRequest()));
document.getElementById("copyConfirm").addEventListener("click", () => copyText(buildConfirmation()));
document.getElementById("copyEvidence").addEventListener("click", () => copyText(buildEvidenceLine()));
document.getElementById("copyNudge").addEventListener("click", () => copyText(buildNudge()));
document.getElementById("copyFallback").addEventListener("click", () => copyText(buildFallback()));
document.getElementById("downloadClose").addEventListener("click", downloadClosePack);
form.addEventListener("input", render);

render();

function render() {
  const data = values();
  const offer = OFFERS[data.offer];
  document.getElementById("quoteRef").textContent = ref;
  document.getElementById("quoteAmount").textContent = formatKrw(offer.price);
  document.getElementById("quoteOffer").textContent = offer.label;
  document.getElementById("quoteDelivery").textContent = offer.delivery;
  document.getElementById("paymentRequest").textContent = buildPaymentRequest();
  document.getElementById("confirmation").textContent = buildConfirmation();
  document.getElementById("evidenceLine").textContent = buildEvidenceLine();
  document.getElementById("paymentNudge").textContent = buildNudge();
  document.getElementById("fallbackClose").textContent = buildFallback();
  document.getElementById("orderLink").href = `../order/index.html?offer=${data.offer}`;
  document.getElementById("intakeLink").href = intakeUrl(data.offer);
  document.getElementById("fulfillmentLink").href = "../fulfillment/index.html";
}

function values() {
  const data = Object.fromEntries(new FormData(form));
  if (data.offer === "team" && data.deliveryWindow === FAST_DELIVERY) {
    data.deliveryWindow = TEAM_DELIVERY;
    form.elements.deliveryWindow.value = TEAM_DELIVERY;
  } else if (data.offer !== "team" && data.deliveryWindow === TEAM_DELIVERY) {
    data.deliveryWindow = FAST_DELIVERY;
    form.elements.deliveryWindow.value = FAST_DELIVERY;
  }
  return data;
}

function buildPaymentRequest() {
  const data = values();
  const offer = OFFERS[data.offer];
  return [
    `${data.buyer || "OO님"}, 무료 진단 확인 감사합니다.`,
    "",
    `요청하신 ${data.useCase || "결과물"} 작업은 ${offer.label}${instrumentalParticle(offer.label)} 진행하면 됩니다.`,
    `금액: ${formatKrw(offer.price)}`,
    `전달물: ${offer.delivery}`,
    `전달 시간: ${data.deliveryWindow}`,
    `주문번호: ${ref}`,
    `결제/입금 안내: ${data.payment}`,
    "",
    `결제 후 익명 메모는 ${intakeUrl(data.offer)} 로 보내주세요.`,
    "회사명, 고객명, 개인정보, 계약 정보는 지우고 보내는 것을 권합니다."
  ].join("\n");
}

function buildConfirmation() {
  const data = values();
  const offer = OFFERS[data.offer];
  return [
    `[Brief30 결제 확인] ${ref}`,
    "",
    `${data.buyer || "구매자"}님, 결제 확인 감사합니다.`,
    `${offer.label} 기준으로 ${data.useCase || "요청 결과물"} 작업을 진행하겠습니다.`,
    "",
    "다음 단계:",
    `1. 익명 메모 제출: ${intakeUrl(data.offer)}`,
    `2. 전달 예정: ${data.deliveryWindow}`,
    "3. 결과물 확인 후 수정 요청 1회까지 반영",
    "",
    `문의/회신: ${data.contact || config.supportEmail || "기존 대화방"}`
  ].join("\n");
}

function buildEvidenceLine() {
  const data = values();
  const offer = OFFERS[data.offer];
  return [
    ref,
    data.buyer || "구매자",
    offer.label,
    offer.price,
    data.contact || "",
    data.useCase || "",
    data.payment || "",
    new Date().toISOString().slice(0, 10)
  ].map(csvCell).join(",");
}

function buildNudge() {
  return buildPaymentNudge(followUpData());
}

function buildFallback() {
  return buildFallbackClose(followUpData());
}

function followUpData() {
  const data = values();
  return {
    ...data,
    ref,
    intakeUrl: intakeUrl(data.offer)
  };
}

function downloadClosePack() {
  const text = [
    `# Brief30 Close Pack - ${ref}`,
    "",
    "## Payment request",
    buildPaymentRequest(),
    "",
    "## Payment confirmation",
    buildConfirmation(),
    "",
    "## Operator evidence CSV",
    "ref,buyer,offer,amount,contact,use_case,payment_route,date",
    buildEvidenceLine(),
    "",
    "## 24-hour follow-up",
    buildNudge(),
    "",
    "## Fallback close",
    buildFallback()
  ].join("\n");
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brief30-close-${ref}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

function intakeUrl(offer) {
  const data = values();
  const params = new URLSearchParams({
    ref,
    offer,
    buyer: data.buyer || "",
    useCase: data.useCase || ""
  });
  return `../intake/index.html?${params.toString()}`;
}

function normalizeOffer(value) {
  return OFFERS[value] ? value : "setup";
}

function defaultDeliveryWindow(offer) {
  return offer === "team" ? TEAM_DELIVERY : FAST_DELIVERY;
}

function setSelectByText(select, value) {
  const text = String(value || "");
  const match = [...select.options].find((option) => text.includes(option.textContent) || option.textContent.includes(text));
  if (match) {
    select.value = match.value;
  }
}

function makeRef() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `B30-CLOSE-${date}-${suffix}`;
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function instrumentalParticle(value) {
  const text = String(value || "");
  const code = text.charCodeAt(text.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "으로";
  const jong = (code - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}
