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
3. ~~App icon~~ **DONE, then simplified (v2, user request 2026-09-25).** v1 was
   Bindy clipped to a tilted report — the user found it mixed two ideas. **v2 is
   just a mini spreadsheet**, centred and straight-on on flat teal: grey header
   strip + row gutter, 3 lanes x 5 rows, Finance's side red on top and yours blue
   at the bottom (tints a notch deeper than in-game so they read at 60px), crisp
   grid lines, no mascot/text/tilt/shadow. Source `client/icon/qbr-icon.svg`
   (+ README with the re-render recipe); shipped as the single universal 1024
   PNG, no alpha. Checked at 1024 and 120px. Direction for future icon work:
   **simpler wins** — one idea, flat colour, the board's red/blue identity.
4. ~~Careers climb the org chart~~ **DONE.** `run.ts` MEETINGS is now a 5-rung
   ladder, each rung a best-of-3 meeting:
   | rung | meeting | plays | boss | edge (cards/qtr) | $$ home cells |
   |---|---|---|---|---|---|
   | The Intern | Onboarding sync | random, never passes on purpose | - | 0 | 0 |
   | The Manager | Weekly 1:1 | smart greedy | - | 0 | 0 |
   | Finance | Budget review | smart lookahead | - | 1 | 0 |
   | The VP | Quarterly Review | smart lookahead | drawn at start (Micromanager / Legacy / Auditor) | 1 | 1 |
   | The CEO | Board meeting | smart lookahead | Reply-All (always) | 2 | 2 |
   Flow: **org chart** (before the career and after every win; also the
   career-end screen) -> supply closet -> meeting. Your title climbs New hire ->
   Associate -> Senior associate -> Team lead -> Director -> Promoted.
   `OrgChart.tsx`; opponents' names/initials flow into the strip, status, tips.
   `opponentPolicy(kind)` in shared is the ONE rung -> AI mapping for app + sim.
   **Ladder bars (pre-registered in `runbars.ts` before the first ladder run),
   2000 seeds: 6/6 with J1/J2/B1** — L1 difficulty climbs 82.1% > 80.3% > 67.6%
   > 60.2% > 52.1%; L2 random-draft promotion 14.0% (10-40); L3 Intern 82.1%
   (>=75). **Honest history:** first ladder run failed L1 — win rates ROSE up
   the chart (VP 87.6% > Intern 78.6%) because stacked jokers outscale smarter
   opponents. Added seniority levers: `oppEdge` (extra cards/quarter) and
   `oppHomeBoost` (opponent home cells at $$). Edge saturates (a 15-card deck);
   home boost is strong but NOT monotone — CEO with 3 boosted cells was EASIER
   (71.6%) than with 2 (56.5%), likely the AI's eval over-valuing budget on its
   own empty cells. Final tuning is the table above.
