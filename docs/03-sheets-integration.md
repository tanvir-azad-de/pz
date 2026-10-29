# 03 — Google Sheets Integration

## Goal

Given a spreadsheet ID (read from the URL — see "Sheet resolution" below), fetch all 6 tabs
once per sheet load, normalize them into plain JS objects/arrays, validate them against a
strict schema, cache in memory for the session, and fail with a specific, actionable error —
never a blank screen or silently-wrong data — if the network, the ID, or the sheet itself
doesn't check out.

## Sheet resolution (which spreadsheet to fetch)

There is no master sheet and no default/fallback sheet ID anywhere in the code. The
spreadsheet ID is read directly out of the URL hash by `js/app.js`:

```js
// #/<sheetId>/<route>/<param>, e.g. #/1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU/game/g1
function parseHash() {
  const hash = (location.hash || "").replace(/^#\/?/, "");
  const segments = hash.split("/").filter((s) => s !== "");
  const rawId = segments[0];
  if (!rawId) return { sheetId: null, route: "discover", params: {} };

  const sheetId = extractSheetId(decodeURIComponent(rawId)); // also accepts a pasted full Sheets URL
  const route = segments[1] || "discover";
  const id = segments[2];
  return { sheetId, route, params: { id } };
}
```

`extractSheetId()` also matches a pasted full Sheets URL
(`https://docs.google.com/spreadsheets/d/<id>/edit#gid=0`) via
`/\/spreadsheets\/d\/([A-Za-z0-9_-]{25,60})/`, so either form works in the hash.

`js/sheets.js`'s `Sheets.load(sheetId)` validates the ID against `SHEET_ID_PATTERN`
(`/^[A-Za-z0-9_-]{25,60}$/`) before issuing any fetch, throwing a `SheetError("BAD_ID", ...)`
if it doesn't look like a real spreadsheet ID. There's no fallback value to degrade to — an
invalid or absent ID is always a hard failure, rendered by `js/app.js` as a specific error
screen (see "Loading / error states" below), not a guess at which sheet to show instead.

Switching which sheet is active is purely editing the URL hash — no code change, no deploy,
and no edit to any other spreadsheet.

## Fetch sequence

1. `js/app.js`'s `loadSheet()` parses the current hash, and if it has a sheet ID, calls
   `Sheets.load(sheetId)` before the router renders the first view for that sheet.
2. `Sheets.load()` issues 6 parallel `fetch()` calls, one per tab, using `Promise.all` (not
   `allSettled` — see "Decisions" for why this flipped from the old per-tab-fallback design).
   Tabs are addressed **by name**, not gid — see below.

```js
const TAB_NAMES = ["games", "tasks", "rewards", "wallet", "settings", "content"];

function gvizUrl(sheetId, tabName) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
}
```

3. Each response body is text, not JSON. Strip the wrapper before parsing:

