import { buildPaymentSetup } from "./logic.js";

const form = document.querySelector("#setupForm");
const modeButtons = document.querySelectorAll("[data-mode]");
const routeStatus = document.querySelector("#routeStatus");
const nextAction = document.querySelector("#nextAction");
const setupCommand = document.querySelector("#setupCommand");
const liveCommands = document.querySelector("#liveCommands");
const orderConfig = document.querySelector("#orderConfig");
const marketingConfig = document.querySelector("#marketingConfig");
const copyButtons = document.querySelectorAll("[data-copy]");

let mode = "direct";

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    render();
  });
});

form.addEventListener("input", render);
copyButtons.forEach((button) => {
  button.addEventListener("click", () => copyTarget(button));
});

render();

function render() {
  const setup = buildPaymentSetup({ ...formValues(), mode });
  mode = setup.mode;
  modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  routeStatus.textContent = setup.statusLabel;
  routeStatus.dataset.ready = String(setup.ready);
  nextAction.textContent = setup.nextAction;
  setupCommand.textContent = setup.setupCommand;
  liveCommands.textContent = setup.liveCommands;
  orderConfig.textContent = setup.orderConfig;
  marketingConfig.textContent = setup.marketingConfig;
}

function formValues() {
  return Object.fromEntries(new FormData(form).entries());
}

async function copyTarget(button) {
  const target = document.querySelector(button.dataset.copy);
  if (!target) return;
  await copyText(target.textContent);
  const original = button.textContent;
  button.textContent = "복사됨";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}
