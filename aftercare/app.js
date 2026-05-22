import { buildReferralCsv, buildReferralIntroMessages, referralOfferUrl, referralValue } from "./logic.js";

const OFFER_LABELS = {
  self: "19,000원 셀프툴",
  setup: "49,000원 셋업팩",
  service: "99,000원 대행팩"
};

const STORAGE_KEY = "brief30.aftercare.v1";
const form = document.querySelector("#aftercareForm");
const tabs = document.querySelector("#tabs");
const preview = document.querySelector("#messagePreview");
const referralCsv = document.querySelector("#referralCsv");
const kpiGrid = document.querySelector("#kpiGrid");
let activeTab = "checkin";

hydrate();
bindEvents();
render();

function hydrate() {
  const saved = loadJson(STORAGE_KEY, {});
  Object.entries(saved).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function bindEvents() {
  form.addEventListener("input", render);
  document.querySelector("#loadSample").addEventListener("click", loadSample);
  document.querySelector("#copyCurrent").addEventListener("click", () => copyText(packet()[activeTab]));
  document.querySelector("#copyAll").addEventListener("click", () => copyText(Object.values(packet()).join("\n\n")));
  document.querySelector("#copyCsv").addEventListener("click", () => copyText(referralCsv.textContent));
  document.querySelector("#downloadPack").addEventListener("click", downloadPack);
}

function render() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(new FormData(form))));
  const labels = {
    checkin: "3일 확인",
    testimonial: "후기 요청",
    referral: "소개 요청",
    intro: "소개 DM",
    nextSale: "다음 판매"
  };
  tabs.innerHTML = Object.entries(labels).map(([key, label]) => `
    <button class="${key === activeTab ? "isActive" : ""}" data-tab="${key}" type="button">${label}</button>
  `).join("");
  tabs.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      render();
    });
  });
  preview.textContent = packet()[activeTab];
  referralCsv.textContent = buildReferralCsv(values());
  renderKpis();
}

function packet() {
  const data = values();
  const root = normalizeRoot(data.publicUrl);
  const offer = OFFER_LABELS[data.offer] || OFFER_LABELS.setup;
  const referralOffer = data.referralOffer || "service";
  const referralLabel = OFFER_LABELS[referralOffer] || OFFER_LABELS.service;
  return {
    checkin: [
      `${data.buyer}님, ${data.result} 전달드린 뒤 실제로 써보셨는지 확인차 연락드립니다.`,
      "",
      "1. 바로 복사해서 쓸 수 있었나요?",
      "2. 빠진 항목이나 어색한 표현이 있었나요?",
      "3. 다음 주에도 같은 포맷으로 반복해서 쓸 만한가요?",
      "",
      "짧게 한 줄만 답 주셔도 다음 포맷 개선에 반영하겠습니다."
    ].join("\n"),
    testimonial: [
      `${data.buyer}님, 써보신 뒤 괜찮았다면 아래 문장을 공개 후기 후보로 써도 될까요?`,
      "",
      `“${data.quote}”`,
      "",
      "실명/회사명은 공개하지 않고, 직무나 역할 정도만 익명으로 표기하겠습니다.",
      "불편하면 내부 개선 메모로만 사용하겠습니다."
    ].join("\n"),
    referral: [
      `${data.buyer}님, 비슷하게 주간보고/회의록/고객사 업데이트 정리에 시간 쓰는 분 1-2명만 떠오르실까요?`,
      "",
      `무료 진단 링크: ${root}diagnostic/index.html`,
      `${referralLabel} 안내: ${referralOfferUrl(root, referralOffer)}`,
      "",
      "소개받은 분에게는 바로 판매보다 익명 메모 1개 무료 진단부터 보여드리겠습니다."
    ].join("\n"),
    intro: buildReferralIntroMessages(data).join("\n\n") || "소개 후보를 먼저 입력하세요.",
    nextSale: [
      `${data.buyer}님, 이번 결과물이 반복해서 쓸 만하다면 다음 메모도 같은 포맷으로 이어갈 수 있습니다.`,
      "",
      data.offer === "service"
        ? "대행팩을 반복으로 쓰면 매주 3개 메모까지 같은 기준으로 정리해드립니다."
        : "셋업팩 이후에는 셀프툴로 반복 사용하거나, 바쁜 주에는 대행팩으로 넘기면 됩니다.",
      "",
      `다음 요청: ${root}order/index.html?offer=service`,
      `무료 진단 공유: ${root}diagnostic/index.html`
    ].join("\n")
  };
}

function renderKpis() {
  const data = values();
  const referralCount = String(data.referrals || "").split("\n").filter((row) => row.trim()).length;
  kpiGrid.innerHTML = [
    kpi("후기 후보", data.quote ? "1개" : "0개"),
    kpi("소개 후보", `${referralCount}명`),
    kpi("잠재 매출", formatKrw(referralValue(data))),
    kpi("다음 행동", referralCount ? "운영판 import" : "소개 요청")
  ].join("");
}

function loadSample() {
  form.elements.buyer.value = "김PM";
  form.elements.orderRef.value = "B30-CLOSE-20260522-DEMO";
  form.elements.offer.value = "setup";
  form.elements.referralOffer.value = "service";
  form.elements.result.value = "주간보고 초안 + 반복 포맷";
  form.elements.quote.value = "보고서 정리 시간이 확실히 줄었고, 다음 주에도 같은 포맷으로 쓸 수 있을 것 같습니다.";
  form.elements.referrals.value = "동료 PM\n운영팀 리드";
  render();
}

function downloadPack() {
  const text = Object.entries(packet()).map(([key, value]) => `## ${key}\n${value}`).join("\n\n");
  const blob = new Blob([`${text}\n\n## referral csv\n${referralCsv.textContent}`], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-aftercare-pack.md";
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

function values() {
  return Object.fromEntries(new FormData(form));
}

function normalizeRoot(value) {
  const root = String(value || "").trim();
  return root.endsWith("/") ? root : `${root}/`;
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function kpi(label, value) {
  return `<article><span>${label}</span><strong>${value}</strong></article>`;
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}
