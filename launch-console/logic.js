import { buildContactDesk } from "../contact-desk/logic.js";
import { buildEvidenceDesk } from "../evidence-desk/logic.js";
import { buildShareCopy, paymentRouteState } from "../preflight/commands.js";

const TARGET_KRW = 300000;

export const sampleWarmContacts = [
  "최컨설턴트 | 예전 프로젝트 | 임원 보고 전 결정사항 정리가 반복됨",
  "박대표 | 소개받은 초기 대표 | 팀 업데이트와 고객사 공유를 매주 정리해야 함",
  "정팀장 | 지인 추천 | 주간보고와 액션아이템 정리에 시간 많이 씀"
].join("\n");

export function buildLaunchConsole(input = {}, options = {}) {
  const date = clean(options.date || input.date) || today();
  const month = clean(options.month || input.month) || date.slice(0, 7);
  const publicUrl = normalizeRoot(input.publicUrl || options.publicUrl || "https://happyreni.github.io/brief30-workfix-sprint/");
  const payment = options.paymentStatus || paymentRouteState(options.orderConfig || {}, options.marketingConfig || {});
  const contacts = buildContactDesk(
    { contacts: input.contacts || "", ledger: input.ledger || "" },
    { publicUrl, date, limit: input.limit || options.limit || 20, offer: "team" }
  );
  const evidence = buildEvidenceDesk(
    { paymentText: input.payments || "" },
    { date, month, paymentRoute: input.paymentRoute || options.paymentRoute || "" }
  );
  const gap = Math.max(0, TARGET_KRW - evidence.readyTotal);
  const closePacket = buildClosePacket(publicUrl, contacts.topAsk, payment.ready);
  const next = nextAction({ payment, contacts, evidence, gap });
  return {
    date,
    month,
    publicUrl,
    payment,
    contacts,
    evidence,
    gap,
    closePacket,
    next,
    metrics: buildMetrics({ payment, contacts, evidence, gap }),
    checklist: buildChecklist({ payment, contacts, evidence, gap }),
    commands: buildCommands({ publicUrl, month, payment, contacts, evidence, closePacket }),
    links: buildLinks(publicUrl, contacts.topAsk),
    shareCopy: buildShareCopy(publicUrl, `${publicUrl}launch-console/index.html`)
  };
}

function nextAction({ payment, contacts, evidence, gap }) {
  if (evidence.readyTotal >= TARGET_KRW) {
    return { level: "done_check", label: "증거 병합 후 매출 감사", detail: "payment text를 저장하고 money:paid를 실행하세요." };
  }
  if (!payment.ready) {
    return { level: "blocked", label: "결제 루트 먼저 설정", detail: "payment-setup에서 실제 회신 이메일과 입금 안내 또는 checkout URL을 넣으세요." };
  }
  if (contacts.sendableRows.length) {
    return { level: "send", label: `${contacts.topAsk.name}에게 30만원 제안`, detail: "컨택트 데스크 메시지를 보내고 운영 CSV를 가져오세요." };
  }
  return { level: "source", label: "따뜻한 후보 메모 입력", detail: "전 직장, 지인, 소개, 답장 온 사람부터 10명만 적으세요." };
}

function buildMetrics({ payment, contacts, evidence, gap }) {
  return [
    { label: "PAYMENT", value: payment.ready ? "READY" : "MISSING" },
    { label: "WARM SENDS", value: String(contacts.sendableRows.length) },
    { label: "READY PROOF", value: String(evidence.ready.length) },
    { label: "READY TOTAL", value: formatKrw(evidence.readyTotal) },
    { label: "GAP", value: formatKrw(gap) }
  ];
}

function buildChecklist({ payment, contacts, evidence, gap }) {
  return [
    item("결제 루트", payment.ready, payment.ready ? payment.label : "실제 결제 안내 필요"),
    item("공개 링크", true, "release/seller 업로드 후 check:public 실행"),
    item("따뜻한 후보", contacts.sendableRows.length > 0, `${contacts.sendableRows.length}명 준비`),
    item("입금 증거", evidence.ready.length > 0, `${evidence.ready.length}건 병합 가능`),
    item("월 30 감사", gap <= 0, gap <= 0 ? "목표 증거 금액 도달" : `${formatKrw(gap)} 남음`)
  ];
}

