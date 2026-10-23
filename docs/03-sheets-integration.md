# 03 — Google Sheets Integration

## Goal

Fetch all 6 tabs once at app boot, normalize them into plain JS objects/arrays, cache in memory
for the session, and degrade gracefully (skeletons → retry → bundled fallback) if the network
or the sheet itself is unavailable or malformed.

## Locale resolution (which spreadsheet to fetch)

Before fetching the 6 content tabs, `Sheets.load()` first resolves WHICH spreadsheet to fetch
them from, by reading a single cell out of a separate master spreadsheet:

```js
const MASTER_SHEET_ID = "1g9h9pcDypXhZEFuPyVZmaQ7DUI-RqqhpnV-zivLkeXY";
const MASTER_GID = "0";
const DEFAULT_SHEET_ID = "1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU"; // pz-en

async function resolveSheetId() {
  try {
    const id = await fetchMasterSheetId(); // scans master rows for the "isActive" key
    if (!SHEET_ID_PATTERN.test(id)) throw new Error("not a spreadsheet ID");
    return id;
  } catch (err) {
    console.warn("falling back to default locale —", err.message);
    return DEFAULT_SHEET_ID;
  }
}
```

The master sheet has **no header row** (`parsedNumHeaders: 0`, blank `cols[].label]`), so it
is NOT parsed by `gvizToObjects()` (below) — that function would treat row 0 as the header and
discard the sheet's one real row. `fetchMasterSheetId()` instead scans `table.rows` directly for
a row whose column A is `isActive` and returns column B.

`resolveSheetId()` never throws — any failure (network, missing row, malformed value) resolves
to `DEFAULT_SHEET_ID` with a `console.warn`, so a broken master cell degrades to "show pz-en",
never to a hard failure. See `docs/01-data-model.md` for the master-sheet contract and how to
flip locales.

The resolved spreadsheet ID is then used for all 6 `fetchTab()` calls below — **pz-en and pz-de
are duplicates of each other and share identical gids**, so the `TABS` map (gid per tab name)
is locale-independent; only the spreadsheet ID varies.

## Fetch sequence

1. `app.js` calls `Sheets.load()` once, before the router renders the first view.
2. `Sheets.load()` resolves the locale spreadsheet ID (above), then issues 6 parallel
   `fetch()` calls against it, one per tab, using `Promise.allSettled` (not `Promise.all` —
   one bad tab must not block the others). Tabs are addressed by **gid**, not by name — see
   the gotcha below.

```js
const TABS = {
  games:    "420976241",
  tasks:    "666986029",
  rewards:  "955004045",
  wallet:   "1476565906",
  settings: "719558094",
  content:  "1744568315",
};

function gvizUrl(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
}
```

3. Each response body is text, not JSON. Strip the wrapper before parsing:

```js
function parseGviz(text) {
  const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error("Unexpected gviz response shape");
  return JSON.parse(match[1]);
}
```

4. Convert the gviz table into an array of plain objects using **row 1 as the header source**,
   not `table.cols[].label` (Figma/Sheets sometimes leaves `label` blank depending on how the
   sheet was authored; row-1-as-header is explicit and predictable):

```js
function gvizToObjects(table) {
  // table.rows[0] is used as the header row; data starts at rows[1]
  const headerRow = table.rows[0]?.c.map(c => (c?.v ?? "").toString().trim());
  return table.rows.slice(1).map(row => {
    const obj = {};
    headerRow.forEach((key, i) => {
      obj[key] = row.c[i]?.v ?? "";
    });
    return obj;
  });
}
```

   > Note: if the sheet's first row is recognized by Google as a header (common case), gviz
   > actually omits it from `rows` and puts it in `cols[].label` instead, OR includes it as
   > `rows[0]` depending on sheet formatting. The loader handles BOTH cases: it first checks
   > `table.cols[0].label` — if all `cols[].label` are non-empty, use those as headers and
   > `table.rows` as data directly; otherwise fall back to treating `rows[0]` as the header row.

## ⚠️ Tab addressing: use gid, not sheet name

Confirmed by direct testing against the live sheet: requesting `sheet=<name>` — even with the
exact correct tab name, or a deliberately nonsense name — always returns the **`games`** tab's
data with `status: "ok"`. Tab-name lookup is unreliable on this sheet; there is no error to
catch. **All tab requests use `gid=<number>` instead** (see the `TABS` map above). If a tab is
ever deleted and recreated, grab its new gid from the sheet's URL and update the map.

## ⚠️ Header validation (still mandatory, even with gid addressing)

A gid is stable but doesn't protect against someone restructuring a tab's columns. After
extracting headers for each tab, compare them against a hardcoded expected-column list.
Mismatch ⇒ treat as a failed fetch for that tab (same code path as a network error).

