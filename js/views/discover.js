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
          <div class="illustration-card__art"></div>
          <div class="illustration-card__body">
            <p class="t-body-sm illustration-card__title">${Render.esc(content.invite_card_discover_text)}</p>
            <button class="btn btn-pill-outline" type="button">Get Bonus ${Render.icon.arrowRight()}</button>
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
}

function gameCardHtml(game, store) {
  const total = Render.computedTotal(
    store.data.tasks.filter((t) => t.game_id === game.id)
  );
  const isTrue = (v) => String(v).trim().toUpperCase() === "TRUE";

  return `
    <button class="game-card" type="button" data-game-id="${Render.esc(game.id)}">
      <div class="game-card__art" style="background-image:url('${Render.esc(game.image_url)}')">
        <div>
          <p class="t-title-sm game-card__name" style="margin:0;">${Render.esc(game.name)}</p>
          <p class="t-body-sm game-card__desc line-clamp-1" style="margin:0;">${Render.esc(game.description)}</p>
        </div>
        <div class="game-card__badges">
          ${isTrue(game.has_cashback) ? `<span class="badge badge--surface">${Render.icon.dollar()} Cashback</span>` : ""}
          ${isTrue(game.has_limited_bonus) ? `<span class="badge badge--surface">${Render.icon.stopwatch()} Limited Bonus</span>` : ""}
        </div>
      </div>
      <div class="game-card__footer">
        <div class="game-card__amount">
          ${Render.icon.coin()}
          <span class="t-title-sm">${Render.esc(total)}</span>
        </div>
        <span class="btn btn-small">Play</span>
      </div>
    </button>
  `;
}
