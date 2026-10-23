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
          <span class="t-label-lg">Your Referral Balance</span>
          <span class="t-title-md" style="color:var(--color-primary);">${Render.esc(settings.referral_balance)}</span>
        </div>

        <div class="flex-col gap-md">
          <h2 class="t-title-md" style="margin:0;">Referral Rewards</h2>
          <p class="t-body-lg" style="margin:0;">Earn rewards when your friend:</p>
          <div class="flex-col gap-xs">
            <div class="surface-card flex-row gap-md" style="background:var(--color-bg);justify-content:space-between;">
              <span class="t-body-lg">Completes the first task</span>
              <span class="t-title-sm" style="color:var(--color-primary);">${Render.esc(settings.referral_first_task)}</span>
            </div>
            <div class="surface-card flex-col gap-sm" style="background:var(--color-bg);">
              <div class="flex-row gap-md" style="justify-content:space-between;">
                <span class="t-body-lg">Earns game rewards from tasks</span>
                <div class="flex-col" style="align-items:flex-end;">
                  <span class="t-title-sm" style="color:var(--color-primary);">${Render.esc(settings.referral_pct)}%</span>
                  <span class="t-body-sm">of their reward</span>
                </div>
              </div>
              <div class="flex-row gap-sm">
                ${Render.icon.info()}
                <span class="t-body-sm">You'll get ${Render.esc(settings.referral_pct)}% of their game rewards</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-col gap-md">
          <h2 class="t-title-md" style="margin:0;">How it works?</h2>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_1)}</p>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_2)}</p>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_3)}</p>
          <p class="t-body-sm" style="margin:0;">${Render.esc(content.invite_how_4)}</p>
        </div>
      </div>
    </div>

    <div class="sticky-footer">
      <button class="btn btn-primary" type="button">Invite Friends</button>
    </div>
  `;
}
