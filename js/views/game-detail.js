/* Game Detail — docs/06-screens-detail.md */

function renderGameDetail(container, params, store) {
  const game = store.data.games.find((g) => g.id === params.id);

  if (!game) {
    container.innerHTML = `<div class="state-message"><p class="t-body-md">Game not found.</p></div>`;
    return;
  }

  const tasks = store.data.tasks.filter((t) => t.game_id === game.id);
  const total = Render.computedTotal(tasks);
  const isActive = (t) => String(t.is_active).trim().toUpperCase() === "TRUE";

  container.innerHTML = `
    <div class="screen-stack" style="padding-bottom: 140px;">
      <div class="padded-x">
        <div style="height:200px;border-radius:var(--radius-xl);background-image:url('${Render.esc(game.image_url)}');background-size:cover;background-position:center;background-color:var(--purple-700);"></div>
      </div>

      <div class="padded-x flex-col gap-sm" style="align-items:center;text-align:center;">
        <div style="width:92px;height:92px;border-radius:var(--radius-xl);background-image:url('${Render.esc(game.image_url)}');background-size:cover;background-position:center;background-color:var(--purple-700);"></div>
        <h1 class="t-title-sm" style="margin:0;">${Render.esc(game.name)}</h1>
      </div>

      <div class="padded-x flex-row gap-md">
        <div class="flex-col gap-xs" style="flex:1;align-items:center;text-align:center;">
          <span class="t-body-sm">total reward</span>
          <div class="flex-row gap-xs" style="justify-content:center;"><span class="t-title-sm">${Render.esc(game.total_reward)}</span></div>
        </div>
        <div style="width:1px;background:var(--purple-600);align-self:stretch;"></div>
        <div class="flex-col gap-xs" style="flex:1;align-items:center;text-align:center;">
          <span class="t-body-sm">max per task</span>
          <div class="flex-row gap-xs" style="justify-content:center;"><span class="t-title-sm">${Render.esc(game.max_per_task)}</span></div>
        </div>
      </div>

      <div class="padded-x">
        <div class="surface-card flex-col gap-md">
          <div class="flex-row gap-md" style="justify-content:space-between;">
            <div class="flex-col gap-xs" style="flex:1;">
              <span class="t-body-lg">Earn up to $50 cashback</span>
              <span class="t-body-md">Earn 50% cashback every time you make a purchase</span>
            </div>
            <div style="width:81px;height:57px;border-radius:8px;background:url('assets/icons/illus-cashback.png') center / cover;flex-shrink:0;"></div>
          </div>
          <button class="btn btn-pill-outline" type="button">How it works? ${Render.icon.arrowRight()}</button>
        </div>
      </div>

      <div class="padded-x">
        <div class="surface-card flex-col gap-md">
          <div class="flex-row gap-sm" style="justify-content:space-between;">
            <span class="t-body-lg">Tasks</span>
            <span class="badge badge--surface">${Render.esc(total)} total</span>
          </div>
          <p class="t-body-sm" style="margin:0;">Complete the tasks below and receive rewards for each of them.</p>
          <div class="flex-col gap-xs">
            ${tasks.map((t) => taskRowHtml(t, isActive(t))).join("")}
          </div>
        </div>
      </div>

      <div class="padded-x">
        <div class="surface-card flex-col gap-sm">
          <span class="t-body-md" style="font-weight:800;">Description</span>
          <p class="t-body-sm line-clamp-2" style="margin:0;" id="game-desc">${Render.esc(game.long_description)}</p>
          <button class="btn btn-ghost" type="button" id="see-more" style="align-self:flex-start;color:var(--purple-200);">...See More</button>
        </div>
      </div>
    </div>

    <div class="sticky-footer">
      <button class="btn btn-primary" type="button">Play Now</button>
    </div>
  `;

  const seeMore = container.querySelector("#see-more");
  const desc = container.querySelector("#game-desc");
  if (seeMore && desc) {
    seeMore.addEventListener("click", () => {
      desc.classList.remove("line-clamp-2");
      seeMore.remove();
    });
  }
}

function taskRowHtml(task, active) {
  return `
    <div class="surface-card flex-row gap-md" style="background:var(--color-bg);justify-content:space-between;">
      <div class="flex-col gap-xs">
        <span class="t-body-lg">${Render.esc(task.name)}</span>
        ${active ? `<span class="badge badge--success" style="align-self:flex-start;">Active task</span>` : ""}
      </div>
      <div class="flex-row gap-xs"><span class="t-title-sm">${Render.esc(task.amount)}</span></div>
    </div>
  `;
}
