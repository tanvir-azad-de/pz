# 05 — Tab Screens

Covers the 4 screens reachable from the bottom tab bar: Discover, My Games, Rewards, Profile.
Section order, spacing, and data bindings below are read from each screen's Figma auto-layout
(node IDs noted per screen).

> Routes below are written as `#/route` for brevity. The actual hash always carries the active
> sheet ID first — see `docs/03-sheets-integration.md` — so `#/discover` really means
> `#/<sheetId>/discover`.

## Discover (Figma node `1:2127`)

Route `#/discover`. Sections, top to bottom, each separated by `--space-section-gap` (24px):

1. **Invite card** — full-width card, `background: var(--color-surface)`, `border: 1px solid
   var(--purple-400)`, `border-radius: 16px`, padding `12px 12px 8px`, height 89px.
   `display:flex; gap:12px`. Left: decorative illustration (static image/SVG, 91×69). Right:
   text block — `content.invite_card_discover_text` (`.t-body-sm` 14/800, 2-line max) + "Get
   Bonus" pill button (`.btn-pill-outline`-style but filled: `background: transparent`, text
   `var(--color-primary)`, arrow icon). Visual only, no real navigation target specified by the
   brief — tapping does nothing (or could link to `#/invite`; left as a no-op per "visual only"
   decision, can be wired later).

2. **Trending Game** — section header "Trending Game" (`.t-title-md`, 24/800), padding `0 16px`,
   followed by exactly **one** game card: `games` row 2 (the first data row), using the shared
   game card component (`04-components.md`).

3. **All Games** — section header row: "All Games" (`.t-title-md`) + "See All" ghost button,
   `justify-content: space-between`, padding `0 16px`. Below it, a vertical list (`gap: 12px`)
   of the shared game card component for every row in `games` (including the trending one —
   Figma shows it duplicated in both sections, so the app does too, for fidelity).

Each card navigates to `#/game/:id` on tap.

```
Discover
├─ Invite card (static)
├─ "Trending Game" + 1 card   (games[0])
└─ "All Games" + "See All" + N cards (games[0..n])
```

## My Games (no Figma frame — derived per product decision)

Route `#/my-games`. Per a later product decision, this tab is now intentionally empty — it no
longer lists any games (previously it mirrored Discover's "All Games" in a 2-column grid; that
behavior was removed). Renders just a centered empty-state message (`.state-message`, same
pattern used for "Game not found" / "Reward not found"): "No games yet" / "Games you start
playing will appear here." No header text (removed per a later product decision — the nav bar
already shows "My Games" as the screen title).

`gameCardHtml()` (defined in `js/views/discover.js`) and the `.game-card` styles are unaffected
— Discover still uses them.

## Rewards (Figma node `1:5889`)

Route `#/rewards`. Per product decision, the Figma "featured PayPal/Zalando row" at the very
top is **not** built — the screen starts directly with the balance card, then the 4 category
rows:

1. **Balance card** — full-width, `padding: 0 16px` wrapper around an inner card:
   `background: var(--color-surface)`, no border, `border-radius: 16px`,
   `padding: 12px 16px`. Content: wallet icon (24×24) + text block ("Your Balance" `.t-label-tiny`
   800 + `{settings.balance}` (sheet-formatted, e.g. `$2.30`) `.t-label-lg` 800) + "Payout Now" button (`.btn-small`) right-
   aligned. "Payout Now" is visual only (no target screen specified — Reward Detail requires
   picking a specific reward first).

2. **Four category rows**, each identical structure, for `category` ∈ `Cash`, `Amazon`,
   `Google Play`, `Apple` (in that order):
   - Header: category name (`.t-title-md`, 24/800) + "See All" ghost button,
     `justify-content:space-between`, `padding:0 16px`.
   - Horizontally scrollable row (`.payout-row`, see `04-components.md`) of every `rewards` row
     where `rewards.category` matches, each rendered as a `.payout-card` with its progress bar.
   - Tapping any card navigates to `#/reward/:id`.

