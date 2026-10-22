/* Reward Detail — docs/06-screens-detail.md */

function renderRewardDetail(container, params, store) {
  const reward = store.data.rewards.find((r) => r.id === params.id);
  const content = store.data.content;

  if (!reward) {
    container.innerHTML = `<div class="state-message"><p class="t-body-md">Reward not found.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="screen-stack" style="padding-bottom: 140px;">
      <div class="padded-x">
        <div class="flex-col" style="background:#fff;border-radius:var(--radius-xl);padding:20px 16px;align-items:center;">
          ${Render.brandLogoWide(reward.brand)}
        </div>
      </div>

      <div class="padded-x">
        <span class="t-display-lg">${Render.esc(reward.amount)}</span>
      </div>

      <div class="padded-x flex-col gap-sm">
        <h2 class="t-title-sm" style="margin:0;">How it works</h2>
        <p class="t-body-sm" style="margin:0;">${Render.esc(content.reward_detail_how_1)}</p>
        <p class="t-body-sm" style="margin:0;">${Render.esc(content.reward_detail_how_2)}</p>
        <p class="t-body-sm" style="margin:0;">${Render.esc(content.reward_detail_how_3)}</p>
      </div>

      <div class="padded-x">
        <div style="border-top:1px solid var(--purple-700);"></div>
      </div>

      <div class="padded-x flex-col gap-sm">
        <h2 class="t-title-sm" style="margin:0;">Conditions</h2>
        <p class="t-body-sm" style="margin:0;">${Render.esc(content.reward_detail_conditions_1)}</p>
        <p class="t-body-sm" style="margin:0;">${Render.esc(content.reward_detail_conditions_2)}</p>
      </div>

      <div class="padded-x">
        <div class="surface-card">
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.reward_detail_disclaimer)}</p>
        </div>
      </div>
    </div>

    <div class="sticky-footer">
      <button class="btn btn-primary" type="button">Confirm Payout</button>
    </div>
  `;
}
