import { buildFollowupDesk, sampleLedger } from "./logic.js";

const STORAGE_KEY = "brief30.followupDesk.v1";
const form = document.querySelector("#followupForm");
const ledgerText = document.querySelector("#ledgerText");
const metricGrid = document.querySelector("#metricGrid");
const topFollowup = document.querySelector("#topFollowup");
const followupCards = document.querySelector("#followupCards");
const updateCsv = document.querySelector("#updateCsv");
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
  form.elements.statuses.value = saved.statuses || "tester,replied,contacted";
  form.elements.limit.value = saved.limit || "12";
  ledgerText.value = saved.ledger || "";
}

function bindEvents() {
  form.addEventListener("input", render);
  ledgerText.addEventListener("input", render);
  document.querySelector("#loadSample").addEventListener("click", () => {
    ledgerText.value = sampleLedger;
    render();
  });
  document.querySelector("#clearAll").addEventListener("click", () => {
    ledgerText.value = "";
    render();
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyFrom(button));
  });
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  const view = buildFollowupDesk({ ...data, ledger: ledgerText.value });
  persist(data);
  nextLevel.textContent = levelText(view.next.level);
  nextLevel.dataset.level = view.next.level;
  nextLabel.textContent = view.next.label;
  nextDetail.textContent = view.next.detail;
  metricGrid.innerHTML = view.metrics.map(metricCard).join("");
  topFollowup.innerHTML = topCard(view);
  followupCards.innerHTML = view.cards.length ? view.cards.map(followupCard).join("") : emptyCard();
  updateCsv.textContent = view.updateCsv;
  commandBlock.textContent = view.commandBlock;
  fullText.textContent = view.fullText;
}

function topCard(view) {
  if (!view.top) {
    return `<article><span>Next</span><strong>${escapeHtml(view.next.label)}</strong><p>${escapeHtml(view.next.detail)}</p></article>`;
  }
  return `
    <article>
      <span>Top follow-up</span>
      <strong>${escapeHtml(view.top.name)} · ${escapeHtml(view.top.offer)} · ${escapeHtml(view.top.nextTouch)}</strong>
      <p>${escapeHtml(view.top.message)}</p>
      <a href="${escapeHtml(view.top.closeUrl)}">클로징 링크 열기</a>
    </article>
  `;
}

function followupCard(item) {
  return `
    <article>
      <strong>${escapeHtml(item.name)} · ${escapeHtml(item.status)} · ${escapeHtml(item.offer)}</strong>
      <small>next ${escapeHtml(item.nextTouch)}</small>
      <p>${escapeHtml(item.message)}</p>
      <a href="${escapeHtml(item.closeUrl)}">클로징</a>
    </article>
  `;
}

function emptyCard() {
  return "<article><strong>후속 후보 없음</strong><p>운영 CSV를 붙여넣거나 상태 필터를 넓히세요.</p></article>";
}

function metricCard(item) {
  return `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`;
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, ledger: ledgerText.value }));
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
  if (level === "done") return "완료";
  return "입력";
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
