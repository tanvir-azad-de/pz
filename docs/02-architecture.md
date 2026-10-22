# 02 — Architecture

## File tree

```
/
├── index.html              # single shell: nav bar + <main id="view"> + tab bar
├── css/
│   ├── tokens.css          # design tokens (colors, type, spacing, radii) — see 00-design-system.md
│   ├── base.css            # reset, font loading, html/body sizing, safe-area
│   └── components.css      # game card, payout card, wallet card, badge, chip, pill, buttons
├── js/
│   ├── app.js               # boot sequence, hash router, view registry, tab bar + nav bar render
│   ├── sheets.js             # gviz fetch for all 6 tabs, cache, validation, fallback
│   ├── render.js              # shared DOM helpers: el(), escapeHtml(), skeleton(), formatMoney()
│   └── views/
│       ├── discover.js
│       ├── my-games.js
│       ├── game-detail.js
│       ├── rewards.js
│       ├── reward-detail.js
│       ├── wallet.js
│       ├── profile.js
│       └── invite.js
├── assets/
│   └── icons/              # icon SVGs, brand logo PNGs, illustration PNGs
├── data/
│   └── fallback.json        # bundled offline copy of all 6 tabs, used when Sheets fetch fails
├── docs/                    # this documentation set
├── .gitignore
├── .nojekyll                # tells GitHub Pages not to run Jekyll on this static site
└── README.md
```

No build step, no bundler, no npm dependency. Every file above is hand-authored static
HTML/CSS/JS, deployable as-is to GitHub Pages or any static host.

## Routing

Single-page app using hash-based routing (works identically on GitHub Pages with no server
rewrite config, and on Vercel with zero config).

| Route | View module | Tab bar visible? | Nav bar |
|---|---|---|---|
| `#/discover` (default) | `views/discover.js` | yes, Discover active | title "Discover" + wallet pill |
| `#/my-games` | `views/my-games.js` | yes, My Games active | title "My Games" + wallet pill |
| `#/rewards` | `views/rewards.js` | yes, Rewards active | title "Rewards" + wallet pill |
| `#/profile` | `views/profile.js` | yes, Profile active | title "Profile" + wallet pill |
| `#/game/:id` | `views/game-detail.js` | no | back arrow + game name + wallet pill |
| `#/reward/:id` | `views/reward-detail.js` | no | back arrow + brand name + wallet pill |
| `#/wallet` | `views/wallet.js` | no | back arrow + "Wallet" + wallet pill |
| `#/invite` | `views/invite.js` | no | back arrow + "Invite Friends" + wallet pill |

`#/wallet` and `#/invite` are reached from Profile's two CTAs, not from the tab bar — they are
detail screens per the original brief ("two CTA: one to Wallet Page another to Invite a friend
screen").

### Router lifecycle (`app.js`)

1. On `load` and on every `hashchange`, parse `location.hash` into `{route, params}` via a small
   pattern match (supports one `:id` segment).
2. Look up the view module in a registry object `{ "discover": renderDiscover, "game": renderGameDetail, ... }`.
3. Clear `#view`, call the matched view's `render(container, params, data)` where `data` is the
   already-fetched Sheets payload (see `03-sheets-integration.md` — fetched once at boot, not
   per-navigation).
4. Toggle tab bar visibility and nav bar content (title/back-arrow) based on the route table
   above.
5. Scroll `#view` to top on every navigation.
6. Unknown hash → redirect to `#/discover`.

No history-stack management beyond the browser's native hash history — back/forward buttons
work for free because each navigation is a real hash change.

## Nav bar anatomy

Present on every screen, fixed height ~68px, bottom border `1px solid var(--purple-700)`:

- Left: either nothing (tab screens) or a back-arrow icon button (detail screens) + screen
  title (`.t-title-sm`, 20/700, white).
- Right: the green wallet pill — `padding: 8px 12px`, `border: 1px solid var(--color-primary)`,
  `border-radius: 8px`, content `$ {balance}` from `settings.balance`, text size 18px 800; the
  `$` is colored `var(--color-primary)`, the amount is white.

The wallet pill is rendered by `app.js` itself (not per-view), since it reads the same
`settings.balance` value regardless of screen.

## Tab bar anatomy

Fixed to the bottom of the viewport, `background: var(--color-bg)`, top border
`1px solid var(--purple-700)`, height ~70px + safe-area inset. 4 items, each
icon (24×24) + label (`.t-caption`, 12/400): **Discover, My Games, Rewards, Profile**.
Active item: icon + label tinted `var(--color-primary)`. Inactive: `var(--purple-300)`.

Detail routes (`game`, `reward`, `wallet`, `invite`) hide the tab bar entirely and instead show
a sticky CTA button pinned above the safe-area inset (e.g. "Play Now", "Confirm Payout",
"Invite Friends").

## Mobile-only viewport strategy

This app is never intended to be opened on a desktop browser (explicit product decision).
Consequences for `base.css`:

```css
html, body { height: 100%; margin: 0; }
/* scrollbar-width is NOT inherited — must target every element (`*`), not just
   `html`, or nested scrollers like .payout-row keep their native scrollbar. */
* { scrollbar-width: none; -ms-overflow-style: none; } /* Firefox / IE */
*::-webkit-scrollbar { width: 0; height: 0; display: none; } /* Safari / Chrome */
body {
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-on-bg);
  font-family: "Plus Jakarta Sans", sans-serif;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
}
#view { padding-bottom: calc(70px + env(safe-area-inset-bottom)); }
.tab-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding-bottom: env(safe-area-inset-bottom);
}
```

- No `@media (min-width: ...)` breakpoints anywhere — there is exactly one layout.
- No max-width centering column for desktop; the app simply fills whatever viewport it's given
  (expected to be a phone).
- `env(safe-area-inset-bottom)` accounts for the iOS home indicator area so the sticky CTA
  buttons and tab bar aren't obscured.
- Scrollbars are hidden everywhere (page + the `.payout-row` h-scrollers) — a native scrollbar
  track/thumb reads as desktop chrome on this mobile-only app. Scrolling itself still works;
  only the visual indicator is suppressed.

## No-build-step rationale

- Zero dependencies to install, zero bundler config, zero version drift — matches "simple web
  app demo" scope.
- Deploys identically to GitHub Pages (static files served from `main`/`docs` or a `gh-pages`
  branch) and Vercel (zero-config static site) with no build command.
- Trade-off accepted: no module bundling means `index.html` lists every `<script>` tag manually
  in dependency order (`render.js` → `sheets.js` → each view module → `app.js` last).

## Decisions

- Hash routing, not path routing — no server rewrite rules needed on GitHub Pages.
- Data fetched once at boot (see chunk 3), not per-navigation — tab switches are instant.
- Tab bar is 4 items (Discover, My Games, Rewards, Profile) — Figma's 5-tab bar (including
  "Missions") is not implemented; no Missions screen exists.
- No desktop layout, no breakpoints, fixed mobile-only viewport handling.

## Open items

- None. All assets (icons, brand logos, illustrations, favicon) are in place — see
  `docs/04-components.md` icon inventory.
