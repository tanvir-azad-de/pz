# 01 — Data Model (Google Sheets)

## Locale sheets + master sheet

The app is served by **three** spreadsheets, not one:

| Role | Sheet ID | Purpose |
|---|---|---|
| Master | `1g9h9pcDypXhZEFuPyVZmaQ7DUI-RqqhpnV-zivLkeXY` | A single `isActive` row whose value is the spreadsheet ID of whichever locale sheet is currently live. |
| pz-en | `1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU` | English content. Also the hardcoded `DEFAULT_SHEET_ID` fallback. |
| pz-de | `12jvO2x_ay8umdq22SDwrpxkr_2HD705hujnnwNbGRrs` | German content. |

At boot, `js/sheets.js` (`Sheets.load()`) first fetches **gid 0** of the master sheet, reads the
row whose column A is `isActive`, and takes column B as the spreadsheet ID to use for the 6
content tabs below. **pz-en and pz-de are duplicates of each other — all 6 tab gids are
identical across both** — so switching locale is purely "which spreadsheet ID", never "which
gid map".

The master sheet has **no header row** (gviz reports `parsedNumHeaders: 0`, blank
`cols[].label`), by design — it's a single ad-hoc key/value pair, not a table. It is therefore
parsed by a dedicated function (`fetchMasterSheetId` in `js/sheets.js`), NOT by the generic
`gvizToObjects()` used for the 6 content tabs (which would misinterpret row 0 as a header and
discard the one real row).

**Failure handling:** if the master sheet is unreachable, has no `isActive` row, or its value
doesn't look like a spreadsheet ID (`/^[A-Za-z0-9_-]{25,60}$/`), the app logs a `console.warn`
and falls back to `DEFAULT_SHEET_ID` (pz-en). A broken master cell degrades to "show English",
never to a hard failure.

To switch the live locale: edit the master sheet's `isActive` row, column B, to the target
locale's spreadsheet ID. No code change, no deploy.

## Locale sheet (pz-en / pz-de)

- URL: `https://docs.google.com/spreadsheets/d/1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU/edit`
- Sheet ID: `1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU`
- Sharing: must be public ("Anyone with the link can view") for the gviz endpoint to work
  unauthenticated.
- **Status as of 2026-10-23: all 6 tabs are fully populated** — 19 games, 114 tasks (6 per
  game), 12 rewards, 9 wallet transactions, 7 settings keys, 73 content keys. `data/fallback.json`
  and `seed/*.tsv` are regenerated directly from this live sheet (see `seed/README.md`), so all
  three stay in lockstep — there is no longer a smaller/stale demo dataset.

## Fetch mechanism: gviz JSON endpoint

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&gid=<TAB_GID>
```

- No API key required, CORS-friendly, returns typed values.
- Response body is NOT pure JSON — it's wrapped: `/*O_o*/\ngoogle.visualization.Query.setResponse({...});`
  Strip everything outside the outermost `{...}` before `JSON.parse`.
- Row 1 of each tab is the header row. `table.cols[i].label` gives the header text IF the sheet
  has a proper header row recognized by gviz; otherwise `label` is empty and `id` is `ColN`.
  To be safe, **the app treats row 1 as headers explicitly** rather than relying on `cols[].label`.

### ⚠️ Critical gotcha #1 — silent fallback on bad tab name

Confirmed by testing against the live sheet: requesting `sheet=<name>` with ANY name — including
the correct tab names AND deliberately nonsense names like `zzzznope123` — returns
`"status":"ok"` with the **`games`** tab's data every time. Tab-name-based lookup is completely
unreliable on this sheet. A typo, or even a correctly-spelled tab name, will NOT throw — it will
silently return the wrong tab's data.

**Resolution: address tabs by numeric `gid` instead of `sheet=<name>`.** Each tab's gid is
visible in the sheet's URL when that tab is active (`#gid=<number>`), and is stable unless the
tab is deleted and recreated.

