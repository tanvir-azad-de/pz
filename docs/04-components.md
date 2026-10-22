# 04 — Components

Shared, reusable UI pieces used across multiple screens. All dimensions/colors/type below are
read directly from the Figma file's auto-layout properties (fetched via REST API), not
estimated.

## Game card

Used on Discover (Trending + All Games) and My Games (identical cards, 2-column grid).

Total height 261px, two stacked parts:

**Art/header section** — 201px tall, `border-radius: 20px 20px 0 0` (top corners only, since
the footer is visually attached), `background-image: var(--game-image)` (`background-size:
cover`), padding 12px, content bottom-aligned:
- Game name — `.t-title-sm` (20/700), white
- Description — `.t-body-sm` (12/300), white, single line, `text-overflow: ellipsis`
- Badge row, `gap: 4px`:
  - Cashback badge (if `has_cashback`): pill, `background: var(--color-surface)`,
    `border-radius: 52px` (effectively a pill), `padding: 4px 8px`, dollar-sign icon (20×20) +
    "Cashback" label `.t-body-md` (14/400) white
  - Limited Bonus badge (if `has_limited_bonus`): same pill style, stopwatch icon (20×20) +
    "Limited Bonus" label

**Footer section** — 60px tall, `background: var(--color-surface)`, `border-radius: 0 0 20px
20px`, padding 12px, `display:flex; justify-content:space-between; align-items:center`:
- Left: computed total `$ {sum of tasks.amount}` — `.t-title-sm` (20/700)
  white
- Right: "Play" button — pill, `background: var(--color-primary)`, `padding: 13px 20px`,
  `border-radius: 8px`, text `.t-body-md` 800, color `var(--color-on-primary)`. Visual only —
  navigates to `#/game/:id` on tap (the whole card is tappable, not just the button).

```css
.game-card { width: 100%; border-radius: 20px; overflow: hidden; background: var(--color-surface); }
.game-card__art {
  height: 201px; padding: 12px; display: flex; flex-direction: column; justify-content: flex-end;
  background-size: cover; background-position: center;
}
.game-card__footer {
  height: 60px; padding: 12px; display: flex; align-items: center; justify-content: space-between;
}
```

### My Games 2-column grid

```css
.my-games__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 16px;
}
```
Each card's internal layout is unchanged from the Discover card; only the container becomes a
2-column grid instead of a vertical stack. Text may wrap/truncate more aggressively at half
width — `text-overflow: ellipsis; white-space: nowrap` on the name and description.

## Payout card (Rewards horizontal rows + Reward Detail source data)

Small card, 141×108, used inside horizontally-scrollable rows:

```css
.payout-card {
  width: 141px; background: var(--color-surface); border-radius: 20px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.payout-card__brand { display: flex; align-items: center; gap: 8px; }
.payout-card__logo { width: 36px; height: 36px; border-radius: 54px; background: #fff; }
.payout-card__amount { font-size: 24px; font-weight: 800; color: var(--color-on-bg); }
.payout-card__track { height: 4px; border-radius: 100px; background: var(--purple-600); overflow: hidden; }
.payout-card__fill { height: 100%; border-radius: 100px; background: var(--purple-400); }
```

Progress fill width = `rewards.progress_pct` as a percentage. Below the card, a separate pill
shows a derived currency figure (`Render.progressAmount()`: `amount x progress_pct` — see
`01-data-model.md`; the deprecated coin icon and static "points" number are gone), `padding:
4px 0`, `.t-body-lg` (16/800) white.

Tapping a payout card navigates to `#/reward/:id`.

### Horizontal scroll row wrapper

```css
.payout-row { display: flex; gap: 12px; overflow-x: auto; padding: 0 16px 4px; scroll-snap-type: x proximity; }
.payout-row > * { scroll-snap-align: start; flex: 0 0 auto; }
```

Row header above each scroll row: category name `.t-title-md` (24/800) + "See All" ghost button
right-aligned (`display:flex; justify-content:space-between`).

## Wallet card (3 variants)

All variants share a base: `background: var(--color-surface)`, `border-radius: 12px`,
`padding: 12px`.

**Variant A — simple (game reward, survey):** height 74px.
```
[50×50 icon, r8]  [name .t-body-lg / subtitle .t-caption]     [+$/-$ amount  Pending?]
```
Amount row: `±$ {amount}` `.t-label-lg` (16/800), color
`var(--color-primary)` if `type === 'earned'`, `var(--color-on-bg)` if `spent`. If `status ===
'Pending'`, a pill badge below the amount: `background: var(--purple-400)`, text "Pending"
`.t-caption` white.

