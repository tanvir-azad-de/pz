# Seed data — paste into the Google Sheet

These TSV files contain demo data matching the schema in `docs/01-data-model.md`. Each file
includes its header row. Paste each one into the matching tab, starting at cell `A1` (this
overwrites the header row with the same header, which is fine — it's identical).

## How to paste

1. Open the TSV file in a text editor and select-all / copy (or open it in a spreadsheet app
   and copy the used range).
2. In the Google Sheet, click the target tab, select cell `A1`.
3. Paste. Google Sheets will split tab-separated values into columns automatically.
4. For `settings.tsv` and `content.tsv`: **clear the tab first** (select all existing cells,
   delete) before pasting — both tabs currently contain leftover wide-format data from an
   earlier draft and must be reset to the two-column `key` / `value` layout.

## Tab → gid reference

Tab name lookup (`?sheet=<name>`) is broken on this spreadsheet — it always returns the
`games` tab regardless of what name is requested. The app addresses tabs by **gid** instead.
If you ever delete and recreate a tab, its gid changes — grab the new one from the tab's URL
(`#gid=<number>` in the browser address bar when that tab is active) and update
`js/sheets.js`.

| Tab | gid | File |
|---|---|---|
| `games` | `420976241` | `games.tsv` |
| `tasks` | `666986029` | `tasks.tsv` |
| `rewards` | `955004045` | `rewards.tsv` |
| `wallet` | `1476565906` | `wallet.tsv` |
| `settings` | `719558094` | `settings.tsv` (clear tab first) |
| `content` | `1744568315` | `content.tsv` (clear tab first) |

## Verifying after paste

```
curl "https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:json&gid=<gid>"
```

Check the response's `table.rows[0].c` values match the expected header row for that tab.
