import { SEGMENTS, SOURCES, generateProspects } from "../prospecting/data.js";
import { buildAllMessages, buildOperatorCsv, buildOutboxRows, normalizeUrls } from "./messages.js";

const STORAGE_KEY = "brief30.outbox.v1";
const SENT_KEY = "brief30.outbox.sent.v1";
const form = document.querySelector("#outboxForm");
const messageList = document.querySelector("#messageList");
const operatorCsv = document.querySelector("#operatorCsv");
const kpiGrid = document.querySelector("#kpiGrid");

let rows = [];
let sent = loadJson(SENT_KEY, {});

hydrateForm();
bindEvents();
render();

function hydrateForm() {
  form.elements.segment.innerHTML = Object.entries(SEGMENTS).map(([key, item]) => option(key, item.label)).join("");
  form.elements.source.innerHTML = Object.entries(SOURCES).map(([key, item]) => option(key, item.label)).join("");
  const saved = loadJson(STORAGE_KEY, {});
  Object.entries(saved).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function bindEvents() {
  form.addEventListener("input", render);
  document.querySelector("#copyAll").addEventListener("click", () => copyText(buildAllMessages(rows)));
  document.querySelector("#copyCsv").addEventListener("click", () => copyText(operatorCsv.textContent));
  document.querySelector("#downloadCsv").addEventListener("click", downloadCsv);
  document.querySelector("#markAllSent").addEventListener("click", markAllSent);
  document.querySelector("#resetSent").addEventListener("click", () => {
    sent = {};
    persistSent();
    render();
  });
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const names = String(data.names || "").split("\n").map((name) => name.trim()).filter(Boolean);
  const prospects = generateProspects({
    segment: data.segment,
    source: data.source,
    count: data.count,
    offer: data.offer
  });
  rows = buildOutboxRows(prospects, names, normalizeUrls(data.publicUrl || ""));
  operatorCsv.textContent = buildOperatorCsv(sentRows());
  renderKpis(data);
  renderMessages();
}

function renderKpis(data) {
  const sentCount = rows.filter((row) => sent[row.id]).length;
  const replyTarget = Math.max(1, Math.round(rows.length * 0.12));
  const setupMath = closeMath(data.offer);
  kpiGrid.innerHTML = [
    kpi("오늘 발송", `${sentCount}/${rows.length}`),
    kpi("예상 답장", `${replyTarget}명`),
    kpi("월 30 경로", setupMath),
    kpi("다음 행동", sentCount >= rows.length ? "운영판 기록" : "복사 후 발송")
  ].join("");
}

function closeMath(offer) {
  if (offer === "team") return "1건 = 300,000원";
  if (offer === "service") return "4건 = 396,000원";
  if (offer === "self") return "16건 = 304,000원";
  return "7건 = 343,000원";
}

function renderMessages() {
  messageList.innerHTML = rows.map((row, index) => `
    <article class="messageCard ${sent[row.id] ? "isSent" : ""}">
      <div class="messageHead">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(row.name)} · ${escapeHtml(row.role)}</strong>
          <small>${escapeHtml(row.pain)} · ${escapeHtml(row.offerLabel)}</small>
        </div>
      </div>
      <pre>${escapeHtml(row.message)}</pre>
      <div class="cardActions">
        <button class="secondary" data-copy="${row.id}" type="button">문안 복사</button>
        <button class="primary" data-sent="${row.id}" type="button">${sent[row.id] ? "보냄 취소" : "보냄 체크"}</button>
      </div>
    </article>
  `).join("");

  messageList.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = rows.find((item) => item.id === button.dataset.copy);
      copyText(row.message);
      flash(button, "복사됨");
    });
  });
  messageList.querySelectorAll("[data-sent]").forEach((button) => {
    button.addEventListener("click", () => {
      sent[button.dataset.sent] = !sent[button.dataset.sent];
      if (!sent[button.dataset.sent]) {
        delete sent[button.dataset.sent];
      }
      persistSent();
      render();
    });
  });
}

function sentRows() {
  return rows.filter((row) => sent[row.id]);
}

function markAllSent() {
  rows.forEach((row) => {
    sent[row.id] = true;
  });
  persistSent();
  render();
}

function downloadCsv() {
  const blob = new Blob([operatorCsv.textContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-outbox-operator-import.csv";
  link.click();
  URL.revokeObjectURL(url);
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

function flash(button, text) {
  const original = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1100);
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function persistSent() {
  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}

function kpi(label, value) {
  return `<article><span>${label}</span><strong>${value}</strong></article>`;
}

function option(value, label) {
  return `<option value="${value}">${label}</option>`;
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
