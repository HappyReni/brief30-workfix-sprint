import { buildDemoPack } from "./demo-pack.js";

export function buildQuotePage(note = "", options = {}) {
  const demo = buildDemoPack(note, options);
  const slug = slugify(options.slug || demo.buyer);
  const fileName = `brief30-quote-${slug}-${demo.date}.html`;
  const html = quoteHtml(demo);
  return {
    ...demo,
    fileName,
    html,
    shareText: shareText(demo, fileName)
  };
}

export function formatQuotePage(page) {
  return [
    "# Brief30 quote page",
    "",
    `Buyer: ${page.buyer}`,
    `File: ${page.fileName}`,
    `Offer: ${page.proposal.offer.label}`,
    `Score: ${page.score}/100`,
    `Payment route: ${page.proposal.routeReady ? page.proposal.paymentRoute : "missing"}`,
    "",
    "## Share text",
    page.shareText,
    "",
    "## Operator update CSV",
    "```csv",
    page.updateCsv,
    "```",
    "",
    "Do not merge this quote page into revenue. Only actual payment proof processed through money:paid counts."
  ].join("\n");
}

export function quotePageFiles(page) {
  return [
    { name: page.fileName, content: page.html },
    { name: page.fileName.replace(/\.html$/u, "-share.md"), content: `${formatQuotePage(page)}\n` },
    { name: page.fileName.replace(/\.html$/u, "-update.csv"), content: `${page.updateCsv}\n` }
  ];
}

function quoteHtml(page) {
  const paymentLine = page.proposal.routeReady
    ? escapeHtml(page.proposal.paymentRoute)
    : "진행 의사 확인 후 결제 루트를 바로 안내합니다.";
  const ctaLabel = page.proposal.routeReady ? "결제 후 메모 보내기" : "진행 의사 보내기";
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brief30 quote - ${escapeHtml(page.buyer)}</title>
    <style>
      :root{color:#17211d;background:#eef2e9;font-family:Arial,"Apple SD Gothic Neo",sans-serif}
      body{margin:0;padding:32px}
      main{max-width:920px;margin:0 auto}
      section{margin:0 0 20px;padding:22px;border:1px solid #cfd8cd;background:#fffaf0;border-radius:8px}
      h1,h2{margin:0 0 12px}p{line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
      .pill{display:inline-block;margin:0 8px 8px 0;padding:6px 10px;border-radius:999px;background:#d8efe8;font-weight:700}
      a.button{display:inline-block;margin-top:12px;padding:12px 16px;border-radius:6px;background:#0f766e;color:white;text-decoration:none;font-weight:800}
      pre{white-space:pre-wrap;line-height:1.5;background:#f4f0e7;padding:14px;border-radius:6px;overflow:auto}
    </style>
  </head>
  <body>
    <main>
      <section>
        <span class="pill">Brief30 personalized quote</span>
        <span class="pill">${page.score}/100 demo score</span>
        <h1>${escapeHtml(page.buyer)}님 샘플 결과와 진행 견적</h1>
        <p>${escapeHtml(page.outputType)} 기준으로 메모를 정리했습니다. 아래 샘플이 업무에 맞으면 ${escapeHtml(page.proposal.offer.label)}으로 이어가면 됩니다.</p>
      </section>
      <section>
        <h2>3줄 샘플</h2>
        <ul>${page.result.executive.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="grid">
        <div>
          <h2>제안</h2>
          <p><strong>${escapeHtml(page.proposal.offer.label)}</strong></p>
          <p>금액: ${formatKrw(page.proposal.offer.price)}</p>
          <p>전달물: ${escapeHtml(page.proposal.offer.delivery)}</p>
          <p>전달 시간: ${escapeHtml(page.proposal.offerKey === "service" ? "입금 확인 후 24시간 이내" : "입금 확인 후 안내")}</p>
        </div>
        <div>
          <h2>결제/진행</h2>
          <p>${paymentLine}</p>
          <p>주문번호: ${escapeHtml(page.proposal.ref)}</p>
          <a class="button" href="${escapeHtml(page.proposal.intakeUrl)}">${ctaLabel}</a>
        </div>
      </section>
      <section>
        <h2>샘플 전문</h2>
        <pre>${escapeHtml(page.sampleMarkdown)}</pre>
      </section>
      <section>
        <h2>보완 포인트</h2>
        <ul>${page.result.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    </main>
  </body>
</html>
`;
}

function shareText(page, fileName) {
  return [
    `${page.buyer}, 보내주신 메모 기준으로 샘플 결과와 진행 견적을 한 장으로 정리했습니다.`,
    "",
    `파일: ${fileName}`,
    `진단 점수: ${page.score}/100`,
    `제안: ${page.proposal.offer.label}`,
    page.proposal.routeReady ? `결제/입금 안내: ${page.proposal.paymentRoute}` : "진행 가능하면 답 주세요. 결제 루트를 붙여 보내겠습니다.",
    "",
    "샘플이 업무 흐름에 맞으면 결제 후 익명 메모를 이어서 보내주세요."
  ].join("\n");
}

function slugify(value) {
  const slug = String(value || "buyer").trim().toLowerCase().replace(/[^a-z0-9가-힣]+/giu, "-").replace(/^-|-$/gu, "");
  return slug || "buyer";
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
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
