(function () {
  const config = window.BRIEF30_MARKETING_CONFIG || {};
  const orderUrl = config.orderUrl || "./../order/index.html";
  const buyUrl = config.buyUrl || withOffer(orderUrl, "self");
  const setupUrl = config.setupUrl || withOffer(orderUrl, "setup");
  const serviceUrl = config.serviceUrl || withOffer(orderUrl, "service");
  const teamUrl = config.teamUrl || withOffer(orderUrl, "team");
  const workfixUrl = config.workfixUrl || withOffer(orderUrl, "workfix");
  const testerUrl = config.testerUrl || "#outreach";
  const demoUrl = config.demoUrl || "./../diagnostic/index.html";

  bindLinks("[data-buy-link]", buyUrl, "셀프툴 주문하기");
  bindLinks("[data-setup-link]", setupUrl, "셋업팩 주문하기");
  bindLinks("[data-service-link]", serviceUrl, "대행팩 주문하기");
  bindLinks("[data-team-link]", teamUrl, "팀 스프린트 주문하기");
  bindLinks("[data-workfix-link]", workfixUrl, "Workfix 24시간 스프린트 주문하기");

  document.querySelectorAll("[data-tester-link]").forEach((link) => {
    link.setAttribute("href", testerUrl);
  });

  document.querySelectorAll("[data-demo-link]").forEach((link) => {
    link.setAttribute("href", demoUrl);
  });

  const hasExternalCheckout = config.teamUrl || config.workfixUrl || config.buyUrl || config.setupUrl || config.serviceUrl;
  document.documentElement.dataset.checkout = hasExternalCheckout ? "external" : "direct";

  function bindLinks(selector, url, label) {
    document.querySelectorAll(selector).forEach((link) => {
      link.setAttribute("href", url);
      link.textContent = label;
      if (/^https?:/u.test(url)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noreferrer");
      }
    });
  }

  function withOffer(url, offer) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}offer=${offer}`;
  }
})();
