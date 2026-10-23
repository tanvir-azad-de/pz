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
    game: { title: null, render: renderGameDetail, tab: false, overlayNav: true, parent: "discover", titleFrom: (p, store) => {
      const g = store.data.games.find((x) => x.id === p.id);
      return g ? g.name : "Game";
    } },
    reward: { title: null, render: renderRewardDetail, tab: false, parent: "rewards", titleFrom: (p, store) => {
      const r = store.data.rewards.find((x) => x.id === p.id);
      return r ? r.brand : "Reward";
    } },
    wallet: { title: "Wallet", render: renderWallet, tab: false, parent: "profile" },
    // No declared parent: #/invite is reached from both Discover's "Get Bonus" CTA and
    // Profile's bonus CTA, so there's no single correct "up" target — the back handler
    // below falls through to history.back() for this route specifically.
    invite: { title: "Invite Friends", render: renderInvite, tab: false },
  };

  let store = null;

  // --- Momentum-proof scroll reset ---------------------------------------
  // A touch fling keeps emitting compositor scroll deltas for ~100-300ms
  // AFTER the tap that triggers navigation. A single `window.scrollTo(0, 0)`
  // in route() gets overwritten a few frames later by that residual
  // momentum, so the new screen opens mid-page instead of at the top. To fix
  // this we re-assert scrollTo(0, 0) on every animation frame for a short
  // window, and abort immediately if the user starts a genuine new scroll
  // gesture so we never fight a deliberate scroll.
  let scrollResetRaf = null;
  let scrollResetUntil = 0;

  function resetScrollToTop() {
    scrollResetUntil = performance.now() + 300;
    if (scrollResetRaf !== null) return;

    const tick = () => {
      window.scrollTo(0, 0);
      if (performance.now() < scrollResetUntil) {
        scrollResetRaf = requestAnimationFrame(tick);
      } else {
        scrollResetRaf = null;
      }
    };
    scrollResetRaf = requestAnimationFrame(tick);
  }

  function cancelScrollReset() {
    scrollResetUntil = 0;
    if (scrollResetRaf !== null) {
      cancelAnimationFrame(scrollResetRaf);
      scrollResetRaf = null;
    }
  }

  // Baseline history.length captured at boot. Only used by the back-arrow handler below for
  // routes with no declared `parent` (currently just #/invite, reachable from both Profile
  // and Discover — see ROUTES above) to decide between history.back() (return to wherever the
  // user actually came from) and a hard fallback to #/discover (when there's no in-app history
  // to go back to, e.g. a cold load straight to #/invite via bookmark/share). Routes WITH a
  // declared `parent` ignore this entirely and always go to that parent.
  let bootHistoryLength = 0;

  // --- Overlay nav bar (full-bleed hero screens, e.g. Game Detail) -------
  // The overlay variant is `position: fixed` + transparent so #view can start
  // at viewport y:0 and a route's hero image can sit visibly behind it (see
  // .game-hero / .nav-bar--overlay in components.css). We fade in an opaque
  // backdrop once the hero has scrolled past, so text stays legible over
  // whatever content follows.
  const NAV_OVERLAY_THRESHOLD = 211; // hero height (279) - nav height (68)
  let navScrollHandler = null;

  function teardownNavOverlay() {
    if (navScrollHandler) {
      window.removeEventListener("scroll", navScrollHandler);
      navScrollHandler = null;
    }
  }

  function setupNavOverlay(navEl) {
    const apply = () => navEl.classList.toggle("is-scrolled", window.scrollY > NAV_OVERLAY_THRESHOLD);
    apply();
    navScrollHandler = apply;
    window.addEventListener("scroll", navScrollHandler, { passive: true });
  }

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

  // Splits the balance into its symbol + number so the symbol can keep its --color-primary
  // tint (per the design) without the app hardcoding what that symbol is — it comes straight
  // from the sheet-formatted settings.balance string (e.g. "$2.30").
  function walletBalanceHtml(balance) {
    const { symbol, rest } = Render.splitAmount(balance);
    return `<span style="color:var(--color-primary);">${Render.esc(symbol)}</span>${Render.esc(rest)}`;
  }

  function renderNavBar(routeKey, routeDef, params) {
    teardownNavOverlay();

    const navBar = document.getElementById("nav-bar");
    const isTab = routeDef.tab;
    const title = routeDef.title || (routeDef.titleFrom ? routeDef.titleFrom(params, store) : "");
    const balance = store && store.data.settings ? store.data.settings.balance : "";

    navBar.innerHTML = `
      <div class="nav-bar${routeDef.overlayNav ? " nav-bar--overlay" : ""}">
        <div class="nav-bar__left">
          ${isTab ? "" : `<button class="nav-bar__back" type="button" id="back-btn">${Render.icon.back()}</button>`}
          <span class="t-title-sm nav-bar__title">${Render.esc(title)}</span>
        </div>
        <button class="wallet-pill" type="button" id="wallet-pill-btn">
          <span class="t-label-lg" style="font-size:18px;">${walletBalanceHtml(balance)}</span>
        </button>
      </div>
    `;

    if (routeDef.overlayNav) {
      setupNavOverlay(navBar.querySelector(".nav-bar"));
    }

    const walletPillBtn = document.getElementById("wallet-pill-btn");
    if (walletPillBtn) {
      walletPillBtn.addEventListener("click", () => {
        location.hash = "#/wallet";
      });
    }

    const backBtn = document.getElementById("back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        // The nav-bar arrow is an "up" affordance, not browser-back: it goes to the
        // route's declared logical parent regardless of how the user actually got here
        // (fixes cold-load/reload on a detail URL landing on #/discover instead of the
        // real parent, e.g. #/reward/:id -> #/rewards). Routes with no declared parent
        // (#/invite, reachable from both Profile and Discover) keep the older
        // history-first behavior, since neither entry point is the single correct parent.
        if (routeDef.parent) {
          location.hash = `#/${routeDef.parent}`;
        } else if (history.length > bootHistoryLength) {
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
    view.innerHTML = "";
    routeDef.render(view, params, store);

    // #view is not a scroll container (css/base.css — #app is min-height: 100dvh
    // and #view has no bounded height/overflow-y), so `view.scrollTop = 0` is a
    // no-op; the window is the real scroller. Reset AFTER render so the new
    // content's height already exists and the browser can't clamp/anchor us
    // back to a stale offset. The reset is held across several frames (see
    // resetScrollToTop above) to survive residual fling momentum from the tap
    // that triggered this navigation.
    resetScrollToTop();
  }

  async function boot() {
    // Prevent the browser from re-applying a remembered window scroll offset
    // on reload/back-forward, which would fight the explicit reset in route().
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // A deliberate scroll from the user always wins over the momentum-proof
    // reset in resetScrollToTop() above.
    window.addEventListener("touchstart", cancelScrollReset, { passive: true });
    window.addEventListener("wheel", cancelScrollReset, { passive: true });

    renderShell();
    renderSkeleton();
    bootHistoryLength = history.length;

    try {
      store = await Sheets.load();
      Render.initCurrency(store.data);
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
