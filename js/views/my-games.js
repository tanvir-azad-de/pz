/* My Games tab — identical data/card to Discover, 2-column grid. docs/05-screens-tabs.md */

function renderMyGames(container, params, store) {
  const { games } = store.data;

  container.innerHTML = `
    <div class="screen-stack">
      <h2 class="t-title-md padded-x" style="margin:0;">My Games</h2>
      <div class="my-games__grid">
        ${games.map((g) => gameCardHtml(g, store)).join("")}
      </div>
    </div>
  `;

  container.querySelectorAll("[data-game-id]").forEach((el) => {
    el.addEventListener("click", () => {
      location.hash = `#/game/${el.dataset.gameId}`;
    });
  });
}
