/* Rewards tab — docs/05-screens-tabs.md */

function renderRewards(container, params, store) {
  const { rewards, settings } = store.data;
  // Categories come from the rewards tab's own `category` column, in row order, rather than
  // a hardcoded list — reordering/renaming categories is then a sheet-only change.
  const categories = [];
  rewards.forEach((r) => {
    if (r.category && !categories.includes(r.category)) categories.push(r.category);
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

      ${categories.map((cat) => categoryRowHtml(cat, rewards, settings.balance)).join("")}
    </div>
  `;

  container.querySelectorAll("[data-reward-id]").forEach((el) => {
    el.addEventListener("click", () => {
      location.hash = `#/reward/${el.dataset.rewardId}`;
    });
  });
}

function categoryRowHtml(category, rewards, balance) {
  const items = rewards.filter((r) => r.category === category);
  if (items.length === 0) return "";
  return `
    <div class="flex-col gap-md">
      <div class="section-header">
        <h2 class="t-title-md" style="margin:0;">${Render.esc(category)}</h2>
        <button class="btn btn-ghost" type="button">${Render.t("common_see_all")}</button>
      </div>
      <div class="payout-row">
        ${items.map((r) => payoutCardHtml(r, balance)).join("")}
      </div>
    </div>
  `;
}

// Progress bar fill: how much of this reward's amount the user's current wallet balance
// already covers, e.g. balance $2.30 against a $5.00 reward -> 46%. Clamped to 100% once the
// balance meets or exceeds the reward amount; rounded to a whole percent for the inline width.
function progressPct(balance, amount) {
  const target = Render.parseAmount(amount);
  if (!(target > 0)) return 0;
  const raw = (Render.parseAmount(balance) / target) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function payoutCardHtml(reward, balance) {
  const pct = progressPct(balance, reward.amount);

  return `
    <button class="payout-card" type="button" data-reward-id="${Render.esc(reward.id)}">
      <div class="payout-card__body">
        <div class="payout-card__brand">
          ${Render.brandLogo(reward.brand, 36)}
          <span class="t-body-md payout-card__brand-name">${Render.esc(reward.brand)}</span>
        </div>
        <span class="t-title-md payout-card__amount">${Render.esc(reward.amount)}</span>
        <div class="payout-card__track">
          <div class="payout-card__fill" style="width:${pct}%"></div>
        </div>
      </div>
    </button>
  `;
}
