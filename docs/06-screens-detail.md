# 06 — Detail Screens

Covers the 4 screens reached by tapping into a tab screen: Game Detail, Reward Detail, Wallet,
Invite Friends. All are built at full fidelity to their Figma frames (per product decision),
minus the status bar/prompt/search chrome dropped globally.

> Routes below are written as `#/route` for brevity. The actual hash always carries the active
> sheet ID first — see `docs/03-sheets-integration.md` — so `#/game/:id` really means
> `#/<sheetId>/game/:id`.

## Game Detail (Figma node `1:4424`)

Route `#/game/:id`. Back arrow + game name in nav bar. No tab bar; sticky "Play Now" footer.

1. **Hero image** (`.game-hero`) — full-bleed, 360×279 per Figma (fluid width: this app has no
   fixed mobile frame, so it's `left:0; right:0` rather than a literal `360px`), `position:
   absolute; top: 0` inside a `position: relative` `.game-detail-stack` wrapper,
   `background-image: games.image_url`, `background-size: cover`, no border-radius (edge to
   edge). Overlaid with `linear-gradient(to top, var(--color-bg) 0%, transparent 100%)` stacked
   above the image in the same `background-image` property. Doubles as the backdrop for the nav
   bar — see "Overlay nav bar" below.

2. **Icon + title block** (`.game-hero__below`) — 92×92 rounded icon (`border-radius: 20px`,
   reusing `games.image_url`, cropped via `background-size: cover`) stacked above the game name
   (`.t-title-sm`, 20/700), `gap: 8px`, `padding: 0 16px`, horizontally centered
   (`align-items: center; text-align: center`). Positioned with `margin-top: 224px` (279 − 55),
   so it overlaps the hero's bottom edge by 55px; `position: relative; z-index: 1` keeps it
   above `.game-hero` (`z-index: 0`).

3. **Stats row** — `display:flex; gap:12px; padding:0 16px`, two equal-width stat blocks
   separated by a vertical `1px solid var(--purple-600)` divider, each centered
   (`align-items: center; text-align: center`):
   - "total reward" (`.t-body-sm` 12/300 label) above a pill:
     `games.total_reward` (`.t-title-sm`, 20/700), pill `border-radius: 32px`
   - "max per task" label above a pill: `games.max_per_task`

4. **IAP cashback card** — `background: var(--color-surface)`, `border-radius: 8px`,
   `padding: 12px`, `gap: 12px`. Row: text block (title "Earn up to $50 cashback"
   `.t-body-lg` 16/800 + subtitle "Earn 50% cashback every time you make a purchase"
   `.t-body-md` 14/400) + decorative image (81×57, `illus-cashback.png` only — no gradient
   backing; the PNG has transparent pixels and a gradient placed behind it bled through as an
   unwanted tint, so it was removed for this image specifically) — both static copy per Figma
   (not Sheet-driven; this card's text is hardcoded, not a `content` key, since it's a fixed
   promo unit not described as needing to vary). Below: "How it works?" pill ghost button with
   arrow icon, visual only.

5. **Tasks card** — `background: var(--color-surface)`, `border-radius: 8px`, `padding: 16px
   12px 8px`:
   - Header row: "Tasks" (`.t-body-lg` 16/800) + total pill (**computed**
     `SUM(tasks.amount where game_id matches)` + "total" label), `justify-content:
     space-between`
   - Subcopy: "Complete the tasks below and receive rewards for each of them." (`.t-body-sm`
     12/300)
   - Task rows (`gap: 4px`), one per `tasks` row for this `game_id`, in sheet order:
     - `background: var(--color-bg)`, `border-radius: 8px`, `padding: 12px`,
       `justify-content: space-between`
     - Left: `tasks.name` (`.t-body-lg` 16/800); if `tasks.is_active`, a green "Active task"
       pill badge (`.badge--success`) rendered below the name
     - Right: `{tasks.amount}` (sheet-formatted, e.g. `$5.00`) (`.t-title-sm`, 20/700)

6. **Description card** — `background: var(--color-surface)`, `border-radius: 8px`, `padding:
   12px`: "Description" label (`.t-body-md` 14/800) + `games.long_description` (`.t-body-sm`
   12/300), truncated to ~2 lines with a trailing "...See More" (visual only — tapping expands
   in place by removing the `line-clamp`, no navigation).

7. **Sticky footer** — "Play Now" (`.btn-primary`, full width, 58px). Navigates to
   `games.href` (Play Store / App Store link) via `location.href`, same tab. When `href` is
   blank for that row, the button renders with `.btn-disabled` (dimmed, `disabled` attribute)
   instead of launching anything.

**Overlay nav bar.** Because the hero is `position: absolute; top: 0`, it needs `#view` to
start at viewport `y: 0` to sit behind the nav bar — but `#view` is a scroll container
(`overflow-x: hidden` computes `overflow-y` to `auto` per spec) and the normal `.nav-bar` is
`position: sticky`, which occupies 68px of real layout space ahead of `#view`. So this route
flags `overlayNav: true` (`js/app.js` route table), and `renderNavBar` adds `.nav-bar--overlay`:
`position: fixed`, transparent, no border — it floats over the hero with no backdrop of its
own. A passive `scroll` listener toggles `.is-scrolled`, which fades in an opaque
`var(--color-bg)` background + border so the title/back-arrow/wallet-pill stay legible once the
hero has scrolled out of view. The listener is torn down on every route change so it never runs
on screens using the normal sticky nav bar. No scrim is applied over the hero image itself, so
nav bar text legibility there depends on the art being dark near the top.

This mechanism is shared with Invite Friends. Rather than a hardcoded scroll threshold, the
backdrop element is marked `data-nav-backdrop` and `setupNavOverlay` toggles `.is-scrolled`
once `backdrop.getBoundingClientRect().bottom <= navEl.offsetHeight` — i.e. the moment the
backdrop's bottom edge passes under the nav bar. Measuring the element is required because
Invite's gradient has no fixed height (`min-height: 360px` plus content-driven growth), so no
constant could be correct for both routes. The listener is attached in `route()` **after** the
view renders, not inside `renderNavBar`, since the element it measures doesn't exist yet at
nav-render time.

```
Game Detail
├─ Hero image (games.image_url, absolute, 360×279, gradient overlay) — nav bar backdrop
├─ Icon + name (overlaps hero by 55px)
├─ Stats: total reward | max per task
├─ IAP cashback card (static copy)
├─ Tasks card (header total = SUM(tasks.amount), N task rows, active badge)
├─ Description card (long_description, See More)
└─ Sticky "Play Now" (games.href, dimmed/disabled when blank)
```

## Reward Detail (Figma node `1:6256`)

Route `#/reward/:id`. Back arrow + `rewards.brand` in nav bar. Sticky "Confirm Payout" footer.

1. **Offer card** — white card (`background: #fff`, `border-radius: 20px`, `padding: 20px 16px`),
   centered content: large brand logo via `Render.brandLogoWide(reward.image_url, reward.brand)`
   (sheet-supplied URL, fixed 360×160 `object-fit:contain` box, falls back to a letter circle
   if blank/404 — see `01-data-model.md`).

2. **Amount row** — below the white card: `rewards.amount` in large text (`.t-display-lg`,
   32/800). Deprecated coin icon removed; no secondary derived currency figure.

3. **How it works** — "How it works" header (`.t-title-sm`, 20/700) + 3 bullet lines
   (`reward.reward_detail_how_1/2/3`, `.t-body-sm` 12/300).

4. **Divider** — `1px solid var(--purple-700)`.

5. **Conditions** — "Conditions" header + 2 bullet lines (`reward.reward_detail_conditions_1/2`,
   same style).

6. **Disclaimer box** — `background: var(--color-surface)`, `border-radius: 8px`, `padding:
   10px 8px`, text `reward.reward_detail_disclaimer` (`.t-body-sm` 12/300).

7. **Sticky footer** — "Confirm Payout" (`.btn-primary`), visual only.

```
Reward Detail
├─ White offer card (brand logo via Render.brandLogoWide)
├─ Amount + points pill
├─ "How it works" (3 bullets, per-reward)
├─ divider
├─ "Conditions" (2 bullets, per-reward)
├─ Disclaimer box
└─ Sticky "Confirm Payout"
```

## Wallet (Figma node `2:1942`)

Route `#/wallet`. Back arrow + "Wallet" in nav bar. No sticky footer (scrolling list screen).

1. **Balance card** — same visual component as the Rewards balance card
   (`04-components.md`/`05-screens-tabs.md`): `settings.balance` + "Payout Now" button (visual
   only here too — or could deep-link to `#/rewards`; left inert per "visual only" decision).

2. **Secondary balance + filter row** — a larger standalone balance figure (amount,
   `.t-title-md` 24/800) followed by the 3 filter chips: **All** (active by default,
   `background: var(--purple-400)`), **Earned**, **Spent** (`04-components.md`). Tapping a chip
   client-side filters the transaction list below by `wallet.type` (no network refetch, no
   persistence).

3. **Date-grouped transaction list** — group `wallet` rows by `date` value, preserving sheet
   order both across groups and within a group. Each group:
   - Date header (`.t-body-lg` 14/800), e.g. "October 8th"
   - Cards (`gap: 8px`), using Wallet Card Variant A (simple) or Variant B (coupon, when
     `coupon_code` is non-empty) from `04-components.md`.

```
Wallet
├─ Balance card (settings.balance, Payout Now)
├─ Big balance figure + filter chips (All / Earned / Spent)
├─ "October 8th"
│   ├─ transaction card (+/-, icon, name, subtitle, Pending?)
│   └─ coupon card (code box, Copy & Shop) — if coupon_code present
└─ "September 29th"
    └─ ...more transaction cards
```

## Invite Friends (Figma node `3:1962`)

Route `#/invite`. Back arrow + "Invite Friends" in nav bar. Sticky "Invite Friends" footer.

1. **Gradient hero** (`.invite-hero`) — `background: linear-gradient(180deg, rgba(124,113,224,0)
   0%, #7C71E0 100%)` (transparent at the top fading to `--purple-400` at the bottom; the
   `rgba(...,0)` form is used rather than the `transparent` keyword so the ramp can't pick up a
   muddy dark midpoint from `transparent`'s `rgba(0,0,0,0)` definition), `min-height: 360px`,
   `padding: 92px 20px 48px`. Doubles as the backdrop for the nav bar — see "Overlay nav bar"
   under Game Detail; this route also flags `overlayNav: true` and the hero carries
   `data-nav-backdrop`. `padding-top` is 92px = 68px nav height + the 24px of content inset,
   since the overlay nav is `position: fixed` and occupies no layout space.

   `min-height` rather than a fixed `height`: the title and subtitle both wrap to 2 lines at
   360px wide, so natural height is ~403px there — already clearing the 360px floor. Letting the
   element grow with its content guarantees the referral panel's negative margin (below) always
   lands on the hero's bottom padding instead of clipping the subtitle. Content, centered:
   decorative illustration (`.invite-hero__art`, 166×145, static, **no gradient backing** — see
   `04-components.md`), then title `content.invite_hero_title` (`.t-title-sm`, 20/700) +
   subtitle `content.invite_hero_subtitle` (`.t-body-md`, 14/400).

2. **Referral panel** (`.invite-panel`) — `background: var(--color-surface)` (`#181A44`),
   covering the hero's bottom 30px via `margin-top: -30px`, plus `position: relative; z-index: 1`
   so it paints above the hero regardless of source order. `padding: 32px 16px 140px` (not the
   usual 24px bottom — the extra clearance for the sticky footer lives on the panel itself so its
   dark surface extends all the way down; putting that padding on the outer wrapper instead left
   a gap of the page's lighter background showing above the footer), `border-radius: 16px 16px 0
   0`. The hero/panel overlap is what hides the gradient's hard bottom edge, so the two sections
   read as one continuous surface.

   a. **Referral balance card** (`.invite-balance-card`) — `border: 1px dashed var(--purple-400)`
      (dashed, not solid), `border-radius: 20px`, `padding: 16px 0`, centered text: "Your
      Referral Balance" (`.t-label-lg`, 16/800) above `{settings.referral_balance}`
      (sheet-formatted, e.g. `$120.00`) (`.t-title-md`, 24/800, color `var(--color-primary)`).

   b. **Referral Rewards** — header "Referral Rewards" (`.t-title-md`, 24/800) + subcopy "Earn
      rewards when your friend:" (`.t-body-lg`, 14/400). Two reward rule cards
      (`background: var(--color-bg)`, `border-radius: 8px`, `padding: 12px`):
      - "Completes the first task" + `{settings.referral_first_task}` (sheet-formatted, e.g. `$5.00`) (`.t-title-sm`,
        20/700, `var(--color-primary)`)
      - "Earns game rewards from tasks" + `{settings.referral_pct}%` (same style) + "of their
        reward" caption, plus a footer line with an info icon: "You'll get
        {settings.referral_pct}% of their game rewards" (`.t-body-sm`, 12/300)

   c. **How it works?** — header + 4 bullet lines (`content.invite_how_1..4`, `.t-body-sm`
      12/300).

3. **Sticky footer** — "Invite Friends" (`.btn-primary`), visual only (no share sheet
   integration — this is a static demo).

```
Invite Friends
├─ Gradient hero (illustration, title, subtitle — content.invite_hero_*) — nav bar backdrop
├─ Referral panel (covers hero's bottom 30px)
│   ├─ Balance card (settings.referral_balance, dashed outline)
│   ├─ Referral Rewards (2 rule cards using settings.referral_first_task / referral_pct)
│   └─ "How it works?" (4 bullets, content.invite_how_1..4)
└─ Sticky "Invite Friends" button
```

## Decisions

- All 4 detail screens built at full Figma fidelity (per explicit product decision), minus the
  globally-dropped status bar/prompt/search chrome.
- Game Detail's IAP cashback card text is static/hardcoded (fixed promo unit), not Sheet-driven.
- Game Detail's hero is `position: absolute` (not in-flow) specifically so it can extend behind
  the nav bar; this required a one-off `.nav-bar--overlay` fixed/transparent variant plus a
  scroll listener, since `#view`'s computed `overflow-y: auto` would otherwise clip it. Invite
  Friends now reuses that same overlay nav (its gradient is also a nav backdrop), but keeps its
  hero **in flow** — it doesn't need to escape `#view`'s box, since the gradient is a background
  on a normally-flowed block rather than an absolutely-positioned layer. The shared piece is the
  `[data-nav-backdrop]` marker both heroes carry, which `setupNavOverlay` measures.
- Reward Detail's points-style number and "How it works"/"Conditions" text are shared across all
  reward categories, sourced once from `content`.
- Wallet's filter chips are client-side only, reset on reload.
- Invite Friends' hero/panel overlap is implemented via CSS margin, not absolute positioning, to
  stay responsive to content height.

## Open items

- Decorative illustrations (game IAP promo image, invite hero illustration) remain static
  placeholder assets — not listed as Sheet-driven content.
