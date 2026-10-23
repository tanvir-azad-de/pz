/* Google Sheets data layer. See docs/01-data-model.md and docs/03-sheets-integration.md.
   Fetches 6 tabs by gid (name-based lookup is broken on this spreadsheet — confirmed by
   testing: sheet=<name> always returns the `games` tab regardless of the name requested).
   Fetch-once, in-memory cache, per-tab fallback to data/fallback.json on failure. */

const Sheets = (() => {
  const SHEET_ID = "1M70ITzDuJapNMhcd9H_HEPUyuOWHkJIMyrFBb4cSubU";

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

  function gvizUrl(gid) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  }

  function parseGviz(text) {
    const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) throw new Error("Unexpected gviz response shape");
    return JSON.parse(match[1]);
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

  async function fetchTab(tabName, gid) {
    const res = await fetch(gvizUrl(gid));
    if (!res.ok) throw new Error(`HTTP ${res.status} for tab "${tabName}"`);
    const text = await res.text();
    const json = parseGviz(text);
    if (json.status !== "ok") throw new Error(`gviz status "${json.status}" for tab "${tabName}"`);
    const { headers, objects } = gvizToObjects(json.table);
    if (!validateHeaders(tabName, headers)) {
      throw new Error(`Tab "${tabName}" headers don't match expected schema: got [${headers.join(", ")}]`);
    }
    return objects;
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
    for (let i = 1; i <= 2; i++) {
      const title = content[`bonus_${i}_title`];
      if (title === undefined) continue;
      bonuses.push({
        slot: i,
        title: title || "",
        cta: content[`bonus_${i}_cta`] || "",
        icon: content[`bonus_${i}_icon`] || "",
      });
    }
    return bonuses;
  }

  async function fetchAll() {
    const names = Object.keys(TABS);
    const results = await Promise.allSettled(
      names.map((name) => fetchTab(name, TABS[name]))
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
    try {
      _cache = await fetchAll();
    } catch (err) {
      // Total failure (e.g. offline): fall back entirely.
      const fallback = await loadFallback();
      fallback.content.bonuses = collectBonuses(fallback.content);
      _cache = { data: fallback, failedTabs: Object.keys(TABS), error: err };
    }
    return _cache;
  }

  return { load, TABS };
})();
