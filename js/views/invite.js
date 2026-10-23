/* Invite Friends — docs/06-screens-detail.md */

function renderInvite(container, params, store) {
  const content = store.data.content;
  const settings = store.data.settings;

  container.innerHTML = `
    <div class="flex-col">
      <div class="invite-hero flex-col gap-md" data-nav-backdrop style="align-items:center;text-align:center;">
        <div class="invite-hero__art"></div>
        <div class="flex-col gap-sm">
          <h1 class="t-title-sm" style="margin:0;">${Render.esc(content.invite_hero_title)}</h1>
          <p class="t-body-md" style="margin:0;">${Render.esc(content.invite_hero_subtitle)}</p>
        </div>
      </div>

      <div class="invite-panel flex-col">
        <div class="invite-balance-card flex-col">
          <span class="t-label-lg">${Render.t("invite_referral_balance_label")}</span>
          <span class="t-title-md" style="color:var(--color-primary);">${Render.esc(settings.referral_balance)}</span>
        </div>

        <div class="flex-col gap-md">
          <h2 class="t-title-md" style="margin:0;">${Render.t("invite_rewards_title")}</h2>
          <p class="t-body-lg" style="margin:0;">${Render.t("invite_rewards_intro")}</p>
          <div class="flex-col gap-xs">
            <div class="surface-card flex-row gap-md" style="background:var(--color-bg);justify-content:space-between;">
              <span class="t-body-lg">${Render.t("invite_reward_first_task_label")}</span>
              <span class="t-title-sm" style="color:var(--color-primary);">${Render.esc(settings.referral_first_task)}</span>
            </div>
            <div class="surface-card flex-col gap-sm" style="background:var(--color-bg);">
              <div class="flex-row gap-md" style="justify-content:space-between;">
                <span class="t-body-lg">${Render.t("invite_reward_pct_label")}</span>
                <div class="flex-col" style="align-items:flex-end;">
                  <span class="t-title-sm" style="color:var(--color-primary);">${Render.esc(settings.referral_pct)}%</span>
                  <span class="t-body-sm">${Render.t("invite_reward_pct_caption")}</span>
                </div>
              </div>
              <div class="flex-row gap-sm">
                ${Render.icon.info()}
                <span class="t-body-sm">${Render.t("invite_referral_pct_note")}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-col gap-md">
          <h2 class="t-title-md" style="margin:0;">${Render.t("invite_how_title")}</h2>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_1)}</p>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_2)}</p>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_3)}</p>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_4)}</p>
        </div>
      </div>
    </div>

    <div class="sticky-footer">
      <button class="btn btn-primary" type="button">${Render.t("invite_cta")}</button>
    </div>
  `;
}
