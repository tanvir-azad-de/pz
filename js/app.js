/* App shell: hash router, tab bar, nav bar. See docs/02-architecture.md. */

const App = (() => {
  const TAB_ROUTES = ["discover", "my-games", "rewards", "profile"];

  const TABS_CONFIG = [
    { key: "discover", labelKey: "tab_label_discover", icon: Render.icon.tabDiscover },
    { key: "my-games", labelKey: "tab_label_my_games", icon: Render.icon.tabMyGames },
    { key: "rewards", labelKey: "tab_label_rewards", icon: Render.icon.tabRewards },
    { key: "profile", labelKey: "tab_label_profile", icon: Render.icon.tabProfile },
  ];

  const ROUTES = {
    discover: { titleKey: "nav_title_discover", render: renderDiscover, tab: true },
    "my-games": { titleKey: "nav_title_my_games", render: renderMyGames, tab: true },
    rewards: { titleKey: "nav_title_rewards", render: renderRewards, tab: true },
    profile: { titleKey: "nav_title_profile", render: renderProfile, tab: true },
    game: { titleKey: null, render: renderGameDetail, tab: false, overlayNav: true, parent: "discover", titleFrom: (p, store) => {
      const g = store.data.games.find((x) => x.id === p.id);
      return g ? g.name : Render.t("nav_title_game_fallback");
    } },
    reward: { titleKey: null, render: renderRewardDetail, tab: false, parent: "rewards", titleFrom: (p, store) => {
      const r = store.data.rewards.find((x) => x.id === p.id);
      return r ? r.brand : Render.t("nav_title_reward_fallback");
    } },
    wallet: { titleKey: "nav_title_wallet", render: renderWallet, tab: false, parent: "profile" },
    // No declared parent: #/invite is reached from both Discover's "Get Bonus" CTA and
    // Profile's bonus CTA, so there's no single correct "up" target — the back handler
    // below falls through to history.back() for this route specifically.
    invite: { titleKey: "nav_title_invite", render: renderInvite, tab: false, overlayNav: true },
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

  // --- Overlay nav bar (full-bleed hero screens: Game Detail, Invite) ----
  // The overlay variant is `position: fixed` + transparent so #view can start
  // at viewport y:0 and a route's hero image/gradient can sit visibly behind it
  // (see .game-hero / .invite-hero / .nav-bar--overlay in components.css). We
  // fade in an opaque backdrop once that element has scrolled past, so text
  // stays legible over whatever content follows.
  //
  // The threshold is measured off the [data-nav-backdrop] element rather than
  // hardcoded, because Invite's gradient has no fixed height (min-height: 360px
  // + content-driven growth as the title/subtitle wrap), so no constant can be
  // correct for both routes.
  let navScrollHandler = null;
  let pendingNavOverlayEl = null;

  function teardownNavOverlay() {
    pendingNavOverlayEl = null;
    if (navScrollHandler) {
      window.removeEventListener("scroll", navScrollHandler);
      navScrollHandler = null;
    }
  }

  function setupNavOverlay(navEl) {
    // Cached once: setup runs after the view has rendered (see route()), so the
    // current screen's backdrop element is already in the DOM. The listener is
    // torn down on every navigation, so this never outlives its element.
    const backdrop = document.querySelector("[data-nav-backdrop]");

    const apply = () => {
      const scrolledPast = backdrop
        ? backdrop.getBoundingClientRect().bottom <= navEl.offsetHeight
        : false;
      navEl.classList.toggle("is-scrolled", scrolledPast);
    };

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

  // Tab bar labels come from the content tab, so they can't paint until Sheets.load()
  // resolves (see boot()). Rendered twice: once during the loading skeleton with a
  // non-breaking-space placeholder in place of the label (preserving the 12px label line box
  // from .tab-bar__label in css/components.css, so icons don't shift when real labels arrive),
  // then again after boot() has called Render.initContent().
  function renderTabBar() {
    const tabBar = document.getElementById("tab-bar");
    tabBar.innerHTML = TABS_CONFIG.map((t) => `
      <button class="tab-bar__item" type="button" data-route="${t.key}">
        ${t.icon()}
        <span class="tab-bar__label">${store ? Render.t(t.labelKey) : "&nbsp;"}</span>
      </button>
    `).join("");

    tabBar.querySelectorAll("[data-route]").forEach((el) => {
      el.addEventListener("click", () => {
        location.hash = `#/${el.dataset.route}`;
      });
    });
  }

  // Splits the balance into its symbol + number so the symbol can keep its --color-primary
  // tint (per the design) without the app hardcoding what that symbol is or which side it's
  // on — it comes straight from the sheet-formatted settings.balance string (e.g. "$2.30" or
  // "2,30€").
  function walletBalanceHtml(balance) {
    const { symbol, rest, position } = Render.splitAmount(balance);
    const symbolHtml = `<span style="color:var(--color-primary);">${Render.esc(symbol)}</span>`;
    return position === "suffix" ? `${Render.esc(rest)}${symbolHtml}` : `${symbolHtml}${Render.esc(rest)}`;
  }

  function renderNavBar(routeKey, routeDef, params) {
    teardownNavOverlay();

    const navBar = document.getElementById("nav-bar");
    const isTab = routeDef.tab;
    const title = routeDef.titleKey ? Render.tRaw(routeDef.titleKey) : (routeDef.titleFrom ? routeDef.titleFrom(params, store) : "");
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
      // Deferred to route(), after the view has rendered: the
      // [data-nav-backdrop] element the listener measures doesn't exist yet.
      pendingNavOverlayEl = navBar.querySelector(".nav-bar");
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

    // Overlay nav listener is attached here, not in renderNavBar, because it
    // measures the view's [data-nav-backdrop] element, which only exists now.
    if (pendingNavOverlayEl) {
      const navEl = pendingNavOverlayEl;
      pendingNavOverlayEl = null;
      setupNavOverlay(navEl);
    }

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
      Render.initContent(store.data.content, store.data.fallbackContent);
      Render.initCurrency(store.data);
      // settings.number_locale (e.g. "de-DE") drives <html lang>, so screen readers and
      // browser features (spellcheck, font selection) match the active locale sheet. Falls
      // back to "en" if the sheet predates this key (see Render.initCurrency's own fallback).
      const numberLocale = (store.data.settings && store.data.settings.number_locale) || "en-US";
      document.documentElement.lang = numberLocale.split("-")[0];
      if (store.failedTabs && store.failedTabs.length) {
        console.warn("Using fallback data for tabs:", store.failedTabs.join(", "));
      }
      renderTabBar();
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
