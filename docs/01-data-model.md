# 01 — Data Model (Google Sheets)

# 01 — Data Model (Google Sheets)

## The sheet is chosen at runtime, via the URL

There is no master sheet, no default sheet, and no fixed locale set. The app renders whatever
public Google Sheet is referenced by the URL hash: `#/<sheet-id>/<route>`, e.g.
`#/1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU/discover`. A full Sheets URL
(`https://docs.google.com/spreadsheets/d/<id>/edit`) in the hash also works — `js/app.js`
extracts the ID. There is nothing in app code that knows about "pz-en"/"pz-de" or any other
specific spreadsheet; those names below are just convenient examples of sheets this app has
been tested against.

Switching which content is shown is purely a URL change — paste a different sheet's ID into
the hash. There is no code change and no "master cell" to edit.

**What makes a sheet valid:** 6 tabs named exactly `games`, `tasks`, `rewards`, `wallet`,
`settings`, `content`, with the columns documented below, shared "Anyone with the link —
Viewer". `js/sheets.js` validates all of this on load (see "Validation and failure modes"
below) and the app shows a specific, actionable error screen — not a blank page or English
placeholder content — if any part of it doesn't hold.

### Example sheets used during development

| Sheet | ID | Purpose |
|---|---|---|
| pz-en | `1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU` | English reference content, 19 games / 114 tasks / 12 rewards / 9 wallet rows / 7 settings keys / 73 content keys. |
| pz-de | `12jvO2x_ay8umdq22SDwrpxkr_2HD705hujnnwNbGRrs` | German translation of the same dataset — proves the app is locale-agnostic (confirmed: identical schema, different `content`/`settings` values, different gids from pz-en since it was NOT duplicated gid-for-gid). |

`seed/*.tsv` is a paste-ready template generated from the pz-en reference sheet — see
`seed/README.md` for how to turn it into your own sheet.

