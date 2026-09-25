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

## Best-of-3 match — the Gwent layer (2026-09-25) — 4/4 bars PASS
`packages/shared/src/qbr/match.ts`. **The app now plays a whole year**: up to 3
quarters, one hand for the match (8 opening, +3 before Q2, +2 before Q3, no
per-turn draw), **locking pass** ("Close out Qn": you are out for the quarter,
Finance plays on alone), fresh board each quarter, 2 lives each (lose a quarter =
-1, tie = both -1), starter alternates. Finance = `smartPass(lookaheadPolicy)`.
Pre-registered bars (in `sim/src/matchbars.ts`, stated before the first run),
`pnpm match 2000`:
| bar | result | |
|---|---|---|
| M1 seat balance, smart mirror first-seat share in [40,60] | 50.1% | PASS |
| M2 passing matters: smart-pass beats never-pass >= 60% | 63.3% | PASS |
| M3 headroom: smart-lookahead beats smart-greedy >= 55% | 64.4% | PASS |
| M4 length: median turns per whole match <= 36 | 23 | PASS |
Also: 40% of matches reach Q3; ~1.9 voluntary passes per match; ~3 cards unplayed.
**How it got there, honestly:** the first config (8 opening, +2/+1) passed M2 at
60.2% — on the line (95% CI ~58.6-61.8), not a real pass. `pnpm passplan` showed
~59% of passing's value is the one obvious move (after Finance closes out, stop
the moment you lead); banking a lead early adds ~3pp. `pnpm matchsweep` then
tested the card economy: **scarcity was the wrong lever** (5-card hands make
passing matter LESS: 52-60%); **bigger between-quarter refills make it matter
more** (a saved card is worth more when the next quarter re-arms you). 8 / +3/+2
passes all four with margin; 10-card hands push seat balance to 55-56%.
**Open design issue — conceding is worthless.** In every config, conceding a lost
quarter to save cards scores 47-50% against the same plan without it, i.e. the
signature Gwent "throw a round" play does not pay yet. Boards reset and ~3
cards go unplayed at the end, so a saved card rarely matters. Candidate levers
for later: carry something across quarters (a lane's budget? a card's value?),
or make the last quarter card-hungrier. Do not claim "Gwent-style card
advantage" in marketing until this moves.

## Known rules issue surfaced by play
- ~~An opening hand can have no legal move~~ — fixed by `cheapOpener` (default).

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
4. ~~Gwent layer~~ **DONE 2026-09-25** — 4/4 match bars; see "Best-of-3 match".
   Follow-up: make conceding a quarter worth something (open design issue).
4b. ~~Home Screen (user request 2026-09-25)~~ **DONE 2026-09-25.** The app opens
   to Home (`client/src/Home.tsx`): the teal desktop with a start window, "Start
   fiscal year", and the player's record (W/L/D + last year's quarters, saved in
   localStorage via guarded `record.ts`). Finishing a year ("Back to home" on the
   year-end dialog) returns Home and records it. The game window's title-bar ×
   also returns Home **without** ending the year: `App.tsx` keeps the `Game`
   mounted but hidden and `paused` (Finance cannot move), and Home offers
   "Resume year". The desktop space is reserved for the run map / joker tray.
