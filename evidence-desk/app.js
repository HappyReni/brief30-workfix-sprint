import { buildEvidenceDesk, samplePaymentText } from "./logic.js";

const STORAGE_KEY = "brief30.evidenceDesk.v1";
const form = document.querySelector("#evidenceForm");
const paymentText = document.querySelector("#paymentText");
const metricGrid = document.querySelector("#metricGrid");
const priorityPanel = document.querySelector("#priorityPanel");
const readyRows = document.querySelector("#readyRows");
const reviewRows = document.querySelector("#reviewRows");
const evidenceCsv = document.querySelector("#evidenceCsv");
const commandText = document.querySelector("#commandText");
const fullText = document.querySelector("#fullText");
const readyBadge = document.querySelector("#readyBadge");
const priorityText = document.querySelector("#priorityText");

hydrate();
bindEvents();
render();

function hydrate() {
  const saved = loadJson(STORAGE_KEY, {});
  form.elements.date.value = saved.date || today();
  form.elements.month.value = saved.month || today().slice(0, 7);
  form.elements.paymentRoute.value = saved.paymentRoute || "";
  paymentText.value = saved.paymentText || "";
}

function bindEvents() {
  form.addEventListener("input", render);
  paymentText.addEventListener("input", render);
  document.querySelector("#loadSamples").addEventListener("click", () => {
    paymentText.value = samplePaymentText;
    render();
  });
  document.querySelector("#clearText").addEventListener("click", () => {
    paymentText.value = "";
    render();
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyFrom(button, button.dataset.copy));
  });
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  const view = buildEvidenceDesk({ paymentText: paymentText.value }, data);
  persist(data);
  readyBadge.textContent = view.ready.length ? "병합 가능" : "증거 대기";
  readyBadge.dataset.ready = String(Boolean(view.ready.length));
  priorityText.textContent = view.ready.length
    ? `${view.ready.length}건 / ${formatKrw(view.readyTotal)} 확인`
    : "실제 결제 증거만 병합";
  metricGrid.innerHTML = view.metrics.map(metricCard).join("");
  priorityPanel.innerHTML = renderPriority(view);
  readyRows.innerHTML = view.ready.map((row) => rowCard(row, "ready")).join("") || emptyCard("병합 가능한 행이 없습니다.");
  reviewRows.innerHTML = view.review.map((row) => rowCard(row, "review")).join("") || emptyCard("보완할 행이 없습니다.");
  evidenceCsv.textContent = view.evidenceCsv;
  commandText.textContent = view.commands;
  fullText.textContent = view.fullText;
}

function renderPriority(view) {
  const body = view.ready.length
    ? `원문 결제 문자를 저장한 뒤 money:paid로 파싱, 병합, 감사를 한 번에 확인합니다. 남은 갭: ${formatKrw(view.gapAfterReady)}`
    : "주문번호, 구매자, 금액, 상품, 날짜가 모두 있어야 매출 CSV에 들어갑니다.";
  return `<article><span>NEXT</span><strong>${escapeHtml(view.ready.length ? "실제 증거 확인 후 병합" : "증거 항목 보완")}</strong><p>${escapeHtml(body)}</p></article>`;
}

function rowCard(row, type) {
  const title = type === "ready" ? `${row.buyer} · ${formatKrw(row.amount)}` : `row ${row.index} · ${row.issues.join(", ")}`;
  const body = type === "ready" ? `${row.ref} / ${row.offer} / ${row.paidAt}` : row.raw;
  return `<article class="${type}Card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>`;
}

function emptyCard(text) {
  return `<article class="plainCard"><p>${escapeHtml(text)}</p></article>`;
}

function metricCard(metric) {
  return `<article><span>${metric.label}</span><strong>${metric.value}</strong></article>`;
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, paymentText: paymentText.value }));
}

async function copyFrom(button, selector) {
  await copyText(document.querySelector(selector)?.textContent || "");
  flash(button, "복사됨");
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

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function flash(button, text) {
  const original = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1100);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}
