# Seed data — paste into the Google Sheet

These TSV files are a snapshot of the live pz-en sheet's content (regenerated directly from it,
not hand-authored — see `docs/01-data-model.md` and `docs/03-sheets-integration.md`), matching
the schema in `docs/01-data-model.md`. Each file includes its header row. Paste each one into
the matching tab of any locale sheet, starting at cell `A1` (this overwrites the header row
with the same header, which is fine — it's identical). Useful for resetting a sheet to a known
state, or as an English starting point to translate into a new locale sheet.

## How to paste

1. Open the TSV file in a text editor and select-all / copy (or open it in a spreadsheet app
   and copy the used range).
2. In the Google Sheet, click the target tab, select cell `A1`.
3. Paste. Google Sheets will split tab-separated values into columns automatically.
4. For `settings.tsv` and `content.tsv`: clear the tab first (select all existing cells,
   delete) before pasting, to avoid stray leftover rows below the pasted range if the target
   tab currently has more rows than the file.

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