4c. ~~No placing on filled cells (user request 2026-09-25)~~ **DONE.** Matches
   (`MATCH_RULES`) now have `pasteOver: false`: a card can only go on an EMPTY
   cell you own. Measured before switching (`tsx src/nopaste.ts`): match bars
   stay 4/4 (2000 seeds: seat 47.0%, passing 62.9%, headroom 61.1%, 21 turns) —
   in a match the fixed hand, not board space, is the binding constraint, so the
   single-quarter starvation that paste-over fixed does not recur. Single-quarter
   `DEFAULT_RULES` keep pasteOver only so Phase 0 stays reproducible; the app
   never uses them. **Paste-over is reserved for a future joker ("Paste
   Special": you may paste over your own card).**
5. **Balatro layer — first playable slice DONE 2026-09-25.** Home's primary
   button is now **Start run** (Quick year vs Finance is secondary). `Run.tsx`:
   supply closet (pick 1 of 3 jokers + the meeting calendar, boss visible from
   the start) -> meeting (`Game` with the run's mods, opponent strength and
   meeting name) -> next draft ... -> "Promotion!" / "Calendar cleared" -> Home;
   runs are recorded (runs / promotions / best meeting). In a meeting: jokers sit
   as desk-object tiles on the teal desktop (`.tray`, compact strip on short
   phones), the boss rule shows on Finance's strip, blocked cells are hatched,
   and placed cards show their EFFECTIVE value (`cellValue`) in green/red when a
   joker or boss changed it. × / Resume works mid-run like a quick year.
   **Layout bug found and fixed here:** match hands are 8-10 cards, and on an
   iPhone SE the hand had been sliding over row 5 (sheet `min-height: 0`); fixing
   it with `min-height: auto` instead froze rows at their 96px max. Now: an
   explicit sheet floor (header + 5 x min row + totals), a sideways-scrolling
   snapping hand (cards min 66px), a compact mode under 760px height, and
   `.window { overflow-y: auto }` as a safety net. Verified at 375x667 and
   402x874: no overlap, no window scroll, pass button on screen.
   Engine notes follow.
   `shared/src/qbr/mods.ts` (jokers for seat 0, boss for seat 1, all effects read
   through `cellValue` / `blockedCells` / `bonusDraw` / wrap in `spreadEffects`)
   and `run.ts` (3 meetings: Quick sync vs greedy, Standup vs lookahead,
   Quarterly Review vs lookahead + boss; draft 1 of 3 jokers before each; lose a
   meeting and the run ends; boss known from the start). Jokers: Coffee Mug (+1
   card each quarter), APPROVED Stamp ($$+ cards +1), Conditional Formatting (+1
   to your cards in lanes you lead), Circular Reference (spreads wrap lanes).
   Bosses: Micromanager (locks the cells in front of your Sales + Ops homes),
   Legacy System (Finance's Ops home starts at $$), Auditor (your best card counts
   half), Reply-All (Finance +2 cards each quarter).
   **Pre-registered bars (`sim/src/runbars.ts`), final at 2000 seeds, no
   paste-over: 4/4** — J1 weakest joker 54.0% (>=53), J2 strongest 69.5% (<=70),
   B1 smallest boss drop 7.6pp (>=5), R1 random-draft run clear 36.1% (10-50).
   **Honest history:** first run 1/4 — Stamp too weak (+2pp), Formatting broken
   (76%), Micromanager brutal (-37pp, it locked a home cell), Legacy System
   *helped* the player (symmetric concrete). Three content-tuning rounds (bars
   never moved); notable dead ends: "Formatting needs both neighbours" was too
   weak, and giving Finance a $$$ cell made Legacy System brutal again (8%),
   because a $$$ cell lets Finance open with Headcount. Thin margins to watch:
   Stamp 54.0% and Circular 69.5%. Not yet built: the meeting calendar, joker
   draft screen and desk-object tray; helpers (keycaps / sticky notes); "The
   Board" final boss; Pivot Table / Newton's Cradle / Paste Special jokers.
6. ~~Mascot~~ **DONE 2026-09-25 — "Bindy", an original binder clip**
   (`client/src/Mascot.tsx`, inline SVG placeholder art: black plates, wire-handle
   arms, the jaw is the face — shut idle, open talking, tilted worried). NOT
   Clippy/Clippit; it was briefly "Clipper" and renamed for being one letter-swap
   from Clippy. Bindy gives **one-time tips** (`tips.ts`, seen-set in guarded
   localStorage, tap to dismiss): how to place (first turn), what orange stripes
   mean (first flip preview), what to do when Finance closes out (ahead / behind),
   and each boss's rule the first time you meet it. Tips float over Finance's
   side of the board, away from your hand. Bindy also greets you on Home.
   Respects `prefers-reduced-motion`.

## Terminology (user decision 2026-09-25)
Player-facing words: a full run is a **career** ("Start career", "Resume career",
"Careers N · promoted N"); a one-off match is **one year** ("Play one year",
"Resume year", "Years NW · NL"). Code keeps the older names — `run.ts`,
`RunState`, `Run.tsx`, `record.runs`, session kind `'run'` / `'quick'` — so a
"run" in code is a "career" on screen, and a "quick year" in code is "one year".

## Backlog from TestFlight feedback (user, 2026-09-25) — prioritized
Feedback loop is now iOS via TestFlight (every push to `main` -> Xcode Cloud).
1. **Filled cells must never take a card — VERIFY on current build.** The rule
   (`MATCH_RULES.pasteOver: false`) landed in `fd39b29`; builds from `6d3bcf7`
   to `58a4af8` deliberately allowed pasting over your own card, so the report is
   most likely an old build. Covered end-to-end now by a client test that plays
   real turns and checks every highlighted target is empty ("never offers a
   filled cell"). If it still happens on a build >= `fd39b29`, get a screenshot:
   the likely confusion would be a takeover FLIP (the card changes owner in
   place), which is not a placement — then make flips read as such.
2. ~~Explain greyed-out cards~~ **DONE (`fcaad5e`).** On your turn an
   unaffordable card shows a red "needs $$" tag and stays tappable: tapping it
   puts the reason in the formula bar ("Slide Deck needs a $$$ cell; your best
   open cell has $. Spreads add $ to the cells they reach."). Off-turn cards
   stay `disabled`. Bindy has a one-time `cost` tip after the placement tip.
   Tests find playable cards by `data-playable="true"`, not `:not(:disabled)`.
2b. ~~Terminology: run -> career, quick round -> one year~~ **DONE** (see
   "Terminology").
3. ~~App icon~~ **DONE.** Bindy clipped to a QBR report on the teal desktop;
   the sheet's rows echo the board (Finance pink on top, a dashed-yellow legal
   cell, a green claim, your blue row at the bottom). No text. Source
   `client/icon/qbr-icon.svg` (+ README with the re-render recipe); shipped as
   the single universal 1024 PNG, no alpha. Checked at 120px and on the
   Simulator home screen. Placeholder until the commissioned pixel art.
4. **Runs climb the org chart.** Keep one-off matches (Quick year). A full run
   becomes a ladder of named opponents the player can anticipate, e.g. **Intern
   -> Manager -> Finance -> VP -> (CEO / The Board)**, each a best-of-3 meeting
   of rising strength with its own personality/boss rule. Show an **org-chart
   screen before the run starts and after every round**: where you are, who's
   next, who's above. Replaces today's fixed 3-meeting calendar (`run.ts`
   MEETINGS) — re-run `runbars` for the new ladder (R1 clear rate etc.).
5. **Unlockable special cards for beating runs** — and an inventory to iterate
   on. Beating a run (or a rung of the ladder) unlocks new cards that join your
   deck/pool; persistence alongside `record.ts`. Every new card goes through the
   sim (does it help without breaking bars?). Needs a real card-design pass —
   the current 11-card pool is small.
6. **Deck view from Home.** Show the deck you have and the cards not yet
   unlocked (silhouettes / "locked" with the unlock condition). Depends on 5's
   unlock model.
Items 4-6 are one progression system (ladder -> unlocks -> collection); design
them together, build in that order.

## Next up (not yet built)
- Balatro depth: helpers (keycap consumables Ctrl+C/V/X/Z, sticky notes), more
  jokers (Paste Special = paste over your own card, Pivot Table, Newton's
  Cradle), "The Board" final boss, a shop/economy between meetings.
- Gwent depth: make conceding a quarter worth something (open design issue).
- Art: commission the pixel set (Bindy, jokers, bosses, card faces) — the SVG/CSS
  shapes here are placeholders sized for it.
- Device: install on a real iPhone via Xcode Cloud / TestFlight and play a run.

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
pnpm match       # best-of-3 bars M1-M4: [seedsPerSeat=500]
# from packages/sim: tsx src/runbars.ts [seeds] (jokers/bosses/run bars J1 J2 B1 R1),
#                    tsx src/nopaste.ts (match bars with vs without paste-over)
# from packages/sim: tsx src/passplan.ts (pass-plan thresholds),
#                    tsx src/matchsweep.ts (hand size x between-quarter draws)
```
Worktrees: a background Claude session edits in `.claude/worktrees/<name>`
(gitignored) and fast-forwards `main`; run a second dev server there on 5177.

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