| Tab | gid |
|---|---|
| `games` | `420976241` |
| `tasks` | `666986029` |
| `rewards` | `955004045` |
| `wallet` | `1476565906` |
| `settings` | `719558094` |
| `content` | `1744568315` |

### ⚠️ Gotcha #2 — header validation still required

Even with gid-based addressing, validate the returned header row against the expected column
list for that gid before trusting the data. If it doesn't match, treat it as a fetch failure
(trigger retry UI / fallback), not as "tab is empty." Implemented in `js/sheets.js` (chunk 3).

## Tabs and columns

### `games`

| Column | Type | Notes |
|---|---|---|
| `id` | string | stable unique id, e.g. `g1` |
| `name` | string | e.g. `Coin Master` |
| `image_url` | string (URL) | used as both the 201h hero/card art AND the 92px rounded Game Detail icon (same image, cropped via CSS) |
| `description` | string | one short line, shown under the name on the card (Figma: "Description max 1 line of text...") |
| `total_reward` | string | e.g. `$1,000.00` — pre-formatted by the sheet, shown verbatim as the game card footer amount AND the "total reward" stat on Game Detail |
| `max_per_task` | string | e.g. `$75.00` — pre-formatted by the sheet, shown verbatim as "max per task" stat on Game Detail |
| `long_description` | string | paragraph, shown in the Game Detail "Description" card with "...See More" truncation |
| `has_cashback` | boolean (`TRUE`/`FALSE`) | shows the "Cashback" badge (dollar icon) on the card |
| `has_limited_bonus` | boolean (`TRUE`/`FALSE`) | shows the "Limited Bonus" badge (stopwatch icon) on the card |

**Convention:** row 2 (the first data row) is the **Trending Game** shown on Discover. All rows
render in both Discover → "All Games" and My Games (My Games shows the identical list as
Discover, 2-column, per product decision — no filtering).

The footer amount shown on every game card is `games.total_reward`, shown verbatim (not
computed) — the symbol is split out via `Render.splitAmount()` so it can be tinted
`var(--color-primary)` without the app hardcoding what that symbol is. This is a different
number from the "Tasks ... total" badge on Game Detail, which IS computed:
`SUM(tasks.amount WHERE tasks.game_id == games.id)`, formatted via `Render.computedTotal()`
using the currency symbol detected from the sheet data (see "Currency formatting" below) — the
app never hardcodes a `$`.

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `game_id` | string | foreign key → `games.id` |
| `name` | string | e.g. `Level 10` |
| `amount` | string | e.g. `$5.00` — pre-formatted by the sheet, shown verbatim; never hardcode a `$` in code |
| `is_active` | boolean (`TRUE`/`FALSE`) | at most one `TRUE` row per `game_id`; renders the green "Active task" pill badge |

Rows for a given `game_id` render in sheet order (top to bottom = display order).

### `rewards`

| Column | Type | Notes |
|---|---|---|
| `id` | string | e.g. `r1` |
| `category` | string, one of `Cash`, `Amazon`, `Google Play`, `Apple` | drives which horizontal row the card appears in |
| `brand` | string | logo label shown on the card, e.g. `PayPal`, `Zalando`, `Amazon` |
| `amount` | string | e.g. `$5.00`, `$10.00` — pre-formatted by the sheet, shown verbatim |
| `reward_detail_how_1` | string | Reward Detail "How it works" bullet 1 |
| `reward_detail_how_2` | string | Reward Detail "How it works" bullet 2 |
| `reward_detail_how_3` | string | Reward Detail "How it works" bullet 3 |
| `reward_detail_conditions_1` | string | Reward Detail "Conditions" bullet 1 |
| `reward_detail_conditions_2` | string | Reward Detail "Conditions" bullet 2 |
| `reward_detail_disclaimer` | string | Reward Detail disclaimer box text |

There's no `progress_pct` column. The progress bar under the amount on each payout card is
derived client-side: `settings.balance / rewards.amount`, as a percentage, clamped to 100%
(once the balance covers the reward) and rounded to a whole percent for the inline fill width.

