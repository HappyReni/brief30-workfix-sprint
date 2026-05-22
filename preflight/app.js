import {
  buildCheckoutCommand,
  buildOrderCommand,
  buildShareCopy,
  isEmail,
  paymentRouteState
} from "./commands.js";

const orderConfig = window.BRIEF30_ORDER_CONFIG || {};
const marketingConfig = window.BRIEF30_MARKETING_CONFIG || {};
const setupForm = document.querySelector("#setupForm");
const publicUrl = document.querySelector("#publicUrl");
const statusGrid = document.querySelector("#statusGrid");
const scoreValue = document.querySelector("#scoreValue");
const scoreFill = document.querySelector("#scoreFill");
const scoreText = document.querySelector("#scoreText");
const orderCommand = document.querySelector("#orderCommand");
const checkoutCommand = document.querySelector("#checkoutCommand");
const shareCopy = document.querySelector("#shareCopy");

const checks = [
  {
    title: "결제 루트",
    pass: () => paymentRouteState(orderConfig, marketingConfig).ready,
    fix: () => paymentRouteState(orderConfig, marketingConfig).fix
  },
  {
    title: "회신 이메일",
    pass: () => isEmail(orderConfig.supportEmail) || paymentRouteState(orderConfig, marketingConfig).checkoutReady,
    fix: "직접 주문이면 회신 이메일을 설정하세요."
  },
  {
    title: "결제 안내",
    pass: () => Boolean(orderConfig.bankAccount) || paymentRouteState(orderConfig, marketingConfig).checkoutReady,
    fix: "직접 주문이면 계좌, 결제 링크, 또는 DM 결제 절차를 입력하세요."
  },
  {
    title: "허브 루트",
    pass: () => true,
    fix: "seller 폴더 루트가 hub/index.html로 이동해야 합니다."
  },
  {
    title: "납품 시간",
    pass: () => Boolean(orderConfig.deliveryWindow),
    fix: "구매 후 언제 받을지 명시하세요."
  }
];

function render() {
  renderStatus();
  renderCommand();
  renderShareCopy();
}

function renderStatus() {
  const rows = checks.map((check) => {
    const passed = check.pass();
    return { ...check, passed };
  });
  const score = Math.round((rows.filter((row) => row.passed).length / rows.length) * 100);
  scoreValue.textContent = `${score}%`;
  scoreFill.style.width = `${score}%`;
  scoreText.textContent = score >= 100 ? "바로 공유 가능" : "빨간 항목을 먼저 처리";
  statusGrid.innerHTML = rows
    .map(
      (row) => `
        <article class="${row.passed ? "isPass" : "isBlock"}">
          <span>${row.passed ? "OK" : "FIX"}</span>
          <strong>${row.title}</strong>
          <p>${row.passed ? readyText(row.title) : fixText(row.fix)}</p>
        </article>
      `
    )
    .join("");
}

function renderCommand() {
  const form = new FormData(setupForm);
  orderCommand.textContent = buildOrderCommand(Object.fromEntries(form.entries()));
  checkoutCommand.textContent = buildCheckoutCommand(Object.fromEntries(form.entries()));
}

function renderShareCopy() {
  shareCopy.textContent = buildShareCopy(publicUrl.value, window.location.href);
}

function loadCurrentValues() {
  setupForm.elements.sellerName.value = orderConfig.sellerName || "Brief30";
  setupForm.elements.supportEmail.value = orderConfig.supportEmail || "";
  setupForm.elements.bankAccount.value = orderConfig.bankAccount || "";
  setupForm.elements.contactLine.value = orderConfig.contactLine || "";
  setupForm.elements.deliveryWindow.value = orderConfig.deliveryWindow || "입금 확인 후 24시간 이내";
  setupForm.elements.buyUrl.value = marketingConfig.buyUrl || "";
  setupForm.elements.setupUrl.value = marketingConfig.setupUrl || "";
  setupForm.elements.serviceUrl.value = marketingConfig.serviceUrl || "";
  setupForm.elements.teamUrl.value = marketingConfig.teamUrl || "";
  setupForm.elements.workfixUrl.value = marketingConfig.workfixUrl || "";
  setupForm.elements.testerUrl.value = marketingConfig.testerUrl || "";
  render();
}

async function copyTarget(selector, button) {
  const text = document.querySelector(selector).textContent;
  await navigator.clipboard.writeText(text);
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function readyText(title) {
  if (title === "결제 루트") {
    return paymentRouteState(orderConfig, marketingConfig).label;
  }
  return "준비됨";
}

function fixText(value) {
  return typeof value === "function" ? value() : value;
}

setupForm.addEventListener("input", render);
publicUrl.addEventListener("input", render);
document.querySelector("#loadCurrent").addEventListener("click", loadCurrentValues);
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyTarget(button.dataset.copy, button));
});

loadCurrentValues();