function buildCommands({ publicUrl, month, payment, contacts, evidence, closePacket }) {
  const lines = [
    "npm run package:release",
    "npm run audit:release",
    payment.ready ? "npm run audit:release:strict" : "open payment-setup/index.html",
    `npm run check:public -- ${publicUrl}`
  ];
  if (contacts.sendableRows.length) {
    lines.push(`open contact-desk/index.html and send ${contacts.sendableRows.length} warm team asks`);
    if (payment.ready && closePacket?.ready) {
      lines.push(`open ${closePacket.closeUrl} and copy the 300,000원 payment request`);
    }
  } else {
    lines.push("open contact-desk/index.html and paste 10 warm contacts");
  }
  lines.push("open money-day/index.html before merging anything");
  if (evidence.ready.length) {
    lines.push("save raw payment text as path/to/payment-text.txt");
    lines.push(`npm run money:paid -- path/to/brief30-launch-ledger.csv path/to/payment-text.txt --out=path/to/brief30-launch-ledger.csv --month=${month} --report-out=outreach/generated`);
  }
  lines.push(`npm run audit:revenue -- path/to/brief30-launch-ledger.csv --month=${month}`);
  return lines.join("\n");
}

function buildLinks(publicUrl, topAsk) {
  const links = [
    { label: "결제 셋업", href: "../payment-setup/index.html" },
    { label: "컨택트 데스크", href: "../contact-desk/index.html" },
    { label: "클로징 데스크", href: closeUrlFor(topAsk) || "../closing/index.html?offer=team" },
    { label: "머니데이", href: "../money-day/index.html" },
    { label: "증거 데스크", href: "../evidence-desk/index.html" },
    { label: "팀 샘플", href: `${publicUrl}team/sample.html` },
    { label: "팀 주문", href: `${publicUrl}order/index.html?offer=team` },
    { label: "진행룸", href: `${publicUrl}dealroom/index.html?offer=team` }
  ];
  if (topAsk) {
    const packet = buildClosePacket(publicUrl, topAsk, true);
    links.push({ label: "팀 청구서", href: packet.invoiceUrl });
    links.push({ label: "결제 증빙", href: packet.paidUrl });
  }
  return links;
}

function buildClosePacket(publicUrl, topAsk, paymentReady) {
  if (!topAsk) {
    return {
      ready: false,
      title: "따뜻한 후보가 필요합니다",
      detail: "후보 메모를 붙여넣으면 첫 30만원 요청 링크를 만듭니다.",
      closeUrl: "../closing/index.html?offer=team",
      invoiceUrl: `${publicUrl}invoice/index.html?offer=team`,
      paidUrl: `${publicUrl}paid/index.html?offer=team`,
      copy: "후보를 먼저 입력하세요."
    };
  }
  const buyer = clean(topAsk.name);
  const useCase = clean(topAsk.pain || topAsk.note || "팀 주간보고");
  const params = {
    offer: "team",
    buyer,
    useCase
  };
  const publicParams = query(params);
  const closeUrl = closeUrlFor(topAsk);
  const invoiceUrl = `${publicUrl}invoice/index.html?${publicParams}`;
  const paidUrl = `${publicUrl}paid/index.html?${query({ offer: "team", buyer, amount: TARGET_KRW })}`;
  const roomUrl = `${publicUrl}dealroom/index.html?${publicParams}`;
  return {
    ready: Boolean(paymentReady),
    title: `${buyer} 30만원 요청`,
    detail: paymentReady ? "클로징 데스크에서 입금 요청 문안을 복사하세요." : "실제 결제 루트 설정 후 발송하세요.",
    closeUrl,
    invoiceUrl,
    paidUrl,
    copy: [
      `${buyer}, ${useCase} 건은 Brief30 팀 브리핑 스프린트로 진행하면 됩니다.`,
      "",
      "금액: 300,000원",
      `개인 진행룸: ${roomUrl}`,
      `청구서: ${invoiceUrl}`,
      `결제 증빙 양식: ${paidUrl}`,
      "",
      paymentReady
        ? "진행 가능하면 결제 후 주문번호와 입금자명을 답장으로 남겨주세요."
        : "아직 판매자 결제 루트가 비어 있으니 payment-setup을 먼저 끝낸 뒤 보내세요."
    ].join("\n")
  };
}

function closeUrlFor(topAsk) {
  if (!topAsk) return "";
  return `../closing/index.html?${query({
    offer: "team",
    buyer: topAsk.name,
    useCase: topAsk.pain || topAsk.note || "팀 주간보고"
  })}`;
}

function item(title, done, detail) {
  return { title, done, detail };
}

function normalizeRoot(value) {
  const root = clean(value);
  return root.endsWith("/") ? root : `${root}/`;
}

function formatKrw(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function query(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (clean(value)) params.set(key, value);
  });
  return params.toString();
}

function clean(value) {
  return String(value || "").trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
