import { formatKrw } from "./model.js";

export function buildBuyerClosePage(pack) {
  const fileName = `brief30-buyer-close-room-${slug(pack.buyer)}-${pack.date}.html`;
  return {
    fileName,
    html: pageHtml(pack),
    shareText: shareText(pack, fileName)
  };
}

function pageHtml(pack) {
  const payment = pack.paymentReady ? escapeHtml(pack.paymentRoute) : "승인 후 실제 결제 URL 또는 입금 계좌를 확정해 안내합니다.";
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%2314201b'/%3E%3Cpath d='M16 18h32v6H16zm0 12h22v6H16zm0 12h32v6H16z' fill='%23fffdf7'/%3E%3C/svg%3E" />
    <title>Brief30 close room - ${escapeHtml(pack.company)}</title>
    <style>
      :root {
        --ink: #14201b;
        --muted: #607069;
        --paper: #fffdf7;
        --wash: #edf2e8;
        --line: #d9e0d5;
        --teal: #0f766e;
        --amber: #b45309;
        --dark: #1c2924;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: var(--wash);
        color: var(--ink);
        font-family: "Avenir Next", "Segoe UI", "Apple SD Gothic Neo", sans-serif;
      }
      main {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 28px 0 44px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
        gap: 28px;
        align-items: end;
        min-height: 46vh;
        padding: 30px 0;
        border-bottom: 1px solid var(--line);
      }
      .eyebrow {
        margin: 0 0 12px;
        color: var(--teal);
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(38px, 6vw, 76px);
        line-height: 0.96;
        letter-spacing: 0;
      }
      h2 {
        margin: 0 0 12px;
        font-size: 22px;
        letter-spacing: 0;
      }
      p {
        line-height: 1.65;
      }
      .lead {
        max-width: 720px;
        color: var(--muted);
        font-size: 19px;
      }
      .price {
        background: var(--dark);
        color: var(--paper);
        border-radius: 8px;
        padding: 22px;
      }
      .price strong {
        display: block;
        font-size: 40px;
        line-height: 1;
      }
      .price span {
        display: block;
        margin-top: 12px;
        color: #dceee8;
        line-height: 1.55;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1px;
        margin: 24px 0;
        border: 1px solid var(--line);
        background: var(--line);
      }
      .tile, .block {
        background: var(--paper);
        padding: 20px;
      }
      .tile b {
        display: block;
        margin-bottom: 8px;
        color: var(--amber);
        font-size: 13px;
        text-transform: uppercase;
      }
      .sections {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .block {
        border: 1px solid var(--line);
        border-radius: 8px;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: keep-all;
        color: var(--ink);
        font: 14px/1.65 "SFMono-Regular", Consolas, monospace;
      }
      button {
        margin: 0 8px 14px 0;
        border: 0;
        border-radius: 6px;
        background: var(--teal);
        color: white;
        padding: 10px 12px;
        font-weight: 900;
        cursor: pointer;
      }
      .ghost {
        background: transparent;
        color: var(--teal);
        border: 1px solid var(--teal);
      }
      .warn {
        border-left: 4px solid var(--amber);
      }
      @media (max-width: 780px) {
        main {
          width: min(100vw - 24px, 720px);
          padding-top: 18px;
        }
        .hero, .sections, .grid {
          grid-template-columns: 1fr;
          min-height: auto;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Brief30 one-buyer close room</p>
          <h1>${escapeHtml(pack.company)} ${escapeHtml(pack.useCase)} 닫기</h1>
          <p class="lead">이 파일 하나에 첫 제안, 승인 전달문, 구매요청, 입금 요청, 결제 증빙 요청을 모두 담았습니다. 호스팅 없이 파일로 전달해도 됩니다.</p>
        </div>
        <aside class="price">
          <strong>${formatKrw(pack.amount)}</strong>
          <span>${escapeHtml(pack.team.offer.delivery)}</span>
          <span>결제/입금 안내: ${payment}</span>
        </aside>
      </section>
      <section class="grid">
        <div class="tile"><b>구매자</b><p>${escapeHtml(pack.buyer)}</p></div>
        <div class="tile"><b>승인자</b><p>${escapeHtml(pack.approver)}</p></div>
        <div class="tile"><b>주문번호</b><p>${escapeHtml(pack.ref)}</p></div>
      </section>
      <button data-copy="first">첫 메시지 복사</button>
      <button data-copy="approval" class="ghost">승인 전달문 복사</button>
      <button data-copy="payment" class="ghost">입금 요청 복사</button>
      <section class="sections">
        ${block("first", "첫 발송문", pack.buyerMessage)}
        ${block("approval", "승인자 전달문", pack.approverMessage)}
        ${block("purchase", "구매요청 메모", pack.procurement.requestMemo)}
        ${block("payment", "입금 요청", pack.invoice.paymentRequest)}
        ${block("proof", "증빙 요청", pack.handoff.proofRequest)}
        ${block("template", "구매자 증빙 답장 템플릿", pack.team.buyerProofTemplate)}
      </section>
      <section class="block warn" style="margin-top:14px">
        <h2>매출 처리 기준</h2>
        <p>이 딜룸은 영업 산출물입니다. 실제 입금일, 구매자, 금액, 주문번호가 확인된 결제 증빙만 money:paid와 audit:revenue로 매출 처리합니다.</p>
      </section>
    </main>
    <script>
      const blocks = ${JSON.stringify(copyBlocks(pack))};
      document.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", async () => {
          await navigator.clipboard.writeText(blocks[button.dataset.copy] || "");
          button.textContent = "복사됨";
          setTimeout(() => { button.textContent = button.dataset.copy === "first" ? "첫 메시지 복사" : button.dataset.copy === "approval" ? "승인 전달문 복사" : "입금 요청 복사"; }, 900);
        });
      });
    </script>
  </body>
</html>
`;
}

function block(id, title, content) {
  return `<article class="block" id="${id}"><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(content)}</pre></article>`;
}

function copyBlocks(pack) {
  return {
    first: pack.buyerMessage,
    approval: pack.approverMessage,
    payment: pack.invoice.paymentRequest
  };
}

function shareText(pack, fileName) {
  return [
    `${pack.buyer}님께 보낼 단일 딜룸 파일입니다.`,
    "",
    `파일: ${fileName}`,
    `금액: ${formatKrw(pack.amount)}`,
    `주문번호: ${pack.ref}`,
    pack.paymentReady ? `결제/입금 안내: ${pack.paymentRoute}` : "결제/입금 안내: 실제 결제 루트 확인 필요",
    "",
    "첫 메시지, 승인 전달문, 구매요청, 입금 요청, 결제 증빙 요청이 한 파일에 들어 있습니다."
  ].join("\n");
}

function slug(value) {
  return String(value || "buyer").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 40) || "buyer";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}