```js
function parseGviz(text) {
  const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) return null; // not a gviz response — e.g. an HTML sign-in/consent page
  try { return JSON.parse(match[1]); } catch (err) { return null; }
}
```

   A `null` result (no match, or malformed JSON) means the sheet exists but gviz didn't give
   back its usual response — in practice this is what a **private** (not "Anyone with the
   link") spreadsheet returns: an HTML Google Accounts page instead of JSON. This is surfaced
   as `SheetError("NO_ACCESS", ...)`.

4. Convert the gviz table into an array of plain objects using **row 1 as the header source**,
   not `table.cols[].label` (Google Sheets sometimes leaves `label` blank depending on how the
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

## Tab addressing: by name, confirmed working

Earlier drafts of this doc claimed `sheet=<name>` always returns the `games` tab regardless of
the name requested, and addressed tabs by hardcoded `gid` instead. **Re-tested directly
against multiple live spreadsheets and that claim was wrong**: `?sheet=tasks`, `?sheet=Tasks`,
`?sheet=content`, etc. each return exactly that tab, byte-identical to the equivalent
`?gid=<N>` request. Only a name that matches **no** tab in the sheet falls through to the
first tab — which the header validation below (always run regardless of addressing mode)
catches as a schema mismatch.

Name-based addressing isn't just preferred now, it's required: a hardcoded gid map only ever
worked across pz-en/pz-de because pz-de was duplicated from pz-en, so its gids happened to
match. Any sheet created independently — which is every sheet a user points this app at now —
has unrelated gids. There is no map that could cover an arbitrary third-party sheet; tab name
is the only identifier guaranteed to mean the same thing across spreadsheets.

## Header + required-key validation (still mandatory)

A correct tab name doesn't protect against someone restructuring a tab's columns, or leaving a
required `settings`/`content` key blank. Both are validated before any data reaches a view.

```js
const EXPECTED_COLUMNS = {
  games:    ["id","name","image_url","description","total_reward","max_per_task","long_description","has_cashback","has_limited_bonus","href"],
  tasks:    ["game_id","name","amount","is_active"],
  rewards:  ["id","category","brand","amount","reward_detail_how_1","reward_detail_how_2","reward_detail_how_3","reward_detail_conditions_1","reward_detail_conditions_2","reward_detail_disclaimer"],
  wallet:   ["date","type","name","subtitle","amount","status","icon_url","coupon_code"],
  settings: ["key","value"],
  content:  ["key","value"],
};

function missingColumns(tabName, headers) {
  return EXPECTED_COLUMNS[tabName].filter((col) => !headers.includes(col));
}
// missingColumns(...).length > 0 => throw SheetError("BAD_SCHEMA", ..., { tabName, missing })
```

`settings`/`content` only need columns `key`/`value` at the schema level — the actual keys
required within them are checked separately, since EXPECTED_COLUMNS can't express "this
key/value table must contain a row with key X":

```js
const REQUIRED_SETTINGS_KEYS = ["balance", "referral_balance", "referral_first_task", "referral_pct"];
const REQUIRED_CONTENT_KEYS = [ /* all 73 keys read by Render.t()/tRaw() and labelKey/titleKey
                                   across js/app.js and js/views/ — see docs/01-data-model.md
                                   for the full list */ ];

function missingKeys(obj, required) {
  return required.filter((key) => {
    const v = obj[key];
    return v === undefined || v === null || String(v).trim() === "";
  });
}
// missingKeys(...).length > 0 => throw SheetError("MISSING_KEYS", ..., { tabName, missing })
```

`currency_symbol`/`currency_position`/`number_locale` are deliberately NOT in
`REQUIRED_SETTINGS_KEYS` — `Render.initCurrency()` already handles their absence by sniffing a
symbol off sample data, so requiring them would reject otherwise-valid minimal sheets over a
purely cosmetic gap.

## Caching

Fetch-once per sheet ID, in-memory only (no localStorage, no TTL):

```js
let _cache = null;
let _cachedSheetId = null;

async function load(sheetId, force) {
  if (!sheetId || !SHEET_ID_PATTERN.test(sheetId)) {
    throw new SheetError("BAD_ID", `"${sheetId}" doesn't look like a Google Sheet ID`, { sheetId });
  }
  if (_cache && !force && _cachedSheetId === sheetId) return _cache;
  _cache = await fetchAll(sheetId);
  _cachedSheetId = sheetId;
  return _cache;
}
```

A page reload re-fetches (picking up any edits made to the sheet since). Navigating within the
same sheet never refetches. **Changing the sheet ID in the hash does** — `js/app.js`'s
`onHashChange()` compares the new hash's sheet ID against the currently-loaded one and, if
different, re-runs the full load sequence (skeleton → fetch → render) rather than treating it
as an ordinary route change.

## Loading / error states

Per-view render functions receive the already-resolved data; the loading/error state lives at
the app-shell level (`js/app.js`), before routing happens for that sheet:

1. **Skeleton**: while `Sheets.load()` is in flight, `#view` shows skeleton placeholders
   (shimmering gray blocks matching each screen's card shapes — defined in `components.css` as
   `.skeleton`).
