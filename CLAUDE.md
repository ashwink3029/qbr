# QBR — Project Map for Claude

## One-line pitch
**Quarterly Business Reports as a card game.** A Queen's Blood-shaped territory
card battle played on a 3x5 spreadsheet, headed toward a Balatro-shaped run:
bosses are meetings, jokers are desk supplies and software features, helpers are
keyboard shortcuts and sticky notes. Lore-light, vibe-heavy — the fiction is
corporate spreadsheet hell, which every player already knows, so nothing needs
explaining.

## Why this exists
Origin (2026-09-25): the ask was "a Gwent / Queen's Blood for mobile". Market read:
PvP live-service card games are contracting (Gwent is now community-run, Marvel
Snap's players are declining and its studio cut staff in 2026) and fail the
workspace rubric (servers, balance, content ops). Solo roguelike deckbuilders are
crowded, but a **grid-territory** card game on mobile is thin — no official
Queen's Blood port exists, only fan clones. QBR is that gap, skinned as a
spreadsheet because a lore-light, familiar-object fiction (Balatro = poker/casino)
beats inventing a world.

## Tech stack (same as cubes/ and chain/, deliberately)
- pnpm workspaces — `packages/{shared,client,sim}`.
- **shared**: pure, action-sourced reducer. No `window`/`document`/`react`/`node:*`.
  All randomness through `rngState` (mulberry32, same lineage as chain/cubes).
- **client**: React + TypeScript (Vite), **2D CSS/DOM renderer** (a real `<table>`
  is the board). Capacitor iOS wrap, appId `com.ashwink.qbr`, edge-to-edge.
- **sim**: headless measurement via tsx.

## Rules as built (one quarter = one round)
**Current defaults = `DEFAULT_RULES` (pasteOver + takeover + cheapOpener),
adopted 2026-09-25 — see "Phase 0 re-run" below.** The bullets here describe
the original baseline (`BASELINE_RULES`); the three rules modify it:
- **Paste over:** you may play onto your OWN cell that already holds a card; the
  old card is discarded and the new one spreads again.
- **Takeover:** a spread reaching an enemy card of strictly lower value flips it.
- **Cheap opener:** each opening hand is guaranteed a $-cost card.

- Sheet is 3 rows (Sales / Ops / R&D) x 5 columns. You own column A, AI owns E,
  each home cell at budget `$` = 1.
- Place a card on an **empty cell you own whose budget >= card cost** ($-$$$).
  It **spreads** in its shape (drawn on the card): every empty cell reached
  becomes yours and gains +1 budget (cap 3). A cell taken from the opponent keeps
  its budget. Cells holding a card are never touched. Shapes are written from the
  left player's view and mirrored for the right.
- A row's value leader banks that row's total as revenue; ties bank nothing.
- Draw 1 per turn from each player's second turn. Two consecutive passes end the
  quarter. Both seats use the same 15-card `STARTER_DECK`, shuffled per seed.

## Phase 0 result (2026-09-25, `pnpm measure 2000`) — 2 of 4 pre-registered bars
| bar | result | |
|---|---|---|
| seat balance, greedy-vs-greedy first seat in [40,60]% | **49.9%** | PASS |
| skill floor, greedy beats random >= 80% | **77.0%** | FAIL (close) |
| **skill headroom, 2-ply lookahead beats greedy >= 55%** | **64.2%** | PASS |
| real choices, median plays >= 4 and <25% decisions with 0-1 plays | med **4**, thin **27.5%** | FAIL |

**The headroom result is the one that matters most and it passed comfortably:
thinking one reply ahead wins ~2:1, so the core is not shallow.**
**Diagnosis of the thin-decision fail, measured:** 20.2% of all decisions are a
player holding cards with **no empty cell of their own left** (boxed in); 4.8% are
"all cards too expensive"; 0.0% are an empty hand. The binding constraint is
**territory starvation**, a board-geometry problem, not card costs. Levers to test
next, one at a time against the same harness: a 6th column; a
"replace your own card" play (overwrite for an upgrade); spreads that can push
into enemy cells holding weaker cards. Do not move the pre-registered bars.

## Phase 0 re-run with rule fixes (2026-09-25) — 4/4 bars PASS
`pnpm sweep 1000` tests all 8 combinations against the same pre-registered bars
(moved into `sim/src/bars.ts`, unchanged):
| rules | seat | floor | headroom | med plays | thin | turns | bars |
|---|---|---|---|---|---|---|---|
| baseline | 50.8% | 76.5% | 63.8% | 4 | 27.8% | 19 | 2/4 |
| pasteOver | 50.5% | 93.3% | 75.0% | 9 | 14.4% | 32 | 4/4 |
| takeover | 47.8% | 77.0% | 64.2% | 4 | 27.5% | 19 | 2/4 |
| pasteOver+takeover | 48.9% | 90.3% | 82.6% | 10 | 15.0% | 32 | 4/4 |
| cheapOpener (any combo) | ~same as without | | | | | | |
Confirmed at 2000 seeds for all three: seat 48.8%, floor 90.7%, headroom 83.6%,
median 10 plays, 14.4% thin — **4/4 PASS**. Reading: pasteOver is THE fix for
territory starvation; takeover does nothing alone (a locked board rarely lets it
fire) but adds ~8pp of headroom on top of pasteOver; cheapOpener moves no bar but
removes the "no legal first move" opening. **Cost to watch:** a quarter runs ~32
turns (was 19), because nobody is boxed in and both players play out their
decks — relevant to the best-of-3 layer, which must not triple that.
`spreadEffects()` in shared is the single source of truth for what a play
changes; the reducer applies it and the client previews it (green = claim,
orange stripes = takeover flip).

## Phone layout (2026-09-25) — decisions, do not regress
- **Window anchored to the BOTTOM of a teal desktop, only as tall as its content.**
  Board, hand and pass button always sit in the thumb zone. On tall phones the
  slack is visible desktop ABOVE the window — reserved for the joker tray (desk
  objects on the desktop). An earlier full-height version stretched cells to
  58x184 on a 17 Pro and read as a ledger, not a board.
- Board is a CSS grid, rows `minmax(56px, 112px)` and the sheet is a shrinkable
  flex item, so on an iPhone SE rows drop to ~95px instead of pushing the pass
  button off-screen. Verified at 375x667 / 402x874 / 440x956 via CDP device
  emulation, plus the real Simulator.
- **Touch placement = tap card -> tap cell to preview the spread -> tap the same
  cell again to commit.** Touch has no hover; a spatial game needs the preview.
- Long single-word card names carry soft hyphens (`Stake\u00ADholder`).
- Opponent strip at the top ("Finance", hand as card backs, deck count) is the
  future boss video-call tile.
- **Vertical board (you at the bottom, Finance on top).** The screen shows the sheet
  transposed: 3 lanes (A Sales / B Ops / C R&D) across x 5 rows up, forward = up.
  It is a **view-only transpose** in `client/src/layout.ts` (`toScreen` /
  `fromScreen` / `spreadToScreen`), tested there, including "a Cold Call claims the
  cell directly above it". The rules model is still 3 lanes x 5 columns; never
  bake screen orientation into `packages/shared`. Card glyphs are 3 wide x 5 tall
  in the same orientation. Cells are ~105-127px wide (were 53-66). Lane scores
  sit in a `=SUM` row under your home row; revenue + deck sit beside the pass
  button.

## Known rules issue surfaced by play
- **An opening hand can have no legal move** (all cards cost $$+, home cells hold
  $). Seen live on a random seed; it is the "all cards too expensive" 4.8% from
  Phase 0. Fix candidates: guarantee a $-cost card in the opening hand, or a
  mulligan. Measure through `pnpm measure`, like the starvation fix.

## Backlog (prioritized — top item is next)
1. **App ID + signing — project side DONE 2026-09-25 (`ba0ebe2`); account side
   is the user's.** Bundle ID `com.ashwink.qbr` is registered (user). Project now
   mirrors `rushie/`: `DEVELOPMENT_TEAM = 7XMX2SE648`, automatic signing,
   `ITSAppUsesNonExemptEncryption = false`, iPhone locked to portrait, and
   `ios/App/ci_scripts/ci_post_clone.sh` builds `@qbr/client` for Xcode Cloud.
   **Verified:** a signed Release archive builds (`xcodebuild ... -destination
   'generic/platform=iOS' -allowProvisioningUpdates archive`), signed "Apple
   Development" with the team wildcard profile, web assets bundled.
   **Not possible locally:** App Store export fails with "No Accounts" / no
   "iOS Distribution" certificate — no Apple ID is signed in to Xcode on this Mac.
   That is fine: like rushie, distribution goes through **Xcode Cloud**. Remaining,
   in the user's Apple account: (a) ~~create the App Store Connect app record for
   `com.ashwink.qbr`~~ done 2026-09-25; (b) in Xcode, add an Xcode Cloud workflow on
   `github.com/ashwink3029/qbr` `main` -> Archive -> TestFlight (internal).
   For a direct install, plug in a registered iPhone; the dev-signed build works.
2. ~~Vertical board~~ **DONE 2026-09-25.** See "Phone layout" above.
3. ~~Fix territory starvation + opening hand~~ **DONE 2026-09-25** — 4/4 bars.
4. **Gwent layer:** best-of-3 quarters with passing as a real decision (currently
   policies only pass when forced, so passing is not yet measured at all).
5. **Balatro layer:** run of meetings as blinds — "Quick sync" / "Standup" /
   "Quarterly Review" boss — with boss rule-breakers (Micromanager locks a cell,
   Reply-All floods junk, Auditor halves your best row, Legacy System has
   unclaimable cells, final boss "The Board"). Jokers as desk objects (Coffee Mug,
   APPROVED stamp, Pivot Table rotates a shape, Newton's Cradle, Circular
   Reference wraps edges) — the teal desktop above the window is their tray.
   Helpers as keycaps (Ctrl+C/V/X/Z) and sticky notes. Rushie's Cascade Forge is
   the reference for the joker/blind plumbing.
6. Mascot: an original **binder clip** assistant (jaws = expressions). NOT
   Clippy/Clippit — that is Microsoft's character.

## IP guardrails — read before adding art, names or cards
- Mechanics are free; expression is not. Card names, text, art and characters must
  be original. Don't resemble Gwent factions, Queen's Blood card names, or the
  Cyberpunk TCG look.
- Evoke the 90s office; don't copy trade dress: no Excel green X, no Office
  ribbon, no Windows logo or BSOD, no Microsoft fonts, no Clippy, no flying
  toasters, no quoted Office Space lines or the red stapler as a direct homage.
- No AI-generated shipped art or card text — the card-game audience punishes it.
  Plan on a commissioned pixel artist (32-64px, 16-colour VGA-era palette).

## How to run
```
pnpm install
pnpm dev         # client on http://localhost:5176  (5173 casual, 5174 cubes, 5175 chain)
pnpm test        # shared rule tests + client DOM test
pnpm typecheck
pnpm measure     # Phase 0 report: [seedsPerSeat=1000] [rules, e.g. pasteOver,takeover]
pnpm sweep       # all 8 rule combinations vs the pre-registered bars
```

## iOS Simulator
Same recipe as `rushie/CLAUDE.md` (formerly `chain/`) ("Dev workflow — running on the iOS Simulator"),
with bundle id `com.ashwink.qbr`:
```
cd packages/client && pnpm build && pnpm exec cap sync ios && cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=<UDID>" -derivedDataPath ./build build
xcrun simctl install <UDID> ./build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch <UDID> com.ashwink.qbr
```
Verified building and launching 2026-09-25. No signing team / Xcode Cloud setup yet.
Headless-Chrome screenshots below ~500px wide are cropped by Chrome's minimum window
width — that is not a layout bug; check on the Simulator instead.
