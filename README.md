# PlayZone — demo web app

Mobile-only demo web app (plain HTML/CSS/JS, no build step) that reads its content from a
public Google Sheet and renders 4 tabs plus 4 detail screens: Discover, My Games, Rewards,
Profile, Game Detail, Reward Detail, Wallet, Invite Friends.

Design source: Figma file `OTXhsXviEGsy3KmOAAefAP` ("Playzone"). Full documentation of the
design system, data model, architecture, and every screen's spec lives in [`docs/`](docs/).

## Running locally

No build step, no dependencies. Serve the repo root with any static file server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Resize the browser to a phone width (or use responsive device mode) — there is no desktop
layout by design.

## Data source

The app reads from a public Google Sheet via the gviz JSON endpoint, fetched once at boot. See
[`docs/01-data-model.md`](docs/01-data-model.md) for the full schema and
[`docs/03-sheets-integration.md`](docs/03-sheets-integration.md) for fetch/fallback behavior.

- **Locale switching via a master sheet**: at boot, the app first reads one cell from a master
  spreadsheet (`1g9h9pcDypXhZEFuPyVZmaQ7DUI-RqqhpnV-zivLkeXY`, gid 0, row `isActive`), whose
  value is the spreadsheet ID of the currently-live locale — either pz-en
  (`1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU`) or pz-de
  (`12jvO2x_ay8umdq22SDwrpxkr_2HD705hujnnwNbGRrs`). Flip locales by editing that one cell — no
  code change, no deploy. If the master sheet is unreachable or malformed, the app falls back
  to pz-en with a console warning.
- Tabs are addressed by **gid**, not name (name-based lookup is unreliable on Google Sheets —
  see the gotcha documented in `docs/01-data-model.md`). pz-en and pz-de share identical gids,
  so the gid map is locale-independent.
- Currency symbol/position/decimal convention are read from each locale sheet's `settings` tab
  (`currency_symbol`, `currency_position`, `number_locale`) — never hardcoded in JS.
- If the live fetch fails or a tab's headers don't match the expected schema, that tab falls
  back to `data/fallback.json` automatically — the app never shows a blank screen.
  `data/fallback.json` is a single English bundle shared by both locales.

### Pointing at your own sheet

1. Duplicate an existing locale spreadsheet (pz-en or pz-de), keeping all 6 tabs (`games`,
   `tasks`, `rewards`, `wallet`, `settings`, `content`) — duplicating preserves their gids, so
   you don't need to touch `js/sheets.js`.
2. Set sharing to "Anyone with the link — Viewer".
3. Edit content as needed, keeping header rows matching `docs/01-data-model.md`. Never
   translate `wallet.type`, `games.has_cashback`/`has_limited_bonus`, `tasks.is_active`, or
   `rewards.brand` — these are machine enums / lookup keys, not display copy.
4. Point the master sheet's `isActive` cell at the new spreadsheet's ID to make it live.
5. Optionally paste the files in `seed/*.tsv` to seed demo content — see `seed/README.md`.

To add a brand-new locale (not just re-skin an existing one), also update `MASTER_SHEET_ID`/
`DEFAULT_SHEET_ID` in `js/sheets.js` only if you're changing which sheet is the hardcoded
fallback.

## Project structure

```
index.html              shell: nav bar + <main id="view"> + tab bar
css/
  tokens.css             design tokens (colors, type, spacing, radii)
  base.css               reset, font loading, mobile viewport handling
  components.css         shared UI: cards, badges, buttons, nav/tab bar
js/
  app.js                 hash router, tab bar, nav bar
  sheets.js              Google Sheets fetch, cache, validation, fallback
  render.js              DOM helpers, inline placeholder icons
  views/                 one module per screen
data/fallback.json       bundled offline copy of all 6 tabs
seed/                    paste-ready TSV files matching the sheet schema
docs/                    full design + architecture documentation
```

## Deployment

Deployed via GitHub Pages, branch `main`, root folder. Hash-based routing means no server
rewrite rules are needed. See [`docs/07-deployment.md`](docs/07-deployment.md) for the full
setup and pre-deploy checklist.

## Known gaps

None. All icon, brand logo, illustration, and favicon assets are in place — see
`docs/04-components.md` icon inventory.
- All interactions beyond navigation (Play Now, Confirm Payout, Get Bonus, Copy & Shop, etc.)
  are visual only — no backend, no persistence, by design.
