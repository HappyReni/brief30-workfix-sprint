export function liveSendGate({ paymentRoute = "", requirePayment = false, commandName = "command" } = {}) {
  if (!requirePayment) return { ok: true, message: "" };
  if (paymentRouteReady(paymentRoute)) return { ok: true, message: "" };
  return {
    ok: false,
    message: [
      `${commandName}: live send gate failed.`,
      "A real payment route is required before live outreach.",
      "Run npm run prepare:seller -- --team=\"https://real-checkout.example/team\"",
      "or pass --payment-route=\"은행명 계좌번호 예금주\"."
    ].join("\n")
  };
}

export function paymentRouteReady(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  if (text === "checkout configured") return false;
  return ![
    "your-",
    "example.com",
    "example.test",
    "pay.domain.kr",
    "은행명",
    "실제계좌",
    "예금주명"
  ].some((needle) => text.includes(needle));
}
