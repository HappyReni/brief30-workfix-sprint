import { SEGMENTS, SOURCES, STORAGE_KEY, buildCsv, buildDm, buildSearchPack, generateProspects } from "./data.js";

const form = document.getElementById("prospectForm");
const table = document.getElementById("prospectTable");
const searchPack = document.getElementById("searchPack");
const dmPreview = document.getElementById("dmPreview");
const stats = document.getElementById("stats");

let rows = [];

hydrate();
bindEvents();
render();

function hydrate() {
  form.elements.segment.innerHTML = Object.entries(SEGMENTS).map(([key, item]) => option(key, item.label)).join("");
  form.elements.source.innerHTML = Object.entries(SOURCES).map(([key, item]) => option(key, item.label)).join("");
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.entries(saved).forEach(([key, value]) => {
      if (form.elements[key]) {
        form.elements[key].value = value;
      }
    });
  } catch {
    form.elements.count.value = 30;
  }
}

function bindEvents() {
  form.addEventListener("input", render);
  document.getElementById("copyCsv").addEventListener("click", () => copyText(buildCsv(rows)));
  document.getElementById("downloadCsv").addEventListener("click", downloadCsv);
  document.getElementById("copySearch").addEventListener("click", () => copyText(buildSearchPack(rows)));
  document.getElementById("copyDm").addEventListener("click", () => copyText(buildDm(rows[0])));
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  rows = generateProspects(data);
  renderStats(data);
  searchPack.textContent = buildSearchPack(rows);
  dmPreview.textContent = buildDm(rows[0]);
  table.innerHTML = rows.slice(0, 40).map((row, index) => `
    <article>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <p>${escapeHtml(row.note)}</p>
      <small>${escapeHtml(row.query)}</small>
    </article>
  `).join("");
}

function renderStats(data) {
  const count = Number(data.count || 30);
  const dmTarget = Math.min(count, 30);
  const expectedReplies = Math.max(1, Math.round(dmTarget * 0.12));
  const expectedClose = Math.max(1, Math.round(expectedReplies * 0.35));
  stats.innerHTML = [
    stat("생성 후보", `${count}명`),
    stat("오늘 DM", `${dmTarget}명`),
    stat("예상 답장", `${expectedReplies}명`),
    stat("결제 질문", `${expectedClose}명`)
  ].join("");
}

function downloadCsv() {
  const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-prospect-import.csv";
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

function stat(label, value) {
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
