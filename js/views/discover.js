/* Discover tab — docs/05-screens-tabs.md */

function renderDiscover(container, params, store) {
  const { games } = store.data;
  const content = store.data.content;

  const trending = games[0];
  const all = games.slice(1);

  container.innerHTML = `
    <div class="screen-stack">
      <div class="padded-x">
        <div class="illustration-card">
          <div class="illustration-card__art" style="background-image:url('assets/icons/illus-invite-card.png');"></div>
          <div class="illustration-card__body">
            <p class="t-body-sm illustration-card__title">${Render.esc(content.invite_card_discover_text)}</p>
            <button class="btn btn-pill-outline" type="button" id="get-bonus-btn">${Render.t("discover_invite_cta")} ${Render.icon.arrowRight()}</button>
          </div>
        </div>
      </div>

      <div class="flex-col gap-md">
        <h2 class="t-title-md padded-x" style="margin:0;">${Render.t("discover_trending_title")}</h2>
        <div class="padded-x">
          ${trending ? gameCardHtml(trending) : ""}
        </div>
      </div>

      <div class="flex-col gap-md">
        <div class="section-header">
          <h2 class="t-title-md" style="margin:0;">${Render.t("discover_all_games_title")}</h2>
          <button class="btn btn-ghost" type="button">${Render.t("common_see_all")}</button>
        </div>
        <div class="padded-x flex-col gap-md">
          ${all.map((g) => gameCardHtml(g)).join("")}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-game-id]").forEach((el) => {
    el.addEventListener("click", () => {
      location.hash = App.hashFor("game", el.dataset.gameId);
    });
  });

  const getBonusBtn = container.querySelector("#get-bonus-btn");
  if (getBonusBtn) {
    getBonusBtn.addEventListener("click", () => {
      location.hash = App.hashFor("invite");
    });
  }
}

// Card footer shows games.total_reward verbatim (sheet-formatted, e.g. "$1000.00" or
// "1000,00€") — NOT a computed sum of that game's tasks. Those two numbers are intentionally
// different: total_reward is the game's overall promo figure, while the per-task amounts
// (summed on Game Detail's "Tasks ... total" badge via Render.computedTotal()) are what the
// player actually earns per task. Splitting the symbol out (Render.splitAmount) keeps the
// green-symbol/white-number treatment without the app hardcoding what that symbol is or
// which side of the number it sits on.
function gameCardHtml(game) {
  const { symbol, rest, position } = Render.splitAmount(game.total_reward);
  const symbolHtml = `<span class="t-title-sm" style="color:var(--color-primary);">${Render.esc(symbol)}</span>`;
  const restHtml = `<span class="t-title-sm">${Render.esc(rest)}</span>`;

  return `
    <button class="game-card" type="button" data-game-id="${Render.esc(game.id)}">
      <div class="game-card__art" style="background-image:linear-gradient(to top, #06071C 0%, rgba(6,7,28,0) 100%), url('${Render.esc(game.image_url)}')">
        <div>
          <p class="t-title-sm game-card__name" style="margin:0;">${Render.esc(game.name)}</p>
        </div>
        <div class="game-card__badges">
          ${Render.boolTrue(game.has_cashback) ? `<span class="badge badge--surface">${Render.icon.dollar()} ${Render.t("game_card_badge_cashback")}</span>` : ""}
          ${Render.boolTrue(game.has_limited_bonus) ? `<span class="badge badge--surface">${Render.icon.stopwatch()} ${Render.t("game_card_badge_limited_bonus")}</span>` : ""}
        </div>
      </div>
      <div class="game-card__footer">
        <div class="game-card__amount">
          ${position === "suffix" ? restHtml + symbolHtml : symbolHtml + restHtml}
        </div>
        <span class="btn btn-play">${Render.t("game_card_play_cta")}</span>
      </div>
    </button>
  `;
}