5. ~~Unlockable special cards~~ **DONE.** `cards.ts` `SPECIALS`: six specials,
   each an **upgrade that replaces one starter card** (deck stays 15):
   | special | unlock | replaces | card |
   |---|---|---|---|
   | Coffee Run | beat the Intern | a Memo | $ v2, sides + leap 2 |
   | Performance Review | beat the Manager | Slide Deck | $$ v5, forward |
   | Budget Cut | beat Finance | a Cold Call | $ v1, forward fan + leap |
   | Hostile Takeover | beat the VP | Vision Statement | $$$ v8, forward fan |
   | Golden Parachute | get promoted | Headcount | $$ v8, no spread |
   | Water Cooler Gossip | finish 3 careers | a Standup | $ v1, sides + back diagonals |
   | Team Building | promoted on stake 2 | Synergy | $$ v3, Synergy's + shape, **+2 to your cards it reaches** |
   | Performance Improvement Plan | promoted on stake 3 | a Stakeholder | $$ v3, forward fan, **−2 to every rival card in its lane** |
   Unlocks derive from the saved record (`progressOf`: best rung, careers, stakeCleared) — no
   second store. Your deck (`playerDeck`) is fixed when a career/year starts;
   opponents always play the starter deck (`Deck = {player, opponent}`). The
   career-end screen announces new unlocks. **Unlock bars (pre-registered in
   `sim/src/unlockbars.ts`), 2000 seeds: 3/3** — every special lifts the
   player's share +1.2..+8.8pp (U1 >= +1, U2 <= +10), whole collection 71.7%
   (U3 <= 75%). **Honest history — a real design finding:** the first model
   ADDED specials to the deck and failed: expensive specials were NET NEGATIVE
   (Hostile Takeover -6.3pp, Golden Parachute -6.7pp — a $$$ card is dead in an
   8-card opening hand) while a cheap one was broken (+16.1pp). Switching to
   replacements fixed the sign; two tuning rounds set the numbers above.
   **Rule for future cards: in QBR cheap spreaders are king and $$$ cards are
   liabilities until the board has budget — price new cards accordingly.**
   Thin margin: Hostile Takeover +1.2pp (bar +1) — first to revisit.
   With 8 specials (iteration 7): 3/3, smallest +1.2pp, collection **74.5%** — U3 now
   has 0.5pp of room, so the NEXT special must be paid for by trimming another.
6. ~~Deck view from Home~~ **DONE.** Home -> "Your deck" (`DeckView.tsx`):
   owned cards cheapest-first with copy counts, specials highlighted gold, and
   locked specials as silhouettes with how to unlock and what they replace.
   Card faces are shared (`CardFace.tsx`) by the hand, deck view and unlocks.