Brand logos (36px payout card + larger Reward Detail lockup) are NOT sourced from the sheet —
they're resolved client-side from `brand` via `Render.brandLogo()` / `Render.brandLogoWide()`,
which map known brand names to local PNGs in `assets/icons/` (falls back to a colored letter
circle for unknown brands). The sheet previously had `icon_url`/`detail_image_url` columns for
this, but they were never read by the app and have been removed.

Reward Detail screen (tap any payout card) shows that single reward's `amount`, plus its own
`reward_detail_how_1/2/3`, `reward_detail_conditions_1/2`, and `reward_detail_disclaimer` —
each reward's copy is independent, letting Cash/Amazon/Google Play/Apple rewards carry
brand-appropriate redemption instructions. The deprecated coin icon and its decorative
`1 000`-style points number (previously static `content` tab copy), plus the later
`Render.progressAmount()` derived currency figure that replaced it, have both been removed.

### `wallet`

| Column | Type | Notes |
|---|---|---|
| `date` | string | e.g. `October 8th` — used verbatim as the group header text (not parsed as a real date) |
| `type` | string, one of `earned`, `spent` | drives `+`/`-` sign (prepended to the sheet-formatted amount), and the Earned/Spent filter chip |
| `name` | string | e.g. `Fishdom`, `Survey`, coupon title |
| `subtitle` | string | e.g. `Level 10`, or coupon subtitle |
| `amount` | string | e.g. `$75.00` — pre-formatted by the sheet; absolute value, sign applied from `type` |
| `status` | string, blank or `Pending` | renders the purple "Pending" badge when non-blank |
| `icon_url` | string (URL) | 50px art/icon for the row |
| `coupon_code` | string, optional | when non-empty, renders the taller coupon card variant with the code box and "Copy & Shop" button |

Rows group by `date` in sheet order; within a date group, sheet order = display order.

### `settings` (key/value — single scalars only)

These cells are numbers with a currency *display format* applied in the sheet (not text), so
gviz returns both a raw value (`v`, e.g. `2.3`) and a formatted string (`f`, e.g. `$2.30`). The
data layer (`js/sheets.js`) reads `f` for every cell so these values arrive pre-formatted just
like every other amount column, with no `$` hardcoded in the app.

| `key` | Example `value` (as read by the app) | Used by |
|---|---|---|
| `balance` | `$2.30` (pz-en) / `2,30€` (pz-de) | wallet pill in every nav bar, Rewards balance card, Wallet balance card |
| `referral_balance` | `$120.00` / `120,00€` | Invite Friends "Your Referral Balance" |
| `referral_first_task` | `$5.00` / `5,00€` | Invite Friends reward rule, for completing first task |
| `referral_pct` | `10` | Invite Friends "xx%" of game rewards — percent-formatted, not currency |
| `currency_symbol` | `$` / `€` | Plain text, read verbatim. Drives `Render.splitAmount()`/`parseAmount()`/`formatAmount()` (`js/render.js`) — the ONLY code-level knowledge of which symbol is active. |
| `currency_position` | `prefix` / `suffix` | Whether the symbol renders before or after the number (pz-en: `$5.00`, pz-de: `5,00€`). Any other value is treated as `prefix`. |
| `number_locale` | `en-US` / `de-DE` | A BCP-47 tag passed to `Intl.NumberFormat`/`toLocaleString` to derive the decimal/thousands separators (`,`/`.` swap between locales) and to set `<html lang>` at boot (`js/app.js`). |

These 3 keys must be **plain text cells**, not Sheets-native currency/number formats — they're
read via `v`, not `f`, so autoformatting would corrupt them. If they're absent (e.g. an older
sheet, or `data/fallback.json`, which intentionally still lacks them), `Render.initCurrency()`
falls back to sniffing a leading symbol off real data, assuming `en-US`/prefix — the original
pre-locale behavior.

### `content` (key/value — all static screen text)

Flat key/value table. Every user-visible string that isn't per-row sheet data (game names,
task amounts, brand names, etc.) lives here, so copy can be changed without a deploy. Looked
up via `Render.t(key)` / `Render.tRaw(key)` (`js/render.js`), which falls through live sheet →
bundled `data/fallback.json` → console warning + empty string.

