import { buildPaymentEvidencePack, formatPaymentEvidencePack } from "./payment-evidence.js";
import { formatMergeReport, mergeLedgerWithEvidence } from "./ledger-merge.js";
import { auditRevenueEvidence, formatRevenueAudit } from "./revenue-proof.js";
import { formatKrw } from "./model.js";

export function buildMoneyPaid(ledgerText = "", paymentText = "", options = {}) {
  const evidencePack = buildPaymentEvidencePack(paymentText, {
    source: options.source || "",
    date: options.date,
    paymentRoute: options.paymentRoute
  });
  const canMerge = evidencePack.ready.length > 0;
  const mergeResult = canMerge ? mergeLedgerWithEvidence(ledgerText, evidencePack.evidenceCsv) : null;
  const auditResult = mergeResult
    ? auditRevenueEvidence(mergeResult.text, {
        month: options.month,
        target: options.target,
        date: options.date ? new Date(`${options.date}T00:00:00Z`) : undefined
      })
    : auditRevenueEvidence(ledgerText, {
        month: options.month,
        target: options.target,
        date: options.date ? new Date(`${options.date}T00:00:00Z`) : undefined
      });

  return {
    source: options.source || "",
    ledgerPath: options.ledgerPath || "",
    outPath: options.outPath || "",
    evidencePack,
    mergeResult,
    auditResult,
    canMerge,
    mergedLedgerText: mergeResult?.text || ledgerText,
    evidenceCsv: evidencePack.evidenceCsv,
    reached: auditResult.reached
  };
}

export function formatMoneyPaid(pack) {
  return [
    "# Brief30 paid close",
    "",
    `Ledger: ${pack.ledgerPath || "stdin"}`,
    `Output: ${pack.outPath || "stdout"}`,
    `Ready evidence rows: ${pack.evidencePack.ready.length}`,
    `Needs review: ${pack.evidencePack.review.length}`,
    `Merged rows added: ${pack.mergeResult ? Math.max(pack.mergeResult.added, 0) : 0}`,
    `Qualified revenue: ${formatKrw(pack.auditResult.revenue)}`,
    `Gap: ${formatKrw(pack.auditResult.gap)}`,
    "",
    "## Payment evidence",
    formatPaymentEvidencePack(pack.evidencePack),
    "",
    "## Ledger merge",
    pack.mergeResult ? formatMergeReport(pack.mergeResult, pack.outPath) : "No ready evidence rows. Ledger was not changed.",
    "",
    "## Revenue audit",
    formatRevenueAudit(pack.auditResult, pack.outPath || pack.ledgerPath || "merged ledger")
  ].join("\n");
}

export function moneyPaidFiles(pack) {
  const month = pack.auditResult.month || "month";
  return [
    {
      name: `brief30-money-paid-${month}.md`,
      content: `${formatMoneyPaid(pack)}\n`
    },
    {
      name: `brief30-money-paid-evidence-${month}.csv`,
      content: `${pack.evidenceCsv}\n`
    }
  ];
}
