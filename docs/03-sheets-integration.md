# 03 — Google Sheets Integration

## Goal

Fetch all 6 tabs once at app boot, normalize them into plain JS objects/arrays, cache in memory
for the session, and degrade gracefully (skeletons → retry → bundled fallback) if the network
or the sheet itself is unavailable or malformed.

## Fetch sequence

1. `app.js` calls `Sheets.load()` once, before the router renders the first view.
2. `Sheets.load()` issues 6 parallel `fetch()` calls, one per tab, using `Promise.allSettled`
   (not `Promise.all` — one bad tab must not block the others). Tabs are addressed by **gid**,
   not by name — see the gotcha below.

```js
const SHEET_ID = "1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU";
const TABS = {
  games:    { gid: "420976241" },
  tasks:    { gid: "666986029" },
  rewards:  { gid: "955004045" },
  wallet:   { gid: "1476565906" },
  settings: { gid: "719558094" },
  content:  { gid: "1744568315" },
};

function gvizUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
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
  rewards:  ["id","category","brand","amount","progress_pct"],
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

## Swapping the Sheet ID

To point the app at a different spreadsheet: change the `SHEET_ID` constant AND every gid in
the `TABS` map at the top of `js/sheets.js` (gids are per-spreadsheet, not portable). The target
sheet must have 6 tabs with the header rows specified in `01-data-model.md`, in any tab order
and under any tab names — only the gids matter for fetching.

## Decisions

- `Promise.allSettled`, not `Promise.all` — partial data beats no data for a demo.
- Row-1-as-header parsing, handling both gviz header representations.
- **Tabs addressed by gid, not by name** — the live sheet's `sheet=<name>` lookup is broken
  (always returns `games`), confirmed by direct testing.
- Hardcoded `EXPECTED_COLUMNS` validation is mandatory, not optional.
- No localStorage, no TTL-based cache — fetch once per page load, matches "simple demo" scope.
- Fallback merges per-tab, not all-or-nothing.

## Open items

- None blocking implementation. If a tab is ever deleted/recreated in the live sheet, its gid
  changes — update the `TABS` map in `js/sheets.js` accordingly (see `seed/README.md`).
