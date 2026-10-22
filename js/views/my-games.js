/* My Games tab — docs/05-screens-tabs.md.
   Intentionally empty per product decision: the tab no longer lists any games. */

function renderMyGames(container) {
  container.innerHTML = `
    <div class="screen-stack">
      <div class="state-message">
        <p class="t-body-lg">No games yet</p>
        <p class="t-body-md">Games you start playing will appear here.</p>
      </div>
    </div>
  `;
}
