import { DEFAULT_ORDER_OFFER, ORDER_OFFERS, buildOrderState, makeRef, normalizeOffer } from "./logic.js";

const config = window.BRIEF30_ORDER_CONFIG || {};
const params = new URLSearchParams(window.location.search);
const form = document.getElementById("orderForm");
const orderRef = makeRef();
let selectedOffer = normalizeOffer(params.get("offer") || DEFAULT_ORDER_OFFER);

document.querySelectorAll("[data-offer-card]").forEach((button) => {
  button.addEventListener("click", () => {
    selectedOffer = normalizeOffer(button.dataset.offerCard);
    render();
  });
});

form.addEventListener("input", render);
document.getElementById("copyOrder").addEventListener("click", () => copyText("orderMessage", "copyOrder"));
document.getElementById("copyOrderTop").addEventListener("click", () => copyText("orderMessage", "copyOrderTop"));
document.getElementById("copyApproval").addEventListener("click", () => copyText("approvalMessage", "copyApproval"));
document.getElementById("copyApprovalTop").addEventListener("click", () => copyText("approvalMessage", "copyApprovalTop"));
document.getElementById("copyOperator").addEventListener("click", () => copyText("operatorCsv", "copyOperator"));

render();

function render() {
  const state = currentState();
  document.querySelectorAll("[data-offer-card]").forEach((button) => {
    button.classList.toggle("isActive", button.dataset.offerCard === selectedOffer);
  });

  setText("targetMath", state.offer.math);
  setText("targetCopy", state.offer.mathCopy);
  setText("selectedOfferTitle", state.offer.label);
  setText("orderRef", state.orderRef);
  setText("orderAmount", state.amountText);
  setText("intentStatusLabel", state.intentLabel);
  setText("bankAccount", state.paymentRoute);
  setText("deliveryWindow", state.deliveryWindow);
  setText("orderPreview", state.orderMessage);
  setText("approvalPreview", state.approvalMessage);
  setText("operatorPreview", state.operatorCsv);
  setHref("emailOrder", state.mailtoUrl);
  setHref("intakeLink", state.intakeUrl);
  setHref("demoLink", state.demoUrl);
}

async function copyText(key, buttonId) {
  await writeClipboard(currentState()[key]);
  flashButton(buttonId);
}

function currentState() {
  return buildOrderState({
    form: Object.fromEntries(new FormData(form).entries()),
    selectedOffer,
    config,
    orderRef
  });
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

function flashButton(id) {
  const button = document.getElementById(id);
  const original = button.textContent;
  button.textContent = "복사 완료";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setHref(id, value) {
  document.getElementById(id).setAttribute("href", value);
}

window.BRIEF30_ORDER_OFFERS = ORDER_OFFERS;