7. ~~Sound + haptics for tap / place / confirm~~ **DONE.** `client/src/feedback.ts`:
   WebAudio synthesis (no asset files), primed on the first touch anywhere
   (`main.tsx`), plus native haptics via `@capacitor/haptics` (NOT
   `navigator.vibrate`, which iOS WebKit ignores — rushie's approach does nothing
   on iPhone; cubes' plugin approach is the one that works). Cues: tap a card =
   light impact + paper flick; tap an unaffordable card = warning + low buzz;
   first tap on a cell (place/preview) = selection tick + cell click; second tap
   (confirm) = medium impact + rubber-stamp thunk + two-note "approved" ding.
   The plugin is registered in `ios/App/CapApp-SPM/Package.swift` (path into
   `node_modules/.pnpm`, resolved on Xcode Cloud because `ci_post_clone.sh` runs
   `pnpm install` first) — **after adding any Capacitor plugin, run `cap sync
   ios` and COMMIT Package.swift**, since CI only runs `cap copy`. Only
   verifiable on a real device: the Simulator has no haptics. Web audio is
   subject to the iPhone's silent switch.
8. ~~Opponent avatars~~ **DONE.** `client/src/avatars.tsx`: 16x16 pixel
   portraits authored as character maps (+ palette) and drawn as crisp SVG
   runs — the Intern (hoodie, lanyard), the Manager (side part, headset), Finance
   (green visor, glasses, sweater vest), the VP (silver hair, shades, power tie),
   the CEO (silver beard, pinstripes, gold tie). Fictional office types; none
   modelled on a real person. Shown on the opponent strip and the org chart,
   keyed by the rung's `initials` (unknown ids fall back to the initials tile).
   Same "placeholder art in code" status as Bindy and the icon: sized so a
   commissioned 16x16 set can replace the maps 1:1. Tests pin every map to
   16x16 and its palette (a typo'd row fails CI, not the eye). Caught in review:
   Finance's glasses first rendered as solid bars (frame and pupil shared a
   colour) and read as a second VP in shades.
9. ~~Move animation~~ **DONE (/explore iteration 1, 2026-09-26).** Found: every
   placement, spread and takeover flip snapped instantly, so a new player could
   not SEE what Finance just did — cells simply changed colour. Now
   `client/src/motion.ts` `moveFx(before, action)` derives each play's visible
   effects from the shared `spreadEffects` (so animation can never disagree with
   the rules): the placed card **drops in** (260ms), claimed cells **ripple
   outward** in grid-step rings (260ms, 70ms per ring, tinted by who claimed),
   taken-over cards **turn over** (380ms). Applies to Finance's moves too — the
   last play's effects stay marked until the next one; a pass clears them; a new
   quarter starts still. Per-move React keys replay the CSS animation on the same
   cell. Everything ends by `FX_MAX_MS` = 420ms, inside the 450ms AI delay, so
   turns are no slower; `prefers-reduced-motion` switches it off. Tests written
   first and confirmed red: `motion.test.ts` (placed/claim/flip sets, nearest-first
   ordering, pass = none, budget <= 450ms) and Game "move animation" (your play
   drops + claims, preview does not animate, Finance's reply animates and replaces
   yours). Verified headlessly at 375x667 mid-animation (claim overlays visibly
   expanding while Finance "is typing") + clean Simulator build. **Not verified:**
   how it feels on a real iPhone at 60/120Hz; no sound yet for flips.
10. ~~Accessibility: ownership without colour + VoiceOver labels~~ **DONE
   (/explore iteration 3, 2026-09-26; gap-analysis P1).** Ownership, the most
   important thing on the board, was red-vs-blue only. Now every cell has a
   `data-owner` hook and a **chevron by shape and position**: yours on the bottom
   edge pointing up (your direction of play), the opponent's on the top edge
   pointing down; the `=SUM` lead adds ▲ / ▼. VoiceOver labels in spreadsheet
   language (`client/src/a11y.ts`): cells "A5, your Coffee Run, value 2" /
   "C1, Finance's cell, budget $" / "…, locked"; cards "Memo, costs $, value 1,
   spreads left, right, 1 ahead" (+ "— can't play: needs a $$ cell"); lane totals
   "Sales: you 3, Finance 1, you lead". Tests first (`a11y.test.tsx`, red then
   green). **Verified** by rendering a mid-game board with Chrome's
   `setEmulatedVisionDeficiency('achromatopsia')`: owners are unambiguous in full
   greyscale. **Also fixed, found while verifying:** claim overlays' end state
   depended on the CSS animation finishing — headless Chrome (a hidden page) froze
   them at 55% opacity, which a backgrounded iPhone could do too. They now leave
   the DOM after `FX_MAX_MS` + 100ms (`settledFx`; test "claim overlays are removed
   … even if the animation never ran"). **Not verified:** real VoiceOver on
   device; Larger Text (Dynamic Type) is not supported yet — sizes are fixed px.
10b. ~~Settings~~ **DONE (/explore iteration 4, 2026-09-26; gap-analysis P1).** Home ->
   "Settings" (`SettingsView.tsx`, a 90s preferences dialog): **Sound effects** and
   **Haptics** toggles (`settings.ts`, guarded localStorage `qbr.settings.v1`, applied
   via `setFeedbackPrefs` — with sound off no audio engine is ever created, with
   haptics off no native call is made), **Show tips again** (clears Bindy's seen
   set), **Reset progress** behind an in-app second step ("Erase every career, year
   and unlocked card?" / Keep / Erase — never a system dialog). Tests first
   (`settings.test.tsx`: sound-off never constructs an AudioContext, toggles persist
   across a remount, tips reset, reset needs the confirm tap then Home shows "No
   years on record"). Verified at 375x667: Home and Settings fit with no scroll.
10c. ~~Teach scoring and lives in play~~ **DONE (/explore iteration 5, 2026-09-26;
   gap-analysis P1, part of the guided-first-quarter item).** The two rules that decide
   who wins were only learned by losing. Two new one-time Bindy tips (`tips.ts`),
   fired by game state, not a scripted tutorial: **`lanes`** right after your first
   card lands ("…the cells your card reached are yours now. Each column is a lane:
   when the quarter closes, each lane's leader banks its total.") and **`lives`** at
   the start of your first Q2 ("Fresh sheet for Q2, but your hand carries over. Two
   lives each: lose two quarters and the year goes to <opponent>."). Priority: boss >
   place > lanes > lives > cost > takeover > close-out. Test first (`tips.test.tsx`).
   Remaining for the full guided-first-quarter item: whether the first career should
   skip the supply closet (3 screens before the first card today) — needs a real
   first-time player on TestFlight to judge, not a guess.
10d. ~~Career stakes~~ **DONE (/explore iteration 6, 2026-09-26; gap-analysis P1,
   variety).** Balatro-style post-win tiers: promoting at stake N opens N+1
   (`record.stakeCleared`, never decreases). `run.ts` `STAKES`, applied to EVERY rung on
   top of the rung's own levers via `meetingMods`:
   | stake | name | opponents' extra cards / qtr | opponents' $$ home cells |
   |---|---|---|---|
   | 1 | Standard | 0 | 0 |
   | 2 | Budget freeze | +1 | 0 |
   | 3 | Restructuring | +1 | 1 |
   | 4 | Hostile board | +2 | 2 |
   Home shows a ◀ Stake N: name ▶ picker (with the stake's one-line rule) only after
   the first promotion; the org chart title names the stake. **Pre-registered bars
   (`sim/src/stakebars.ts`), 2000 careers each: 3/3** — S1 each stake >= 2pp harder
   (random-draft promotion 14.0% > 9.0% > 5.7% > 3.4%), S2 top stake winnable (3.4% >=
   2%), S3 Standard untouched (exactly 14.0%). **Honest history:** first design had 5
   stakes including "Hiring freeze" (the PLAYER draws 1 fewer card a quarter) — it
   collapsed promotion from 9.0% to **0.5%** (the fixed hand is QBR's binding
   constraint, again), making stakes 3-5 unwinnable. Replaced with opponent-only
   levers; then "Headcount review" (+2 cards, 1 cell) measured 5.3% ≈ Restructuring's
   5.7% (card-edge saturation, again) and was cut: with >= 2pp steps from 14% and a >=
   2% top, the ladder only fits 4 tiers. Also fixed: Home overflowed an iPhone SE by
   37px with Resume + picker; the logo shrinks to 56px under 760px height (verified:
   no scroll, Settings on screen). Tests first (`stakes.test.tsx`, run stake test).
10e. ~~Card abilities~~ **DONE (/explore iteration 7, 2026-09-26; gap-analysis P1,
   depth).** `CardDef.ability = {kind: 'boost'|'weaken', amount, reach?: 'spread'|'lane'}`.
   Abilities resolve AFTER claims and takeover flips, inside `spreadEffects` (so the
   preview, the reducer and the animation cannot disagree): boost adds to a per-cell
   `Cell.mod` on your cards (incl. just-flipped ones); weaken subtracts from rival cards
   not flipped by this move, and a card at effective value <= 0 is **destroyed** (the
   cell empties, its owner keeps it). `cellValue` includes `mod`; paste-over drops it.
   Content = the two stake-unlock specials in the table above. Client: a green "+2" /
   red "−2 lane" badge on the card face (`CardFace`, so hand, deck view and unlocks),
   ability words in the VoiceOver label (`abilityWords`), preview rings + "+2"/"−2"/"✕"
   tags on affected cells with "boosts N / weakens N" in the formula bar, and move fx
   (boost pulse, weaken shake, "✕" destroy overlay, all inside the 420ms budget, off
   under reduced motion). Tests first: `abilities.test.ts` (5), motion + a11y + DeckView.
   **Honest history (unlock bars, 2000 seeds):** Team Building as $$ v2 was +0.6pp and
   PIP -1.0pp. Measured WHY before tuning (`played / landed` probe): boost landed on 100%
   of plays, but spread-reach weaken landed on only **8%** — a forward spread rarely
   touches a rival card that takeover hasn't already flipped, and weaken 2 -> 3 changed
   the result by exactly 0.0pp. Lane reach made it land on 84% of plays, but as a $$ v2
   single-forward body it was **-3.8pp**: the ability can't pay for a worse body.
   Destroyed-cell ownership (keep vs neutral) measured identical, so the simpler rule
   stayed. Final: both are **strict upgrades of the card they replace** (same body +
   ability) — +1.9pp and +1.6pp. **Rule for future ability cards: an ability is a
   rider on a full-value body, never a substitute for one, and check that it LANDS
   (the probe) before tuning its size.**
10g. ~~Cues for the moments that resolve~~ **DONE (/explore iteration 9, 2026-09-26;
   gap-analysis P2, polish).** `feedback.ts` covered only tap / place / confirm / denied;
   everything a play or a year RESOLVES to was silent. New cues, all synthesized, all
   behind the Settings switches: `moveResolved(fx, human)` for either side's move —
   takeover swish gliding up when you take a card and down (+ light haptic) when you
   lose one, a sparkle for boost, a deflating blat for weaken, crumpled paper (+ heavy
   haptic) for a destroy, timed a beat after the drop to land with the flip animation;
   `quarterEnded` (two-note up / down / flat); `yearEnded` (cash-register fanfare +
   success haptic / buzzer + error haptic / shrug) — the deciding quarter plays the
   year's cue instead of its own; `careerEnded(promoted, unlocks)` (fanfare, then one
   chime per special unlocked, max 3). Wired in `Game.apply()` (so the AI's moves sound
   too) and a once-only effect in `Run`. Tests first (`feedback.test.tsx`: move report
   for both seats, quarter/year cues from a closed-out year, career cue with its unlock
   count — which caught that a 3rd career unlocks Gossip, i.e. the count is live).
   Verified the real synthesis in headless Chrome on a running AudioContext: every cue,
   zero exceptions. Haptics remain real-device-only.
10f. ~~Faster first career~~ **DONE (/explore iteration 8, 2026-09-26; gap-analysis P1,
   guided first quarter — the "time to first card" half; 10c was the teaching half).**
   A brand-new player (`progress.careers === 0`) goes Home -> org chart -> **straight
   into the Intern**: no supply closet of jokers they can't read yet. The desk comes with
   a fixed `STARTER_JOKER` (Coffee Mug), said in a yellow note on the chart; the closet
   first opens after beating the Intern, as the session-one reward (and offers the other
   three). Two taps from Home to the first card, down from three screens + a choice.
   The org chart stays (user decision: see progression before a career). **Pre-registered
   bars (`sim/src/firstcareer.ts`), 2000 careers: 3/3** — F1 first-career Intern 84.1%
   (>= 75%), F2 first-career promotion 15.8% (10-40%), L1 still climbs (84.1 > 83.2 >
   70.6 > 60.1 > 53.0). Ordinary careers byte-identical (14.0%). **Honest history:** the
   first design (no joker at all) FAILED both: Intern 69.8%, promotion 6.8% — one joker is
   worth ~12pp against the Intern. All four jokers were measured as the starter (Stamp
   only 75.1% / 11.6%); Mug passes and is the easiest to read. Also fixed a real bug from
   iteration 7: the career-end unlock announcement ignored `stakeCleared`, so Team
   Building / PIP would unlock silently (`careerEndProgress`, tested). Verified at
   375x667 and 402x874: chart fits with no scroll.
10h. ~~Daily career~~ **DONE (/explore iteration 10, 2026-09-26; gap-analysis P2,
   variety).** Home -> **Daily career** (after the first career): one shared seed per
   calendar day (`shared/src/qbr/daily.ts` `dailySeed(dayKey(new Date()))`), so everyone
   gets the same VP boss, closet offers and deals; **starter deck** (comparable, unlocks
   set aside) at **Budget freeze** (`DAILY_STAKE = 2`); **one attempt a day** — it counts
   the moment it starts (walking out forfeits it), and a **streak** counts consecutive
   days (`record.daily`, `recordDailyStart` / `recordDailyEnd` / `liveStreak`). Home shows
   "Daily career · streak N", then "Today's career: beat the Manager · streak N" /
   "promoted!" / "walked out"; while it is the session in progress, Resume reads "Resume
   today's career" instead (a status line there overflowed an iPhone SE by 38px). A daily
   still counts as a career (record, unlocks, stake clear). **Pre-registered bars
   (`sim/src/dailybars.ts`, 365 dates x 20 draft orderings), first run on raw date
   hashes at Standard: D1 16.4% PASS, D2 31.2% FAIL, D3 72 FAIL.** D2 was a real
   finding: on 69% of dates every draft lost — **the deals decide a career more than the
   drafts do** (still only 63.6% winnable when play varies too). Fix, bars unchanged:
   **vetted seeds** — `sim/src/dailyvet.ts` takes, per day, the first candidate
   `hash(date#k)` a smart-lookahead player promotes with >= 1 draft ordering; `DAILY_K`
   ships the k's as 1,096 base-36 digits (2026-10-01..2029-09-30, ~5 min to regenerate;
   later days fall back to the raw hash — **extend the table before 2029-09**). Vetting
   made days too easy at Standard (D1 46.7%), hence Budget freeze (33.3%; Restructuring
   23.3%). **Final: D1 37.0% PASS, D2 100% PASS (by construction — the vetting uses D2's
   criterion; the independent varied-play diagnostic rose 63.6% -> 91.2%), D3 71 FAIL.**
   D3 was mis-designed and stays a recorded FAIL: 4 jokers x 3 bosses allow at most 72
   (boss, offer) setups, so ">= 300" was impossible — days differ through their deals.
   Tests first (`daily.test.tsx` 6, run tests 2). Verified at 375x667 / 402x874: Home
   fits in the worst case (picker + Resume). **Not built:** a shared leaderboard (needs a
   server — off-thesis), sharing a result card.
11. **Multiplayer: "Play your coworker" (user request 2026-09-26) — NOT STARTED.**
   Setup like Cubes (`cubes/CLAUDE.md` "Multiplayer dev/test"): nearby play over
   **MultipeerConnectivity** (Cubes' native plugin + `createNetLink`), **no lobby**
   — discovery in the background, a banner when a coworker is nearby, one tap on
   each phone; consent via Cubes' pure `pairingReducer` (`join-req` / `join-ok` /
   `join-no`, simultaneous-tap race handled). **Home: a line at the bottom like
   "Play your coworker".** In game: both players get the normal game view, each
   at the bottom of their own screen, with the opponent strip showing the OTHER
   USER (their name + a player avatar — there is no "you" avatar yet). **Each
   player brings their own deck**: the guest sends its `playerDeck` on join and
   the host starts `newMatch(seed, {player: hostDeck, opponent: guestDeck})` —
   the split `Deck` type already supports this. Design notes: host-authoritative
   like Cubes (guest sends intents, host runs `matchReducer` and broadcasts), or
   lockstep since the reducer is pure and seeded; the guest's view needs a
   **seat-1 perspective** (today the client assumes the human is seat 0 —
   `layout.ts` mirroring + `spreadEffects` player param already exist); v1 = plain
   years, no jokers/bosses; a separate coworker record on Home. Validation needs
   **two physical iPhones** (the Simulator can't do Multipeer) — keep pairing and
   seat mapping as pure, unit-tested reducers, as Cubes did. Requires
   `NSLocalNetworkUsageDescription` + `NSBonjourServices` in Info.plist and
   `cap sync ios` + committing Package.swift for the plugin.
Items 4-6 are one progression system (ladder -> unlocks -> collection); design
them together, build in that order.

## Goal gap analysis (/explore iteration 2, research, 2026-09-26)
User goal (set 2026-09-26): **a polished game that is complete, accessible to new users,
gives variety for tenured users, and would be competitive in the iOS App Store.** Sourced
research (onboarding/retention guides from Playio, Hubapps, Segwise; Marvel Snap's bot-led
new-player journey; Balatro reviews on unlocks + stakes; Queen's Blood deck/ability guides;
Apple's 2025 App Store Accessibility Nutrition Labels) mapped onto what QBR has today.
Priorities drive the next /explore iterations — work top-down.

**New users (accessibility)**
- P1 **Differentiate without colour alone + VoiceOver labels.** Ownership, claims and flips
  are shown ONLY as red vs blue; board cells have no accessible names. Both are listed App
  Store accessibility labels. Add a non-colour ownership cue (e.g. corner marker / pattern)
  and `aria-label`s for cells, cards and buttons.
- P1 **Settings: sound on/off, haptics on/off, reset progress.** Table stakes; none exists.
- ~~P1 **Guided first quarter (interactive FTUE).**~~ DONE in two halves: 10c (teach
  scoring + lives in play) and 10f (first career skips the closet, starts with a Mug). Guides say: core play inside ~60s, the
  "aha" inside ~90s, teach by doing not reading, a reward in session one. QBR today: Home ->
  org chart -> supply closet -> first meeting = 3 screens before the first card, and the
  scoring rule (a lane's leader banks its total), lives and closing out are only learned by
  losing. Proposal: the very first career skips the closet and runs a scripted Onboarding
  sync vs the Intern with Bindy stepping through place -> spread -> win a lane -> close out.
  The Intern's 82% beat rate already plays Marvel Snap's "keep new players winning" role.
- Have: tips (Bindy), grey-card explanations, reduced motion, first-career reward (Coffee
  Run on beating the Intern).

**Tenured users (variety)**
- P1 **Stakes after promotion** (Balatro's post-win difficulty tiers): each promotion
  unlocks a harder "fiscal year" of the same ladder, using the measured seniority levers
  (`oppEdge`, `oppHomeBoost`, boss draws). Cheap, and gives a goal after the CEO.
- ~~P1 **Card abilities**~~ DONE iteration 7 (10e); more ability cards need U3 room — the biggest depth gap vs Queen's Blood, whose decks are built on
  on-play buffs/debuffs and destroy triggers. QBR cards are vanilla (shape + value). Needs a
  small ability system in `shared` + sim bars before content.
- P2 **Deck building**: choose which specials go in (today unlocks auto-apply).
- ~~P2 **Daily seeded career**~~ DONE iteration 10 (10h): vetted daily seeds, Budget freeze, streaks.
- P2 More jokers/bosses (4 + 4 today vs Balatro's 150 jokers); the filed ones below.

**Polish / App Store**
- ~~P2 Sound for flips, quarter results, promotion, unlocks~~ DONE iteration 9 (10g). Still
  open: *animations* for row wins / quarter results / promotion / unlocks (they snap).
- P3 (user-side) commissioned art to replace placeholder-in-code art, App Store screenshots,
  privacy policy / product page; real-device verification via TestFlight.

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

## Exploration loop — `/explore`
`.claude/commands/explore.md` (adapted from Rushie's, itself from nexus's) runs ONE
iteration: orient from this file -> pick one hypothesis (open thread first; else
research / juice / sound+haptics / balance / new content / UI clarity) -> state what
would count as success and pre-register any bar -> do the work -> verify (tests,
typecheck, headless phone-size check with a temporary preview server, Simulator build)
-> record it here (DONE entry, "Next up", or a recorded null) -> commit and push once
to `origin/main`. It lists the measured nulls and user decisions not to re-open.

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
