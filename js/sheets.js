/* Google Sheets data layer. See docs/01-data-model.md and docs/03-sheets-integration.md.
   Fetches 6 tabs BY NAME via the gviz JSON endpoint (name-based lookup works correctly —
   confirmed live against multiple spreadsheets: ?sheet=<name> returns that exact tab,
   case-insensitively; only a NAME THAT DOESN'T EXIST falls through to the first tab, which
   validateHeaders() below catches). Gid-based addressing was dropped because gids are
   per-spreadsheet-copy — they only matched across pz-en/pz-de because one was duplicated from
   the other. An arbitrary third-party sheet (the whole point of this module now) has no such
   guarantee, so tab name is the only identifier that travels across spreadsheets.

   No master sheet, no default sheet, no bundled fallback data. The spreadsheet ID comes from
   the caller (see js/app.js, which reads it out of the URL hash). Any failure — bad ID, no
   access, wrong schema, missing content keys — surfaces as a typed SheetError the caller
   renders into a specific error screen; there is no silent degrade-to-English-default path
   anymore, because there is no longer a "default" sheet to degrade to. */

const Sheets = (() => {
  // Spreadsheet IDs look like 25-60 chars of [A-Za-z0-9_-]. Used to validate IDs parsed out
  // of the URL hash (see js/app.js) before ever issuing a fetch.
  const SHEET_ID_PATTERN = /^[A-Za-z0-9_-]{25,60}$/;

  const TAB_NAMES = ["games", "tasks", "rewards", "wallet", "settings", "content"];

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

  // settings/content are key-value tabs (EXPECTED_COLUMNS only checks the 2 column headers
  // exist) — these are the individual KEYS the rest of the app actually reads. A sheet that
  // has the right columns but is missing one of these renders blank strings everywhere with
  // no warning, which is worse than a clear "your sheet is missing X" error. Audited by
  // grepping every Render.t()/tRaw()/content.*/settings.* call site in js/ (see PR description
  // for the exact grep) and cross-checked against a live reference sheet — 73 content keys,
  // 0 drift either direction.
  //
  // currency_symbol / currency_position / number_locale are deliberately NOT required —
  // Render.initCurrency() (js/render.js) already sniffs/defaults them when absent.
  const REQUIRED_SETTINGS_KEYS = ["balance", "referral_balance", "referral_first_task", "referral_pct"];

  const REQUIRED_CONTENT_KEYS = [
    "bonus_1_cta",
    "bonus_1_title",
    "bonus_2_cta",
    "bonus_2_title",
    "common_balance_label",
    "common_payout_cta",
    "common_see_all",
    "discover_all_games_title",
    "discover_invite_cta",
    "discover_trending_title",
    "email",
    "game_card_badge_cashback",
    "game_card_badge_limited_bonus",
    "game_card_play_cta",
    "game_detail_cashback_cta",
    "game_detail_cashback_subtitle",
    "game_detail_cashback_title",
    "game_detail_description_title",
    "game_detail_max_per_task_label",
    "game_detail_not_found",
    "game_detail_play_cta",
    "game_detail_see_more_cta",
    "game_detail_task_active_badge",
    "game_detail_tasks_subtitle",
    "game_detail_tasks_title",
    "game_detail_tasks_total_suffix",
    "game_detail_total_reward_label",
    "invite_card_discover_text",
    "invite_cta",
    "invite_hero_subtitle",
    "invite_hero_title",
    "invite_how_1",
    "invite_how_2",
    "invite_how_3",
    "invite_how_4",
    "invite_how_title",
    "invite_referral_balance_label",
    "invite_referral_pct_note",
    "invite_reward_first_task_label",
    "invite_reward_pct_caption",
    "invite_reward_pct_label",
    "invite_rewards_intro",
    "invite_rewards_title",
    "my_games_empty_body",
    "my_games_empty_title",
    "nav_title_discover",
    "nav_title_game_fallback",
    "nav_title_invite",
    "nav_title_my_games",
    "nav_title_profile",
    "nav_title_reward_fallback",
    "nav_title_rewards",
    "nav_title_wallet",
    "profile_bonuses_title",
    "profile_delete_account_cta",
    "profile_email_label",
    "profile_menu_help",
    "profile_menu_imprint",
    "profile_menu_privacy",
    "profile_menu_terms",
    "profile_wallet_row_label",
    "reward_detail_conditions_title",
    "reward_detail_confirm_cta",
    "reward_detail_how_title",
    "reward_detail_not_found",
    "tab_label_discover",
    "tab_label_my_games",
    "tab_label_profile",
    "tab_label_rewards",
    "wallet_copy_shop_cta",
    "wallet_filter_all",
    "wallet_filter_earned",
    "wallet_filter_spent",
  ];

  // Thrown for every failure mode this module can detect, each with a `code` the caller
  // (js/app.js) switches on to render a specific, actionable error screen instead of one
  // generic "couldn't load data" message. `detail` carries whatever extra context that
  // screen needs (tab name, missing column/key list, etc).
  class SheetError extends Error {
    constructor(code, message, detail) {
      super(message);
      this.name = "SheetError";
      this.code = code;
      this.detail = detail || null;
    }
  }

  let _cache = null;
  let _cachedSheetId = null;

  function gvizUrl(sheetId, tabName) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  }

  function parseGviz(text) {
    const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) return null; // Not a gviz response at all — e.g. an HTML login/consent page.
    try {
      return JSON.parse(match[1]);
    } catch (err) {
      return null;
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

  function missingColumns(tabName, headers) {
    const expected = EXPECTED_COLUMNS[tabName];
    return expected.filter((col) => !headers.includes(col));
  }

  // Schema validation only checks that expected COLUMNS exist — it can't catch a structurally
  // broken ROW, e.g. a cell-internal newline that shifts an entire row's values one column to
  // the right (this happened on an earlier pz-de games tab: a wrapped long_description
  // produced a row with prose in the `id` column and "TRUE" in `name`). These guards drop rows
  // that fail a cheap shape check for tabs where that's structurally identifiable, logging a
  // warning instead of silently rendering garbage (a game card titled "TRUE", a task joined to
  // no game, etc.).
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

  async function fetchTab(sheetId, tabName) {
    let res;
    try {
      res = await fetch(gvizUrl(sheetId, tabName));
    } catch (err) {
      throw new SheetError("NETWORK", `Network error fetching tab "${tabName}"`, { tabName, cause: err });
    }

    if (res.status === 404) {
      throw new SheetError("NOT_FOUND", `Spreadsheet not found (HTTP 404)`, { sheetId });
    }
    if (!res.ok) {
      throw new SheetError("NETWORK", `HTTP ${res.status} for tab "${tabName}"`, { tabName, status: res.status });
    }

    const text = await res.text();
    const json = parseGviz(text);
    if (!json) {
      // gviz returns actual JSON for every real spreadsheet, public or not. A non-JSON body
      // (an HTML Google Accounts / "request access" page) means the sheet exists but isn't
      // shared "Anyone with the link".
      throw new SheetError("NO_ACCESS", `Spreadsheet isn't publicly readable`, { sheetId });
    }
    if (json.status !== "ok") {
      throw new SheetError("NOT_FOUND", `gviz status "${json.status}" for tab "${tabName}"`, { tabName });
    }

    const { headers, objects } = gvizToObjects(json.table);
    const missing = missingColumns(tabName, headers);
    if (missing.length > 0) {
      throw new SheetError("BAD_SCHEMA", `Tab "${tabName}" is missing columns: ${missing.join(", ")}`, {
        tabName,
        missing,
        got: headers,
      });
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

  function missingKeys(obj, required) {
    return required.filter((key) => {
      const v = obj[key];
      return v === undefined || v === null || String(v).trim() === "";
    });
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
    // All-or-nothing: with no bundled fallback data to blend in on a per-tab failure, a
    // partial failure must surface as an error, not as mismatched data silently stitched
    // together from two different spreadsheets' worth of content.
    const results = await Promise.all(TAB_NAMES.map((name) => fetchTab(sheetId, name)));

    const data = {};
    TAB_NAMES.forEach((name, i) => {
      data[name] = results[i];
    });

    // settings/content are key-value tabs; collapse array-of-rows into a flat object.
    data.settings = toKeyValue(data.settings);
    data.content = toKeyValue(data.content);

    const settingsMissing = missingKeys(data.settings, REQUIRED_SETTINGS_KEYS);
    if (settingsMissing.length > 0) {
      throw new SheetError("MISSING_KEYS", `settings tab is missing keys: ${settingsMissing.join(", ")}`, {
        tabName: "settings",
        missing: settingsMissing,
      });
    }
    const contentMissing = missingKeys(data.content, REQUIRED_CONTENT_KEYS);
    if (contentMissing.length > 0) {
      throw new SheetError("MISSING_KEYS", `content tab is missing keys: ${contentMissing.join(", ")}`, {
        tabName: "content",
        missing: contentMissing,
      });
    }

    data.content.bonuses = collectBonuses(data.content);

    // wallet.type is a machine enum (js/views/wallet.js keys its earned/spent styling and
    // filter chips off the literal string), not translatable copy — unlike every other
    // string column, it must stay "earned"/"spent" in every locale sheet. Warn loudly rather
    // than silently rendering every row as "spent" if a locale sheet ever translates it.
    const WALLET_TYPES = ["earned", "spent"];
    data.wallet.forEach((row, i) => {
      const type = String(row.type || "").trim().toLowerCase();
      if (!WALLET_TYPES.includes(type)) {
        console.warn(`Sheets: wallet row ${i} has unrecognized type "${row.type}" — expected "earned" or "spent". This column must not be translated.`);
      }
    });

    return { data };
  }

  async function load(sheetId, force) {
    if (!sheetId || !SHEET_ID_PATTERN.test(sheetId)) {
      throw new SheetError("BAD_ID", `"${sheetId}" doesn't look like a Google Sheet ID`, { sheetId });
    }
    if (_cache && !force && _cachedSheetId === sheetId) return _cache;
    _cache = await fetchAll(sheetId);
    _cachedSheetId = sheetId;
    return _cache;
  }

  return { load, SheetError, SHEET_ID_PATTERN, TAB_NAMES };
})();
