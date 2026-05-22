import { buildContactDesk, sampleContacts, sampleLedger } from "./logic.js";

const STORAGE_KEY = "brief30.contactDesk.v1";
const form = document.querySelector("#deskForm");
const contactText = document.querySelector("#contactText");
const ledgerText = document.querySelector("#ledgerText");
const metricGrid = document.querySelector("#metricGrid");
const topAsk = document.querySelector("#topAsk");
const contactList = document.querySelector("#contactList");
const messageText = document.querySelector("#messageText");
const operatorCsv = document.querySelector("#operatorCsv");
const reviewCsv = document.querySelector("#reviewCsv");
const fullText = document.querySelector("#fullText");
const priorityText = document.querySelector("#priorityText");

hydrate();
bindEvents();
render();

function hydrate() {
  const saved = loadJson(STORAGE_KEY, {});
  form.elements.publicUrl.value = saved.publicUrl || "";
  form.elements.date.value = saved.date || today();
  form.elements.limit.value = saved.limit || 20;
  form.elements.offer.value = saved.offer || "";
  contactText.value = saved.contacts || "";
  ledgerText.value = saved.ledger || "";
}

function bindEvents() {
  form.addEventListener("input", render);
  contactText.addEventListener("input", render);
  ledgerText.addEventListener("input", render);
  document.querySelector("#loadSamples").addEventListener("click", () => {
    contactText.value = sampleContacts;
    ledgerText.value = sampleLedger;
    render();
  });
  document.querySelector("#clearLedger").addEventListener("click", () => {
    ledgerText.value = "";
    render();
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyFrom(button, button.dataset.copy));
  });
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  const view = buildContactDesk(
    { contacts: contactText.value, ledger: ledgerText.value },
    { publicUrl: data.publicUrl, date: data.date, limit: data.limit, offer: data.offer }
  );
  persist(data);
  priorityText.textContent = view.topAsk ? `${view.topAsk.name} 먼저 발송` : "따뜻한 후보를 붙여넣기";
  metricGrid.innerHTML = view.metrics.map((metric) => metricCard(metric)).join("");
  topAsk.innerHTML = renderTopAsk(view.topAsk);
  contactList.innerHTML = view.sendableRows.map((row, index) => contactCard(row, index)).join("");
  messageText.textContent = view.messages || "보낼 후보가 없습니다.";
  operatorCsv.textContent = view.operatorCsv;
  reviewCsv.textContent = view.reviewCsv;
  fullText.textContent = view.fullText;
}

function renderTopAsk(row) {
  if (!row) {
    return `<article><span>NEXT</span><strong>후보 메모를 붙여넣으세요</strong><p>이름 | 관계 | 고민 형식이면 바로 점수순으로 정리됩니다.</p></article>`;
  }
  return `
    <article>
      <span>NEXT SEND</span>
      <strong>${escapeHtml(row.name)} · ${escapeHtml(row.offerLabel)}</strong>
      <p>${escapeHtml(row.note)}</p>
      <a href="${escapeHtml(row.dealRoomUrl)}">개인 진행룸</a>
    </article>
  `;
}

function contactCard(row, index) {
  return `
    <article class="contactCard">
      <div>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(row.name)} · score ${row.score}</strong>
      </div>
      <p>${escapeHtml(row.note)}</p>
      <small>${escapeHtml(row.offerLabel)} · ${escapeHtml(row.source)}</small>
    </article>
  `;
}

function metricCard(metric) {
  return `<article><span>${metric.label}</span><strong>${metric.value}</strong></article>`;
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...data,
    contacts: contactText.value,
    ledger: ledgerText.value
  }));
}

async function copyFrom(button, selector) {
  const target = document.querySelector(selector);
  await copyText(target?.textContent || "");
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}
