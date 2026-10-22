# 00 — Design System

Source of truth: Figma file `OTXhsXviEGsy3KmOAAefAP` ("Playzone"), page **Design System**,
frames `Colors` (node `1:591`) and `Typography` (node `1:394`), fetched via the Figma REST API
on 2026-10-22. These are exact values read from the file, not estimates.

> The original `figma_to_html/` HTML/CSS export has been deleted from this repo. It was a
> broken, flattened export (background-image divs, ~99 missing PNGs, invalid
> `font-weight: ExtraBold` CSS) and was never used as a source for any value below.

## Colors

### Core accent colors (Figma `color/*` names)

| Token | Figma name | Hex | Usage |
|---|---|---|---|
| `--color-primary` | `color/primary` | `#69F89B` | primary buttons, active tab, links on dark bg, positive amounts |
| `--color-on-primary` | `color/on-primary` | `#06071C` | text/icons on top of `--color-primary` |
| `--color-secondary` | `color/secondary` | `#181A44` | surface / card background |
| `--color-on-secondary` | `color/on-secondary` | `#FFFFFF` | text/icons on top of `--color-secondary` |
| `--color-error` | `color/error` | `#FF6565` | destructive actions, error states |
| `--color-on-error` | `color/on-error` | `#06071C` | text on top of error fills (rare; most error text is `#FF6565` on dark) |

### Background & surface

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#06071C` | app/page background |
| `--color-on-bg` | `#FFFFFF` | primary text on `--color-bg` |
| `--color-surface` | `#181A44` | cards, list rows, chips (inactive) |
| `--color-on-surface` | `#FFFFFF` | text on `--color-surface` |

### Status colors

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#69F89B` | same as primary; used for "Active task" badge fill |
| `--color-warning` / `--color-error` | `#FF6565` | delete account text, error states |
| `--color-info` | `#FFCC4A` | informational accents (not heavily used in these 7 screens) |
| `--color-on-status` | `#FFFFFF` | text on status fills other than success (success uses `on-primary`) |

### Purple ramp (grayscale-for-dark-UI, per Figma "Grayscale" section)

| Token | Hex | Usage |
|---|---|---|
| `--purple-700` | `#181A44` | same as surface |
| `--purple-600` | `#3A3E72` | dividers, progress track background, inactive borders |
| `--purple-500` | `#51558C` | muted secondary text (rarely used directly) |
| `--purple-400` | `#7C71E0` | borders on highlighted cards, progress fill, active filter chip, accent icons |
| `--purple-300` | `#575A8D` | inactive tab bar icon/label |
| `--purple-200` | `#A39AF0` | "See All" link text |
| `--purple-100` | `#BDC0EF` | lightest tint (not observed in use on these screens; reserved) |

### Fixed/neutral

| Token | Hex |
|---|---|
| `--color-white` | `#FFFFFF` |
| `--color-white-70` | `rgba(255,255,255,0.7)` (seen as `white@70%` in the old export; kept for muted white text) |
| `--color-black` | `#000000` |

```css
:root {
  /* core */
  --color-primary: #69F89B;
  --color-on-primary: #06071C;
  --color-secondary: #181A44;
  --color-on-secondary: #FFFFFF;
  --color-error: #FF6565;
  --color-on-error: #06071C;

  /* background/surface */
  --color-bg: #06071C;
  --color-on-bg: #FFFFFF;
  --color-surface: #181A44;
  --color-on-surface: #FFFFFF;

  /* status */
  --color-success: #69F89B;
  --color-warning: #FF6565;
  --color-info: #FFCC4A;
  --color-on-status: #FFFFFF;

  /* purple ramp */
  --purple-700: #181A44;
  --purple-600: #3A3E72;
  --purple-500: #51558C;
  --purple-400: #7C71E0;
  --purple-300: #575A8D;
  --purple-200: #A39AF0;
  --purple-100: #BDC0EF;

  /* neutral */
  --color-white: #FFFFFF;
  --color-white-70: rgba(255,255,255,0.7);
  --color-black: #000000;
}
```

## Typography