```
email
invite_card_discover_text        # "Invite your friends and earn up to $50 bonus" (Discover) — amount is
                                  # part of the prose string, authored directly in the sheet
bonus_1_title / bonus_1_cta
bonus_2_title / bonus_2_cta
invite_hero_title                # "Earn up to $100 for every friend invited!"
invite_hero_subtitle             # "Just share your link and start earning. Works on iOS & Android"
invite_how_1 / invite_how_2 / invite_how_3 / invite_how_4

# Shell: tab bar labels + nav bar titles
tab_label_discover / tab_label_my_games / tab_label_rewards / tab_label_profile
nav_title_discover / nav_title_my_games / nav_title_rewards / nav_title_profile
nav_title_wallet / nav_title_invite
nav_title_game_fallback / nav_title_reward_fallback   # shown if a #/game/:id or #/reward/:id has no match

# Shared across screens
common_see_all / common_balance_label / common_payout_cta

# Discover
discover_invite_cta / discover_trending_title / discover_all_games_title
game_card_badge_cashback / game_card_badge_limited_bonus / game_card_play_cta

# My Games
my_games_empty_title / my_games_empty_body

# Game Detail
game_detail_not_found / game_detail_total_reward_label / game_detail_max_per_task_label
game_detail_cashback_title / game_detail_cashback_subtitle / game_detail_cashback_cta
game_detail_tasks_title / game_detail_tasks_total_suffix / game_detail_tasks_subtitle
game_detail_description_title / game_detail_see_more_cta / game_detail_play_cta
game_detail_task_active_badge

# Reward Detail (headings/CTA only — per-reward body text stays on the `rewards` tab)
reward_detail_not_found / reward_detail_how_title / reward_detail_conditions_title
reward_detail_confirm_cta

# Wallet
wallet_filter_all / wallet_filter_earned / wallet_filter_spent / wallet_copy_shop_cta

# Profile
profile_wallet_row_label / profile_bonuses_title / profile_email_label
profile_menu_help / profile_menu_terms / profile_menu_imprint / profile_menu_privacy
profile_delete_account_cta

# Invite
invite_referral_balance_label / invite_rewards_title / invite_rewards_intro
invite_reward_first_task_label / invite_reward_pct_label / invite_reward_pct_caption
invite_referral_pct_note / invite_how_title / invite_cta
```

Bonuses are stored as indexed keys (`bonus_1_*`, `bonus_2_*`) rather than a separate
tab, per product decision. The loader (`js/sheets.js`) collects these into an array of 2 objects
`{slot, title, cta}` after fetching (a third "bonus_3" card existed earlier but was removed per
product decision — any leftover `bonus_3_*` columns in the live Sheet are simply ignored, not
an error). Bonus card illustrations are NOT sheet-driven — there is no `bonus_N_icon` content
key. An image path isn't user-visible copy, so the art stays a fixed asset in
`PROFILE_BONUS_ILLUSTRATIONS` (`js/views/profile.js`).

A handful of strings are intentionally NOT sheet-driven and remain hardcoded in app code:
- `<title>PlayZone</title>` (`index.html`) — parsed before any JS runs.
- The "Couldn't load data" / "Check your connection and try again." / "Retry" error state
  (`js/app.js` `renderErrorState`) — only reachable when the live sheet fetch AND the bundled
  `data/fallback.json` both fail, so no content source is available by definition.
- The `+` / `-` sign on Wallet amounts — derived from `wallet.type`, not copy (making it
  editable would let the data contradict itself: an "earned" row showing a minus sign).
- The `%` after `settings.referral_pct` on Invite — a unit glyph on a numeric setting, same
  category as the wallet sign.

## Decisions

