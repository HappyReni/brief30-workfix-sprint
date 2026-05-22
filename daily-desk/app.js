import { buildDailyDesk, sampleLedger } from "./logic.js";

const STORAGE_KEY = "brief30.dailyDesk.v1";
const form = document.querySelector("#dailyForm");
const ledgerText = document.querySelector("#ledgerText");
const namesText = document.querySelector("#namesText");
const metricGrid = document.querySelector("#metricGrid");
const checklist = document.querySelector("#checklist");
const sendCards = document.querySelector("#sendCards");
const operatorCsv = document.querySelector("#operatorCsv");
const commandBlock = document.querySelector("#commandBlock");
const fullText = document.querySelector("#fullText");
const nextLevel = document.querySelector("#nextLevel");
const nextLabel = document.querySelector("#nextLabel");
const nextDetail = document.querySelector("#nextDetail");

hydrate();
bindEvents();
render();

function hydrate() {
  const saved = loadJson(STORAGE_KEY, {});
  form.elements.publicUrl.value = saved.publicUrl || "";
  form.elements.date.value = saved.date || today();
  form.elements.paymentRoute.value = saved.paymentRoute || "";
  form.elements.focus.value = saved.focus || "team";
  form.elements.days.value = saved.days || "14";
  form.elements.count.value = saved.count || "";
  namesText.value = saved.names || "";
  ledgerText.value = saved.ledger || "";
}

function bindEvents() {
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  ledgerText.addEventListener("input", render);
  namesText.addEventListener("input", render);
  document.querySelector("#loadSample").addEventListener("click", () => {
    ledgerText.value = sampleLedger;
    namesText.value = "김팀장\n이PM\n박대표\n정리드\n최컨설턴트";
    render();
  });
  document.querySelector("#clearAll").addEventListener("click", () => {
    ledgerText.value = "";
    namesText.value = "";
    render();
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyFrom(button));
  });
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  const view = buildDailyDesk({ ...data, ledger: ledgerText.value, names: namesText.value });
  persist(data);
  nextLevel.textContent = levelText(view.next.level);
  nextLevel.dataset.level = view.next.level;
  nextLabel.textContent = view.next.label;
  nextDetail.textContent = view.next.detail;
  metricGrid.innerHTML = view.metrics.map(metricCard).join("");
  checklist.innerHTML = view.checklist.map(checkItem).join("");
  sendCards.innerHTML = view.sendCards.length ? view.sendCards.map(sendCard).join("") : emptyCard();
  operatorCsv.textContent = view.operatorCsv;
  commandBlock.textContent = view.commandBlock;
  fullText.textContent = view.fullText;
}

function metricCard(item) {
  return `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`;
}

function checkItem(item) {
  return `<article><strong>${escapeHtml(item)}</strong></article>`;
}

function sendCard(item) {
  return `
    <article>
      <strong>${escapeHtml(item.name)} · ${escapeHtml(item.offer)}</strong>
      <small>${escapeHtml(item.note)}</small>
      <p>${escapeHtml(item.message)}</p>
    </article>
  `;
}

function emptyCard() {
  return "<article><strong>발송 문안 없음</strong><p>운영 CSV 또는 생성 수를 확인하세요.</p></article>";
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...data,
    ledger: ledgerText.value,
    names: namesText.value
  }));
}

async function copyFrom(button) {
  await copyText(document.querySelector(button.dataset.copy)?.textContent || "");
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1100);
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

function levelText(level) {
  if (level === "send") return "발송";
  if (level === "blocked") return "설정";
  if (level === "done") return "감사";
  return "대기";
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
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