```js
const EXPECTED_COLUMNS = {
  games:    ["id","name","image_url","description","total_reward","max_per_task","long_description","has_cashback","has_limited_bonus"],
  tasks:    ["game_id","name","amount","is_active"],
  rewards:  ["id","category","brand","amount","reward_detail_how_1","reward_detail_how_2","reward_detail_how_3","reward_detail_conditions_1","reward_detail_conditions_2","reward_detail_disclaimer"],
  wallet:   ["date","type","name","subtitle","amount","status","icon_url","coupon_code"],
  settings: ["key","value"],
  content:  ["key","value"],
};

function validateHeaders(tab, headers) {
  const expected = EXPECTED_COLUMNS[tab];
  const ok = expected.every(col => headers.includes(col));
  if (!ok) throw new Error(`Tab "${tab}" headers don't match expected schema`);
}
```

## Caching

Fetch-once, in-memory only (per product decision — no localStorage, no TTL, no refetch on
screen visits):

```js
let _cache = null;

async function load() {
  if (_cache) return _cache;
  _cache = await fetchAll(); // the Promise.allSettled logic above
  return _cache;
}
```

A page reload re-fetches (picking up any edits made to the sheet since). Switching tabs/screens
within a session never refetches.

## Loading / error states

Per-view render functions receive the already-resolved data; the loading state lives at the
app-shell level, before routing even happens:

1. **Skeleton**: on boot, before `Sheets.load()` resolves, `#view` shows skeleton placeholders
   (shimmering gray blocks matching each screen's card shapes — defined in `components.css` as
   `.skeleton`). The tab bar and nav bar render immediately with static chrome since they don't
   need data beyond `settings.balance` (which also skeletons until resolved).
2. **Partial failure**: if some tabs succeed and others fail validation/network, the app merges
   in `data/fallback.json` values ONLY for the failed tabs (per-tab fallback, not all-or-nothing)
   so e.g. a broken `wallet` tab doesn't blank out a working `games` tab.
3. **Full failure + retry**: if the entire fetch fails (e.g. offline), `#view` shows a centered
   message "Couldn't load data" with a **Retry** button that re-runs `Sheets.load()` (bypassing
   `_cache`).
4. **Fallback bundle**: `data/fallback.json` is always bundled in the repo and mirrors the
   6-tab schema exactly. It is the data source used for any tab that fails validation after one
   retry attempt, so the demo never shows a permanently empty screen.

## Swapping which locale is live

Edit the master sheet's `isActive` row (column B) to the target locale's spreadsheet ID — no
code change, no deploy. See `docs/01-data-model.md` for the 3 spreadsheet IDs.

## Adding a new locale / pointing at a different spreadsheet from scratch

Change `DEFAULT_SHEET_ID` in `js/sheets.js` only if you're replacing the fallback locale itself.
To add a brand-new locale sheet: duplicate an existing locale spreadsheet (so its 6 tab gids
match the `TABS` map — gids are per-spreadsheet, but Sheets preserves them on "Make a copy"),
translate its `content`/`wallet` tabs and set its `settings.currency_symbol` /
`currency_position` / `number_locale`, then point the master sheet's `isActive` value at its ID.
If you instead create a tab from scratch rather than duplicating, you must update every gid in
the `TABS` map to match the new sheet's actual gids.

## Decisions

- `Promise.allSettled`, not `Promise.all` — partial data beats no data for a demo.
- Row-1-as-header parsing, handling both gviz header representations.
- **Tabs addressed by gid, not by name** — the live sheet's `sheet=<name>` lookup is broken
  (always returns `games`), confirmed by direct testing.
- Hardcoded `EXPECTED_COLUMNS` validation is mandatory, not optional.
- No localStorage, no TTL-based cache — fetch once per page load, matches "simple demo" scope.
- Fallback merges per-tab, not all-or-nothing.
- **Locale is resolved via a master spreadsheet, not a URL param or build-time config** — so
  non-technical staff can flip the live locale by editing one cell, with zero deploy. There is
  deliberately no override mechanism (query string, localStorage) — the master sheet is the
  single source of truth.
- `data/fallback.json` stays a single English-only bundle, used for both locales' offline/
  total-failure fallback — accepted tradeoff per product decision, rather than maintaining a
  second bundle.
- Row-level sanity guards (`ROW_GUARDS` in `js/sheets.js`) drop structurally malformed
  `games`/`tasks` rows (e.g. `id` not matching `g\d+`) with a `console.warn`, since header
  validation alone can't catch a shifted row (confirmed root cause of an earlier pz-de
  incident: a cell-internal newline in `long_description` wrapped into an extra row).
- `wallet.type` is validated (warn-only, not corrected) against `["earned", "spent"]` after
  every fetch, since it's a machine enum read by exact string match in `js/views/wallet.js`,
  not translatable copy.

## Open items

- If a tab is ever deleted/recreated in any locale spreadsheet, its gid changes — update the
  `TABS` map in `js/sheets.js` accordingly (see `seed/README.md`). Since all locale sheets are
  expected to be duplicates of one another, this should be done by duplicating the sheet with
  the gid already fixed, not recreating tabs independently per locale.
- `data/fallback.json` predates the `currency_symbol`/`currency_position`/`number_locale`
  settings keys and the sheet's current row counts (4 games vs. 19 live) — it still works via
  `Render.initCurrency()`'s legacy sniffing fallback, but is stale as a demo dataset.
