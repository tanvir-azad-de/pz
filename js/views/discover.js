/* Discover tab — docs/05-screens-tabs.md */

function renderDiscover(container, params, store) {
  const { games } = store.data;
  const content = store.data.content;

  const trending = games[0];
  const all = games;

  container.innerHTML = `
    <div class="screen-stack">
      <div class="padded-x">
        <div class="illustration-card">
          <div class="illustration-card__art" style="background-image:url('assets/icons/illus-invite-card.png');"></div>
          <div class="illustration-card__body">
            <p class="t-body-sm illustration-card__title">${Render.esc(content.invite_card_discover_text)}</p>
            <button class="btn btn-pill-outline" type="button" id="get-bonus-btn">Get Bonus ${Render.icon.arrowRight()}</button>
          </div>
        </div>
      </div>

      <div class="flex-col gap-md">
        <h2 class="t-title-md padded-x" style="margin:0;">Trending Game</h2>
        <div class="padded-x">
          ${trending ? gameCardHtml(trending, store) : ""}
        </div>
      </div>

      <div class="flex-col gap-md">
        <div class="section-header">
          <h2 class="t-title-md" style="margin:0;">All Games</h2>
          <button class="btn btn-ghost" type="button">See All</button>
        </div>
        <div class="padded-x flex-col gap-md">
          ${all.map((g) => gameCardHtml(g, store)).join("")}
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-game-id]").forEach((el) => {
    el.addEventListener("click", () => {
      location.hash = `#/game/${el.dataset.gameId}`;
    });
  });

  const getBonusBtn = container.querySelector("#get-bonus-btn");
  if (getBonusBtn) {
    getBonusBtn.addEventListener("click", () => {
      location.hash = "#/invite";
    });
  }
}

function gameCardHtml(game, store) {
  const totalAmount = Render.computedTotalAmount(
    store.data.tasks.filter((t) => t.game_id === game.id)
  );
  const isTrue = (v) => String(v).trim().toUpperCase() === "TRUE";

  return `
    <button class="game-card" type="button" data-game-id="${Render.esc(game.id)}">
      <div class="game-card__art" style="background-image:linear-gradient(to top, #06071C 0%, rgba(6,7,28,0) 100%), url('${Render.esc(game.image_url)}')">
        <div>
          <p class="t-title-sm game-card__name" style="margin:0;">${Render.esc(game.name)}</p>
        </div>
        <div class="game-card__badges">
          ${isTrue(game.has_cashback) ? `<span class="badge badge--surface">${Render.icon.dollar()} Cashback</span>` : ""}
          ${isTrue(game.has_limited_bonus) ? `<span class="badge badge--surface">${Render.icon.stopwatch()} Limited Bonus</span>` : ""}
        </div>
      </div>
      <div class="game-card__footer">
        <div class="game-card__amount">
          <span class="t-title-sm" style="color:var(--color-primary);">$</span>
          <span class="t-title-sm">${Render.esc(totalAmount)}</span>
        </div>
        <span class="btn btn-play">Play</span>
      </div>
    </button>
  `;
}
