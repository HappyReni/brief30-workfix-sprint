import {
  OFFERS,
  PAYMENTS_KEY,
  SETTINGS_KEY,
  STAGES,
  STORAGE_KEY,
  TARGET_KRW,
  csvCell,
  currentMonthRevenue,
  dueLeads,
  escapeHtml,
  formatKrw,
  hotLeads,
  lead,
  nextTouchFor,
  offerPrice,
  option,
  parseLeadCsv,
  parsePaymentEvidenceCsv,
  parseStageUpdateCsv,
  payment,
  seedLeads,
  sourceStats,
  stageWeight,
  statusLabel,
  today
} from "./model.js";
import { DEFAULT_CHECKOUT_LINKS, buildOutboundScript, buildReplyCopy, closeUseCaseForOffer } from "./reply-copy.js";
import { buildRevenuePlan } from "./revenue-plan.js";

let leads = loadJson(STORAGE_KEY, seedLeads);
let settings = { ...DEFAULT_CHECKOUT_LINKS, ...loadJson(SETTINGS_KEY, {}) };
let payments = loadJson(PAYMENTS_KEY, []);

document.getElementById("leadForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  leads = [
    lead(
      form.get("name"),
      form.get("segment"),
      form.get("source"),
      form.get("offer"),
      "prospect",
      form.get("note"),
      form.get("nextTouch")
    ),
    ...leads
  ];
  event.currentTarget.reset();
  persistLeads();
  render();
});

document.getElementById("paymentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const record = payment(form.get("buyer"), form.get("offer"), form.get("amount"), form.get("ref"));
  payments = [record, ...payments];
  markLeadPaid(record);
  event.currentTarget.reset();
  persistPayments();
  persistLeads();
  render();
});

document.getElementById("resetBoard").addEventListener("click", () => {
  leads = [...seedLeads];
  payments = [];
  persistLeads();
  persistPayments();
  render();
});

document.getElementById("copyScript").addEventListener("click", async () => {
  await copyText(document.getElementById("scriptPreview").textContent);
});

document.getElementById("copyReply").addEventListener("click", async () => {
  await copyText(document.getElementById("replyPreview").textContent);
});

document.getElementById("importLeads").addEventListener("click", () => {
  const imported = parseLeadCsv(document.getElementById("bulkImport").value);
  if (!imported.length) {
    return;
  }
  leads = [...imported, ...leads];
  document.getElementById("bulkImport").value = "";
  persistLeads();
  render();
});

document.getElementById("importStageUpdates").addEventListener("click", () => {
  const updates = parseStageUpdateCsv(document.getElementById("stageImport").value);
  if (!updates.length) {
    return;
  }
  updates.forEach(applyStageUpdate);
  document.getElementById("stageImport").value = "";
  persistLeads();
  render();
});

document.getElementById("importPayments").addEventListener("click", () => {
  const imported = parsePaymentEvidenceCsv(document.getElementById("paymentImport").value);
  if (!imported.length) {
    return;
  }
  payments = [...imported, ...payments];
  imported.forEach(markLeadPaid);
  document.getElementById("paymentImport").value = "";
  persistPayments();
  persistLeads();
  render();
});

document.querySelectorAll("[data-checkout]").forEach((input) => {
  input.value = settings[input.dataset.checkout] || "";
  input.addEventListener("input", () => {
    settings = { ...settings, [input.dataset.checkout]: input.value.trim() };
    persistSettings();
    renderReply();
  });
});

document.getElementById("replyType").addEventListener("change", renderReply);
document.getElementById("replyOffer").addEventListener("change", renderReply);

document.getElementById("exportCsv").addEventListener("click", () => {
  const leadRows = [
    ["name", "segment", "source", "offer", "status", "next_touch", "last_touch", "paid_at", "paid_amount", "payment_ref", "note"],
    ...leads.map(csvRow)
  ];
  const paymentRows = [["paid_at", "buyer", "offer", "amount", "ref"], ...payments.map(paymentCsvRow)];
  download(
    "brief30-launch-ledger.csv",
    ["# leads", ...leadRows.map(joinCsv), "", "# payments", ...paymentRows.map(joinCsv)].join("\n")
  );
});

render();

function loadJson(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    return saved ?? fallback;
  } catch {
    return fallback;
  }
}