## Fetch mechanism: gviz JSON endpoint

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=<TAB_NAME>
```

- No API key required, CORS-friendly, returns typed values.
- Response body is NOT pure JSON — it's wrapped: `/*O_o*/\ngoogle.visualization.Query.setResponse({...});`
  Strip everything outside the outermost `{...}` before `JSON.parse`.
- Row 1 of each tab is the header row. `table.cols[i].label` gives the header text IF the sheet
  has a proper header row recognized by gviz; otherwise `label` is empty and `id` is `ColN`.
  To be safe, **the app treats row 1 as headers explicitly** rather than relying on `cols[].label`.

### Tabs are addressed by name, not gid

Confirmed by testing live against multiple independently-created spreadsheets:
`?sheet=<name>` returns exactly that tab, case-insensitively, byte-identical to the equivalent
`?gid=<N>` request. Only a name that doesn't match any tab falls through to the first tab in
the sheet — which `js/sheets.js`'s column validation (below) catches, since the fallen-through
tab's headers won't match what was requested.

Name-based addressing is required, not just preferred, now that the sheet ID is arbitrary:
gids are per-spreadsheet — they only ever matched across pz-en/pz-de because pz-de happened to
be duplicated from pz-en. A sheet created independently (as any user-supplied sheet will be)
has unrelated gids, so a gid map hardcoded for one sheet would silently fetch the wrong tabs
from another.

### Header + key validation

Header validation (does tab X have all the columns `EXPECTED_COLUMNS[X]` requires) and,
for `settings`/`content`, key validation (does the key/value tab have every key the rest of
the app reads) both happen in `js/sheets.js` before any data reaches a view. A failure throws
a typed `SheetError` (`BAD_SCHEMA` or `MISSING_KEYS`) that `js/app.js` turns into a specific
error screen naming the tab and the missing columns/keys — see "Validation and failure modes".

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
| `href` | string (URL) | Play Store / App Store link. Drives the Discover card's "Play" pill and the Game Detail "Play Now" button via `location.href` (same tab). Required column, but may be blank per-row — a blank value renders the button/pill dimmed and inert (`Render.playHref`) instead of failing the sheet load. No scheme validation is performed. |

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
| `category` | string, e.g. `Cash`, `Amazon`, `Google Play`, `Apple` | drives which horizontal row the card appears in — your sheet can use any category names |
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
which map known brand names (`PayPal`, `Amazon`, `Google Play`, `Apple`) to local PNGs in
`assets/icons/` (falls back to a colored letter circle for unknown brands — so a brand outside
this list still renders, just without a bespoke logo).

Reward Detail screen (tap any payout card) shows that single reward's `amount`, plus its own
`reward_detail_how_1/2/3`, `reward_detail_conditions_1/2`, and `reward_detail_disclaimer` —
each reward's copy is independent, letting different brands carry brand-appropriate
redemption instructions.

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

| `key` | Required? | Example `value` | Used by |
|---|---|---|---|
| `balance` | **yes** | `$2.30` / `2,30€` | wallet pill in every nav bar, Rewards balance card, Wallet balance card |
| `referral_balance` | **yes** | `$120.00` / `120,00€` | Invite Friends "Your Referral Balance" |
| `referral_first_task` | **yes** | `$5.00` / `5,00€` | Invite Friends reward rule, for completing first task |
| `referral_pct` | **yes** | `10` | Invite Friends "xx%" of game rewards — percent-formatted, not currency |
| `currency_symbol` | optional | `$` / `€` | Plain text, read verbatim. Drives `Render.splitAmount()`/`parseAmount()`/`formatAmount()` (`js/render.js`) — the ONLY code-level knowledge of which symbol is active. If omitted, sniffed from sample data. |
| `currency_position` | optional | `prefix` / `suffix` | Whether the symbol renders before or after the number (pz-en: `$5.00`, pz-de: `5,00€`). Any other value is treated as `prefix`. |
| `number_locale` | optional | `en-US` / `de-DE` | A BCP-47 tag passed to `Intl.NumberFormat`/`toLocaleString` to derive the decimal/thousands separators (`,`/`.` swap between locales) and to set `<html lang>` (`js/app.js`). Defaults to `en-US`. |

`js/sheets.js` requires `balance`, `referral_balance`, `referral_first_task`, and
`referral_pct` to be present and non-blank — a sheet missing any of them fails to load with a
`MISSING_KEYS` error naming exactly which key(s) are missing, rather than rendering with blank
amounts. The 3 currency keys are deliberately NOT required, so a minimal sheet still loads and
falls back to sniffing a symbol off real data (assuming `en-US`/prefix).

These 3 currency keys must be **plain text cells**, not Sheets-native currency/number formats
— they're read via `v`, not `f`, so autoformatting would corrupt them.

### `content` (key/value — all static screen text)

Flat key/value table. Every user-visible string that isn't per-row sheet data (game names,
task amounts, brand names, etc.) lives here, so copy can be changed without a deploy. Looked
up via `Render.t(key)` / `Render.tRaw(key)` (`js/render.js`).

**All 73 of the keys below are required** — `js/sheets.js` checks each one is present and
non-blank before a sheet load can succeed, failing with a `MISSING_KEYS` error naming exactly
which key(s) are missing. There is no bundled fallback content anymore, so an incomplete
`content` tab is treated as an invalid sheet rather than a sheet that partially renders in
English.

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
nav_title_game_fallback / nav_title_reward_fallback   # shown if a #/<sheetId>/game/:id or #/<sheetId>/reward/:id has no match

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
- Every error screen's copy (`js/app.js` `errorContentFor`) — necessarily hardcoded, since
  these fire precisely when a `content` tab can't be trusted to supply its own text (missing,
  unreachable, or incomplete sheet).
- The `+` / `-` sign on Wallet amounts — derived from `wallet.type`, not copy (making it
  editable would let the data contradict itself: an "earned" row showing a minus sign).
- The `%` after `settings.referral_pct` on Invite — a unit glyph on a numeric setting, same
  category as the wallet sign.

## Validation and failure modes

`js/sheets.js` throws a typed `SheetError` for every way a sheet load can fail; `js/app.js`
renders a distinct error screen for each:

| `SheetError.code` | Trigger | Error screen says |
|---|---|---|
| *(no sheet ID in hash)* | `#/` with nothing after it | "No spreadsheet specified" + how to add one |
| `BAD_ID` | Hash segment isn't a valid-looking spreadsheet ID | "That doesn't look like a Google Sheet ID" + what was received |
| `NOT_FOUND` | gviz returns HTTP 404 (confirmed: an invalid/nonexistent ID 404s) | "Spreadsheet not found" + check ID + sharing |
| `NO_ACCESS` | gviz returns an HTML page (Google sign-in/consent) instead of its usual JS-wrapped JSON — happens when the sheet exists but isn't shared "Anyone with the link" | "This spreadsheet isn't publicly readable" + sharing instructions |
| `BAD_SCHEMA` | A tab's header row is missing one or more columns `EXPECTED_COLUMNS` requires | "This isn't a valid PlayZone spreadsheet" + which tab + which columns |
| `MISSING_KEYS` | `settings` or `content` is missing a required key, or it's present but blank | which tab + exactly which key(s) |
| `NETWORK` | fetch rejects (offline, etc.) | "Couldn't load data" + Retry button |

