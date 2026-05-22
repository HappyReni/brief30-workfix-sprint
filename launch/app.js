import {
  CHANNELS,
  OFFERS,
  PERSONAS,
  SPRINT_DAYS,
  STORAGE_KEY,
  TARGET_KRW,
  buildCsv,
  buildMessage,
  buyersNeeded,
  channelById,
  defaultState,
  formatKrw,
  progressPercent,
  sprintDate,
  taskKey
} from "./model.js";
import { OPERATOR_PAYMENTS_KEY, operatorLedgerSummary } from "./revenue-sync.js";

let state = loadState();

const refs = {
  paid: document.getElementById("paidInput"),
  syncPaid: document.getElementById("syncPaid"),
  syncStatus: document.getElementById("syncStatus"),
  progress: document.getElementById("progressFill"),
  kpi: document.getElementById("kpiGrid"),
  daySelect: document.getElementById("daySelect"),
  taskList: document.getElementById("taskList"),
  channelDeck: document.getElementById("channelDeck"),
  channel: document.getElementById("channelSelect"),
  persona: document.getElementById("personaSelect"),
  offer: document.getElementById("offerSelect"),
  proofUrl: document.getElementById("proofUrl"),
  orderUrl: document.getElementById("orderUrl"),
  message: document.getElementById("messageOutput"),
  channelDetail: document.getElementById("channelDetail")
};

hydrateControls();
bindEvents();
syncPaidFromOperator();
render();

function loadState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydrateControls() {
  refs.daySelect.innerHTML = SPRINT_DAYS.map((day) => option(day.day, `D${day.day} · ${sprintDate(day.day)}`)).join("");
  refs.channel.innerHTML = CHANNELS.map((channel) => option(channel.id, channel.label)).join("");
  refs.persona.innerHTML = PERSONAS.map((persona) => option(persona, persona)).join("");
  refs.offer.innerHTML = Object.entries(OFFERS).map(([key, offer]) => option(key, offer.label)).join("");
  syncFormValues();
}

function bindEvents() {
  refs.paid.addEventListener("input", updateField("paid", Number));
  refs.daySelect.addEventListener("change", updateField("currentDay", Number));
  refs.channel.addEventListener("change", updateField("channel"));
  refs.persona.addEventListener("change", updateField("persona"));
  refs.offer.addEventListener("change", updateField("offer"));
  refs.proofUrl.addEventListener("input", updateField("proofUrl"));
  refs.orderUrl.addEventListener("input", updateField("orderUrl"));
  refs.syncPaid.addEventListener("click", syncPaidFromOperator);
  document.getElementById("copyMessage").addEventListener("click", () => copyText(refs.message.textContent));
  document.getElementById("exportSprint").addEventListener("click", exportSprint);
  document.getElementById("resetSprint").addEventListener("click", () => {
    state = defaultState();
    saveState();
    syncFormValues();
    render();
  });
}

function updateField(field, cast = String) {
  return (event) => {
    state = { ...state, [field]: cast(event.target.value) };
    saveState();
    render();
  };
}

function syncFormValues() {
  refs.paid.value = state.paid;
  refs.daySelect.value = state.currentDay;
  refs.channel.value = state.channel;
  refs.persona.value = state.persona;
  refs.offer.value = state.offer;
  refs.proofUrl.value = state.proofUrl;
  refs.orderUrl.value = state.orderUrl;
}

function render() {
  renderKpis();
  renderTasks();
  renderChannels();
  renderMessage();
}

function renderKpis() {
  const ledger = operatorLedgerSummary(localStorage.getItem(OPERATOR_PAYMENTS_KEY));
  const gap = Math.max(TARGET_KRW - Number(state.paid || 0), 0);
  const teamNeeded = buyersNeeded(state.paid, "team");
  const serviceNeeded = buyersNeeded(state.paid, "service");
  refs.progress.style.width = `${progressPercent(state.paid)}%`;
  refs.syncStatus.textContent = ledger.count
    ? `Operator ledger ${ledger.count}건 · ${formatKrw(ledger.revenue)}`
    : "Operator paid ledger 없음";
  refs.kpi.innerHTML = [
    metric("현재 확정", formatKrw(state.paid)),
    metric("남은 금액", formatKrw(gap)),
    metric("팀 스프린트 필요", `${teamNeeded}건`),
    metric("대행팩 필요", `${serviceNeeded}건`)
  ].join("");
}

function syncPaidFromOperator() {
  const ledger = operatorLedgerSummary(localStorage.getItem(OPERATOR_PAYMENTS_KEY));
  if (!ledger.count) {
    return;
  }
  state = { ...state, paid: ledger.revenue };
  saveState();
  syncFormValues();
}

function renderTasks() {
  const day = SPRINT_DAYS.find((item) => item.day === Number(state.currentDay)) || SPRINT_DAYS[0];
  refs.taskList.innerHTML = `
    <div class="dayHead">
      <div>
        <p class="eyebrow">D${day.day} · ${sprintDate(day.day)}</p>
        <h2>${day.title}</h2>
      </div>
      <strong>${day.target}</strong>
    </div>
    <div class="tasks">
      ${day.tasks.map((task) => taskItem(day.day, task)).join("")}
    </div>
  `;
  refs.taskList.querySelectorAll("input").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      state.completed = { ...state.completed, [checkbox.value]: checkbox.checked };
      saveState();
      render();
    });
  });
}

function renderChannels() {
  refs.channelDeck.innerHTML = CHANNELS.map((channel) => `
    <article class="${channel.id === state.channel ? "active" : ""}" data-channel="${channel.id}">
      <span>${channel.quota}</span>
      <strong>${channel.label}</strong>
      <p>${channel.goal}</p>
      ${channel.url ? `<a href="${channel.url}" target="_blank" rel="noreferrer">열기</a>` : "<em>내 연락처</em>"}
    </article>
  `).join("");
  refs.channelDeck.querySelectorAll("article").forEach((card) => {
    card.addEventListener("click", () => {
      state.channel = card.dataset.channel;
      saveState();
      syncFormValues();
      render();
    });
  });
  const channel = channelById(state.channel);
  refs.channelDetail.innerHTML = `
    <strong>${channel.label}</strong>
    <span>${channel.guardrail}</span>
  `;
}

function renderMessage() {
  refs.message.textContent = buildMessage(state);
}

function metric(label, value) {
  return `
    <article>
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function taskItem(day, task) {
  const key = taskKey(day, task.id);
  const checked = state.completed[key] ? "checked" : "";
  return `
    <label class="taskRow">
      <input type="checkbox" value="${key}" ${checked} />
      <span>
        <strong>${task.label}</strong>
        <small>${task.impact}</small>
      </span>
    </label>
  `;
}

function option(value, label) {
  return `<option value="${value}">${label}</option>`;
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

function exportSprint() {
  const blob = new Blob([buildCsv(state)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-direct-sales-sprint.csv";
  link.click();
  URL.revokeObjectURL(url);
}
