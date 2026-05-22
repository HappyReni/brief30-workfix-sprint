import { SAMPLE_NOTE, STORAGE_KEY, buildIntakeUrl, buildOrderUrl, diagnose, resultMarkdown } from "./engine.js";

const form = document.getElementById("diagnosticForm");
const output = document.getElementById("resultOutput");
const score = document.getElementById("scoreValue");
const scoreFill = document.getElementById("scoreFill");
const ctaGrid = document.getElementById("ctaGrid");
const adviceList = document.getElementById("adviceList");
const copyButton = document.getElementById("copyResult");
const sampleButton = document.getElementById("loadSample");

let currentResult = null;

hydrate();
form.addEventListener("input", render);
form.addEventListener("submit", (event) => event.preventDefault());
copyButton.addEventListener("click", () => copyText(resultMarkdown(currentResult)));
sampleButton.addEventListener("click", () => {
  form.elements.note.value = SAMPLE_NOTE;
  render();
});

render();

function hydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    Object.entries(saved).forEach(([key, value]) => {
      if (form.elements[key]) {
        form.elements[key].value = value;
      }
    });
  } catch {
    form.elements.note.value = SAMPLE_NOTE;
  }
  if (!form.elements.note.value.trim()) {
    form.elements.note.value = SAMPLE_NOTE;
  }
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  currentResult = diagnose(data);
  score.textContent = `${currentResult.score.overall}`;
  scoreFill.style.width = `${currentResult.score.overall}%`;
  output.innerHTML = `
    <section>
      <p class="eyebrow">3-line brief</p>
      <h2>${escapeHtml(currentResult.headline)}</h2>
      <ul>${currentResult.executive.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section>
      <p class="eyebrow">Preview</p>
      <pre>${escapeHtml(currentResult.report)}</pre>
    </section>
    <section class="locked">
      <p class="eyebrow">Paid unlock</p>
      ${currentResult.locked.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </section>
  `;
  adviceList.innerHTML = currentResult.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  renderCtas(data.offer || "setup");
}

function renderCtas(offer) {
  const orderUrl = buildOrderUrl(offer);
  const intakeUrl = buildIntakeUrl(offer);
  ctaGrid.innerHTML = `
    <a class="primary" href="${orderUrl}">이 결과로 주문하기</a>
    <a class="secondary" href="../closing/index.html?offer=${offer}">견적/입금 안내</a>
    <a class="secondary" href="${intakeUrl}">익명 메모 전달</a>
  `;
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
  flash(copyButton);
}

function flash(button) {
  const original = button.textContent;
  button.textContent = "복사 완료";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1000);
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
