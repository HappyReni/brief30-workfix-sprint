import { INVOICE_OFFERS } from "../invoice/logic.js";

export function buildPaidState({ params = new URLSearchParams(), now = new Date() } = {}) {
  const offerKey = normalizeOffer(params.get("offer") || "team");
  const offer = INVOICE_OFFERS[offerKey] || INVOICE_OFFERS.team;
  const ref = clean(params.get("ref")) || makeRef(now, offerKey);
  const paidAt = clean(params.get("paidAt") || params.get("date")) || isoDate(now);
  const data = {
    offerKey,
    offer,
    ref,
    paidAt,
    buyer: clean(params.get("buyer")) || "",
    contact: clean(params.get("contact")) || "",
    useCase: clean(params.get("useCase") || params.get("use-case")) || defaultUseCase(offerKey),
    paymentRoute: clean(params.get("payment") || params.get("paymentRoute") || params.get("payment-route")),
    amount: amountValue(params.get("amount"), offer.price)
  };
  return {
    ...data,
    amountText: formatKrw(data.amount),
    evidenceText: buildEvidenceText(data),
    evidenceCsv: buildEvidenceCsv(data),
    invoiceUrl: buildRelativeUrl("../invoice/index.html", {
      offer: offerKey,
      ref,
      buyer: data.buyer,
      useCase: data.useCase,
      date: paidAt
    })
  };
}

export function buildEvidenceText(data) {
  return [
    "구매자: " + (clean(data.buyer) || "[입금자명]"),
    `상품: ${data.offer.label}`,
    `금액: ${formatKrw(data.amount)}`,
    `주문번호: ${data.ref}`,
    `입금일: ${data.paidAt}`,
    `용도: ${data.useCase}`,
    data.paymentRoute ? `결제수단: ${data.paymentRoute}` : "",
    data.contact ? `연락처: ${data.contact}` : ""
  ].filter(Boolean).join("\n");
}

export function buildEvidenceCsv(data) {
  return [
    "ref,buyer,offer,amount,contact,use_case,payment_route,date",
    [
      data.ref,
      clean(data.buyer) || "[입금자명]",
      data.offer.label,
      String(data.amount),
      data.contact,
      data.useCase,
      data.paymentRoute,
      data.paidAt
    ].map(csvCell).join(",")
  ].join("\n");
}

function normalizeOffer(value) {
  const text = clean(value).toLowerCase();
  if (text.includes("workfix") || text.includes("자동화") || text.includes("워크픽스")) return "workfix";
  if (text.includes("team") || text.includes("팀") || text.includes("300")) return "team";
  if (text.includes("setup") || text.includes("셋업") || text.includes("49")) return "setup";
  return "service";
}

function defaultUseCase(offerKey) {
  if (offerKey === "team") return "팀 주간보고/회의록 반복 정리";
  if (offerKey === "workfix") return "반복 업무 1개 자동화";
  if (offerKey === "service") return "업무 메모 3개 정리";
  return "첫 업무 메모 정리";
}

function amountValue(value, fallback) {
  const parsed = Number(String(value || "").replace(/[^\d]/gu, ""));
  return parsed > 0 ? parsed : fallback;
}

function buildRelativeUrl(path, values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value)) params.set(key, value);
  });
  return `${path}?${params.toString()}`;
}

function makeRef(now, offerKey) {
  return `B30-PAID-${isoDate(now).replace(/[^\d]/gu, "")}-${offerKey.toUpperCase()}`;
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function clean(value) {
  return String(value || "").trim();
}