**Variant B — coupon (coupon_code present):** height 143px, extra `border: 1px solid
var(--purple-600)`. Adds, below the base row, a `1px` divider (`border-top: 1px solid
var(--purple-400)`) then a row with:
- Code box: `border: 1px solid var(--purple-400)`, `border-radius: 8px`, `padding: 8px 12px`,
  monospace-ish label `.t-body-lg` showing `coupon_code`, plus a copy icon (20×20, inert/visual)
- "Copy & Shop" button: outline style, `border: 1px solid var(--color-primary)`, text color
  `var(--color-primary)`, `.t-body-md` 800, `border-radius: 8px`, `padding: 13px 20px`

**Date group header** above each cluster of cards: `.t-body-lg` (14/800) white, e.g. "October
8th", `padding: 0 16px`, `margin-bottom: 12px`.

**Filter chips** (All / Earned / Spent), row above the date groups:
```css
.wallet-chip { padding: 8px 12px; border-radius: 20px; font: 14px/21px; font-weight: 800; }
.wallet-chip--active { background: var(--purple-400); color: var(--color-on-primary); }
.wallet-chip { background: var(--color-surface); color: var(--color-on-bg); font-weight: 400; }
```
Chips filter the rendered list client-side by `wallet.type` (visual-only state, no persistence).

## Badge (generic pill, reused for Cashback/Limited Bonus/Active task/Pending)

```css
.badge {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;
  border-radius: 52px; font-size: 14px; line-height: 21px;
}
.badge--surface  { background: var(--color-surface); color: var(--color-on-bg); }
.badge--success  { background: var(--color-primary); color: var(--color-on-primary); font-weight: 400; font-size:12px; }
.badge--pending  { background: var(--purple-400); color: #fff; font-size: 12px; }
```

## Chip (filter pills — wallet screen)

See Wallet card section above; same visual language as badges but interactive (tap to filter).

## Pill / buttons

Canonical button styles, reused everywhere:

```css
.btn { border: none; cursor: pointer; font-family: inherit; display:inline-flex; align-items:center; justify-content:center; gap:10px; }
.btn-primary       { height:58px; border-radius:12px; background:var(--color-primary); color:var(--color-on-primary); font:16px/21px; font-weight:800; width:100%; }
.btn-danger-ghost  { height:58px; border-radius:12px; background:transparent; border:1px solid var(--color-error); color:var(--color-error); font:16px/21px; font-weight:800; width:100%; }
.btn-small         { height:36px; border-radius:8px; background:var(--color-primary); color:var(--color-on-primary); padding:13px 20px; font:14px/21px; font-weight:800; }
.btn-ghost         { height:36px; border-radius:8px; background:transparent; color:var(--color-on-bg); padding:13px 0; font:14px/21px; font-weight:800; }
.btn-pill-outline  { height:36px; border-radius:54px; background:transparent; border:1px solid currentColor; padding:12px 0; font:16px/21px; font-weight:800; }
```

Sticky footer CTAs (Play Now / Confirm Payout / Invite Friends) use `.btn-primary`, wrapped in a
fixed-position container above `env(safe-area-inset-bottom)`:

```css
.sticky-footer {
  position: fixed; left:0; right:0; bottom:0; padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
  background: var(--color-bg);
}
```

## Icon inventory (placeholders pending real SVGs)

| Icon | Used in | Placeholder approach |
|---|---|---|
| Back arrow | nav bar on detail screens | inline SVG chevron-left |
| Tab: Discover / My Games / Rewards / Profile | tab bar | 4 simple inline SVG glyphs (grid, controller, gift, user) |
| Dollar / Cashback | game card badge | inline SVG `$` glyph |
| Stopwatch / Limited Bonus | game card badge | inline SVG stopwatch glyph |
| Coin | footer amounts, wallet amounts | inline SVG coin glyph |
| Info | invite friends note | inline SVG "i" circle |
| Copy | wallet coupon card | inline SVG copy/clipboard glyph |
| Chevron right | profile menu rows | inline SVG chevron-right |
| Brand logos: PayPal, Amazon, Google Play, Apple | reward cards + reward detail | **real exports needed from user** — placeholder = colored circle with first letter until provided |

All placeholders live inline in `render.js` as small SVG-returning functions (e.g.
`icon.back()`, `icon.chevronRight()`), so swapping to real files later means only changing the icon
module, not every view.

## Decisions

- Game card art and footer are visually one unit (combined border-radius) even though
  implemented as two stacked divs.
- My Games reuses the exact same card component as Discover; only the grid container differs.
- Progress bars ARE implemented on payout cards (reinstated per product decision).
- Wallet chips are client-side visual filters only — no state persists across reload.
- Brand logos are the one icon category that genuinely needs user-provided assets; everything
  else ships as inline placeholder SVG so no screen is blocked.

## Open items

- Swap brand logo placeholders for real SVGs once provided.
- Swap all placeholder glyphs for Figma-exported SVGs once provided (lower priority — visual
  parity is close enough with placeholders for a demo).
