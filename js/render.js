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

  // Render a string as-is for amounts that already include a currency symbol in the sheet
  // (e.g. "$ 1000", "$5") — the data is inconsistent in spacing by design (real Figma copy),
  // so this simply trusts and escapes the stored string rather than reformatting it.
  function money(str) {
    return esc(str);
  }

  function computedTotal(tasks) {
    const sum = tasks.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return `$ ${sum}`;
  }

  function skeletonBlock(height, extraClass) {
    return `<div class="skeleton ${extraClass || ""}" style="height:${height}px"></div>`;
  }

  // ---- Inline icon set (placeholders — swap for real SVG exports in assets/icons/ later) ----
  const icon = {
    back: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    chevronRight: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    arrowRight: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

    coin: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="#FFCC4A"/><circle cx="12" cy="12" r="6" fill="#FFD45A"/><text x="12" y="16" font-size="8" text-anchor="middle" fill="#8A5A00" font-family="sans-serif" font-weight="bold">$</text></svg>`,

    dollar: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#07E562"/><text x="12" y="16" font-size="12" text-anchor="middle" fill="#064420" font-family="sans-serif" font-weight="bold">$</text></svg>`,

    stopwatch: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="13" r="8" fill="#FF9719"/><rect x="10" y="2" width="4" height="3" rx="1" fill="#FF9900"/><path d="M12 9v4l3 2" stroke="#FFF4E0" stroke-width="1.5" stroke-linecap="round"/></svg>`,

    info: () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v.01M12 11v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,

    copy: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke="currentColor" stroke-width="2"/></svg>`,

    wallet: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 10h18" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="14" r="1.2" fill="currentColor"/></svg>`,

    tabDiscover: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor"/></svg>`,

    tabMyGames: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="20" height="11" rx="5" fill="currentColor"/><circle cx="8" cy="12.5" r="1.5" fill="#06071C"/><circle cx="8" cy="12.5" r="1.5" fill="#06071C" transform="rotate(90 8 12.5)"/><circle cx="17" cy="11" r="1.2" fill="#06071C"/><circle cx="17" cy="14" r="1.2" fill="#06071C"/></svg>`,

    tabRewards: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="9" width="18" height="11" rx="1.5" fill="currentColor"/><rect x="2" y="6" width="20" height="4" rx="1" fill="currentColor"/><rect x="11" y="6" width="2" height="14" fill="#06071C"/></svg>`,

    tabProfile: () => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" fill="currentColor"/></svg>`,

    search: () => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  };

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

  return { esc, money, computedTotal, skeletonBlock, icon, brandLogo };
})();
