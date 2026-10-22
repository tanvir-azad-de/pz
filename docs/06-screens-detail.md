# 06 — Detail Screens

Covers the 4 screens reached by tapping into a tab screen: Game Detail, Reward Detail, Wallet,
Invite Friends. All are built at full fidelity to their Figma frames (per product decision),
minus the status bar/prompt/search chrome dropped globally.

## Game Detail (Figma node `1:4424`)

Route `#/game/:id`. Back arrow + game name in nav bar. No tab bar; sticky "Play Now" footer.

1. **Hero image** — 200px tall, `border-radius: 20px`, `background-image: games.image_url`,
   `background-size: cover`, full width minus 16px screen padding, `margin: 0 16px`.

2. **Icon + title block** — 92×92 rounded icon (`border-radius: 20px`, reusing
   `games.image_url`, cropped via `object-fit: cover` / `background-size: cover`) stacked above
   the game name (`.t-title-sm`, 20/700), `gap: 8px`, `padding: 0 16px`.

3. **Stats row** — `display:flex; gap:12px; padding:0 16px`, two equal-width stat blocks
   separated by a vertical `1px solid var(--purple-600)` divider:
   - "total reward" (`.t-body-sm` 12/300 label) above a pill:
     `games.total_reward` (`.t-title-sm`, 20/700), pill `border-radius: 32px`
   - "max per task" label above a pill: `games.max_per_task`

4. **IAP cashback card** — `background: var(--color-surface)`, `border-radius: 8px`,
   `padding: 12px`, `gap: 12px`. Row: text block (title "Earn up to $50 cashback"
   `.t-body-lg` 16/800 + subtitle "Earn 50% cashback every time you make a purchase"
   `.t-body-md` 14/400) + decorative image (81×57) — both static copy per Figma (not
   Sheet-driven; this card's text is hardcoded, not a `content` key, since it's a fixed promo
   unit not described as needing to vary). Below: "How it works?" pill ghost button with arrow
   icon, visual only.

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
     - Right: `$ {tasks.amount}` (`.t-title-sm`, 20/700)

6. **Description card** — `background: var(--color-surface)`, `border-radius: 8px`, `padding:
   12px`: "Description" label (`.t-body-md` 14/800) + `games.long_description` (`.t-body-sm`
   12/300), truncated to ~2 lines with a trailing "...See More" (visual only — tapping expands
   in place by removing the `line-clamp`, no navigation).

7. **Sticky footer** — "Play Now" (`.btn-primary`, full width, 58px), visual only (no real game
   launch).

```
Game Detail
├─ Hero image (games.image_url)
├─ Icon + name
├─ Stats: total reward | max per task
├─ IAP cashback card (static copy)
├─ Tasks card (header total = SUM(tasks.amount), N task rows, active badge)
├─ Description card (long_description, See More)
└─ Sticky "Play Now"
```

## Reward Detail (Figma node `1:6256`)

Route `#/reward/:id`. Back arrow + `rewards.brand` in nav bar. Sticky "Confirm Payout" footer.

1. **Offer card** — white card (`background: #fff`, `border-radius: 20px`, `padding: 20px 16px`),
   centered content: large logo (`rewards.detail_image_url`, ~200×64 area).

2. **Amount row** — below the white card, `display:flex; gap:24px; align-items:baseline`:
   - `rewards.amount` in large text (`.t-display-lg`, 32/800)
   - secondary figure: `Render.progressAmount()` — `amount x progress_pct` (e.g. `$5` at 35%
     progress -> `$ 1.75`), deterministic per reward so this matches the payout card exactly
     (see `01-data-model.md`), `.t-title-md` 24/800. Deprecated coin icon removed.

3. **How it works** — "How it works" header (`.t-title-sm`, 20/700) + 3 bullet lines
   (`content.reward_detail_how_1/2/3`, `.t-body-sm` 12/300).

4. **Divider** — `1px solid var(--purple-700)`.

5. **Conditions** — "Conditions" header + 2 bullet lines (`content.reward_detail_conditions_1/2`,
   same style).

6. **Disclaimer box** — `background: var(--color-surface)`, `border-radius: 8px`, `padding:
   10px 8px`, text `content.reward_detail_disclaimer` (`.t-body-sm` 12/300).

7. **Sticky footer** — "Confirm Payout" (`.btn-primary`), visual only.

```
Reward Detail
├─ White offer card (detail_image_url)
├─ Amount + points pill
├─ "How it works" (3 bullets, shared content)
├─ divider
├─ "Conditions" (2 bullets, shared content)
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

1. **Gradient hero** — `background: linear-gradient(...)` (gradient fill per Figma; exact stops
   not critical for a demo, approximate with `var(--purple-700)` → `var(--color-bg)`), `padding:
   24px 20px 48px`, height ~345px. Content, centered: decorative illustration (166×145,
   static), then title `content.invite_hero_title` (`.t-title-sm`, 20/700) + subtitle
   `content.invite_hero_subtitle` (`.t-body-md`, 14/400).

2. **Referral panel** — `background: var(--color-surface)`, overlapping the hero by `-25px`
   (negative margin-top on this section, achieved via `margin-top: -25px` on the panel wrapper
   or an equivalent negative `gap` on the parent flex container — Figma's `gap: -25` on the
   containing frame), `padding: 32px 16px 24px`:

   a. **Referral balance card** — `border: 1px solid var(--purple-400)`, `border-radius: 20px`,
      `padding: 16px 0`, centered text: "Your Referral Balance" (`.t-label-lg`, 16/800) above
      `$ {settings.referral_balance}` (`.t-title-md`, 24/800, color `var(--color-primary)`).

   b. **Referral Rewards** — header "Referral Rewards" (`.t-title-md`, 24/800) + subcopy "Earn
      rewards when your friend:" (`.t-body-lg`, 14/400). Two reward rule cards
      (`background: var(--color-bg)`, `border-radius: 8px`, `padding: 12px`):
      - "Completes the first task" + `$ {settings.referral_first_task}` (`.t-title-sm`,
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
├─ Gradient hero (illustration, title, subtitle — content.invite_hero_*)
├─ Referral panel (overlaps hero by -25px)
│   ├─ Balance card ($ settings.referral_balance)
│   ├─ Referral Rewards (2 rule cards using settings.referral_first_task / referral_pct)
│   └─ "How it works?" (4 bullets, content.invite_how_1..4)
└─ Sticky "Invite Friends" button
```

## Decisions

- All 4 detail screens built at full Figma fidelity (per explicit product decision), minus the
  globally-dropped status bar/prompt/search chrome.
- Game Detail's IAP cashback card text is static/hardcoded (fixed promo unit), not Sheet-driven.
- Reward Detail's points-style number and "How it works"/"Conditions" text are shared across all
  reward categories, sourced once from `content`.
- Wallet's filter chips are client-side only, reset on reload.
- Invite Friends' negative-margin hero/panel overlap is implemented via CSS margin, not
  absolute positioning, to stay responsive to content height.

## Open items

- Decorative illustrations (game IAP promo image, invite hero illustration) remain static
  placeholder assets — not listed as Sheet-driven content.
- Exact gradient stops for the Invite Friends hero are approximated; can be refined once/if the
  user supplies exact Figma gradient values.
