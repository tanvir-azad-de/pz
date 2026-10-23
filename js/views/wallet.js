/* Wallet — docs/06-screens-detail.md */

function renderWallet(container, params, store) {
  const { wallet, settings } = store.data;

  const groups = [];
  wallet.forEach((row) => {
    let group = groups.find((g) => g.date === row.date);
    if (!group) {
      group = { date: row.date, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  });

  container.innerHTML = `
    <div class="screen-stack">
      <div class="balance-card">
        <div class="balance-card__inner">
          <div class="balance-card__icon">${Render.icon.wallet()}</div>
          <div class="balance-card__text">
            <span class="t-label-tiny">${Render.t("common_balance_label")}</span>
            <span class="t-label-lg">${Render.esc(settings.balance)}</span>
          </div>
          <button class="btn btn-small" type="button">${Render.t("common_payout_cta")}</button>
        </div>
      </div>

      <div class="wallet-chips">
        <button class="chip is-active" type="button" data-filter="all">${Render.t("wallet_filter_all")}</button>
        <button class="chip" type="button" data-filter="earned">${Render.t("wallet_filter_earned")}</button>
        <button class="chip" type="button" data-filter="spent">${Render.t("wallet_filter_spent")}</button>
      </div>

      <div id="wallet-groups" class="flex-col" style="gap: 24px;">
        ${groups.map(groupHtml).join("")}
      </div>
    </div>
  `;

  const groupsEl = container.querySelector("#wallet-groups");
  container.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      container.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const filter = chip.dataset.filter;
      groupsEl.querySelectorAll("[data-type]").forEach((card) => {
        const show = filter === "all" || card.dataset.type === filter;
        card.style.display = show ? "" : "none";
      });
      groupsEl.querySelectorAll(".wallet-date-group").forEach((g) => {
        const anyVisible = Array.from(g.querySelectorAll("[data-type]")).some(
          (c) => c.style.display !== "none"
        );
        g.style.display = anyVisible ? "" : "none";
      });
    });
  });
}

function groupHtml(group) {
  return `
    <div class="wallet-date-group">
      <span class="t-body-lg wallet-date-group__title">${Render.esc(group.date)}</span>
      <div class="wallet-cards">
        ${group.rows.map(walletCardHtml).join("")}
      </div>
    </div>
  `;
}

function walletCardHtml(row) {
  const isEarned = String(row.type).trim().toLowerCase() === "earned";
  const sign = isEarned ? "+" : "-";
  const amountClass = isEarned ? "is-earned" : "is-spent";
  const hasCoupon = !!(row.coupon_code && String(row.coupon_code).trim());

  const baseRow = `
    <div class="wallet-card__row">
      <div class="wallet-card__left">
        <img class="wallet-card__icon" src="${Render.esc(row.icon_url)}" alt="" />
        <div class="wallet-card__text">
          <span class="t-body-lg wallet-card__name">${Render.esc(row.name)}</span>
          <span class="t-body-sm wallet-card__subtitle">${Render.esc(row.subtitle)}</span>
        </div>
      </div>
      <div class="wallet-card__amount-block">
        <div class="wallet-card__amount ${amountClass}">
          <span class="t-label-lg">${sign}${Render.esc(row.amount)}</span>
        </div>
        ${row.status ? `<span class="badge badge--pending">${Render.esc(row.status)}</span>` : ""}
      </div>
    </div>
  `;

  if (!hasCoupon) {
    return `<div class="wallet-card" data-type="${Render.esc(String(row.type).toLowerCase())}">${baseRow}</div>`;
  }

  return `
    <div class="wallet-card wallet-card--coupon" data-type="${Render.esc(String(row.type).toLowerCase())}">
      ${baseRow}
      <div class="wallet-card__divider"></div>
      <div class="wallet-card__coupon-row">
        <div class="wallet-card__code-box">
          <span class="t-body-lg">${Render.esc(row.coupon_code)}</span>
          ${Render.icon.copy()}
        </div>
        <button class="btn btn-outline-copy" type="button">${Render.t("wallet_copy_shop_cta")}</button>
      </div>
    </div>
  `;
}
