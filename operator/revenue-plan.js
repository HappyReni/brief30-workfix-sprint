import { OFFERS, TARGET_KRW, currentMonthRevenue, offerPrice } from "./model.js";

const CLOSE_STATUS_WEIGHT = {
  tester: 4,
  replied: 3,
  contacted: 1,
  prospect: 0
};

const COMBO_OFFER_PRIORITY = {
  team: 0,
  workfix: 1,
  service: 2,
  setup: 3,
  self: 4
};

export function buildRevenuePlan({ payments, leads, target = TARGET_KRW }) {
  const closed = currentMonthRevenue(payments);
  const gap = Math.max(target - closed, 0);
  const candidates = closeCandidates(leads);
  return {
    closed,
    gap,
    combos: closeCombos(gap),
    candidates,
    nextAction: gap <= 0 ? "목표 달성" : candidates.length ? `${candidates[0].name} 결제 요청` : "10 DMs 발송"
  };
}

export function closeCombos(gap, offers = OFFERS) {
  if (gap <= 0) {
    return [{ label: "목표 달성", counts: {}, total: 0, overage: 0, deals: 0 }];
  }

  const rows = [];
  const entries = Object.entries(offers);
  collectCombos(entries, gap, {}, rows);

  return rows
    .sort((a, b) => a.deals - b.deals || a.overage - b.overage || comboPriority(a) - comboPriority(b) || b.total - a.total)
    .slice(0, 4);
}

export function closeCandidates(leads, limit = 5) {
  return [...leads]
    .filter((item) => ["tester", "replied", "contacted"].includes(item.status))
    .sort((a, b) => candidateScore(b) - candidateScore(a))
    .slice(0, limit);
}

function candidateScore(item) {
  return (CLOSE_STATUS_WEIGHT[item.status] || 0) * 100000 + offerPrice(item);
}

function comboLabel(counts, offers) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${offers[key].label} ${count}건`)
    .join(" + ");
}

function comboPriority(combo) {
  const keys = Object.entries(combo.counts)
    .filter(([, count]) => count > 0)
    .map(([key]) => COMBO_OFFER_PRIORITY[key] ?? 99);
  return Math.min(...keys);
}

function collectCombos(entries, gap, counts, rows, index = 0) {
  if (index >= entries.length) {
    const total = Object.entries(counts).reduce((sum, [key, count]) => sum + count * entries.find(([id]) => id === key)[1].price, 0);
    const deals = Object.values(counts).reduce((sum, count) => sum + count, 0);
    if (deals && total >= gap) {
      rows.push({ counts: { ...counts }, total, overage: total - gap, deals, label: comboLabel(counts, Object.fromEntries(entries)) });
    }
    return;
  }
  const [key, offer] = entries[index];
  const limit = Math.ceil(gap / offer.price) + 1;
  for (let count = 0; count <= limit; count += 1) {
    counts[key] = count;
    collectCombos(entries, gap, counts, rows, index + 1);
  }
  delete counts[key];
}
