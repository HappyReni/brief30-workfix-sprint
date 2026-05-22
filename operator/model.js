export const TARGET_KRW = 300000;
export const STORAGE_KEY = "brief30.operator.v1";
export const SETTINGS_KEY = "brief30.operator.settings.v1";
export const PAYMENTS_KEY = "brief30.operator.payments.v1";

export const OFFERS = {
  self: { label: "19,000원 셀프툴", price: 19000 },
  setup: { label: "49,000원 셋업팩", price: 49000 },
  service: { label: "99,000원 대행팩", price: 99000 },
  team: { label: "300,000원 팀 브리핑 스프린트", price: 300000 },
  workfix: { label: "300,000원 Workfix Sprint", price: 300000 }
};

export const STAGES = [
  { key: "prospect", label: "Prospect", weight: 0.05 },
  { key: "contacted", label: "Contacted", weight: 0.12 },
  { key: "replied", label: "Replied", weight: 0.28 },
  { key: "tester", label: "Tester", weight: 0.46 },
  { key: "closed", label: "Closed", weight: 1 }
];

export const REPLIES = {
  useful:
    "좋게 봐주셔서 감사합니다. 실제 업무 메모 하나로 10분만 돌려보시면 감이 더 빨리 옵니다. 원하시면 제가 49,000원 셋업팩으로 첫 보고 포맷까지 같이 잡아드릴게요.",
  price:
    "가격이 애매하면 19,000원 셀프툴로 먼저 써보셔도 됩니다. 반복해서 쓰게 되면 그때 셋업팩으로 업무 포맷을 같이 맞추는 쪽이 낫습니다.",
  privacy:
    "Brief30은 로그인이나 API 없이 브라우저에서만 실행됩니다. 그래도 회사 정책상 민감한 내용은 익명화해서 넣는 걸 권합니다. 보안 때문에 hosted AI에 못 넣던 메모를 빠르게 구조화하는 용도입니다.",
  service:
    "툴을 직접 쓰는 것보다 결과물이 필요하시면 99,000원 대행팩이 맞습니다. 업무 메모 3개를 받아서 보고서/회의록/후속메일 포맷까지 정리해드립니다."
};

export const seedLeads = [
  lead("지인 A", "직장인", "direct_dm", "setup", "prospect", "주간보고를 매주 쓰는 팀 리드", today()),
  lead("커뮤니티 댓글 B", "프리랜서", "community", "self", "contacted", "고객사 공유 메일을 자주 씀", addDays(1)),
  lead("창업자 C", "창업자", "social_post", "service", "replied", "투자자 업데이트 초안을 매주 작성", today()),
  lead("에이전시 D", "에이전시", "referral", "setup", "tester", "회의록과 후속 메일 정리가 반복됨", addDays(1)),
  lead("컨설턴트 E", "컨설턴트", "previous_client", "service", "prospect", "프로젝트 리스크 보고가 잦음", addDays(2))
];

export function lead(name, segment, source, offer, status, note, nextTouch = today(), lastTouch = "") {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: String(name || "새 리드"),
    segment: String(segment || "직장인"),
    source: String(source || "direct_dm"),
    offer: String(offer || "setup"),
    status: String(status || "prospect"),
    note: String(note || ""),
    nextTouch: String(nextTouch || today()),
    lastTouch: String(lastTouch || ""),
    paidAmount: 0,
    paidAt: "",
    paymentRef: ""
  };
}

export function payment(buyer, offer, amount, ref) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    buyer: String(buyer || "구매자"),
    offer: normalizeOffer(offer),
    amount: Number(amount || OFFERS[normalizeOffer(offer)].price),
    ref: String(ref || ""),
    paidAt: today()
  };
}

export function parsePaymentEvidenceCsv(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isCsvHeader(line, ["ref", "buyer", "offer"]))
    .map(parseCloseEvidenceLine)
    .filter(Boolean);
}

function parseCloseEvidenceLine(line) {
  const [ref, buyer, offer, amount, contact, useCase, paymentRoute, paidAt] = parseCsvLine(line);
  if (!ref || !buyer || !offer) {
    return null;
  }
  const normalizedOffer = normalizeOffer(offer);
  const parsedAmount = Number(String(amount || "").replace(/[^\d]/g, "")) || OFFERS[normalizedOffer].price;
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    buyer: String(buyer || "구매자"),
    offer: normalizedOffer,
    amount: parsedAmount,
    ref: [ref, contact, useCase, paymentRoute].filter(Boolean).join(" / "),
    paidAt: /^\d{4}-\d{2}-\d{2}$/u.test(String(paidAt || "")) ? paidAt : today()
  };
}

export function parseLeadCsv(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isCsvHeader(line, ["name", "segment", "source"]))
    .map(parseLeadLine);
}

