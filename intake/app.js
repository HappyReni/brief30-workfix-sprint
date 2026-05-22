import { intakeDefaultsFromParams, serviceMemoPlaceholder, teamMemoPlaceholder } from "./params.js";

const params = new URLSearchParams(window.location.search);
const form = document.getElementById("intakeForm");
const preview = document.getElementById("intakePreview");
const DEFAULT_MEMO = "회사명/고객명 제거 후 여기에 메모를 붙여넣어 주세요.";

applyParams();

form.addEventListener("input", render);
form.elements.offer.addEventListener("change", syncMemoPlaceholder);
document.getElementById("copyIntake").addEventListener("click", () => copyText(buildMessage()));
document.getElementById("downloadIntake").addEventListener("click", downloadIntake);

render();

function render() {
  preview.textContent = buildMessage();
}

function applyParams() {
  const defaults = intakeDefaultsFromParams(params);
  Object.entries(defaults).forEach(([key, value]) => {
    if (value && form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function syncMemoPlaceholder() {
  const current = form.elements.memo.value.trim();
  if (![DEFAULT_MEMO, serviceMemoPlaceholder(), teamMemoPlaceholder()].includes(current)) {
    return;
  }
  form.elements.memo.value = memoPlaceholder(form.elements.offer.value);
  render();
}

function memoPlaceholder(offer) {
  if (offer === "team") return teamMemoPlaceholder();
  if (offer === "service") return serviceMemoPlaceholder();
  return DEFAULT_MEMO;
}

function buildMessage() {
  const data = Object.fromEntries(new FormData(form));
  return [
    `[Brief30 intake] ${data.orderRef || "주문번호"}`,
    "",
    `구매자: ${data.buyer || "구매자"}`,
    `구매 오퍼: ${selectedOptionText(form.elements.offer)}`,
    `원하는 결과물: ${data.output || "주간보고"}`,
    `보고 대상: ${data.audience || "보고 대상"}`,
    `원하는 톤: ${data.tone || "간결하게"}`,
    `반드시 포함할 내용: ${data.must || "핵심 내용"}`,
    `마감 희망: ${data.deadline || "24시간 이내"}`,
    "",
    "익명화 확인:",
    "- 회사명/고객명/개인정보/계좌/계약정보를 제거했습니다.",
    "",
    "원문 메모:",
    data.memo || "익명화한 원문 메모를 붙여넣어 주세요."
  ].join("\n");
}

function selectedOptionText(select) {
  return select.options[select.selectedIndex]?.textContent || "구매 오퍼";
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

function downloadIntake() {
  const blob = new Blob([buildMessage()], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-intake.md";
  link.click();
  URL.revokeObjectURL(url);
}