function persistLeads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function persistPayments() {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

function render() {
  renderMetrics();
  renderStages();
  renderTodayQueue();
  renderRevenuePlan();
  renderInsights();
  renderPaymentLedger();
  renderRows();
  renderReply();
  document.getElementById("scriptPreview").textContent = buildScript(leads[0]);
}

function renderMetrics() {
  const closed = currentMonthRevenue(payments);
  const openForecast = leads
    .filter((item) => item.status !== "closed")
    .reduce((total, item) => total + offerPrice(item) * stageWeight(item.status), 0);
  const forecast = closed + openForecast;
  const gap = Math.max(TARGET_KRW - closed, 0);
  const dueCount = dueLeads(leads).length;
  const next = closed >= TARGET_KRW ? "목표 달성" : dueCount > 0 ? `${dueCount} follow-ups` : "10 DMs";

  setMetric("closed", formatKrw(closed));
  setMetric("forecast", formatKrw(forecast));
  setMetric("gap", formatKrw(gap));
  setMetric("next", next);
}

function renderStages() {
  document.getElementById("stageGrid").innerHTML = STAGES.map((stage) => {
    const stageLeads = leads.filter((item) => item.status === stage.key);
    const value = stageLeads.reduce((total, item) => total + offerPrice(item), 0);
    return `
      <article class="stageCard">
        <span>${stage.label}</span>
        <strong>${stageLeads.length}</strong>
        <small>${formatKrw(value)}</small>
      </article>
    `;
  }).join("");
}

function renderRows() {
  document.getElementById("leadTable").innerHTML = leads.map((item) => `
    <article class="leadRow ${isDueDisplay(item) ? "isDue" : ""}" data-id="${item.id}">
      <div class="leadMain">
        <span class="statusTag">${statusLabel(item.status)}</span>
        <strong>${escapeHtml(item.name)} · ${escapeHtml(item.segment)}</strong>
        <p>${escapeHtml(item.source || "direct_dm")} · ${escapeHtml(OFFERS[item.offer]?.label || OFFERS.setup.label)} · 다음 연락 ${escapeHtml(item.nextTouch || "미정")}</p>
        <p>${escapeHtml(item.note || "메모 없음")}</p>
        ${item.paidAmount ? `<p class="paidLine">Paid ${formatKrw(item.paidAmount)} · ${escapeHtml(item.paymentRef || item.paidAt)}</p>` : ""}
      </div>
      <div class="rowActions">
        <select data-action="status">
          ${STAGES.map((stage) => option(stage.key, statusLabel(stage.key), item.status)).join("")}
          ${option("lost", "Lost", item.status)}
        </select>
        <select data-action="offer">
          ${Object.entries(OFFERS).map(([key, offer]) => option(key, offer.label, item.offer)).join("")}
        </select>
        <input data-action="nextTouch" type="date" value="${escapeHtml(item.nextTouch || "")}" />
        <button class="ghost" data-action="touch" type="button">Touch</button>
        <button class="ghost" data-action="copy" type="button">DM</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".leadRow").forEach((row) => {
    row.addEventListener("change", updateLead);
    row.addEventListener("click", handleRowClick);
  });
}

function renderTodayQueue() {
  const items = dueLeads(leads);
  document.getElementById("todayQueue").innerHTML = `
    <div>
      <p class="eyebrow">Today queue</p>
      <h3>${items.length ? `${items.length}명 후속 연락` : "오늘 밀린 후속 없음"}</h3>
    </div>
    <div class="queueList">
      ${items.length ? items.map((item) => `
        <button data-id="${item.id}" type="button">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(OFFERS[item.offer]?.label || "")}</span>
        </button>
      `).join("") : "<p>새 DM 10개를 보내고 Prospect를 채우세요.</p>"}
    </div>
  `;
  document.querySelectorAll(".queueList button").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = leads.find((leadItem) => leadItem.id === button.dataset.id);
      await copyText(buildScript(item));
      markTouched(item);
    });
  });
}

function renderRevenuePlan() {
  const plan = buildRevenuePlan({ payments, leads });
  document.getElementById("revenuePlan").innerHTML = `
    <div class="planHeader">
      <div>
        <p class="eyebrow">Revenue plan</p>
        <h3>${escapeHtml(plan.nextAction)}</h3>
      </div>
      <strong>${formatKrw(plan.gap)} 남음</strong>
    </div>
    <div class="planGrid">
      ${plan.combos.map((combo) => `
        <article>
          <span>목표 조합</span>
          <strong>${escapeHtml(combo.label)}</strong>
          <small>${formatKrw(combo.total)} · 초과 ${formatKrw(combo.overage)}</small>
        </article>
      `).join("")}
    </div>
    <div class="closeList">
      ${plan.candidates.length ? plan.candidates.map((item) => `
        <a href="${closeUrl(item)}">
          <span>${escapeHtml(statusLabel(item.status))}</span>
          <strong>${escapeHtml(item.name)} · ${escapeHtml(OFFERS[item.offer]?.label || "")}</strong>
        </a>
      `).join("") : "<p class=\"emptyState\">먼저 outbox에서 보낸 리드를 가져오세요.</p>"}
    </div>
  `;
}

function closeUrl(item) {
  const params = new URLSearchParams({
    offer: item.offer || "setup",
    buyer: item.name || "",
    useCase: closeUseCaseForOffer(item.offer),
    source: "operator"
  });
  return `../closing/index.html?${params.toString()}`;
}

function renderInsights() {
  document.getElementById("sourcePanel").innerHTML = `
    <p class="eyebrow">Source funnel</p>
    ${sourceStats(leads).map((item) => `
      <div class="sourceRow">
        <strong>${escapeHtml(item.source)}</strong>
        <span>${item.count} leads · ${item.warm} warm · ${formatKrw(item.forecast)}</span>
      </div>
    `).join("")}
  `;
  document.getElementById("hotPanel").innerHTML = `
    <p class="eyebrow">Hot leads</p>
    ${hotLeads(leads).map((item) => `
      <button class="hotLead" data-id="${item.id}" type="button">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(OFFERS[item.offer]?.label || "")}</span>
      </button>
    `).join("")}
  `;
  document.querySelectorAll(".hotLead").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = leads.find((leadItem) => leadItem.id === button.dataset.id);
      await copyText(buildScript(item));
    });
  });
}

function renderPaymentLedger() {
  document.getElementById("paymentLedger").innerHTML = `
    <p class="eyebrow">Paid ledger</p>
    ${payments.length ? payments.slice(0, 6).map((item) => `
      <div class="paymentRow">
        <strong>${escapeHtml(item.buyer)} · ${formatKrw(item.amount)}</strong>
        <span>${escapeHtml(OFFERS[item.offer]?.label || item.offer)} · ${escapeHtml(item.paidAt)} · ${escapeHtml(item.ref || "증거 미입력")}</span>
      </div>
    `).join("") : "<p class=\"emptyState\">아직 기록된 결제가 없습니다.</p>"}
  `;
}

function renderReply() {
  const type = document.getElementById("replyType").value;
  const offerKey = document.getElementById("replyOffer").value;
  document.getElementById("replyPreview").textContent = buildReplyCopy({ type, offerKey, settings });
}

function updateLead(event) {
  const row = event.currentTarget;
  const item = leads.find((leadItem) => leadItem.id === row.dataset.id);
  if (!item) {
    return;
  }
  item[event.target.dataset.action] = event.target.value;
  if (event.target.dataset.action === "status") {
    item.nextTouch = nextTouchFor(event.target.value);
  }
  persistLeads();
  render();
}

async function handleRowClick(event) {
  if (event.target.dataset.action === "touch") {
    const item = leads.find((leadItem) => leadItem.id === event.currentTarget.dataset.id);
    markTouched(item);
    return;
  }
  if (event.target.dataset.action !== "copy") {
    return;
  }
  const item = leads.find((leadItem) => leadItem.id === event.currentTarget.dataset.id);
  await copyText(buildScript(item));
}

function markTouched(item) {
  if (!item) {
    return;
  }
  item.lastTouch = today();
  item.nextTouch = nextTouchFor(item.status);
  if (item.status === "prospect") {
    item.status = "contacted";
  }
  persistLeads();
  render();
}

function markLeadPaid(record) {
  const buyerName = record.buyer.trim().toLowerCase();
  const item = leads.find((leadItem) => leadItem.name.trim().toLowerCase() === buyerName);
  if (!item) {
    return;
  }
  item.status = "closed";
  item.offer = record.offer;
  item.paidAmount = record.amount;
  item.paidAt = record.paidAt;
  item.paymentRef = record.ref;
  item.nextTouch = "";
}

function applyStageUpdate(update) {
  let item = leads.find((leadItem) => leadItem.name.trim().toLowerCase() === update.name.toLowerCase());
  if (!item) {
    item = lead(update.name, "직장인", "replydesk", update.offer, update.status, update.note, update.nextTouch || nextTouchFor(update.status));
    leads = [item, ...leads];
    return;
  }
  item.status = update.status;
  item.offer = update.offer;
  item.nextTouch = update.nextTouch || nextTouchFor(update.status);
  item.lastTouch = today();
  item.note = [item.note, update.note].filter(Boolean).join(" / ");
}

function buildScript(item = leads[0]) {
  return buildOutboundScript({ item, settings });
}

function csvRow(item) {
  return [
    item.name,
    item.segment,
    item.source,
    OFFERS[item.offer]?.label || item.offer,
    item.status,
    item.nextTouch,
    item.lastTouch,
    item.paidAt,
    item.paidAmount,
    item.paymentRef,
    item.note
  ];
}

function paymentCsvRow(item) {
  return [item.paidAt, item.buyer, OFFERS[item.offer]?.label || item.offer, item.amount, item.ref];
}

function joinCsv(row) {
  return row.map(csvCell).join(",");
}

function setMetric(key, value) {
  document.querySelector(`[data-metric="${key}"]`).textContent = value;
}

function isDueDisplay(item) {
  return dueLeads([item]).length > 0;
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

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
