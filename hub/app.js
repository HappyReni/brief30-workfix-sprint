const routes = [
  {
    title: "무료 진단",
    href: "../diagnostic/index.html",
    label: "메모 1개로 미리보기",
    metric: "3분",
    copy: "회사명과 고객명을 지운 업무 메모로 요약과 보고서 맛보기를 확인합니다."
  },
  {
    title: "Before/After",
    href: "../proof/index.html",
    label: "결과물 증거",
    metric: "4개 예시",
    copy: "주간보고, 회의록, 고객사 업데이트가 실제로 어떻게 바뀌는지 봅니다."
  },
  {
    title: "셋업팩 주문",
    href: "../order/index.html?offer=setup",
    label: "초기 추천",
    metric: "49,000원",
    copy: "툴과 첫 업무 메모 셋업을 같이 받아 바로 반복 포맷을 만듭니다."
  },
  {
    title: "팀 승인 메모",
    href: "../approval/index.html?offer=team",
    label: "30만원 한 건",
    metric: "300,000원",
    copy: "팀 예산 승인을 위한 요청서, 보안 기준, 결재권자 전달 문안을 만듭니다."
  },
  {
    title: "결제 셋업",
    href: "../payment-setup/index.html",
    label: "발송 전 필수",
    metric: "Live gate",
    copy: "실제 입금 안내 또는 결제 URL을 넣어 live 발송 명령과 설정 스니펫을 만듭니다."
  },
  {
    title: "런치 콘솔",
    href: "../launch-console/index.html",
    label: "오늘 할 일",
    metric: "1 action",
    copy: "결제, 후보, 증거 상태를 한 화면에서 보고 다음 행동과 명령만 남깁니다."
  },
  {
    title: "일일 데스크",
    href: "../daily-desk/index.html",
    label: "발송 수 산출",
    metric: "Daily math",
    copy: "원장 CSV로 매출 gap, 기대 파이프라인, 오늘 보낼 문안과 운영 CSV를 만듭니다."
  },
  {
    title: "클로징 데스크",
    href: "../closing/index.html?offer=team",
    label: "입금 요청",
    metric: "300,000원",
    copy: "관심 답장을 받으면 견적, 입금 요청, 증거 라인, 후속 문안을 한 번에 복사합니다."
  },
  {
    title: "후속 데스크",
    href: "../followup-desk/index.html",
    label: "24시간 재접촉",
    metric: "Top ask",
    copy: "운영 CSV를 붙여넣어 오늘 다시 보낼 결제 요청과 업데이트 CSV를 만듭니다."
  },
  {
    title: "라이브 데스크",
    href: "../live-desk/index.html",
    label: "한 줄 실행",
    metric: "ZIP",
    copy: "결제 루트, 후보, 답장, 증거를 묶은 입력 번들을 만들고 money:live 실행 한 줄로 발송 폴더를 만듭니다."
  },
  {
    title: "머니데이",
    href: "../money-day/index.html",
    label: "오늘 닫기",
    metric: "1건",
    copy: "리드, 답장, 결제 증거를 붙여넣어 지금 돈 요청할 후보와 병합 가능한 증거를 분리합니다."
  },
  {
    title: "증거 데스크",
    href: "../evidence-desk/index.html",
    label: "입금 확인",
    metric: "CSV",
    copy: "입금 문자와 결제 알림을 붙여넣어 매출 원장에 병합 가능한 증거 CSV로 바꿉니다."
  },
  {
    title: "컨택트 데스크",
    href: "../contact-desk/index.html",
    label: "따뜻한 후보",
    metric: "점수순",
    copy: "아는 사람 메모를 붙여넣어 중복을 빼고 오늘 보낼 메시지와 운영 CSV를 만듭니다."
  },
  {
    title: "개인 진행룸",
    href: "../dealroom/index.html?offer=team&buyer=Lead%2020&company=OO%ED%8C%80",
    label: "답장 클로징",
    metric: "1 URL",
    copy: "관심 있는 한 명에게 승인, 청구, 증빙, 인테이크 링크를 묶어서 보냅니다."
  },
  {
    title: "대행팩 요청",
    href: "../service/index.html",
    label: "결과물 먼저",
    metric: "99,000원",
    copy: "보고서가 급한 사람에게 메모 3개 정리와 반복 포맷을 바로 제안합니다."
  },
  {
    title: "셀프툴 주문",
    href: "../order/index.html?offer=self",
    label: "혼자 쓰기",
    metric: "19,000원",
    copy: "다운로드해서 브라우저에서 바로 여는 로컬 업무 브리프 도구입니다."
  }
];

const routeGrid = document.querySelector("#routeGrid");
const healthRows = document.querySelector("#healthRows");
const shareText = document.querySelector("#shareText");
const checkLinks = document.querySelector("#checkLinks");
const copyShare = document.querySelector("#copyShare");

function renderRoutes() {
  routeGrid.innerHTML = routes
    .map(
      (route, index) => `
        <a class="routeCard" href="${route.href}">
          <span class="routeIndex">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <small>${route.label}</small>
            <h3>${route.title}</h3>
            <p>${route.copy}</p>
          </div>
          <strong>${route.metric}</strong>
        </a>
      `
    )
    .join("");
}

function renderHealth(statuses = {}) {
  healthRows.innerHTML = routes
    .map((route) => {
      const state = statuses[route.href] ?? "대기";
      return `
        <a class="healthRow" href="${route.href}">
          <span>${route.title}</span>
          <code>${route.href}</code>
          <strong data-state="${state}">${state}</strong>
        </a>
      `;
    })
    .join("");
}

function getAbsoluteUrl(path) {
  return new URL(path, window.location.href).toString();
}

function renderShareText() {
  const diagnosticUrl = getAbsoluteUrl("../diagnostic/index.html");
  const proofUrl = getAbsoluteUrl("../proof/index.html");
  const orderUrl = getAbsoluteUrl("../order/index.html?offer=setup");
  const serviceUrl = getAbsoluteUrl("../service/index.html");

  shareText.textContent = [
    "Brief30 무료 진단 먼저 열어보세요.",
    "",
    "회사명, 고객명, 실명은 지우고 업무 메모 1개를 붙여넣으면 보고서 미리보기가 바로 나옵니다.",
    `무료 진단: ${diagnosticUrl}`,
    `결과 예시: ${proofUrl}`,
    `셋업팩 주문: ${orderUrl}`,
    `대행팩 요청: ${serviceUrl}`
  ].join("\n");
}

async function checkRoute(route) {
  try {
    const response = await fetch(route.href, { cache: "no-store" });
    return response.ok ? "정상" : "확인필요";
  } catch {
    return window.location.protocol === "file:" ? "브라우저열림" : "확인필요";
  }
}

async function checkAllRoutes() {
  checkLinks.disabled = true;
  checkLinks.textContent = "확인 중";
  const entries = await Promise.all(routes.map(async (route) => [route.href, await checkRoute(route)]));
  renderHealth(Object.fromEntries(entries));
  checkLinks.disabled = false;
  checkLinks.textContent = "링크 검증";
}

async function copyText() {
  await navigator.clipboard.writeText(shareText.textContent);
  copyShare.textContent = "복사됨";
  window.setTimeout(() => {
    copyShare.textContent = "공유 문안 복사";
  }, 1200);
}

renderRoutes();
renderHealth();
renderShareText();

checkLinks.addEventListener("click", checkAllRoutes);
copyShare.addEventListener("click", copyText);