- **Currency formatting is owned entirely by the sheet, never by app code.** Every amount
  column (`games.total_reward`/`max_per_task`, `tasks.amount`, `rewards.amount`,
  `wallet.amount`, `settings.balance`/`referral_balance`/`referral_first_task`) is read and
  rendered verbatim from the sheet's *formatted* cell value — `js/sheets.js` reads gviz's `f`
  (not `v`), so a cell showing `$5.00` in the sheet UI renders as `$5.00` in the app, with no
  symbol concatenated in JS. `js/render.js` exposes `splitAmount()` for the few spots that tint
  the symbol a different color than the number (nav-bar wallet pill, game card total), and
  `parseAmount()`/`formatAmount()` for the one place that must do arithmetic — summing a game's
  task amounts (`Render.computedTotal()`). Both now read the active locale's
  `currency_symbol`/`currency_position`/`number_locale` from `settings` (see above) rather than
  sniffing format off sample data, so switching locale is purely a sheet-authoring change
  (which spreadsheet the master points at + its `settings` values), never a code change.
- **Enum-like columns must never be translated, in any locale sheet.** These are read by exact
  string match in app code, not displayed as copy — translating them breaks the app silently
  (wrong badge, wrong filter, wrong card variant) rather than throwing:
  - `games.has_cashback` / `games.has_limited_bonus` / `tasks.is_active` — must stay
    `TRUE`/`FALSE`.
  - `wallet.type` — must stay `earned`/`spent`. (A prior pz-de draft translated this to
    `Verdient`/`Ausgegeben`; `js/sheets.js`'s `fetchAll()` now warns in the console if any
    wallet row's `type` isn't `earned`/`spent`, but it doesn't correct the data.)
  - `rewards.brand` — must stay the exact English brand name (`PayPal`, `Amazon`,
    `Google Play`, `Apple`); it's a lookup key into `BRAND_SLUGS`/`BRAND_LETTER_COLORS`
    (`js/render.js`) for logo PNGs, not display text. `rewards.category` (shown verbatim as a
    section heading) IS safe to translate (pz-de uses `Bargeld` for `Cash`).
  - `games.id` must stay the pattern `g<number>` — `js/sheets.js` drops any `games`/`tasks` row
    that fails a basic shape check (`id` not matching `g\d+`, or `tasks.game_id` blank) as a
    guard against structurally broken rows (e.g. a cell-internal newline shifting a row's
    columns), logging a `console.warn` rather than rendering garbage.

- 6 tabs total: `games`, `tasks`, `rewards`, `wallet`, `settings`, `content`. No separate
  `profile`/`bonuses`/`referral` tabs — those values live in `settings`/`content`.
- `settings` holds ONLY single scalars (key/value, one row per key) — this avoids mixing a
  lone balance cell with tabular transaction rows, which would break the gviz single-table
  parse used for `wallet`.
- Trending game = row 2 of `games` (first data row), by convention. My Games = identical list
  to Discover's "All Games", rendered 2-column — no separate selection mechanism.
- Progress bars render on the Rewards payout cards (not on Reward Detail, which has none),
  computed from `settings.balance` vs. each reward's `amount` rather than authored in the sheet.
- Game Detail reuses `games.image_url` for both the wide hero and the small rounded icon —
  no separate `icon_url` column for games.
- "How it works" / "Conditions" / disclaimer text on Reward Detail is per-reward (stored as
  `reward_detail_*` columns on the `rewards` tab, not in `content`), so each Cash/Amazon/Google
  Play/Apple reward can carry its own redemption copy.

## Open items

- `seed/*.tsv` and `data/fallback.json` are both generated directly from the live pz-en sheet
  (all 19 games, 114 tasks, 12 rewards, 9 wallet rows, 7 settings keys, 73 content keys) and
  are kept byte-identical to it and to each other. If the live sheet changes, regenerate both
  rather than hand-editing — a script fetches all 6 tabs via the same gviz normalization logic
  as `js/sheets.js` and writes both outputs from one pass, so they can't drift from each other.
- `data/fallback.json` is what the app renders from on live fetch failure (per-tab or total).
  `seed/*.tsv` is a paste-ready snapshot of the same data, useful for resetting a sheet or
  seeding pz-de before translation.
