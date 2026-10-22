/* Shared render helpers: HTML escaping, small template utilities, inline icon SVGs,
   and skeleton placeholder generators. No framework — plain template strings + innerHTML,
   matching the "no build step" architecture decision (docs/02-architecture.md). */

const Render = (() => {
  function esc(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function computedTotal(tasks) {
    const sum = tasks.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return `$ ${sum}`;
  }

  // Secondary currency figure shown next to a reward's headline amount (payout card +
  // Reward Detail). Replaces the deprecated decorative "points" number now that the app is
  // real-currency-only: amount x progress_pct, e.g. "$5" at 35% -> "$ 1.75". Deterministic
  // per reward so the card and its detail screen always agree. Returns "" when amount isn't
  // numeric (the rewards.amount column allows placeholder junk like "xxx" per
  // docs/01-data-model.md) rather than rendering "$ NaN".
  function progressAmount(reward) {
    const amt = parseFloat(String(reward.amount).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amt)) return "";
    const pct = Math.max(0, Math.min(100, Number(reward.progress_pct) || 0));
    return `$ ${((amt * pct) / 100).toFixed(2)}`;
  }

  function skeletonBlock(height, extraClass) {
    return `<div class="skeleton ${extraClass || ""}" style="height:${height}px"></div>`;
  }

  // ---- Icon set ----
  // Monochrome icons are real SVG files in assets/icons/, rendered as a CSS mask so they
  // inherit `currentColor` from their rendering context (e.g. green inside a primary pill
  // button, white in a menu row, tinted by the tab bar's active/inactive state) — one file
  // works everywhere instead of needing per-context color variants.
  //
  // NOTE: CSS mask has no onerror equivalent, so a missing/renamed file in ICON_MASK fails
  // silently (icon renders as empty space, not a broken-image glyph). Keep filenames in sync
  // with assets/icons/.
  const ICON_MASK = {
    back: { file: "back.svg", size: 24 },
    chevronRight: { file: "chevron-right.svg", size: 20 },
    arrowRight: { file: "arrow-right.svg", size: 20 },
    info: { file: "info.svg", size: 16 },
    copy: { file: "copy.svg", size: 20 },
    wallet: { file: "wallet.svg", size: 24 },
    tabDiscover: { file: "tab-discover.svg", size: 24 },
    tabMyGames: { file: "tab-mygames.svg", size: 24 },
    tabRewards: { file: "tab-rewards.svg", size: 24 },
    tabProfile: { file: "tab-profile.svg", size: 24 },
  };

  // Multi-color icons can't be CSS-masked (mask flattens every fill to one color), so these
  // render as <img> and keep their own baked-in colors. onerror restores the inline SVG below
  // so a missing/renamed file degrades to the placeholder instead of a broken-image icon.
  const ICON_IMG = {
    dollar: { file: "badge-cashback.svg", size: 20 },
    stopwatch: { file: "badge-limited-bonus.svg", size: 20 },
  };

  // Inline fallbacks — used by ICON_IMG entries on load failure, and for any icon key not yet
  // backed by a real file.
  const ICON_FALLBACK = {
    dollar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#07E562"/><text x="12" y="16" font-size="12" text-anchor="middle" fill="#064420" font-family="sans-serif" font-weight="bold">$</text></svg>`,
    stopwatch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="13" r="8" fill="#FF9719"/><rect x="10" y="2" width="4" height="3" rx="1" fill="#FF9900"/><path d="M12 9v4l3 2" stroke="#FFF4E0" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };

  // Called from the onerror="" attribute on ICON_IMG <img> tags (see note above) — must stay
  // reachable as Render._iconImgFallback since it's invoked from markup, not JS call sites.
  function _iconImgFallback(imgEl, key) {
    imgEl.outerHTML = ICON_FALLBACK[key] || "";
  }

  function maskIcon(key) {
    const def = ICON_MASK[key];
    return `<span class="icon" style="--icon-src:url('assets/icons/${def.file}');width:${def.size}px;height:${def.size}px"></span>`;
  }

  function imgIcon(key) {
    const def = ICON_IMG[key];
    return `<img class="icon" width="${def.size}" height="${def.size}" src="assets/icons/${def.file}" alt="" onerror="Render._iconImgFallback(this,'${key}')" />`;
  }

  const icon = {};
  Object.keys(ICON_MASK).forEach((key) => {
    icon[key] = () => maskIcon(key);
  });
  Object.keys(ICON_IMG).forEach((key) => {
    icon[key] = () => imgIcon(key);
  });

  // Generic brand logo placeholder: colored circle + first letter, swappable for real SVGs.
  function brandLogo(brand, size) {
    const s = size || 36;
    const letter = esc((brand || "?").trim().charAt(0).toUpperCase());
    const colors = {
      PayPal: "#003087",
      Amazon: "#FF9900",
      "Google Play": "#34A853",
      Apple: "#A3AAAE",
    };
    const bg = colors[brand] || "var(--purple-400)";
    return `<div class="brand-logo" style="width:${s}px;height:${s}px;background:${bg}">${letter}</div>`;
  }

  return { esc, computedTotal, progressAmount, skeletonBlock, icon, brandLogo, _iconImgFallback };
})();
