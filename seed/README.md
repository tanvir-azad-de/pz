# Seed data — the template for your own sheet

These TSV files are the paste-ready template for creating a new PlayZone-compatible Google
Sheet from scratch, matching the schema in `docs/01-data-model.md`. Each file includes its
header row and a snapshot of real demo content (originally generated from a live English
reference sheet), so you get a fully working sheet immediately, not an empty shell.

Since the app now reads any public sheet ID from the URL (`#/<sheet-id>/discover` — see
`docs/03-sheets-integration.md`), this is the fastest way to get your own: copy these files
into a new spreadsheet, tweak the content, and point the app at it. No code change is
involved.

## How to create a new sheet from this template

1. Create a new Google Sheet.
2. Create 6 tabs named **exactly** (lowercase): `games`, `tasks`, `rewards`, `wallet`,
   `settings`, `content`.
3. For each tab, open the matching `.tsv` file below in a text editor, select-all / copy,
   click cell `A1` in that tab, and paste. Google Sheets splits tab-separated values into
   columns automatically.
4. Edit the content as you like — game names, amounts, copy, etc. Keep the header row exactly
   as pasted (column names must match `docs/01-data-model.md`).
5. **Do not translate or change these columns' values** — they're machine enums / lookup
   keys, not display copy (see `docs/01-data-model.md` for why):
   - `wallet.type` — must stay `earned` / `spent`
   - `games.has_cashback`, `games.has_limited_bonus`, `tasks.is_active` — must stay
     `TRUE` / `FALSE`
   - `rewards.brand` — keep `PayPal`, `Amazon`, `Google Play`, or `Apple` if you want that
     reward to get a real logo (any other brand name still works, just without one)
   - `games.id` — must match `g<number>` (e.g. `g1`, `g2`, ...)
   - `games.href` — required column (the sheet won't load without it), but individual rows
     may be left blank; a blank row's "Play Now" button / "Play" pill just renders dimmed and
     does nothing instead of navigating. The template ships with Play Store search-result
     links as placeholders — replace with real store listing URLs.
6. Set sharing: **Share → General access → Anyone with the link → Viewer.**
7. Open `https://<your-pages-host>/#/<your-sheet-id>/discover`.

| Tab | File |
|---|---|
| `games` | `games.tsv` |
| `tasks` | `tasks.tsv` |
| `rewards` | `rewards.tsv` |
| `wallet` | `wallet.tsv` |
| `settings` | `settings.tsv` |
| `content` | `content.tsv` |

## Required keys

`settings.tsv` must keep these 4 keys with non-blank values: `balance`, `referral_balance`,
`referral_first_task`, `referral_pct`. (`currency_symbol`, `currency_position`,
`number_locale` are optional — included in the template, but the app falls back gracefully if
you remove them.)

`content.tsv` must keep all 73 of its keys with non-blank values — see
`docs/01-data-model.md` for the full list. The app validates both of the above on load and
will show exactly which key(s) are missing if you accidentally delete one.

## Tab addressing

Tabs are fetched by **name** (`?sheet=<name>`), confirmed working and case-insensitive — not
by gid. This is why the tab names in step 2 above must be exact: there's no gid map to fall
back to, since gids are specific to one spreadsheet and won't match between your copy and the
original.

## Verifying a tab after pasting

```
curl "https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&sheet=<tab-name>"
```

Check the response's `table.rows[0].c` values match the expected header row for that tab.
