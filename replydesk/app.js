import { applyOfferStrategy, buildCloseCsv, buildCloseQueue, buildResponse, buildUpdateCsv, normalizeUrls, parseReplies, typeLabel } from "./logic.js";

const STORAGE_KEY = "brief30.replydesk.v1";
const sampleReplies = [
  "김PM | 오 이거 좋네요. 실제 주간보고에 써볼 수 있을 것 같아요.",
  "창업자 C | 회사 자료라 보안이 좀 걱정되는데 외부로 나가나요?",
  "프리랜서님 | 직접 쓰기보다 고객사 업데이트를 대신 정리해주실 수 있나요?",
  "박리드 | 팀 예산으로 승인받으면 여러 명 메모도 같이 정리되나요?",
  "팀장님 | 가격이 얼마인지 보고 결정하고 싶습니다."
].join("\n");

const form = document.querySelector("#replyForm");
const replyList = document.querySelector("#replyList");
const updateCsv = document.querySelector("#updateCsv");
const closeQueue = document.querySelector("#closeQueue");
const closeCsv = document.querySelector("#closeCsv");
const kpiGrid = document.querySelector("#kpiGrid");

hydrate();
bindEvents();
render();

function hydrate() {
  const saved = loadJson(STORAGE_KEY, {});
  form.elements.publicUrl.value = saved.publicUrl || "https://your-site.example.com/";
  form.elements.offer.value = saved.offer || "setup";
  form.elements.replies.value = saved.replies || sampleReplies;
}

function bindEvents() {
  form.addEventListener("input", render);
  document.querySelector("#loadSample").addEventListener("click", () => {
    form.elements.replies.value = sampleReplies;
    render();
  });
  document.querySelector("#copyAll").addEventListener("click", () => copyText(getRows().map((row) => row.response).join("\n\n")));
  document.querySelector("#copyUpdateCsv").addEventListener("click", () => copyText(updateCsv.textContent));
  document.querySelector("#copyCloseCsv").addEventListener("click", () => copyText(closeCsv.textContent));
  document.querySelector("#downloadCsv").addEventListener("click", downloadCsv);
}

function render() {
  const rows = getRows();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(new FormData(form))));
  updateCsv.textContent = buildUpdateCsv(rows);
  closeCsv.textContent = buildCloseCsv(rows, normalizeUrls(form.elements.publicUrl.value));
  renderKpis(rows);
  renderCloseQueue(rows);
  replyList.innerHTML = rows.map((row, index) => `
    <article class="replyCard ${row.status === "lost" ? "isLost" : ""}">
      <div class="replyHead">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(row.name)} · ${escapeHtml(typeLabel(row.type))}</strong>
          <small>${escapeHtml(row.status)} · ${escapeHtml(row.offer)}</small>
        </div>
      </div>
      <blockquote>${escapeHtml(row.reply)}</blockquote>
      <pre>${escapeHtml(row.response)}</pre>
      <div class="cardActions">
        <button class="primary" data-copy="${index}" type="button">답장 복사</button>
        ${row.status === "tester" ? `<a class="secondary" href="${escapeHtml(buildCloseQueue([row], normalizeUrls(form.elements.publicUrl.value))[0].closeUrl)}">클로저 열기</a>` : ""}
      </div>
    </article>
  `).join("");
  replyList.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      copyText(rows[Number(button.dataset.copy)].response);
      flash(button);
    });
  });
}

function renderCloseQueue(rows) {
  const urls = normalizeUrls(form.elements.publicUrl.value);
  const queue = buildCloseQueue(rows, urls);
  closeQueue.innerHTML = queue.length ? queue.map((item) => `
    <a class="closeRow" href="${escapeHtml(item.closeUrl)}">
      <span>${escapeHtml(typeLabel(item.type))}</span>
      <strong>${escapeHtml(item.name)} · ${escapeHtml(item.offer)} · ${Number(item.amount).toLocaleString("ko-KR")}원</strong>
      <small>${escapeHtml(item.prompt)}</small>
      ${item.serviceUrl ? `<em>${escapeHtml(item.serviceUrl)}</em>` : ""}
    </a>
  `).join("") : "<p class=\"emptyState\">결제 요청 후보가 없습니다.</p>";
}

function getRows() {
  const data = Object.fromEntries(new FormData(form));
  const urls = normalizeUrls(data.publicUrl);
  return parseReplies(data.replies)
    .sort((a, b) => a.priority - b.priority)
    .map((row) => applyOfferStrategy(row, data.offer))
    .map((row) => ({ ...row, response: buildResponse(row, urls, data.offer) }));
}

function renderKpis(rows) {
  const testers = rows.filter((row) => row.status === "tester").length;
  const replies = rows.filter((row) => row.status === "replied").length;
  const service = rows.filter((row) => row.offer === "service").length;
  const team = rows.filter((row) => row.offer === "team").length;
  kpiGrid.innerHTML = [
    kpi("처리 답장", `${rows.length}개`),
    kpi("결제 질문", `${testers}개`),
    kpi("팀 클로즈", `${team}개`),
    kpi("대행 기회", `${service}개`),
    kpi("추가 설득", `${replies}개`)
  ].join("");
}

function downloadCsv() {
  const blob = new Blob([updateCsv.textContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-reply-stage-updates.csv";
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

function flash(button) {
  const original = button.textContent;
  button.textContent = "복사됨";
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

function kpi(label, value) {
  return `<article><span>${label}</span><strong>${value}</strong></article>`;
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