```
Rewards
├─ Balance card (settings.balance, Payout Now)
├─ "Cash" + See All  → h-scroll of rewards[category=Cash]
├─ "Amazon" + See All → h-scroll of rewards[category=Amazon]
├─ "Google Play" + See All → h-scroll of rewards[category=Google Play]
└─ "Apple" + See All → h-scroll of rewards[category=Apple]
```

## Profile (Figma node `1:6839`)

Route `#/profile`. Sections top to bottom:

1. **Your Wallet row** — card, `background: var(--color-surface)`, `border-radius: 16px`,
   `padding: 8px 12px`, height 66px. `display:flex; justify-content:space-between;
   align-items:center`. Left: `illus-wallet.png` (50×50, native asset size — Figma specs
   61×56 but the delivered art is square) + "Your Wallet" label (`.t-label-lg`). Right:
   chevron-right icon. Tapping navigates to `#/wallet`.

2. **Bonuses** — section header "Bonuses" (`.t-title-sm`, 20/700), `padding: 8px 0`. Two
   cards (bonus 3 removed per product decision; `gap: 8px` or `12px` between them — Figma
   shows both 12 and 8 depending on sub-frame; use 12px for consistency), each:
   `background: var(--color-surface)`, `border: 1px solid
   var(--purple-400)`, `border-radius: 16px`, `padding: 12px 12px 8px`, height ~89px.
   `display:flex; gap:12px`. Left: decorative illustration (91×69 — bonus 1 reuses
   `illus-invite-card.png`, same as the Discover invite card; bonus 2 uses
   `illus-bonus-2.png`). Right:
   text (`content.bonus_{n}_title`, `.t-body-sm` 14/800, 2-line) + pill CTA button
   (`content.bonus_{n}_cta`, outline style, `var(--color-primary)` text + arrow icon). Both
   visual only, no real navigation (per "visual only interactions" decision) — except bonus 1
   ("Invite your friends...") which may optionally link to `#/invite` since that screen exists;
   bonus 2 (Instagram follow) has no corresponding screen and stays inert.

3. **Menu list** — 5 rows, each `border-bottom: 1px solid var(--purple-700)`, `padding: 12px
   16px`, `display:flex; justify-content:space-between; align-items:center`, height 48px
   (first row "Email" is taller, 70px, showing label + value stacked):
   - Email: "Email" `.t-body-md` (14/400) above `content.email` `.t-body-md` white — no chevron,
     informational only
   - Help&Info — label + chevron-right, inert
   - Terms of Use — label + chevron-right, inert
   - Imprint — label + chevron-right, inert
   - Privacy — label + chevron-right, inert

4. **Delete account** — full-width danger button (`.btn-danger-ghost`): `background:
   transparent`, no border, red text, `padding: 12px 24px`, pinned near the bottom of the
   content (not sticky — scrolls with the page, per Figma's "Frame 2609211" which sits inline
   after the menu, not fixed). Visual only, no action.

```
Profile
├─ Your Wallet row → #/wallet
├─ "Bonuses" + 3 cards (content.bonus_1..3, mostly inert)
├─ Menu: Email (value) / Help&Info / Terms of Use / Imprint / Privacy
└─ Delete account (danger, inert)
```

## Decisions

- Discover's "All Games" list excludes the Trending game (later product decision — originally
  matched Figma exactly with the trending game duplicated in both sections; de-duplication was
  added afterward).
- My Games is intentionally empty (later product decision) — no game list, no filtering, just
  a header and an empty-state message.
- Rewards' featured top row (PayPal/Zalando cards with progress bars at the very top of the
  Figma frame) is dropped; the screen starts at the balance card. The 4 category rows DO use
  progress bars (that part of the design is kept).
- Profile's 3 bonus cards and "Delete account" button are visual-only; only "Your Wallet" has a
  real navigation target.

## Open items

- Decorative illustrations (invite card art, bonus card art) are static placeholder
  images/gradients until/unless the user provides exports — these were never listed as needing
  Sheet-driven data, so they're treated as static assets, not content-tab entries.
