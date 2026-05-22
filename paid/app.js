import { buildPaidState } from "./logic.js";

let state = buildPaidState({ params: new URLSearchParams(window.location.search) });

const refs = {
  form: document.querySelector("#paidForm"),
  title: document.querySelector("#title"),
  amount: document.querySelector("#amount"),
  ref: document.querySelector("#ref"),
  paidAt: document.querySelector("#paidAt"),
  evidence: document.querySelector("#evidence"),
  csv: document.querySelector("#csv"),
  invoice: document.querySelector("#invoice"),
  copyButtons: document.querySelectorAll("[data-copy]")
};

seedForm();
render();

refs.form.addEventListener("input", () => {
  state = buildPaidState({ params: new URLSearchParams(new FormData(refs.form)) });
  render();
});

refs.copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    await copyText(document.querySelector(button.dataset.copy).textContent);
    flash(button);
  });
});

function seedForm() {
  Object.entries({
    offer: state.offerKey,
    ref: state.ref,
    buyer: state.buyer,
    amount: String(state.amount),
    paidAt: state.paidAt,
    useCase: state.useCase,
    contact: state.contact,
    paymentRoute: state.paymentRoute
  }).forEach(([key, value]) => {
    const field = refs.form.elements[key];
    if (field) field.value = value;
  });
}

function render() {
  refs.title.textContent = `${state.offer.label} 결제 증빙`;
  refs.amount.textContent = state.amountText;
  refs.ref.textContent = state.ref;
  refs.paidAt.textContent = state.paidAt;
  refs.evidence.textContent = state.evidenceText;
  refs.csv.textContent = state.evidenceCsv;
  refs.invoice.href = state.invoiceUrl;
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
