/* My Games tab — docs/05-screens-tabs.md.
   Intentionally empty per product decision: the tab no longer lists any games. */

function renderMyGames(container) {
  container.innerHTML = `
    <div class="screen-stack">
      <div class="state-message">
        <p class="t-body-lg">${Render.t("my_games_empty_title")}</p>
        <p class="t-body-md">${Render.t("my_games_empty_body")}</p>
      </div>
    </div>
  `;
}
