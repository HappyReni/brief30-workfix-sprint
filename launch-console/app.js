import { buildLaunchConsole, sampleWarmContacts } from "./logic.js";
import { paymentRouteState } from "../preflight/commands.js";

const STORAGE_KEY = "brief30.launchConsole.v1";
const orderConfig = window.BRIEF30_ORDER_CONFIG || {};
const marketingConfig = window.BRIEF30_MARKETING_CONFIG || {};
const paymentStatus = paymentRouteState(orderConfig, marketingConfig);
const form = document.querySelector("#launchForm");
const contactText = document.querySelector("#contactText");
const ledgerText = document.querySelector("#ledgerText");
const paymentText = document.querySelector("#paymentText");
const metricGrid = document.querySelector("#metricGrid");
const checklist = document.querySelector("#checklist");
const linkList = document.querySelector("#linkList");
const commands = document.querySelector("#commands");
const shareCopy = document.querySelector("#shareCopy");
const closeTitle = document.querySelector("#closeTitle");
const closeDetail = document.querySelector("#closeDetail");
const closeLinks = document.querySelector("#closeLinks");
const closeCopy = document.querySelector("#closeCopy");
const nextLevel = document.querySelector("#nextLevel");
const nextLabel = document.querySelector("#nextLabel");
const nextDetail = document.querySelector("#nextDetail");

hydrate();
bindEvents();
render();

function hydrate() {
  const saved = loadJson(STORAGE_KEY, {});
  form.elements.publicUrl.value = saved.publicUrl || "";
  form.elements.month.value = saved.month || today().slice(0, 7);
  form.elements.paymentRoute.value = saved.paymentRoute || "";
  contactText.value = saved.contacts || "";
  ledgerText.value = saved.ledger || "";
  paymentText.value = saved.payments || "";
}

function bindEvents() {
  form.addEventListener("input", render);
  contactText.addEventListener("input", render);
  ledgerText.addEventListener("input", render);
  paymentText.addEventListener("input", render);
  document.querySelector("#loadContacts").addEventListener("click", () => {
    contactText.value = sampleWarmContacts;
    render();
  });
  document.querySelector("#clearAll").addEventListener("click", () => {
    contactText.value = "";
    ledgerText.value = "";
    paymentText.value = "";
    render();
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => copyFrom(button, button.dataset.copy));
  });
}

function render() {
  const data = Object.fromEntries(new FormData(form));
  const view = buildLaunchConsole(
    { ...data, contacts: contactText.value, ledger: ledgerText.value, payments: paymentText.value },
    { paymentStatus, orderConfig, marketingConfig }
  );
  persist(data);
  nextLevel.textContent = levelText(view.next.level);
  nextLevel.dataset.level = view.next.level;
  nextLabel.textContent = view.next.label;
  nextDetail.textContent = view.next.detail;
  metricGrid.innerHTML = view.metrics.map(metricCard).join("");
  checklist.innerHTML = view.checklist.map(checkCard).join("");
  linkList.innerHTML = view.links.map(linkCard).join("");
  closeTitle.textContent = view.closePacket.title;
  closeDetail.textContent = view.closePacket.detail;
  closeLinks.innerHTML = closePacketLinks(view.closePacket);
  closeCopy.textContent = view.closePacket.copy;
  commands.textContent = view.commands;
  shareCopy.textContent = view.shareCopy;
}

function metricCard(metric) {
  return `<article><span>${metric.label}</span><strong>${metric.value}</strong></article>`;
}

function checkCard(item) {
  return `<article class="${item.done ? "done" : "todo"}"><strong>${item.done ? "OK" : "TODO"} · ${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></article>`;
}

function linkCard(item) {
  return `<a href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.label)}</strong><span>열기</span></a>`;
}

function closePacketLinks(packet) {
  return [
    { label: "클로징", href: packet.closeUrl },
    { label: "청구서", href: packet.invoiceUrl },
    { label: "증빙", href: packet.paidUrl }
  ].map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join("");
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...data,
    contacts: contactText.value,
    ledger: ledgerText.value,
    payments: paymentText.value
  }));
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

function levelText(level) {
  if (level === "done_check") return "감사";
  if (level === "send") return "발송";
  if (level === "blocked") return "설정";
  return "후보";
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
