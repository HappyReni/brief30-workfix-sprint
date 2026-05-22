import { buildDealRoomState } from "./logic.js";

const state = buildDealRoomState(
  window.location.search,
  window.BRIEF30_ORDER_CONFIG || {},
  window.BRIEF30_MARKETING_CONFIG || {},
  { currentUrl: window.location.href }
);

const setText = (selector, value) => {
  document.querySelector(selector).textContent = value;
};

setText("#buyerName", state.buyer);
setText("#roomTitle", `${state.buyer} 전용 진행룸`);
setText("#roomSubtitle", `${state.useCase} 건을 ${state.shortOfferPhrase} 바로 확인합니다.`);
setText("#amount", state.amountText);
setText("#ref", state.ref);
setText("#routeLabel", state.route.label);
setText("#routeInstruction", state.route.instruction);
setText("#offerLabel", state.offer.label);
setText("#delivery", state.offer.delivery);
setText("#useCase", state.useCase);
setText("#shareText", state.shareText);
setText("#securityText", state.securityText);
setText("#operatorCsv", state.operatorCsv);

document.querySelector("#primaryCta").href = state.primaryCta.href;
document.querySelector("#primaryCta").textContent = state.primaryCta.label;
document.querySelector("#invoiceCta").href = state.urls.invoice;
document.querySelector("#approvalCta").href = state.urls.approval;
document.querySelector("#paidCta").href = state.urls.paid;
document.querySelector("#intakeCta").href = state.urls.intake;
document.querySelector("#diagnosticCta").href = state.urls.diagnostic;

if (state.offer.key !== "team") {
  document.querySelector("#approvalCta").textContent = "청구서";
  document.querySelector("#approvalCta").href = state.urls.invoice;
}

document.querySelector("#stepGrid").innerHTML = state.steps
  .map(
    (step, index) => `
      <a class="stepCard" href="${step.href}">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${step.title}</strong>
        <p>${step.body}</p>
        <small>${step.label}</small>
      </a>
    `
  )
  .join("");

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    await copyText(document.querySelector(button.dataset.copy).textContent);
    const original = button.textContent;
    button.textContent = "복사됨";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  });
});

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
