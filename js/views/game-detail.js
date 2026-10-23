/* Game Detail — docs/06-screens-detail.md */

function renderGameDetail(container, params, store) {
  const game = store.data.games.find((g) => g.id === params.id);

  if (!game) {
    container.innerHTML = `<div class="state-message"><p class="t-body-md">${Render.t("game_detail_not_found")}</p></div>`;
    return;
  }

  const tasks = store.data.tasks.filter((t) => t.game_id === game.id);
  const total = Render.computedTotal(tasks);
  const isActive = (t) => Render.boolTrue(t.is_active);

  container.innerHTML = `
    <div class="screen-stack game-detail-stack" style="padding-bottom: 140px; ">
      <div class="game-hero" data-nav-backdrop style="background-image:linear-gradient(to top, var(--color-bg) 0%, rgba(6,7,28,0.1) 100%), url('${Render.esc(game.image_url)}');"></div>

      <div class="game-hero__below padded-x flex-col gap-sm" style="align-items:center;text-align:center;">
        <div style="width:92px;height:92px;border-radius:var(--radius-xl);background-image:url('${Render.esc(game.image_url)}');background-size:cover;background-position:center;background-color:var(--purple-700);"></div>
        <h1 class="t-title-sm" style="margin:0;">${Render.esc(game.name)}</h1>
      </div>

      <div class="padded-x flex-row gap-md">
        <div class="flex-col gap-xs" style="flex:1;align-items:center;text-align:center;">
          <span class="t-body-sm">${Render.t("game_detail_total_reward_label")}</span>
          <div class="flex-row gap-xs" style="justify-content:center;"><span class="t-title-sm">${Render.esc(game.total_reward)}</span></div>
        </div>
        <div style="width:1px;background:var(--purple-600);align-self:stretch;"></div>
        <div class="flex-col gap-xs" style="flex:1;align-items:center;text-align:center;">
          <span class="t-body-sm">${Render.t("game_detail_max_per_task_label")}</span>
          <div class="flex-row gap-xs" style="justify-content:center;"><span class="t-title-sm">${Render.esc(game.max_per_task)}</span></div>
        </div>
      </div>

      <div class="padded-x">
        <div class="surface-card flex-col gap-md">
          <div class="flex-row gap-md" style="justify-content:space-between;">
            <div class="flex-col gap-xs" style="flex:1;">
              <span class="t-body-lg">${Render.t("game_detail_cashback_title")}</span>
              <span class="t-body-md">${Render.t("game_detail_cashback_subtitle")}</span>
            </div>
            <div style="width:81px;height:57px;border-radius:8px;background:url('assets/icons/illus-cashback.png') center / cover;flex-shrink:0;"></div>
          </div>
          <button class="btn btn-pill-outline" type="button">${Render.t("game_detail_cashback_cta")} ${Render.icon.arrowRight()}</button>
        </div>
      </div>

      <div class="padded-x">
        <div class="surface-card flex-col gap-md">
          <div class="flex-row gap-sm" style="justify-content:space-between;">
            <span class="t-body-lg">${Render.t("game_detail_tasks_title")}</span>
            <span class="badge badge--surface">${Render.esc(total)} ${Render.t("game_detail_tasks_total_suffix")}</span>
          </div>
          <p class="t-body-sm" style="margin:0;">${Render.t("game_detail_tasks_subtitle")}</p>
          <div class="flex-col gap-xs">
            ${tasks.map((t) => taskRowHtml(t, isActive(t))).join("")}
          </div>
        </div>
      </div>

      <div class="padded-x">
        <div class="surface-card flex-col gap-sm">
          <span class="t-body-md" style="font-weight:800;">${Render.t("game_detail_description_title")}</span>
          <p class="t-body-sm line-clamp-2" style="margin:0;" id="game-desc">${Render.esc(game.long_description)}</p>
          <button class="btn btn-ghost" type="button" id="see-more" style="align-self:flex-start;color:var(--purple-200);">${Render.t("game_detail_see_more_cta")}</button>
        </div>
      </div>
    </div>

    <div class="sticky-footer">
      <button class="btn btn-primary" type="button">${Render.t("game_detail_play_cta")}</button>
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
        ${active ? `<span class="badge badge--success" style="align-self:flex-start;">${Render.t("game_detail_task_active_badge")}</span>` : ""}
      </div>
      <div class="flex-row gap-xs"><span class="t-title-sm">${Render.esc(task.amount)}</span></div>
    </div>
  `;
}
