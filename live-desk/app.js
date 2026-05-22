import { buildLiveDesk, sampleLedger, samplePeople, sampleReplies } from "./logic.js";

const form = document.querySelector("#liveForm");
const fields = {
  ledger: document.querySelector("#ledgerText"),
  people: document.querySelector("#peopleText"),
  replies: document.querySelector("#replyText"),
  payments: document.querySelector("#paymentText")
};
const metricGrid = document.querySelector("#metricGrid");
const gatePill = document.querySelector("#gatePill");
const nextSend = document.querySelector("#nextSend");
const commandText = document.querySelector("#commandText");
const inputsJson = document.querySelector("#inputsJson");
const fullText = document.querySelector("#fullText");
const fileList = document.querySelector("#fileList");
const zipList = document.querySelector("#zipList");

document.querySelector("#loadSeed").addEventListener("click", () => {
  fields.ledger.value = sampleLedger;
  render();
});
document.querySelector("#loadWarm").addEventListener("click", () => {
  fields.people.value = samplePeople;
  fields.replies.value = sampleReplies;
  render();
});
document.querySelector("#downloadInputs").addEventListener("click", downloadInputs);
document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copyTarget(button)));
form.addEventListener("input", render);

fields.ledger.value = sampleLedger;
render();

function render() {
  const view = buildLiveDesk(
    {
      ledgerText: fields.ledger.value,
      peopleText: fields.people.value,
      replyText: fields.replies.value,
      paymentText: fields.payments.value
    },
    {
      ledgerPath: field("ledgerPath"),
      inputsPath: field("inputsPath"),
      outDir: field("outDir"),
      date: field("date"),
      month: field("month"),
      publicUrl: field("publicUrl"),
      paymentRoute: field("paymentRoute")
    }
  );
  gatePill.textContent = view.paymentReady ? "발송 가능" : "결제 루트 필요";
  gatePill.dataset.ready = String(view.paymentReady);
  nextSend.textContent = view.nextSend;
  metricGrid.innerHTML = view.metrics.map(metricTemplate).join("");
  commandText.textContent = view.command;
  inputsJson.textContent = view.inputsJson;
  fullText.textContent = view.fullText;
  fileList.innerHTML = listTemplate(view.fileNames);
  zipList.innerHTML = listTemplate(view.zipNames);
}

function metricTemplate(metric) {
  return `<article><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong></article>`;
}

function listTemplate(items) {
  if (!items.length) return "<p>생성 예정 파일이 없습니다.</p>";
  return items.slice(0, 28).map((item) => `<code>${escapeHtml(item)}</code>`).join("");
}

async function copyTarget(button) {
  const target = document.querySelector(button.dataset.copy);
  if (!target) return;
  await copyText(target.textContent);
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function downloadInputs() {
  const blob = new Blob([inputsJson.textContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-live-inputs.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const node = document.createElement("textarea");
    node.value = text;
    document.body.append(node);
    node.select();
    document.execCommand("copy");
    node.remove();
  }
}

function field(name) {
  return form.elements.namedItem(name)?.value || "";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}