2. **All-or-nothing**: `fetchAll()` uses `Promise.all`, so any single tab failing — network,
   404, bad schema — fails the whole load. There is no bundled fallback dataset to blend in
   per-tab anymore (see "Decisions" for why), so a partial failure is just a failure: the app
   either has a complete, valid sheet, or it shows an error screen. It never mixes rows from
   one dataset with rows from another.
3. **Typed errors → specific screens**: every failure mode is a `SheetError` with a `code`
   (`BAD_ID`, `NOT_FOUND`, `NO_ACCESS`, `BAD_SCHEMA`, `MISSING_KEYS`, `NETWORK`), plus a
   missing-sheet-ID case with no error object at all. `js/app.js`'s `errorContentFor()` maps
   each to copy that tells whoever owns the sheet exactly what to fix — see
   `docs/01-data-model.md`'s "Validation and failure modes" table for the full mapping.
4. **Retry**: only offered for `NETWORK` (the one failure a plain retry can plausibly fix
   without the user editing anything first). Every other error code requires fixing the URL or
   the sheet before a retry would do anything different.

## Decisions

- **`Promise.all`, not `Promise.allSettled`.** This flipped from the original per-tab-fallback
  design specifically because there's no longer a bundled fallback dataset to blend in for a
  failed tab — with an arbitrary third-party sheet, "render this tab's rows from a different,
  unrelated spreadsheet" is data corruption, not graceful degradation. An all-or-nothing load
  with a clear error is more honest than a partially-correct render.
- Row-1-as-header parsing, handling both gviz header representations.
- **Tabs addressed by name, not gid** — re-tested and confirmed working (see above); gid
  addressing is incompatible with an arbitrary third-party sheet ID, since gids are
  per-spreadsheet and have no reason to match across independently-created sheets.
- Hardcoded `EXPECTED_COLUMNS` validation, plus `REQUIRED_SETTINGS_KEYS`/
  `REQUIRED_CONTENT_KEYS` key validation, are both mandatory, not optional — this is what
  "exact template copy" (the required contract for a sheet to be considered valid) means in
  practice.
- No localStorage, no TTL-based cache — fetch once per sheet ID, matches "simple demo" scope.
- **No bundled fallback data (`data/fallback.json` removed).** The previous design's bundle
  was a single English snapshot that made sense when only 2 known-good locale sheets existed;
  it stops making sense once any public sheet can be loaded, since there's no longer a
  meaningful "fallback" dataset to fall back to that has anything to do with the sheet that
  failed.
- **The spreadsheet ID is resolved from the URL hash, not a master spreadsheet, env var, or
  build-time config.** This is the entire point of this change: anyone can point the app at
  their own sheet by changing the URL, with zero deploy and zero other spreadsheet to
  maintain.
- Row-level sanity guards (`ROW_GUARDS` in `js/sheets.js`) drop structurally malformed
  `games`/`tasks` rows (e.g. `id` not matching `g\d+`) with a `console.warn`, since header
  validation alone can't catch a shifted row (confirmed root cause of an earlier pz-de
  incident: a cell-internal newline in `long_description` wrapped into an extra row).
- `wallet.type` is validated (warn-only, not corrected) against `["earned", "spent"]` after
  every fetch, since it's a machine enum read by exact string match in `js/views/wallet.js`,
  not translatable copy.

## Pointing the app at a new sheet

Copy `seed/*.tsv` into a new spreadsheet (see `seed/README.md`), keeping the 6 tab names and
all required columns/keys exactly as documented in `docs/01-data-model.md`, share it "Anyone
with the link — Viewer", then open `#/<new-sheet-id>/discover`. There is nothing in
`js/sheets.js` to edit — no gid map, no master cell, no default ID.

## Known limitation

Since any public sheet ID can be loaded, the app is effectively rendering arbitrary
third-party content once pointed at someone else's sheet. `games.image_url` /
`wallet.icon_url` flow into inline `url(...)` / `<img src="...">` with only basic
HTML-escaping, not full CSS/URL-context sanitization or a scheme allowlist. Accepted gap for
this project's current scope — see `docs/01-data-model.md`'s "Known limitation" section.
