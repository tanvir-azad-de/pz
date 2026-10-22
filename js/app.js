/* App shell: hash router, tab bar, nav bar. See docs/02-architecture.md. */

const App = (() => {
  const TAB_ROUTES = ["discover", "my-games", "rewards", "profile"];

  const TABS_CONFIG = [
    { key: "discover", label: "Discover", icon: Render.icon.tabDiscover },
    { key: "my-games", label: "My Games", icon: Render.icon.tabMyGames },
    { key: "rewards", label: "Rewards", icon: Render.icon.tabRewards },
    { key: "profile", label: "Profile", icon: Render.icon.tabProfile },
  ];

  const ROUTES = {
    discover: { title: "Discover", render: renderDiscover, tab: true },
    "my-games": { title: "My Games", render: renderMyGames, tab: true },
    rewards: { title: "Rewards", render: renderRewards, tab: true },
    profile: { title: "Profile", render: renderProfile, tab: true },
    game: { title: null, render: renderGameDetail, tab: false, titleFrom: (p, store) => {
      const g = store.data.games.find((x) => x.id === p.id);
      return g ? g.name : "Game";
    } },
    reward: { title: null, render: renderRewardDetail, tab: false, titleFrom: (p, store) => {
      const r = store.data.rewards.find((x) => x.id === p.id);
      return r ? r.brand : "Reward";
    } },
    wallet: { title: "Wallet", render: renderWallet, tab: false },
    invite: { title: "Invite Friends", render: renderInvite, tab: false },
  };

  let store = null;

  // Baseline history.length captured at boot. Used by the back-arrow handler below to decide
  // between history.back() (return to wherever the user actually came from, e.g. Profile when
  // they tapped a bonus CTA into #/invite) and a hard fallback to #/discover (when there's no
  // in-app history to go back to, e.g. a cold load straight to a detail URL via bookmark/share).
  let bootHistoryLength = 0;

  function parseHash() {
    const hash = (location.hash || "#/discover").replace(/^#\//, "");
    const [route, id] = hash.split("/");
    return { route: route || "discover", params: { id } };
  }

  function renderShell() {
    const appEl = document.getElementById("app");
    appEl.innerHTML = `
      <div id="nav-bar"></div>
      <main id="view"></main>
      <nav id="tab-bar" class="tab-bar"></nav>
    `;
    renderTabBar();
  }

  function renderTabBar() {
    const tabBar = document.getElementById("tab-bar");
    tabBar.innerHTML = TABS_CONFIG.map((t) => `
      <button class="tab-bar__item" type="button" data-route="${t.key}">
        ${t.icon()}
        <span class="tab-bar__label">${t.label}</span>
      </button>
    `).join("");

    tabBar.querySelectorAll("[data-route]").forEach((el) => {
      el.addEventListener("click", () => {
        location.hash = `#/${el.dataset.route}`;
      });
    });
  }

  function renderNavBar(routeKey, routeDef, params) {
    const navBar = document.getElementById("nav-bar");
    const isTab = routeDef.tab;
    const title = routeDef.title || (routeDef.titleFrom ? routeDef.titleFrom(params, store) : "");
    const balance = store && store.data.settings ? store.data.settings.balance : "0.00";

    navBar.innerHTML = `
      <div class="nav-bar">
        <div class="nav-bar__left">
          ${isTab ? "" : `<button class="nav-bar__back" type="button" id="back-btn">${Render.icon.back()}</button>`}
          <span class="t-title-sm nav-bar__title">${Render.esc(title)}</span>
        </div>
        <div class="wallet-pill">
          <span class="t-label-lg" style="font-size:18px;"><span style="color:var(--color-primary);">$</span> ${Render.esc(balance)}</span>
        </div>
      </div>
    `;

    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (history.length > bootHistoryLength) {
          history.back();
        } else {
          location.hash = "#/discover";
        }
      });
    }
  }

  function updateTabBarActive(routeKey) {
    const tabBar = document.getElementById("tab-bar");
    tabBar.style.display = TAB_ROUTES.includes(routeKey) ? "" : "none";
    tabBar.querySelectorAll("[data-route]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.route === routeKey);
    });
  }

  function renderSkeleton() {
    const view = document.getElementById("view");
    view.innerHTML = `
      <div class="screen-stack">
        <div class="padded-x">${Render.skeletonBlock(89)}</div>
        <div class="padded-x">${Render.skeletonBlock(24, "")}</div>
        <div class="padded-x">${Render.skeletonBlock(261)}</div>
        <div class="padded-x">${Render.skeletonBlock(261)}</div>
      </div>
    `;
  }

  function renderErrorState(onRetry) {
    const view = document.getElementById("view");
    view.innerHTML = `
      <div class="state-message">
        <p class="t-body-lg">Couldn't load data</p>
        <p class="t-body-md">Check your connection and try again.</p>
        <button class="btn btn-small" type="button" id="retry-btn">Retry</button>
      </div>
    `;
    document.getElementById("retry-btn").addEventListener("click", onRetry);
  }

  function route() {
    const { route: routeKey, params } = parseHash();
    const routeDef = ROUTES[routeKey] || ROUTES.discover;
    const resolvedKey = ROUTES[routeKey] ? routeKey : "discover";

    updateTabBarActive(resolvedKey);
    renderNavBar(resolvedKey, routeDef, params);

    const view = document.getElementById("view");
    view.scrollTop = 0;
    view.innerHTML = "";
    routeDef.render(view, params, store);
  }

  async function boot() {
    renderShell();
    renderSkeleton();
    bootHistoryLength = history.length;

    try {
      store = await Sheets.load();
      if (store.failedTabs && store.failedTabs.length) {
        console.warn("Using fallback data for tabs:", store.failedTabs.join(", "));
      }
      route();
      window.addEventListener("hashchange", route);
    } catch (err) {
      console.error(err);
      renderErrorState(boot);
    }
  }

  return { boot };
})();

document.addEventListener("DOMContentLoaded", App.boot);
