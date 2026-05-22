import { campaignMath, defaultOrderUrl, shouldReplaceOrderUrl } from "./defaults.js";

const OFFERS = {
  team: { label: "300,000원 팀 브리핑 스프린트", ask: "팀 메모 10개와 4주 브리핑으로 내부 공유 문제를 끝낼지" },
  self: { label: "19,000원 셀프툴", ask: "셀프툴로 계속 써볼 마음이 있는지" },
  setup: { label: "49,000원 셋업팩", ask: "첫 업무 메모 1개를 제가 같이 셋업해드리면 살 마음이 있는지" },
  service: { label: "99,000원 대행팩", ask: "메모 3개를 대신 정리받는 방식이면 맡길 마음이 있는지" }
};

const SEGMENTS = {
  office: {
    label: "직장인/PM",
    context: "팀 공유용 보고와 회의 후 액션아이템 정리",
    result: "주간보고, 회의록, 후속 메일"
  },
  freelancer: {
    label: "프리랜서",
    context: "고객사 진행 공유와 작업 로그 정리",
    result: "고객사 업데이트, 다음 액션, 후속 메일"
  },
  agency: {
    label: "에이전시",
    context: "여러 고객사 상태 업데이트",
    result: "상태 보고, 리스크 요약, 고객 확인 요청"
  },
  founder: {
    label: "창업자",
    context: "팀/투자자 업데이트",
    result: "짧은 운영 브리프, 의사결정 요청, 리스크 요약"
  },
  consultant: {
    label: "컨설턴트",
    context: "미팅 메모와 프로젝트 리스크 정리",
    result: "회의록, 임원 보고, 후속 액션"
  }
};

const form = document.getElementById("campaignForm");
const grid = document.getElementById("messageGrid");

form.addEventListener("input", render);
form.elements.offer.addEventListener("change", syncOfferUrl);
document.getElementById("copyAll").addEventListener("click", () => copyText(buildMessages().map(formatBlock).join("\n\n")));
document.getElementById("downloadTxt").addEventListener("click", downloadMessages);

render();

function render() {
  renderMath();
  grid.innerHTML = buildMessages().map((item, index) => `
    <article class="messageCard">
      <div>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <h3>${item.title}</h3>
      </div>
      <p>${escapeHtml(item.text)}</p>
      <button class="secondary" data-copy="${index}" type="button">복사</button>
    </article>
  `).join("");
  grid.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const message = buildMessages()[Number(button.dataset.copy)];
      copyText(message.text);
      flash(button);
    });
  });
}

function syncOfferUrl() {
  if (shouldReplaceOrderUrl(form.elements.order.value)) {
    form.elements.order.value = defaultOrderUrl(form.elements.offer.value);
  }
  render();
}

function renderMath() {
  const data = Object.fromEntries(new FormData(form));
  const math = campaignMath(data.offer);
  document.getElementById("mathEyebrow").textContent = math.headline;
  document.getElementById("mathIntro").textContent = `월 30은 ${math.intro} 닿습니다. 매일 10명에게 proof와 주문 링크가 들어간 문안을 보냅니다.`;
  document.getElementById("mathDetail").textContent = math.detail;
}

function buildMessages() {
  const data = Object.fromEntries(new FormData(form));
  const segment = SEGMENTS[data.segment] || SEGMENTS.office;
  const offer = OFFERS[data.offer] || OFFERS.team;
  const name = data.name || "OO님";
  const pain = data.pain || segment.context;
  const proof = data.proof || "../diagnostic/index.html";
  const order = data.order || "../order/index.html?offer=team";

  return [
    {
      title: "Cold DM",
      text: `${name}, ${pain} 때문에 시간 많이 쓰는 분들 대상으로 Brief30을 만들었습니다. 익명 메모 1개를 넣으면 ${segment.result} 미리보기가 바로 나옵니다. 무료 진단은 ${proof} 입니다. 10분만 보고 실제로 쓸 만한지 알려주실 수 있을까요?`
    },
    {
      title: "Proof follow-up",
      text: `${name}, 기능 설명보다 결과물이 빠를 것 같아 무료 진단 링크를 보냅니다. ${proof} 여기서 익명 메모가 보고서 문장으로 바뀌는 미리보기를 볼 수 있습니다. ${offer.label} 기준이면 계속 쓸 마음이 있는지 궁금합니다.`
    },
    {
      title: "Price objection",
      text: `가격이 애매하면 바로 구매보다 실제 메모 1개로 확인하는 쪽이 낫습니다. ${offer.ask}만 판단해주시면 됩니다. 주문/신청은 여기입니다: ${order}`
    },
    {
      title: "Community post",
      text: `${segment.label} 중 ${pain}에 시간 쓰는 분들께 작은 로컬 도구를 테스트 중입니다. 업무 메모를 외부 서버에 보내지 않고 ${segment.result}로 정리합니다. 무료 진단: ${proof} / 초기 오퍼: ${offer.label}`
    },
    {
      title: "Close ask",
      text: `${name}, 써볼 만하다고 느끼셨다면 이번 주에 ${offer.label} 옵션으로 열어두겠습니다. 주문 링크는 ${order} 입니다. 결제 후 업무 메모는 회사명/고객명 지우고 보내주시면 됩니다.`
    }
  ];
}

function formatBlock(item) {
  return `[${item.title}]\n${item.text}`;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

function downloadMessages() {
  const blob = new Blob([buildMessages().map(formatBlock).join("\n\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief30-campaign-messages.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function flash(button) {
  const original = button.textContent;
  button.textContent = "복사 완료";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1100);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}
