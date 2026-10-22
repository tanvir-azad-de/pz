/* Rewards tab — docs/05-screens-tabs.md */

function renderRewards(container, params, store) {
  const { rewards, settings } = store.data;
  const categories = ["Cash", "Amazon", "Google Play", "Apple"];

  container.innerHTML = `
    <div class="screen-stack">
      <div class="balance-card">
        <div class="balance-card__inner">
          <div class="balance-card__icon">${Render.icon.wallet()}</div>
          <div class="balance-card__text">
            <span class="t-label-tiny">Your Balance</span>
            <span class="t-label-lg">$ ${Render.esc(settings.balance)}</span>
          </div>
          <button class="btn btn-small" type="button">Payout Now</button>
        </div>
      </div>

      ${categories.map((cat) => categoryRowHtml(cat, rewards)).join("")}
    </div>
  `;

  container.querySelectorAll("[data-reward-id]").forEach((el) => {
    el.addEventListener("click", () => {
      location.hash = `#/reward/${el.dataset.rewardId}`;
    });
  });
}

function categoryRowHtml(category, rewards) {
  const items = rewards.filter((r) => r.category === category);
  if (items.length === 0) return "";
  return `
    <div class="flex-col gap-md">
      <div class="section-header">
        <h2 class="t-title-md" style="margin:0;">${Render.esc(category)}</h2>
        <button class="btn btn-ghost" type="button">See All</button>
      </div>
      <div class="payout-row">
        ${items.map(payoutCardHtml).join("")}
      </div>
    </div>
  `;
}

function payoutCardHtml(reward) {
  const pct = Math.max(0, Math.min(100, Number(reward.progress_pct) || 0));
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
      <div class="payout-card__points">${Render.icon.coin()}<span class="t-label-lg">1 000</span></div>
    </button>
  `;
}
