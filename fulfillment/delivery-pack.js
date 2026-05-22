import { buildPacket, parseIntakeMessage } from "./logic.js";

export function buildDeliveryPack(text, options = {}) {
  const parsed = parseIntakeMessage(text);
  const packet = buildPacket({
    ...parsed,
    buyer: options.buyer || parsed.buyer,
    orderRef: options.ref || parsed.orderRef,
    offer: options.offer || parsed.offer,
    output: options.output || parsed.output,
    deadline: options.deadline || parsed.deadline
  });
  return {
    source: text,
    parsed,
    packet
  };
}

export function formatDeliveryPack(pack, sourcePath = "") {
  return [
    "# Brief30 delivery pack",
    "",
    `Source: ${sourcePath || "stdin"}`,
    `Buyer: ${pack.parsed.buyer || "구매자"}`,
    `Order ref: ${pack.parsed.orderRef || "주문번호"}`,
    `Offer: ${pack.parsed.offer || "setup"}`,
    `Output: ${pack.parsed.output || "weekly"}`,
    "",
    "## Delivery email",
    pack.packet.email,
    "",
    "## Result draft",
    pack.packet.result,
    "",
    "## Setup note",
    pack.packet.setup,
    "",
    "## Next actions",
    pack.packet.checklist
  ].join("\n");
}
