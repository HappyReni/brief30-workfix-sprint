import { buildApprovalShareText, buildApprovalState } from "./logic.js";

const orderConfig = window.BRIEF30_ORDER_CONFIG || {};
const params = new URLSearchParams(window.location.search);
const form = document.querySelector("#approvalForm");
const refs = {
  title: document.querySelector("#pageTitle"),
  amount: document.querySelector("#amount"),
  ref: document.querySelector("#ref"),
  due: document.querySelector("#due"),
  paymentState: document.querySelector("#paymentState"),
  memo: document.querySelector("#memo"),
  forward: document.querySelector("#forward"),
  security: document.querySelector("#security"),
  csv: document.querySelector("#csv"),
  order: document.querySelector("#orderCta"),
  invoice: document.querySelector("#invoiceCta"),
  paid: document.querySelector("#paidCta"),
  sample: document.querySelector("#sampleCta"),
  team: document.querySelector("#teamCta")
};

hydrate();
render();
form.addEventListener("input", render);
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyTarget(button));
});

function hydrate() {
  const initial = buildApprovalState({ params, orderConfig });
  setValue("offer", initial.offerKey);
  setValue("buyer", initial.buyer);
  setValue("company", initial.company);
  setValue("approver", initial.approver);
  setValue("useCase", initial.useCase);
  setValue("people", initial.people);
  setValue("hours", initial.weeklyHours);
  setValue("date", initial.issueDate);
  setValue("due", initial.dueDate);
  setValue("payment", initial.paymentRoute);
}

function render() {
  const data = new FormData(form);
  const state = buildApprovalState({
    params: new URLSearchParams([...data.entries()].filter(([, value]) => String(value || "").trim())),
    orderConfig
  });
  refs.title.textContent = `${state.offer.label} 승인 메모`;
  refs.amount.textContent = state.amountText;
  refs.ref.textContent = state.ref;
  refs.due.textContent = state.dueDate;
  refs.paymentState.textContent = state.ready ? "결제 루트 포함" : "승인 후 결제 루트 확인";
  refs.memo.textContent = state.memoText;
  refs.forward.textContent = state.forwardText;
  refs.security.textContent = state.securityText;
  refs.csv.textContent = state.updateCsv;
  refs.order.href = state.orderUrl;
  refs.invoice.href = state.invoiceUrl;
  refs.paid.href = state.paidUrl;
  refs.sample.href = state.sampleUrl;
  refs.team.href = state.teamUrl;
}

async function copyTarget(button) {
  const selector = button.dataset.copy;
  const target = document.querySelector(selector);
  const state = buildApprovalState({ params: new URLSearchParams(new FormData(form)), orderConfig });
  const text = selector === "#all" ? buildApprovalShareText(state) : target?.textContent || "";
  await copyText(text);
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
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

function setValue(name, value) {
  if (form.elements[name]) {
    form.elements[name].value = value;
  }
}
