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

- Current sheet: `1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU`
- Tabs are addressed by **gid**, not name (name-based lookup is unreliable on Google Sheets —
  see the gotcha documented in `docs/01-data-model.md`)
- If the live fetch fails or a tab's headers don't match the expected schema, that tab falls
  back to `data/fallback.json` automatically — the app never shows a blank screen

### Pointing at your own sheet

1. Duplicate the sheet, keeping the 6 tabs (`games`, `tasks`, `rewards`, `wallet`, `settings`,
   `content`) with header rows matching `docs/01-data-model.md`.
2. Set sharing to "Anyone with the link — Viewer".
3. Grab each tab's `gid` from its URL (`#gid=<number>` when that tab is active in the browser).
4. Update `SHEET_ID` and the `TABS` map in `js/sheets.js`.
5. Optionally paste the files in `seed/*.tsv` to seed demo content — see `seed/README.md`.

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

- Brand logo images (PayPal, Amazon, Google Play, Apple) are pending from the user — see
  "Open items" in `docs/04-components.md`. Everything else in the icon set is real SVG art.
- All interactions beyond navigation (Play Now, Confirm Payout, Get Bonus, Copy & Shop, etc.)
  are visual only — no backend, no persistence, by design.
