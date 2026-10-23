/* Profile tab — docs/05-screens-tabs.md */

// Static illustration per bonus card slot — bonus 1 is the invite-friends promo, reusing the
// same art as the Discover invite card (per product decision, same image). bonus 2 is the
// Instagram follow promo. This art is intentionally NOT sheet-driven (no bonus_N_icon content
// key exists) — an image path isn't user-visible copy, so it stays a fixed asset in code.
const PROFILE_BONUS_ILLUSTRATIONS = [
  "assets/icons/illus-invite-card.png",
  "assets/icons/illus-bonus-2.png",
];

function renderProfile(container, params, store) {
  const content = store.data.content;
  const bonuses = content.bonuses || [];

  const menuRows = [
    { labelKey: "profile_menu_help" },
    { labelKey: "profile_menu_terms" },
    { labelKey: "profile_menu_imprint" },
    { labelKey: "profile_menu_privacy" },
  ];

  container.innerHTML = `
    <div class="screen-stack">
      <div class="padded-x">
        <button class="menu-row" type="button" id="wallet-row" style="border-radius:var(--radius-lg);background:var(--color-surface);border-bottom:none;width:100%;">
          <div class="flex-row gap-md" style="align-items:center;">
            <img src="assets/icons/illus-wallet.png" width="50" height="50" alt="" style="border-radius:var(--radius-sm);flex-shrink:0;" />
            <span class="t-label-lg">${Render.t("profile_wallet_row_label")}</span>
          </div>
          ${Render.icon.chevronRight()}
        </button>
      </div>

      <div class="padded-x flex-col gap-md">
        <h2 class="t-title-sm" style="margin:0;">${Render.t("profile_bonuses_title")}</h2>
        <div class="flex-col gap-md">
          ${bonuses.map((b, i) => bonusCardHtml(b, i)).join("")}
        </div>
      </div>

      <div class="flex-col">
        <div class="menu-row">
          <div class="flex-col gap-xs">
            <span class="t-body-md">${Render.t("profile_email_label")}</span>
            <span class="t-body-md menu-row__value">${Render.esc(content.email)}</span>
          </div>
        </div>
        ${menuRows.map((r) => `
          <button class="menu-row" type="button" style="width:100%;text-align:left;">
            <span class="t-body-md">${Render.t(r.labelKey)}</span>
            ${Render.icon.chevronRight()}
          </button>
        `).join("")}
      </div>

      <div class="padded-x">
        <button class="btn btn-danger-ghost" type="button">${Render.t("profile_delete_account_cta")}</button>
      </div>
    </div>
  `;

  const walletRow = container.querySelector("#wallet-row");
  if (walletRow) {
    walletRow.addEventListener("click", () => {
      location.hash = "#/wallet";
    });
  }

  // Bonus slot 1 is the invite-friends promo (see PROFILE_BONUS_ILLUSTRATIONS above) — tapping
  // its "Get Bonus" CTA navigates to #/invite. Keyed by bonus.slot (the 1-based column suffix
  // from content.bonus_N_*), not array index, so this stays correct even if bonus_1_title were
  // ever missing from the Sheet and collectBonuses() (js/sheets.js) shifted bonus 2 into index 0.
  const inviteBonusBtn = container.querySelector('[data-bonus-slot="1"] .btn-pill-outline');
  if (inviteBonusBtn) {
    inviteBonusBtn.addEventListener("click", () => {
      location.hash = "#/invite";
    });
  }
}

function bonusCardHtml(bonus, index) {
  const art = PROFILE_BONUS_ILLUSTRATIONS[index] || "";
  return `
    <div class="illustration-card" data-bonus-slot="${bonus.slot}">
      <div class="illustration-card__art" style="${art ? `background-image:url('${Render.esc(art)}');` : ""}"></div>
      <div class="illustration-card__body">
        <p class="t-body-sm illustration-card__title">${Render.esc(bonus.title)}</p>
        <button class="btn btn-pill-outline" type="button">${Render.esc(bonus.cta)} ${Render.icon.arrowRight()}</button>
      </div>
    </div>
  `;
}
