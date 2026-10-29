# PlayZone — demo web app

Mobile-only demo web app (plain HTML/CSS/JS, no build step) that reads its content from
**any** public Google Sheet, chosen via the URL — there is no hardcoded sheet and no fixed
locale set. It renders 4 tabs plus 4 detail screens: Discover, My Games, Rewards, Profile,
Game Detail, Reward Detail, Wallet, Invite Friends.

Design source: Figma file `OTXhsXviEGsy3KmOAAefAP` ("Playzone"). Full documentation of the
design system, data model, architecture, and every screen's spec lives in [`docs/`](docs/).

## Running locally

No build step, no dependencies. Serve the repo root with any static file server:

```sh
python3 -m http.server 8000
# open http://localhost:8000/#/<your-sheet-id>/discover
```

Resize the browser to a phone width (or use responsive device mode) — there is no desktop
layout by design.

## Data source

The app reads from a public Google Sheet via the gviz JSON endpoint, fetched once per sheet
load. See [`docs/01-data-model.md`](docs/01-data-model.md) for the full schema and
[`docs/03-sheets-integration.md`](docs/03-sheets-integration.md) for fetch/error behavior.

- **The spreadsheet ID lives in the URL hash**: `#/<sheet-id>/<route>`, e.g.
  `#/1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU/discover`. A full Sheets URL
  (`https://docs.google.com/spreadsheets/d/<id>/edit`) also works — the ID is extracted
  automatically. There is no master sheet, no default sheet, and no hardcoded locale list:
  the app will render whatever sheet is in the hash, in whatever language that sheet's
  content/settings tabs are written in.
- A bare `#/` (no sheet ID), a malformed ID, a 404, a private sheet, a wrong tab schema, or a
  sheet missing required `settings`/`content` keys each render a distinct, actionable error
  screen rather than a generic failure or a silent fallback to English content.
- Tabs are addressed **by name** (`?sheet=<name>`), not gid — confirmed working and
  case-insensitive. This is required for arbitrary sheets, since gids are specific to one
  spreadsheet and aren't preserved when a sheet is created independently rather than
  duplicated from another.
- Currency symbol/position/decimal convention are read from each sheet's `settings` tab
  (`currency_symbol`, `currency_position`, `number_locale`) — never hardcoded in JS. These 3
  keys are optional; omitting them falls back to sniffing a symbol out of sample data.
- There is no bundled offline fallback data. Any load failure (including being offline) shows
  an error screen with a Retry button; the app never silently blends in unrelated data.

### Pointing the app at your own sheet

1. Copy `seed/*.tsv` into a new Google Sheet as 6 tabs named exactly `games`, `tasks`,
   `rewards`, `wallet`, `settings`, `content` — see `seed/README.md` for the paste-ready
   template and the full list of required columns/keys.
2. Set sharing to "Anyone with the link — Viewer".
3. Edit content as needed. Never translate `wallet.type`, `games.has_cashback`/
   `has_limited_bonus`, `tasks.is_active`, or `rewards.brand` — these are machine enums /
   lookup keys, not display copy.
4. Open `https://<your-pages-host>/#/<your-sheet-id>/discover`.

To support a different language, just write that language's text into `content`/`settings` on
your copy of the sheet — no code change is involved either way.

## Project structure

```
index.html              shell: nav bar + <main id="view"> + tab bar
css/
  tokens.css             design tokens (colors, type, spacing, radii)
  base.css               reset, font loading, mobile viewport handling
  components.css         shared UI: cards, badges, buttons, nav/tab bar
js/
  app.js                 hash router (#/<sheetId>/<route>), tab bar, nav bar
  sheets.js              Google Sheets fetch, cache, validation, typed errors
  render.js              DOM helpers, inline placeholder icons
  views/                 one module per screen
seed/                    paste-ready TSV template for a new sheet
docs/                    full design + architecture documentation
```

## Deployment

Deployed via GitHub Pages, branch `main`, root folder. Hash-based routing means no server
rewrite rules are needed. See [`docs/07-deployment.md`](docs/07-deployment.md) for the full
setup and pre-deploy checklist.

## Known gaps

- All icon, brand logo, illustration, and favicon assets are in place — see
  `docs/04-components.md` icon inventory.
- All interactions beyond navigation (Play Now, Confirm Payout, Get Bonus, Copy & Shop, etc.)
  are visual only — no backend, no persistence, by design.
- Sheet content (game names, descriptions, image/icon URLs, brand names) is rendered without
  sanitizing beyond basic HTML-escaping. Since any public sheet ID can be loaded, this is only
  safe because the app trusts whoever authored the sheet you point it at — treat shared sheet
  links the same way you'd treat any other untrusted link.
