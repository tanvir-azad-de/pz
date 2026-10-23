/* Google Sheets data layer. See docs/01-data-model.md and docs/03-sheets-integration.md.
   Fetches 6 tabs by gid (name-based lookup is broken on this spreadsheet — confirmed by
   testing: sheet=<name> always returns the `games` tab regardless of the name requested).
   Fetch-once, in-memory cache, per-tab fallback to data/fallback.json on failure.

   Locale resolution: before fetching the 6 content tabs, we first read a single cell out of
   a separate "master" spreadsheet. Its row 2 (key "isActive") holds the spreadsheet ID of
   whichever locale sheet ("pz-en" or "pz-de") should be live right now. All locale sheets are
   duplicates of one another sharing the same 6 gids below, so only the spreadsheet ID varies
   per locale — see docs/01-data-model.md for the master-sheet contract. */

const Sheets = (() => {
  const MASTER_SHEET_ID = "1g9h9pcDypXhZEFuPyVZmaQ7DUI-RqqhpnV-zivLkeXY";
  const MASTER_GID = "0";
  const MASTER_KEY = "isActive";

  // Used whenever the master sheet is unreachable, malformed, or points at something that
  // doesn't look like a spreadsheet ID — the app must never hard-fail just because the master
  // cell got fat-fingered. This is the pz-en spreadsheet.
  const DEFAULT_SHEET_ID = "1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU";

  // Spreadsheet IDs look like 25-60 chars of [A-Za-z0-9_-]. Guards against the master cell
  // holding a stale token (e.g. the old "pz-en" string), a URL, or blank/whitespace.
  const SHEET_ID_PATTERN = /^[A-Za-z0-9_-]{25,60}$/;

  // All locale spreadsheets are duplicates of one another (confirmed: identical gids across
  // pz-en/pz-de), so one gid map covers every locale.
  const TABS = {
    games: "420976241",
    tasks: "666986029",
    rewards: "955004045",
    wallet: "1476565906",
    settings: "719558094",
    content: "1744568315",
  };

  const EXPECTED_COLUMNS = {
    games: ["id", "name", "image_url", "description", "total_reward", "max_per_task", "long_description", "has_cashback", "has_limited_bonus"],
    tasks: ["game_id", "name", "amount", "is_active"],
    rewards: [
      "id",
      "category",
      "brand",
      "amount",
      "reward_detail_how_1",
      "reward_detail_how_2",
      "reward_detail_how_3",
      "reward_detail_conditions_1",
      "reward_detail_conditions_2",
      "reward_detail_disclaimer",
    ],
    wallet: ["date", "type", "name", "subtitle", "amount", "status", "icon_url", "coupon_code"],
    settings: ["key", "value"],
    content: ["key", "value"],
  };

  let _cache = null;

  function gvizUrl(sheetId, gid) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  }

  function parseGviz(text) {
    const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) throw new Error("Unexpected gviz response shape");
    return JSON.parse(match[1]);
  }

  // The master sheet has no header row (gviz returns parsedNumHeaders:0, blank cols[].label),
  // so it must NOT go through gvizToObjects() below — that function treats row 0 as the header
  // when labels are blank, which would swallow the one data row this sheet has. Instead, scan
  // rows directly for the isActive key/value pair and return the value as-is (untrimmed cell
  // text, validated by the caller).
  async function fetchMasterSheetId() {
    const res = await fetch(gvizUrl(MASTER_SHEET_ID, MASTER_GID));
    if (!res.ok) throw new Error(`HTTP ${res.status} for master sheet`);
    const text = await res.text();
    const json = parseGviz(text);
    if (json.status !== "ok") throw new Error(`gviz status "${json.status}" for master sheet`);

    const rows = (json.table && json.table.rows) || [];
    for (const row of rows) {
      const key = row.c && row.c[0] && row.c[0].v;
      if (String(key || "").trim() === MASTER_KEY) {
        const value = row.c[1] && row.c[1].v;
        return String(value || "").trim();
      }
    }
    throw new Error(`Master sheet has no "${MASTER_KEY}" row`);
  }

  // Resolves which locale spreadsheet to load. Never throws — any failure (network, missing
  // row, malformed value) falls back to DEFAULT_SHEET_ID with a console warning, since a
  // broken master cell must degrade to "show the default locale", not "show nothing".
  async function resolveSheetId() {
    try {
      const id = await fetchMasterSheetId();
      if (!SHEET_ID_PATTERN.test(id)) {
        throw new Error(`Master sheet value "${id}" doesn't look like a spreadsheet ID`);
      }
      return id;
    } catch (err) {
      console.warn("Sheets.resolveSheetId: falling back to default locale —", err.message);
      return DEFAULT_SHEET_ID;
    }
  }

  // Row-1-as-header parsing, handling both gviz header representations:
  // some sheets return headers via cols[].label, others put the header text in rows[0].
  function gvizToObjects(table) {
    // Some tabs carry trailing phantom columns (stale formatting from an earlier draft) whose
    // label is empty while earlier columns ARE labeled. Trim to the last labeled column before
    // deciding whether "labels are present", so those phantom columns don't break detection.
    let lastLabeled = -1;
    table.cols.forEach((c, i) => {
      if ((c.label || "").trim() !== "") lastLabeled = i;
    });
    const trimmedCols = lastLabeled >= 0 ? table.cols.slice(0, lastLabeled + 1) : table.cols;
    const labelsPresent = trimmedCols.length > 0 && trimmedCols.every((c) => (c.label || "").trim() !== "");

    let headers;
    let dataRows;
    if (labelsPresent) {
      headers = trimmedCols.map((c) => c.label.trim());
      dataRows = table.rows || [];
    } else {
      const first = table.rows && table.rows[0];
      if (!first) return { headers: [], objects: [] };
      headers = first.c.map((c) => (c && c.v != null ? String(c.v).trim() : ""));
      dataRows = table.rows.slice(1);
    }
    const objects = dataRows.map((row) => {
      const obj = {};
      headers.forEach((key, i) => {
        const cell = row.c[i];
        // Prefer the formatted value (cell.f) over the raw value (cell.v). This matters for
        // currency/number-formatted cells: a sheet cell showing "$2.30" is stored as the raw
        // number 2.3 with a display format, so v=2.3 but f="$2.30". Reading f means every
        // amount — whether the sheet cell is plain text ("$5.00") or a formatted number
        // (balance, referral_balance, etc.) — arrives pre-formatted exactly as authored in the
        // sheet, so the app never needs to hardcode a currency symbol. Booleans/plain numbers
        // still come through fine via f ("TRUE"/"35"), and f is absent for ordinary text cells
        // so this falls back to v unchanged.
        obj[key] = cell ? (cell.f != null ? cell.f : cell.v != null ? cell.v : "") : "";
      });
      return obj;
    });
    return { headers, objects };
  }

  function validateHeaders(tabName, headers) {
    const expected = EXPECTED_COLUMNS[tabName];
    return expected.every((col) => headers.includes(col));
  }

  // Schema validation (validateHeaders) only checks that expected COLUMNS exist — it can't
  // catch a structurally broken ROW, e.g. a cell-internal newline that shifts an entire row's
  // values one column to the right (this happened on an earlier pz-de games tab: a wrapped
  // long_description produced a row with prose in the `id` column and "TRUE" in `name`). These
  // guards drop rows that fail a cheap shape check for tabs where that's structurally
  // identifiable, logging a warning instead of silently rendering garbage (a game card titled
  // "TRUE", a task joined to no game, etc.).
  const ROW_GUARDS = {
    games: (row) => /^g\d+$/i.test(String(row.id || "").trim()),
    tasks: (row) => String(row.game_id || "").trim() !== "",
  };

  function filterRows(tabName, objects) {
    const guard = ROW_GUARDS[tabName];
    if (!guard) return objects;
    return objects.filter((row, i) => {
      if (guard(row)) return true;
      console.warn(`Sheets: dropping malformed "${tabName}" row ${i}`, row);
      return false;
    });
  }

  async function fetchTab(sheetId, tabName, gid) {
    const res = await fetch(gvizUrl(sheetId, gid));
    if (!res.ok) throw new Error(`HTTP ${res.status} for tab "${tabName}"`);
    const text = await res.text();
    const json = parseGviz(text);
    if (json.status !== "ok") throw new Error(`gviz status "${json.status}" for tab "${tabName}"`);
    const { headers, objects } = gvizToObjects(json.table);
    if (!validateHeaders(tabName, headers)) {
      throw new Error(`Tab "${tabName}" headers don't match expected schema: got [${headers.join(", ")}]`);
    }
    return filterRows(tabName, objects);
  }

  function toKeyValue(rows) {
    const obj = {};
    rows.forEach((r) => {
      if (r.key) obj[r.key] = r.value;
    });
    return obj;
  }

  function collectBonuses(content) {
    const bonuses = [];
    // Only 2 bonus cards ship on Profile (bonus_3 removed per product decision — the Sheet
    // may still carry bonus_3_* columns harmlessly, they're just not read here).
    // Illustration art is NOT sourced from the Sheet (bonus_N_icon doesn't exist as a content
    // key) — it's a fixed image path, not editable copy. See PROFILE_BONUS_ILLUSTRATIONS in
    // js/views/profile.js.
    for (let i = 1; i <= 2; i++) {
      const title = content[`bonus_${i}_title`];
      if (title === undefined) continue;
      bonuses.push({
        slot: i,
        title: title || "",
        cta: content[`bonus_${i}_cta`] || "",
      });
    }
    return bonuses;
  }

  async function fetchAll(sheetId) {
    const names = Object.keys(TABS);
    const results = await Promise.allSettled(
      names.map((name) => fetchTab(sheetId, name, TABS[name]))
    );

    const fallback = await loadFallback();
    const data = {};
    const failedTabs = [];

    names.forEach((name, i) => {
      const r = results[i];
      if (r.status === "fulfilled" && r.value.length > 0) {
        data[name] = r.value;
      } else {
        failedTabs.push(name);
        data[name] = fallback[name];
      }
    });

    // settings/content are key-value tabs; collapse array-of-rows into a flat object.
    data.settings = Array.isArray(data.settings) ? toKeyValue(data.settings) : data.settings;
    data.content = Array.isArray(data.content) ? toKeyValue(data.content) : data.content;
    data.content.bonuses = collectBonuses(data.content);

    // wallet.type is a machine enum (js/views/wallet.js keys its earned/spent styling and
    // filter chips off the literal string), not translatable copy — unlike every other
    // string column, it must stay "earned"/"spent" in every locale sheet. Warn loudly rather
    // than silently rendering every row as "spent" if a locale sheet ever translates it.
    const WALLET_TYPES = ["earned", "spent"];
    if (Array.isArray(data.wallet)) {
      data.wallet.forEach((row, i) => {
        const type = String(row.type || "").trim().toLowerCase();
        if (!WALLET_TYPES.includes(type)) {
          console.warn(`Sheets: wallet row ${i} has unrecognized type "${row.type}" — expected "earned" or "spent". This column must not be translated.`);
        }
      });
    }

    // Bundled offline content, exposed alongside the live content so Render.t() (js/render.js)
    // can fall back to it per-key when a key exists here but hasn't been pasted into the live
    // Sheet yet, without waiting for a total-failure fallback.
    data.fallbackContent = fallback.content;

    return { data, failedTabs };
  }

  let _fallbackPromise = null;
  function loadFallback() {
    if (!_fallbackPromise) {
      _fallbackPromise = fetch("data/fallback.json").then((r) => r.json());
    }
    return _fallbackPromise;
  }

  async function load(force) {
    if (_cache && !force) return _cache;
    // Fire the fallback bundle fetch immediately so it overlaps the master-sheet round-trip
    // below instead of queuing strictly after it (loadFallback() is promise-memoized, so this
    // doesn't cause a duplicate request — fetchAll() just awaits the same promise later).
    loadFallback();
    try {
      const sheetId = await resolveSheetId();
      _cache = await fetchAll(sheetId);
      _cache.sheetId = sheetId;
    } catch (err) {
      // Total failure (e.g. offline): fall back entirely.
      const fallback = await loadFallback();
      fallback.content.bonuses = collectBonuses(fallback.content);
      fallback.fallbackContent = fallback.content;
      _cache = { data: fallback, failedTabs: Object.keys(TABS), error: err };
    }
    return _cache;
  }

  return { load, TABS };
})();
