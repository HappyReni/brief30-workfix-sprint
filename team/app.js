import { buildTeamShareText, teamCtaLinks, teamPaymentState } from "./links.js";

const marketingConfig = window.BRIEF30_MARKETING_CONFIG || {};
const orderConfig = window.BRIEF30_ORDER_CONFIG || {};
const links = teamCtaLinks({ marketingConfig, orderConfig });

const refs = {
  primaryCta: document.querySelector("#primaryCta"),
  orderCta: document.querySelector("#orderCta"),
  closeCta: document.querySelector("#closeCta"),
  invoiceCta: document.querySelector("#invoiceCta"),
  approvalCta: document.querySelector("#approvalCta"),
  intakeCta: document.querySelector("#intakeCta"),
  sampleCta: document.querySelector("#sampleCta"),
  fallbackCta: document.querySelector("#fallbackCta"),
  paymentState: document.querySelector("#paymentState"),
  shareText: document.querySelector("#shareText"),
  copyShare: document.querySelector("#copyShare")
};

render();

refs.copyShare.addEventListener("click", async () => {
  await copyText(refs.shareText.textContent);
  const original = refs.copyShare.textContent;
  refs.copyShare.textContent = "복사됨";
  window.setTimeout(() => {
    refs.copyShare.textContent = original;
  }, 1200);
});

function render() {
  refs.primaryCta.href = links.primary;
  refs.orderCta.href = links.order;
  refs.closeCta.href = links.close;
  refs.invoiceCta.href = links.invoice;
  refs.approvalCta.href = links.approval;
  refs.intakeCta.href = links.intake;
  refs.sampleCta.href = links.sample;
  refs.fallbackCta.href = links.serviceFallback;
  refs.paymentState.textContent = teamPaymentState({ marketingConfig, orderConfig });
  refs.shareText.textContent = buildTeamShareText(links, window.location.href);
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
