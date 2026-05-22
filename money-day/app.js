import { buildMoneyDayConsole, buildSamplePayments, buildSampleReplies } from "./logic.js";

const form = document.querySelector("#moneyForm");
const ledgerInput = document.querySelector("#ledgerText");
const replyInput = document.querySelector("#replyText");
const paymentInput = document.querySelector("#paymentText");
const metricGrid = document.querySelector("#metricGrid");
const priorityText = document.querySelector("#priorityText");
const paymentGate = document.querySelector("#paymentGate");
const teamClose = document.querySelector("#teamClose");
const hotList = document.querySelector("#hotList");
const followupList = document.querySelector("#followupList");
const sendList = document.querySelector("#sendList");
const evidenceCsv = document.querySelector("#evidenceCsv");
const commandCsv = document.querySelector("#commandCsv");
const fullText = document.querySelector("#fullText");

document.querySelector("#loadSeed").addEventListener("click", loadSeed);
document.querySelector("#loadSamples").addEventListener("click", () => {
  replyInput.value = buildSampleReplies();
  paymentInput.value = buildSamplePayments();
  render();
});
document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyFrom(button));
});
form.addEventListener("input", render);

await loadSeed();
render();

async function loadSeed() {
  try {
    const response = await fetch("../outreach/prospect-seed.csv", { cache: "no-store" });
    ledgerInput.value = await response.text();
  } catch {
    ledgerInput.value = "name,segment,source,offer,status,next_touch,note\nLead 20,창업자,direct_dm,team,replied,,팀 업데이트";
  }
  render();
}

function render() {
  const view = buildMoneyDayConsole(
    {
      ledgerText: ledgerInput.value,
      replyText: replyInput.value,
      paymentText: paymentInput.value
    },
    {
      publicUrl: field("publicUrl"),
      paymentRoute: field("paymentRoute"),
      email: field("email"),
      date: field("date"),
      month: field("month"),
      count: field("count"),
      focus: "team"
    }
  );

  paymentGate.textContent = view.paymentGate;
  paymentGate.dataset.ready = String(view.pack.paymentReady);
  priorityText.textContent = view.priority;
  metricGrid.innerHTML = view.metrics.map(metricTemplate).join("");
  teamClose.innerHTML = teamTemplate(view.teamClose);
  hotList.innerHTML = cards(view.hotAsks, (item) => `${item.name} · ${item.signal} · score ${item.score}`, "money-card");
  followupList.innerHTML = cards(view.followups, (item) => `${item.name} · ${item.status}`, "plain-card");
  sendList.innerHTML = cards(view.newSends, (item) => `${item.name} · ${item.offer}`, "plain-card");
  evidenceCsv.textContent = view.evidenceCsv;
  commandCsv.textContent = view.commandCsv;
  fullText.textContent = view.fullText;
}

function metricTemplate(item) {
  return `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`;
}

function teamTemplate(item) {
  return `
    <article>
      <span>One order close</span>
      <strong>${escapeHtml(item.amount)} · ${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.message)}</p>
      ${item.dealRoomUrl ? `<a href="${item.dealRoomUrl}">개인 진행룸</a>` : ""}
      ${item.orderUrl ? `<a href="${item.orderUrl}">팀 주문 링크</a>` : ""}
    </article>
  `;
}

function cards(items, title, className) {
  if (!items.length) return `<article class="${className}"><strong>대상 없음</strong><p>붙여넣은 리드/답장을 더 채우면 자동 생성됩니다.</p></article>`;
  return items.map((item) => `
    <article class="${className}">
      <strong>${escapeHtml(title(item))}</strong>
      <p>${escapeHtml(item.message || item.note || "")}</p>
    </article>
  `).join("");
}

async function copyFrom(button) {
  const target = document.querySelector(button.dataset.copy);
  if (!target) return;
  await copyText(target.textContent);
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
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

function field(name) {
  return form.elements.namedItem(name)?.value || "";
}