function parseLeadLine(line) {
  const [name, segment, source, offer, statusOrNote, nextTouchOrNote, ...rest] = parseCsvLine(line);
  const hasStatus = isKnownStatus(statusOrNote);
  const status = hasStatus ? normalizeStatus(statusOrNote) : "prospect";
  const nextTouch = hasStatus && isDate(nextTouchOrNote) ? nextTouchOrNote : today();
  const note = hasStatus ? rest.join(", ") : [statusOrNote, nextTouchOrNote, ...rest].filter(Boolean).join(", ");
  return lead(name, segment, source, normalizeOffer(offer), status, note, nextTouch);
}

export function parseStageUpdateCsv(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isCsvHeader(line, ["name", "status", "offer"]))
    .map((line) => {
      const [name, status, offer, nextTouch, ...note] = parseCsvLine(line);
      return {
        name: String(name || "").trim(),
        status: normalizeStatus(status),
        offer: normalizeOffer(offer),
        nextTouch: String(nextTouch || ""),
        note: note.join(", ")
      };
    })
    .filter((item) => item.name);
}

function isCsvHeader(line, expected) {
  const cells = parseCsvLine(line).map((cell) => cell.trim().toLowerCase());
  return expected.every((cell, index) => cells[index] === cell);
}

export function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

export function normalizeOffer(value) {
  const lowered = String(value || "").toLowerCase();
  if (lowered.includes("workfix") || lowered.includes("자동화") || lowered.includes("워크픽스")) return "workfix";
  if (lowered.includes("team") || lowered.includes("팀") || lowered.includes("스프린트") || lowered.includes("300")) {
    return "team";
  }
  if (lowered.includes("service") || lowered.includes("대행")) {
    return "service";
  }
  if (lowered.includes("self") || lowered.includes("셀프")) {
    return "self";
  }
  return "setup";
}

export function normalizeStatus(value) {
  const lowered = String(value || "").toLowerCase();
  if (lowered.includes("tester")) return "tester";
  if (lowered.includes("replied")) return "replied";
  if (lowered.includes("contacted")) return "contacted";
  if (lowered.includes("closed")) return "closed";
  if (lowered.includes("lost") || lowered.includes("보류")) return "lost";
  return "prospect";
}

function isKnownStatus(value) {
  const lowered = String(value || "").toLowerCase();
  return ["tester", "replied", "contacted", "closed", "lost", "보류", "prospect"].some((status) => lowered.includes(status));
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(String(value || ""));
}

export function dueLeads(leads) {
  return leads.filter((item) => isDue(item)).sort((a, b) => String(a.nextTouch).localeCompare(String(b.nextTouch)));
}

export function isDue(item) {
  return !["closed", "lost"].includes(item.status) && Boolean(item.nextTouch) && item.nextTouch <= today();
}

export function sourceStats(leads) {
  const stats = new Map();
  leads.forEach((item) => {
    const source = item.source || "direct_dm";
    const current = stats.get(source) || { source, count: 0, warm: 0, forecast: 0 };
    current.count += 1;
    current.warm += ["replied", "tester", "closed"].includes(item.status) ? 1 : 0;
    current.forecast += offerPrice(item) * stageWeight(item.status);
    stats.set(source, current);
  });
  return [...stats.values()].sort((a, b) => b.forecast - a.forecast || b.warm - a.warm).slice(0, 5);
}

export function hotLeads(leads) {
  return [...leads]
    .filter((item) => !["closed", "lost"].includes(item.status))
    .sort((a, b) => leadScore(b) - leadScore(a))
    .slice(0, 5);
}

export function leadScore(item) {
  const sourceBoost = item.source === "referral" || item.source === "previous_client" ? 20 : 0;
  const dueBoost = isDue(item) ? 18 : 0;
  return stageWeight(item.status) * 100 + offerPrice(item) / 1000 + sourceBoost + dueBoost;
}

export function currentMonthRevenue(payments) {
  const month = today().slice(0, 7);
  return payments
    .filter((item) => String(item.paidAt || "").startsWith(month))
    .reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function offerPrice(item) {
  return OFFERS[item.offer]?.price || OFFERS.setup.price;
}

export function stageWeight(status) {
  return STAGES.find((stage) => stage.key === status)?.weight || 0;
}

export function statusLabel(status) {
  return STAGES.find((stage) => stage.key === status)?.label || "Lost";
}

export function nextTouchFor(status) {
  if (status === "closed" || status === "lost") {
    return "";
  }
  if (status === "replied" || status === "tester") {
    return addDays(1);
  }
  return addDays(2);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatKrw(value) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

export function option(value, label, current) {
  return `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`;
}

export function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}
