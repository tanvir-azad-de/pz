# 01 — Data Model (Google Sheets)

## Sheet

- URL: `https://docs.google.com/spreadsheets/d/1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU/edit`
- Sheet ID: `1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU`
- Sharing: must be public ("Anyone with the link can view") for the gviz endpoint to work
  unauthenticated.
- **Status as of 2026-10-22: all 6 tabs exist with header rows in place, but no data rows yet.**
  `settings` and `content` were initially built as wide single-row tables and have since been
  corrected to vertical `key`/`value` layout (see seed files below). The app ships with
  `data/fallback.json` and `seed/*.tsv` so it renders fully and can be populated by paste.

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
| `total_reward` | string | e.g. `$ 1000` — shown as "total reward" stat on Game Detail |
| `max_per_task` | string | e.g. `$ 75` — shown as "max per task" stat on Game Detail |
| `long_description` | string | paragraph, shown in the Game Detail "Description" card with "...See More" truncation |
| `has_cashback` | boolean (`TRUE`/`FALSE`) | shows the "Cashback" badge (dollar icon) on the card |
| `has_limited_bonus` | boolean (`TRUE`/`FALSE`) | shows the "Limited Bonus" badge (stopwatch icon) on the card |

**Convention:** row 2 (the first data row) is the **Trending Game** shown on Discover. All rows
render in both Discover → "All Games" and My Games (My Games shows the identical list as
Discover, 2-column, per product decision — no filtering).

The footer coin amount shown on every game card (`$ xx xxx`) and the "Tasks ... total" on Game
Detail are **computed**, not stored: `SUM(tasks.amount WHERE tasks.game_id == games.id)`.

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `game_id` | string | foreign key → `games.id` |
| `name` | string | e.g. `Level 10` |
| `amount` | number | e.g. `50` (rendered as `$ 50`) |
| `is_active` | boolean (`TRUE`/`FALSE`) | at most one `TRUE` row per `game_id`; renders the green "Active task" pill badge |

Rows for a given `game_id` render in sheet order (top to bottom = display order).

### `rewards`

| Column | Type | Notes |
|---|---|---|
| `id` | string | e.g. `r1` |
| `category` | string, one of `Cash`, `Amazon`, `Google Play`, `Apple` | drives which horizontal row the card appears in |
| `brand` | string | logo label shown on the card, e.g. `PayPal`, `Zalando`, `Amazon` |
| `amount` | string | e.g. `$5`, `$10`, `xxx` |
| `progress_pct` | number (0–100) | fill percentage of the progress bar under the amount |
| `icon_url` | string (URL) | 36px rounded logo shown on the small payout card |
| `detail_image_url` | string (URL) | larger logo image shown on the Reward Detail screen's white card |

Reward Detail screen (tap any payout card) shows that single reward's `amount`, plus a
secondary currency figure computed client-side by `Render.progressAmount()`:
`amount x progress_pct`, e.g. `$5` at 35% progress -> `$ 1.75`. This is NOT a stored column —
it's derived on every render from `amount` + `progress_pct`, so the payout card and the Reward
Detail screen for the same reward always show the identical figure. Resolves to `""` (nothing
rendered) if `amount` doesn't parse as a number, since the column allows placeholder junk like
`xxx`. The deprecated coin icon and its decorative `1 000`-style points number (previously
static `content` tab copy) have been removed.

### `wallet`

| Column | Type | Notes |
|---|---|---|
| `date` | string | e.g. `October 8th` — used verbatim as the group header text (not parsed as a real date) |
| `type` | string, one of `earned`, `spent` | drives `+$`/`-$` sign, and the Earned/Spent filter chip |
| `name` | string | e.g. `Fishdom`, `Survey`, coupon title |
| `subtitle` | string | e.g. `Level 10`, or coupon subtitle |
| `amount` | number | absolute value; sign applied from `type` |
| `status` | string, blank or `Pending` | renders the purple "Pending" badge when non-blank |
| `icon_url` | string (URL) | 50px art/icon for the row |
| `coupon_code` | string, optional | when non-empty, renders the taller coupon card variant with the code box and "Copy & Shop" button |

Rows group by `date` in sheet order; within a date group, sheet order = display order.

### `settings` (key/value — single scalars only)

| `key` | Example `value` | Used by |
|---|---|---|
| `balance` | `2.30` | wallet pill in every nav bar (`$ x.xx`), Rewards balance card, Wallet balance card |
| `referral_balance` | `120` | Invite Friends "Your Referral Balance" |
| `referral_first_task` | `5` | Invite Friends reward rule, "$ xx" for completing first task |
| `referral_pct` | `10` | Invite Friends "xx%" of game rewards |

### `content` (key/value — all static screen text)

Flat key/value table. Keys used by the app (exact strings expected by the renderer):

```
email
invite_card_discover_text        # "Invite your friends and earn up to $xx bonus" (Discover)
bonus_1_title / bonus_1_cta / bonus_1_icon
bonus_2_title / bonus_2_cta / bonus_2_icon
reward_detail_how_1 / reward_detail_how_2 / reward_detail_how_3
reward_detail_conditions_1 / reward_detail_conditions_2
reward_detail_disclaimer
invite_hero_title                # "Earn up to $xxx for every friend invited!"
invite_hero_subtitle             # "Just share your link and start earning. Works on iOS & Android"
invite_how_1 / invite_how_2 / invite_how_3 / invite_how_4
```

Bonuses are stored as indexed keys (`bonus_1_*`, `bonus_2_*`) rather than a separate
tab, per product decision. The loader (`js/sheets.js`) collects these into an array of 2 objects
`{title, cta, icon}` after fetching (a third "bonus_3" card existed earlier but was removed per
product decision — any leftover `bonus_3_*` columns in the live Sheet are simply ignored, not
an error).

## Decisions

- 6 tabs total: `games`, `tasks`, `rewards`, `wallet`, `settings`, `content`. No separate
  `profile`/`bonuses`/`referral` tabs — those values live in `settings`/`content`.
- `settings` holds ONLY single scalars (key/value, one row per key) — this avoids mixing a
  lone balance cell with tabular transaction rows, which would break the gviz single-table
  parse used for `wallet`.
- Trending game = row 2 of `games` (first data row), by convention. My Games = identical list
  to Discover's "All Games", rendered 2-column — no separate selection mechanism.
- Reward Detail progress bars ARE rendered (`progress_pct` column kept and used).
- Game Detail reuses `games.image_url` for both the wide hero and the small rounded icon —
  no separate `icon_url` column for games.
- "How it works" / "Conditions" / disclaimer text on Reward Detail is shared across all reward
  categories (not per-category), stored once in `content`.

## Open items

- All 6 tabs exist with correct header rows. Data rows are pasted in via `seed/*.tsv`
  (see `seed/README.md`) — same demo content as `data/fallback.json`, generated from a single
  source so the two never drift: Coin Master, Royal Match, Fishdom, Monopoly Go; Level 1–10
  tasks; PayPal/Amazon/Google Play/Apple categories; wallet transactions across two date groups;
  Invite Friends and Reward Detail paragraphs.
- `data/fallback.json` mirrors this schema exactly and is what the app renders from until the
  seed data is pasted into the live sheet (or any time the live fetch fails).
