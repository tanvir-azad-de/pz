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
  // The sheet ID currently loaded into `store`. Kept separate from parseHash()'s result so
  // hashFor() can build same-sheet navigation links even mid-render, before route() has
  // re-parsed the hash.
  let currentSheetId = null;

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

  // Extracts a plausible spreadsheet ID out of a pasted full Google Sheets URL
  // (https://docs.google.com/spreadsheets/d/<id>/edit#gid=0), so the hash accepts either a
  // bare ID or a URL copied straight out of the browser's address bar.
  function extractSheetId(raw) {
    const urlMatch = String(raw || "").match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{25,60})/);
    return urlMatch ? urlMatch[1] : raw;
  }

  // Hash shape is #/<sheetId>/<route>/<param> — the sheet ID is the app's only configuration,
  // read straight out of the URL (see docs/03-sheets-integration.md). There is no default
  // sheet and no master sheet anymore: a hash with no ID segment, or one that doesn't look
  // like a spreadsheet ID, resolves to sheetId:null / sheetId:"bad-value" respectively, and
  // boot() below turns that into a specific error screen rather than ever guessing a sheet.
  function parseHash() {
    const hash = (location.hash || "").replace(/^#\/?/, "");
    const segments = hash.split("/").filter((s) => s !== "");
    const rawId = segments[0];
    if (!rawId) return { sheetId: null, route: "discover", params: {} };

    const sheetId = extractSheetId(decodeURIComponent(rawId));
    const route = segments[1] || "discover";
    const id = segments[2];
    return { sheetId, route, params: { id } };
  }

  // Builds a same-sheet navigation hash, e.g. hashFor("game", "g1") -> "#/<sheetId>/game/g1".
  // Every in-app navigation (tab bar, back button, view CTAs) must go through this rather than
  // writing a bare "#/<route>" hash, so the active sheet ID survives every navigation,
  // reload, and share/bookmark.
  function hashFor(route, id) {
    return `#/${currentSheetId}/${route}${id !== undefined && id !== null ? "/" + id : ""}`;
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
        location.hash = hashFor(el.dataset.route);
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
        location.hash = hashFor("wallet");
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
          location.hash = hashFor(routeDef.parent);
        } else if (history.length > bootHistoryLength) {
          history.back();
        } else {
          location.hash = hashFor("discover");
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

  // Every load failure (no ID, bad ID, 404, private sheet, wrong schema, missing content
  // keys, network) renders here with a message specific to what's actually wrong, so whoever
  // is pointing the app at their own sheet (see docs/03-sheets-integration.md) knows exactly
  // what to fix instead of a generic "couldn't load data". There's no bundled fallback data to
  // degrade to anymore, so this screen — not a half-English/half-broken render — is what a
  // failure looks like.
  //
  // `retry` is omitted (no button) for failures a reload can't fix on its own (no ID / bad ID
  // / bad schema / missing keys) — those need the URL or the sheet edited first.
  function errorContentFor(err, rawSheetId) {
    if (!err) {
      return {
        title: "No spreadsheet specified",
        lines: ["Add a Google Sheet ID to the URL, e.g. #/<sheet-id>/discover."],
      };
    }
    if (err.code === "BAD_ID") {
      return {
        title: "That doesn't look like a Google Sheet ID",
        lines: [`Got: "${rawSheetId}"`, "Paste the spreadsheet's ID or its full edit URL after the #/."],
      };
    }
    if (err.code === "NOT_FOUND") {
      return {
        title: "Spreadsheet not found",
        lines: ["Check the ID, and that the sheet's sharing is set to \u201cAnyone with the link\u201d."],
      };
    }
    if (err.code === "NO_ACCESS") {
      return {
        title: "This spreadsheet isn't publicly readable",
        lines: ["Open Share \u2192 General access \u2192 set to \u201cAnyone with the link\u201d (Viewer)."],
      };
    }
    if (err.code === "BAD_SCHEMA") {
      const tab = err.detail && err.detail.tabName;
      const missing = (err.detail && err.detail.missing) || [];
      return {
        title: "This isn't a valid PlayZone spreadsheet",
        lines: [`Tab "${tab}" is missing column(s): ${missing.join(", ")}`, "See seed/ in the repo for the required tab layout."],
      };
    }
    if (err.code === "MISSING_KEYS") {
      const tab = err.detail && err.detail.tabName;
      const missing = (err.detail && err.detail.missing) || [];
      return {
        title: `Your "${tab}" tab is missing required rows`,
        lines: [`Missing key(s): ${missing.join(", ")}`, "Add a row for each in column A/B of that tab."],
      };
    }
    // NETWORK and anything unanticipated: the one case a plain retry can plausibly fix.
    return {
      title: "Couldn't load data",
      lines: ["Check your connection and try again."],
      retry: true,
    };
  }

  function renderErrorState(err, rawSheetId, onRetry) {
    const { title, lines, retry } = errorContentFor(err, rawSheetId);

    const tabBar = document.getElementById("tab-bar");
    if (tabBar) tabBar.style.display = "none";
    const navBar = document.getElementById("nav-bar");
    if (navBar) navBar.innerHTML = "";

    const view = document.getElementById("view");
    view.innerHTML = `
      <div class="state-message">
        <p class="t-body-lg">${Render.esc(title)}</p>
        ${lines.map((l) => `<p class="t-body-md">${Render.esc(l)}</p>`).join("")}
        ${retry ? `<button class="btn btn-small" type="button" id="retry-btn">Retry</button>` : ""}
      </div>
    `;
    if (retry) {
      document.getElementById("retry-btn").addEventListener("click", onRetry);
    }
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

  // Loads whichever sheet is currently in the hash and renders the app around it. Called at
  // boot, on Retry, and whenever hashchange() below detects the hash now points at a
  // DIFFERENT sheet ID than the one currently loaded (switching sheets is a full reload of
  // the data layer, not just a route change).
  async function loadSheet() {
    const { sheetId } = parseHash();
    const rawSheetId = sheetId;

    renderShell();
    renderSkeleton();
    bootHistoryLength = history.length;

    if (!sheetId) {
      store = null;
      currentSheetId = null;
      renderErrorState(null, rawSheetId, loadSheet);
      return;
    }

    try {
      store = await Sheets.load(sheetId);
      currentSheetId = sheetId;
      Render.initContent(store.data.content);
      Render.initCurrency(store.data);
      // settings.number_locale (e.g. "de-DE") drives <html lang>, so screen readers and
      // browser features (spellcheck, font selection) match the active locale sheet. Falls
      // back to "en" if the sheet predates this key (see Render.initCurrency's own fallback).
      const numberLocale = (store.data.settings && store.data.settings.number_locale) || "en-US";
      document.documentElement.lang = numberLocale.split("-")[0];
      renderTabBar();
      const tabBar = document.getElementById("tab-bar");
      if (tabBar) tabBar.style.display = "";
      route();
    } catch (err) {
      console.error(err);
      store = null;
      currentSheetId = null;
      renderErrorState(err, rawSheetId, loadSheet);
    }
  }

  function onHashChange() {
    const { sheetId } = parseHash();
    if (sheetId !== currentSheetId) {
      loadSheet();
    } else {
      route();
    }
  }

  let _wired = false;

  async function boot() {
    if (!_wired) {
      _wired = true;
      // Prevent the browser from re-applying a remembered window scroll offset
      // on reload/back-forward, which would fight the explicit reset in route().
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      // A deliberate scroll from the user always wins over the momentum-proof
      // reset in resetScrollToTop() above.
      window.addEventListener("touchstart", cancelScrollReset, { passive: true });
      window.addEventListener("wheel", cancelScrollReset, { passive: true });

      window.addEventListener("hashchange", onHashChange);
    }

    await loadSheet();
  }

  return { boot, hashFor };
})();

document.addEventListener("DOMContentLoaded", App.boot);
