import { buildPacket, parseIntakeMessage } from "./logic.js";

const form = document.getElementById("fulfillmentForm");
const intakePaste = document.getElementById("intakePaste");
const tabs = document.getElementById("tabs");
const outputPreview = document.getElementById("outputPreview");
let activeTab = "email";

form.addEventListener("input", render);
document.getElementById("applyIntake").addEventListener("click", applyIntake);
document.getElementById("copyOutput").addEventListener("click", () => copyText(currentPacket()[activeTab]));
document.getElementById("downloadPacket").addEventListener("click", downloadPacket);

render();

function render() {
  const labels = {
    email: "Delivery email",
    result: "Result draft",
    setup: "Setup note",
    checklist: "Next actions"
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
  outputPreview.textContent = currentPacket()[activeTab];
}

function currentPacket() {
  const data = Object.fromEntries(new FormData(form));
  return buildPacket({ ...data, offerLabel: selectedOptionText(form.elements.offer) });
}

function applyIntake() {
  const parsed = parseIntakeMessage(intakePaste.value);
  Object.entries(parsed).forEach(([key, value]) => {
    if (value && form.elements[key]) {
      form.elements[key].value = value;
    }
  });
  render();
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

function selectedOptionText(select) {
  return select.options[select.selectedIndex]?.textContent || "구매 오퍼";
}

function downloadPacket() {
  const packet = currentPacket();
  const text = Object.entries(packet).map(([key, value]) => `## ${key}\n${value}`).join("\n\n");
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-fulfillment-packet.md";
  link.click();
  URL.revokeObjectURL(url);
}