There is no bundled fallback dataset: any of the above is an all-or-nothing failure for the
whole sheet load (`Promise.all`, not per-tab `allSettled`) — the app either renders a
fully-loaded, fully-valid sheet, or a specific error screen. It never silently blends rows from
an unrelated dataset into a partially-failed load.

## Decisions

- **Currency formatting is owned entirely by the sheet, never by app code.** Every amount
  column (`games.total_reward`/`max_per_task`, `tasks.amount`, `rewards.amount`,
  `wallet.amount`, `settings.balance`/`referral_balance`/`referral_first_task`) is read and
  rendered verbatim from the sheet's *formatted* cell value — `js/sheets.js` reads gviz's `f`
  (not `v`), so a cell showing `$5.00` in the sheet UI renders as `$5.00` in the app, with no
  symbol concatenated in JS. `js/render.js` exposes `splitAmount()` for the few spots that tint
  the symbol a different color than the number (nav-bar wallet pill, game card total), and
  `parseAmount()`/`formatAmount()` for the one place that must do arithmetic — summing a game's
  task amounts (`Render.computedTotal()`). Both read the active sheet's
  `currency_symbol`/`currency_position`/`number_locale` from `settings` (see above) rather than
  sniffing format off sample data when those keys are present, so a given sheet's currency
  presentation is purely a sheet-authoring concern, never a code change.
- **Enum-like columns must never be translated, in any sheet.** These are read by exact
  string match in app code, not displayed as copy — translating them breaks the app silently
  (wrong badge, wrong filter, wrong card variant) rather than throwing:
  - `games.has_cashback` / `games.has_limited_bonus` / `tasks.is_active` — must stay
    `TRUE`/`FALSE`.
  - `wallet.type` — must stay `earned`/`spent`. `js/sheets.js`'s `fetchAll()` warns in the
    console if any wallet row's `type` isn't `earned`/`spent`, but doesn't correct the data.
  - `rewards.brand` — must stay the exact English brand name (`PayPal`, `Amazon`,
    `Google Play`, `Apple`) to get a bespoke logo via `BRAND_SLUGS`/`BRAND_LETTER_COLORS`
    (`js/render.js`); any other brand name still renders fine via the letter-circle fallback.
    `rewards.category` (shown verbatim as a section heading) is always safe to translate.
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
  `reward_detail_*` columns on the `rewards` tab, not in `content`), so each reward brand can
  carry its own redemption copy.

## Known limitation: untrusted sheet content

Since the app will render whatever public sheet the URL points at, it's effectively rendering
third-party content. Values from `games.image_url`/`wallet.icon_url` are interpolated into
inline `style="background-image:url('...')"` / `<img src="...">` with only basic
HTML-escaping (`Render.esc`) — not a URL-scheme allowlist or CSS-context-aware escaping. This
is an accepted gap for the current demo scope: treat a sheet ID link the same way you'd treat
any other link from an untrusted source, and don't open sheet IDs from sources you don't
trust.
