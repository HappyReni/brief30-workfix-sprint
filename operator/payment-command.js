export const DEFAULT_LEDGER_PATH = "path/to/brief30-launch-ledger.csv";
export const DEFAULT_PAYMENT_TEXT_PATH = "path/to/payment-text.txt";

export function buildMoneyPaidCommand(options = {}) {
  const ledgerPath = clean(options.ledgerPath) || DEFAULT_LEDGER_PATH;
  const paymentTextPath = clean(options.paymentTextPath) || DEFAULT_PAYMENT_TEXT_PATH;
  const month = clean(options.month) || "YYYY-MM";
  const reportOut = clean(options.reportOut) || "outreach/generated";
  return `npm run money:paid -- ${ledgerPath} ${paymentTextPath} --out=${ledgerPath} --month=${month} --report-out=${reportOut}`;
}

export function revenueProofNote() {
  return "Count only actual payment proof processed through money:paid or audit:revenue.";
}

function clean(value) {
  return String(value || "").trim();
}