Font family: **Plus Jakarta Sans**, weights 300 (Light), 400 (Regular), 700 (Bold), 800 (ExtraBold).
Loaded via Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;700;800&display=swap" rel="stylesheet">
```

> Bug recorded from the old export, do not repeat: `font-weight: ExtraBold` / `Light` /
> `Regular` are **invalid CSS values**. Always use numeric weights (300/400/700/800).

### Type scale (from Figma `Typography` frame, "Regular Styles")

| Style name | Size | Line height | Weight | CSS class |
|---|---|---|---|---|
| Display Large | 32px | 41px | 800 | `.t-display-lg` |
| Title Large | 28px | 34px | 800 | `.t-title-lg` |
| Title Medium | 24px | 28px | 800 | `.t-title-md` |
| Title Small | 20px | 28px | 700 | `.t-title-sm` |
| Label Large | 16px | 21px | 800 | `.t-label-lg` |
| Label Small | 14px | 16px | 800 | `.t-label-sm` |
| Label Tiny | 12px | 16px | 800 | `.t-label-tiny` |
| Body Large | 16px | 21px | 700 | `.t-body-lg` |
| Body Medium | 14px | 21px | 400 | `.t-body-md` |
| Body Small | 12px | 14px | 300 | `.t-body-sm` |
| Caption | 12px | 14px | 400 | `.t-caption` |

```css
.t-display-lg  { font-size: 32px; line-height: 41px; font-weight: 800; }
.t-title-lg    { font-size: 28px; line-height: 34px; font-weight: 800; }
.t-title-md    { font-size: 24px; line-height: 28px; font-weight: 800; }
.t-title-sm    { font-size: 20px; line-height: 28px; font-weight: 700; }
.t-label-lg    { font-size: 16px; line-height: 21px; font-weight: 800; }
.t-label-sm    { font-size: 14px; line-height: 16px; font-weight: 800; }
.t-label-tiny  { font-size: 12px; line-height: 16px; font-weight: 800; }
.t-body-lg     { font-size: 16px; line-height: 21px; font-weight: 700; }
.t-body-md     { font-size: 14px; line-height: 21px; font-weight: 400; }
.t-body-sm     { font-size: 12px; line-height: 14px; font-weight: 300; }
.t-caption     { font-size: 12px; line-height: 14px; font-weight: 400; }
```

## Spacing

Values observed consistently across all 7 screen frames:

| Token | Value | Usage |
|---|---|---|
| `--space-screen-x` | 16px | horizontal screen padding |
| `--space-card-gap` | 12px | gap between cards in a list/grid |
| `--space-section-gap` | 24px | gap between major sections on a screen |
| `--space-xs` | 4px | icon-to-label gaps |
| `--space-sm` | 8px | internal small gaps |
| `--space-md` | 12px | card internal padding (common) |
| `--space-lg` | 16px | card internal padding (larger cards) |
| `--space-xl` | 20px | hero/section padding |

## Radii

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 8px | buttons, small chips, wallet icon art |
| `--radius-md` | 12px | primary buttons (58h), wallet cards |
| `--radius-lg` | 16px | profile cards, invite cards, balance card |
| `--radius-xl` | 20px | game hero image, payout cards, game icon |
| `--radius-pill` | 54px (or `999px` generic pill) | "Get Bonus" buttons, badges, filter chips |

## Buttons (from `Buttons` frame, referenced not fully walked — pattern confirmed by instances across screens)

| Variant | Height | Radius | Fill | Text color |
|---|---|---|---|---|
| Primary CTA (full width, sticky footer) | 58px | 12px | `--color-primary` | `--color-on-primary`, `.t-label-lg` |
| Primary CTA (destructive) | 58px | 12px | transparent, border `--color-error` | `--color-error`, `.t-label-lg` |
| Small pill button (e.g. "Play", "Payout Now") | 36px | 8px | `--color-primary` | `--color-on-primary`, `.t-body-md` 800 |
| Ghost/text button (e.g. "See All") | 36px | 8px | transparent | `--purple-200` or `--color-on-bg`, `.t-body-md` 800 |
| Rounded pill CTA (e.g. "Get Bonus") | 36px | `--radius-pill` | `--color-primary` outline/fill per variant | `.t-label-lg` |

## Decisions

- Tab bar is **4 tabs** (Discover, My Games, Rewards, Profile). Figma's tab bar component shows 5
  (including "Missions"), but no Missions screen exists in the file — dropped per product decision.
- No iOS status bar, "prompt" bar, or search field are rendered on any screen — these are Figma
  mockup/device chrome, not product UI, and a real mobile browser supplies its own status bar.
- Dollars only. The coin icon and its decorative `1 000` / `2 000` points-style numbers next
  to payout amounts are deprecated — the app is real-currency-only. The secondary figure next
  to each reward's amount is now `Render.progressAmount()`: `amount x progress_pct`, e.g. `$5`
  at 35% progress renders `$ 1.75`.

## Open items

None blocking. All icon and illustration assets (tab bar, back/chevron/arrow/info/copy/wallet,
both game-card badges, all 4 brand logos, all illustrations, favicon) now ship as real files —
see `docs/04-components.md` icon inventory.
