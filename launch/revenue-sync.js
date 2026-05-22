export const OPERATOR_PAYMENTS_KEY = "brief30.operator.payments.v1";

export function parseOperatorPayments(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function operatorLedgerRevenue(payments, date = new Date()) {
  const month = date.toISOString().slice(0, 7);
  return payments
    .filter((item) => String(item.paidAt || "").startsWith(month))
    .reduce((total, item) => total + Number(item.amount || 0), 0);
}

export function operatorLedgerSummary(raw, date = new Date()) {
  const payments = parseOperatorPayments(raw);
  return {
    count: payments.length,
    revenue: operatorLedgerRevenue(payments, date)
  };
}
