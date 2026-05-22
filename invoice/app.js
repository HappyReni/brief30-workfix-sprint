import { buildInvoiceState, buildShareText } from "./logic.js";

const orderConfig = window.BRIEF30_ORDER_CONFIG || {};
const state = buildInvoiceState({
  params: new URLSearchParams(window.location.search),
  orderConfig
});

const refs = {
  title: document.querySelector("#title"),
  status: document.querySelector("#status"),
  buyer: document.querySelector("#buyer"),
  amount: document.querySelector("#amount"),
  ref: document.querySelector("#ref"),
  due: document.querySelector("#due"),
  delivery: document.querySelector("#delivery"),
  route: document.querySelector("#route"),
  quote: document.querySelector("#quote"),
  payment: document.querySelector("#payment"),
  proof: document.querySelector("#proof"),
  share: document.querySelector("#share"),
  order: document.querySelector("#order"),
  intake: document.querySelector("#intake"),
  paid: document.querySelector("#paid"),
  sample: document.querySelector("#sample"),
  copyButtons: document.querySelectorAll("[data-copy]")
};

render();

refs.copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    await copyText(document.querySelector(button.dataset.copy).textContent);
    flash(button);
  });
});

function render() {
  document.title = `${state.offer.label} 청구서`;
  refs.title.textContent = state.offer.label;
  refs.status.textContent = state.ready ? "결제 안내 연결됨" : "결제 안내 입력 전";
  refs.status.classList.toggle("isReady", state.ready);
  refs.buyer.textContent = state.company ? `${state.company} / ${state.buyer}` : state.buyer;
  refs.amount.textContent = state.amountText;
  refs.ref.textContent = state.ref;
  refs.due.textContent = state.dueDate;
  refs.delivery.textContent = state.deliveryWindow;
  refs.route.textContent = state.paymentRoute || "실제 계좌 또는 결제 URL을 넣은 뒤 발송";
  refs.quote.textContent = state.quoteText;
  refs.payment.textContent = state.paymentText;
  refs.proof.textContent = state.proofText;
  refs.share.textContent = buildShareText(state);
  refs.order.href = state.orderUrl;
  refs.intake.href = state.intakeUrl;
  refs.paid.href = state.paidUrl;
  refs.sample.href = state.sampleUrl;
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

function flash(button) {
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}
