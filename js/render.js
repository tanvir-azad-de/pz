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

  // ---- Currency helpers ----
  // The sheet is the only source of currency symbols/formatting — amounts arrive pre-formatted
  // (e.g. "$5.00", "$1,000.00") from js/sheets.js (which reads gviz's formatted cell.f, not the
  // raw cell.v). Views interpolate those strings as-is and never hardcode a "$". The only place
  // that still needs real arithmetic is summing a game's tasks, handled below.

  // Pulls the numeric value out of a formatted amount string, e.g. "$1,000.00" -> 1000. Strips
  // anything that isn't a digit, dot, or minus sign, then drops thousands separators. Returns 0
  // for unparseable input (blank cell, etc.) so callers can sum safely.
  function parseAmount(v) {
    if (typeof v === "number") return v;
    const cleaned = String(v || "").replace(/[^0-9.\-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // Splits a formatted amount into its leading symbol and the rest, e.g. "$1,000.00" ->
  // { symbol: "$", rest: "1,000.00" }. Used by the handful of spots that tint the currency
  // symbol a different color than the number (nav-bar wallet pill, game card footer) without
  // the app hardcoding what that symbol is.
  function splitAmount(v) {
    const str = String(v || "");
    const match = str.match(/^([^\d\s]*)\s*(.*)$/);
    return { symbol: match ? match[1] : "", rest: match ? match[2] : str };
  }

  // Remembers the currency symbol/format seen in real sheet data, so computedTotal() (which
  // has to re-derive a number via arithmetic, not just pass a string through) can still render
  // its sum dressed the same way as every other amount on screen. Falls back to a bare "$" if
  // nothing with a symbol has loaded yet.
  let _currencySymbol = "$";
  function initCurrency(data) {
    const candidates = [
      data && data.settings && data.settings.balance,
      data && data.games && data.games[0] && data.games[0].total_reward,
      data && data.tasks && data.tasks[0] && data.tasks[0].amount,
      data && data.rewards && data.rewards[0] && data.rewards[0].amount,
    ];
    for (const c of candidates) {
      const symbol = splitAmount(c).symbol;
      if (symbol) {
        _currencySymbol = symbol;
        return;
      }
    }
  }

  // Formats a plain number back into the sheet's currency convention, e.g. 135 -> "$135.00".
  function formatAmount(num) {
    return `${_currencySymbol}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function computedTotal(tasks) {
    const sum = tasks.reduce((acc, t) => acc + parseAmount(t.amount), 0);
    return formatAmount(sum);
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
  //
  // NOTE: the url() below is resolved to an absolute URL via `new URL(..., document.baseURI)`
  // before being written into the inline style attribute. A bare relative url() inside a CSS
  // custom property (--icon-src) resolves against the *stylesheet* that consumes it
  // (css/components.css), not the document, so it would 404 as e.g. /css/assets/icons/... —
  // this previously made every mask icon render as empty space. Resolving it in JS keeps the
  // var() indirection (needed for currentColor tinting) while pointing at the right file.
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
    const src = new URL(`assets/icons/${def.file}`, document.baseURI).href;
    return `<span class="icon" style="--icon-src:url('${src}');width:${def.size}px;height:${def.size}px"></span>`;
  }

  function imgIcon(key) {
    const def = ICON_IMG[key];
    return `<img class="icon-img" width="${def.size}" height="${def.size}" src="assets/icons/${def.file}" alt="" onerror="Render._iconImgFallback(this,'${key}')" />`;
  }

  const icon = {};
  Object.keys(ICON_MASK).forEach((key) => {
    icon[key] = () => maskIcon(key);
  });
  Object.keys(ICON_IMG).forEach((key) => {
    icon[key] = () => imgIcon(key);
  });

  // Brand -> filename slug for assets/icons/brand-{slug}.png / brand-{slug}-wide.png.
  const BRAND_SLUGS = {
    PayPal: "paypal",
    Amazon: "amazon",
    "Google Play": "google-play",
    Apple: "apple",
  };

  const BRAND_LETTER_COLORS = {
    PayPal: "#003087",
    Amazon: "#FF9900",
    "Google Play": "#34A853",
    Apple: "#A3AAAE",
  };

  // Fallback used when a brand has no PNG (unknown brand, or onerror on a known one):
  // colored circle + first letter.
  function brandLogoFallback(brand, size) {
    const letter = esc((brand || "?").trim().charAt(0).toUpperCase());
    const bg = BRAND_LETTER_COLORS[brand] || "var(--purple-400)";
    return `<div class="brand-logo" style="width:${size}px;height:${size}px;background:${bg}">${letter}</div>`;
  }

  // Called from onerror="" on brand <img> tags — restores the letter-circle fallback if the
  // PNG is missing/renamed. Must stay reachable as Render._brandLogoFallback (invoked from
  // markup, not JS call sites).
  function _brandLogoFallback(imgEl, brand, size) {
    imgEl.outerHTML = brandLogoFallback(brand, size);
  }

  // 36px rounded brand mark on the Rewards payout card (js/views/rewards.js). .brand-logo
  // clips to a circle via border-radius, so the PNG just needs to cover that area.
  function brandLogo(brand, size) {
    const s = size || 36;
    const slug = BRAND_SLUGS[brand];
    if (!slug) return brandLogoFallback(brand, s);
    return `<img class="brand-logo" width="${s}" height="${s}" src="assets/icons/brand-${slug}.png" alt="${esc(brand)}" onerror="Render._brandLogoFallback(this,'${esc(brand)}',${s})" />`;
  }

  // 360x160 wide brand lockup on the Reward Detail header (js/views/reward-detail.js), shown
  // on a white card. Fixed 360x160 box per spec; object-fit:contain keeps the brand PNG
  // (720x320 source) from distorting. Falls back to the letter-circle (at a larger size,
  // since there's no wide-format fallback) if the PNG 404s.
  function brandLogoWide(brand) {
    const slug = BRAND_SLUGS[brand];
    if (!slug) return brandLogoFallback(brand, 64);
    return `<img src="assets/icons/brand-${slug}-wide.png" alt="${esc(brand)}" width="360" height="160" style="width:360px;height:160px;object-fit:contain;" onerror="Render._brandLogoFallback(this,'${esc(brand)}',64)" />`;
  }

  return {
    esc,
    parseAmount,
    splitAmount,
    formatAmount,
    initCurrency,
    computedTotal,
    skeletonBlock,
    icon,
    brandLogo,
    brandLogoWide,
    _iconImgFallback,
    _brandLogoFallback,
  };
})();
