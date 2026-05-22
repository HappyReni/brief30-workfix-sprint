import { formatKrw } from "./model.js";

export function buildTeamPage(pack) {
  const fileName = `brief30-team-proposal-${slug(pack.buyer)}-${pack.date}.html`;
  return {
    fileName,
    html: teamHtml(pack),
    shareText: teamShareText(pack, fileName)
  };
}

function teamHtml(pack) {
  const payment = pack.routeReady
    ? escapeHtml(pack.paymentRoute)
    : "승인 후 실제 결제 루트를 확인해 안내합니다.";
  const cta = pack.routeReady ? "주문 메시지 만들기" : "진행 의사 전달하기";
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='12' fill='%23121916'/%3E%3Cpath d='M15 18h34v6H15zm0 12h22v6H15zm0 12h34v6H15z' fill='%23fffdf6'/%3E%3C/svg%3E" />
    <title>Brief30 team proposal - ${escapeHtml(pack.company)}</title>
    <style>
      :root{
        --ink:#121916;--muted:#59645f;--line:#d8ddd4;--paper:#fffdf6;
        --wash:#eef2e6;--teal:#0f766e;--amber:#b45309;--charcoal:#1d2823;
      }
      *{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font-family:Georgia,"Apple SD Gothic Neo",serif}
      main{max-width:1080px;margin:0 auto;padding:28px}
      .hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:28px;align-items:end;min-height:58vh;border-bottom:1px solid var(--line);padding:28px 0}
      .eyebrow{color:var(--teal);font:800 13px/1.2 "Avenir Next","Segoe UI",sans-serif;letter-spacing:0;text-transform:uppercase}
      h1{margin:12px 0;font-size:clamp(38px,7vw,84px);line-height:.94;letter-spacing:0}
      h2{margin:0 0 12px;font-size:24px;letter-spacing:0}.lead{max-width:700px;color:var(--muted);font-size:20px;line-height:1.6}
      .price{background:var(--charcoal);color:var(--paper);padding:22px;border-radius:8px}
      .price strong{display:block;font-size:40px;line-height:1}.price span{display:block;margin-top:10px;color:#d8efe8;line-height:1.5}
      .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:26px 0;background:var(--line);border:1px solid var(--line)}
      .tile{background:var(--paper);padding:20px;min-height:150px}.tile b{display:block;margin-bottom:10px;color:var(--amber);font:900 13px/1 "Avenir Next","Segoe UI",sans-serif}.tile p{margin:0;line-height:1.55}
      .band{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:30px;padding:28px 0;border-top:1px solid var(--line)}
      ul,ol{margin:0;padding-left:20px}li{margin:8px 0;line-height:1.55}.note{color:var(--muted);line-height:1.65}
      .cta{display:inline-block;margin-top:14px;padding:13px 18px;background:var(--teal);color:white;border-radius:6px;text-decoration:none;font:900 15px/1 "Avenir Next","Segoe UI",sans-serif}
      .ref{font:800 14px/1.5 "Avenir Next","Segoe UI",sans-serif;color:var(--muted)}
      .proof{background:#f8efe3;border-left:4px solid var(--amber);padding:16px;border-radius:6px}
      @media (max-width:760px){main{padding:18px}.hero,.band{grid-template-columns:1fr;min-height:auto}.grid{grid-template-columns:1fr}h1{font-size:44px}}
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div>
          <div class="eyebrow">Brief30 team briefing sprint</div>
          <h1>${escapeHtml(pack.company)} 업무 메모를 4주짜리 실행 브리핑으로</h1>
          <p class="lead">${escapeHtml(pack.useCase)}를 위해 익명화한 메모를 보고서, 회의록, 고객 업데이트, 후속 액션으로 정리합니다.</p>
        </div>
        <aside class="price">
          <strong>${formatKrw(pack.offer.price)}</strong>
          <span>${escapeHtml(pack.offer.delivery)}</span>
          <a class="cta" href="${escapeHtml(pack.orderUrl)}">${cta}</a>
        </aside>
      </section>
      <section class="grid" aria-label="핵심 조건">
        <div class="tile"><b>승인 대상</b><p>${escapeHtml(pack.buyer)} / ${escapeHtml(pack.approver)}</p></div>
        <div class="tile"><b>납품 일정</b><p>${escapeHtml(pack.deliveryWindow)}</p></div>
        <div class="tile"><b>주문 번호</b><p>${escapeHtml(pack.ref)}</p></div>
      </section>
      <section class="band">
        <div>
          <h2>제공 범위</h2>
          <ul>
            <li>업무 메모 최대 10개를 구조화한 브리핑으로 정리</li>
            <li>주간 브리핑 4회와 실행 액션 보드 제공</li>
            <li>보고서, 회의록, 고객 업데이트, 후속 메일 초안 중 필요한 형식으로 납품</li>
            <li>결과물 검토 후 수정 요청 1회 포함</li>
          </ul>
        </div>
        <div>
          <h2>진행 순서</h2>
          <ol>
            <li>내부 승인 시 주문번호 ${escapeHtml(pack.ref)}로 진행을 확정합니다.</li>
            <li>결제/입금 메모에 주문번호를 남깁니다.</li>
            <li>익명화한 업무 메모를 제출 링크로 보냅니다.</li>
            <li>결제 확인 후 1차 산출물을 받습니다.</li>
          </ol>
        </div>
      </section>
      <section class="band">
        <div>
          <h2>결제/진행 안내</h2>
          <p class="note">${payment}</p>
          <p class="ref">제출 링크: ${escapeHtml(pack.intakeUrl)}</p>
          <p class="ref">주문 링크: ${escapeHtml(pack.orderUrl)}</p>
        </div>
        <div class="proof">
          <h2>증거 기준</h2>
          <p class="note">실제 입금일, 입금자명, 금액, 주문번호가 확인되기 전에는 매출로 기록하지 않습니다. 결제 증거가 도착하면 money:paid와 audit:revenue로만 확정합니다.</p>
        </div>
      </section>
    </main>
  </body>
</html>
`;
}

function teamShareText(pack, fileName) {
  return [
    `${pack.approver}님께 바로 전달할 수 있는 Brief30 팀 브리핑 스프린트 제안 페이지입니다.`,
    "",
    `파일: ${fileName}`,
    `대상: ${pack.company} / ${pack.buyer}`,
    `금액: ${formatKrw(pack.offer.price)}`,
    `범위: ${pack.offer.delivery}`,
    pack.routeReady ? `결제/입금 안내: ${pack.paymentRoute}` : "승인되면 실제 결제 루트를 확인해 이어가겠습니다.",
    "",
    `주문번호: ${pack.ref}`
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
