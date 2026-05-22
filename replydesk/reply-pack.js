import {
  applyOfferStrategy,
  buildCloseCsv,
  buildCloseQueue,
  buildResponse,
  buildUpdateCsv,
  normalizeUrls,
  parseReplies,
  typeLabel
} from "./logic.js";

export function buildReplyPack(text, options = {}) {
  const defaultOffer = options.offer || "setup";
  const urls = normalizeUrls(options.publicUrl || "https://your-site.example.com/");
  const rows = parseReplies(text)
    .sort((a, b) => a.priority - b.priority)
    .map((row) => applyOfferStrategy(row, defaultOffer))
    .map((row) => ({ ...row, response: buildResponse(row, urls, defaultOffer) }));

  return {
    publicUrl: urls.diagnostic.replace(/diagnostic\/index\.html$/u, ""),
    defaultOffer,
    rows,
    closeQueue: buildCloseQueue(rows, urls),
    closeCsv: buildCloseCsv(rows, urls),
    updateCsv: buildUpdateCsv(rows)
  };
}

export function formatReplyPack(pack, sourcePath = "") {
  return [
    "# Brief30 reply pack",
    "",
    `Source: ${sourcePath || "stdin"}`,
    `Public URL: ${pack.publicUrl}`,
    `Replies: ${pack.rows.length}`,
    `Close candidates: ${pack.closeQueue.length}`,
    "",
    "## Responses",
    ...pack.rows.map(responseBlock),
    "",
    "## Close CSV",
    pack.closeCsv,
    "",
    "## Operator update CSV",
    pack.updateCsv
  ].join("\n");
}

function responseBlock(row, index) {
  return [
    `### ${index + 1}. ${row.name} / ${typeLabel(row.type)} / ${row.offer}`,
    "",
    row.response
  ].join("\n");
}
