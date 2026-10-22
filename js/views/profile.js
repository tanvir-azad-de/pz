/* Profile tab — docs/05-screens-tabs.md */

function renderProfile(container, params, store) {
  const content = store.data.content;
  const bonuses = content.bonuses || [];

  const menuRows = [
    { label: "Help&Info" },
    { label: "Terms of Use" },
    { label: "Imprint" },
    { label: "Privacy" },
  ];

  container.innerHTML = `
    <div class="screen-stack">
      <div class="padded-x">
        <button class="menu-row" type="button" id="wallet-row" style="border-radius:var(--radius-lg);background:var(--color-surface);border-bottom:none;width:100%;">
          <span class="t-label-lg">Your Wallet</span>
          ${Render.icon.chevronRight()}
        </button>
      </div>

      <div class="padded-x flex-col gap-md">
        <h2 class="t-title-sm" style="margin:0;">Bonuses</h2>
        <div class="flex-col gap-md">
          ${bonuses.map(bonusCardHtml).join("")}
        </div>
      </div>

      <div class="flex-col">
        <div class="menu-row">
          <div class="flex-col gap-xs">
            <span class="t-body-md">Email</span>
            <span class="t-body-md menu-row__value">${Render.esc(content.email)}</span>
          </div>
        </div>
        ${menuRows.map((r) => `
          <button class="menu-row" type="button" style="width:100%;text-align:left;">
            <span class="t-body-md">${Render.esc(r.label)}</span>
            ${Render.icon.chevronRight()}
          </button>
        `).join("")}
      </div>

      <div class="padded-x">
        <button class="btn btn-danger-ghost" type="button">Delete account</button>
      </div>
    </div>
  `;

  const walletRow = container.querySelector("#wallet-row");
  if (walletRow) {
    walletRow.addEventListener("click", () => {
      location.hash = "#/wallet";
    });
  }
}

function bonusCardHtml(bonus) {
  return `
    <div class="illustration-card">
      <div class="illustration-card__art"></div>
      <div class="illustration-card__body">
        <p class="t-body-sm illustration-card__title">${Render.esc(bonus.title)}</p>
        <button class="btn btn-pill-outline" type="button">${Render.esc(bonus.cta)} ${Render.icon.arrowRight()}</button>
      </div>
    </div>
  `;
}
