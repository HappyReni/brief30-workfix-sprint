const OUTPUTS = ["주간보고", "회의록", "고객사 업데이트", "후속 메일", "리스크 보고"];

export function intakeDefaultsFromParams(params) {
  const source = params instanceof URLSearchParams ? params : new URLSearchParams(params || "");
  return {
    orderRef: clean(source.get("ref")),
    offer: normalizeOffer(source.get("offer")),
    buyer: clean(source.get("buyer")),
    output: normalizeOutput(source.get("output") || source.get("useCase")),
    memo: memoPlaceholderFor(source.get("offer"))
  };
}

export function normalizeOffer(value) {
  return ["self", "setup", "service", "team"].includes(value) ? value : "";
}

export function normalizeOutput(value) {
  const text = clean(value);
  if (!text) return "";
  return OUTPUTS.find((item) => text.includes(item) || item.includes(text)) || "";
}

export function serviceMemoPlaceholder() {
  return [
    "메모 1:",
    "첫 번째 업무 메모를 익명화해서 붙여넣어 주세요.",
    "",
    "메모 2:",
    "두 번째 업무 메모를 익명화해서 붙여넣어 주세요.",
    "",
    "메모 3:",
    "세 번째 업무 메모를 익명화해서 붙여넣어 주세요."
  ].join("\n");
}

export function teamMemoPlaceholder() {
  return Array.from({ length: 10 }, (_, index) => [
    `메모 ${index + 1}:`,
    "팀 업무 메모를 익명화해서 붙여넣어 주세요."
  ].join("\n")).join("\n\n");
}

function memoPlaceholderFor(offer) {
  if (offer === "team") return teamMemoPlaceholder();
  if (offer === "service") return serviceMemoPlaceholder();
  return "";
}

function clean(value) {
  return String(value || "").trim();
}
