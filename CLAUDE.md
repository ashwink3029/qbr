# QBR — Project Map for Claude

## One-line pitch
**Quarterly Business Reports as a card game.** A Queen's Blood-shaped territory
card battle played on a 3x5 spreadsheet, headed toward a Balatro-shaped run:
bosses are meetings, jokers are desk supplies and software features, helpers are
keyboard shortcuts and sticky notes. Lore-light, vibe-heavy — the fiction is
corporate spreadsheet hell, which every player already knows, so nothing needs
explaining.

## Product goal & polish playbook — read before every loop iteration
**The goal is a user-friendly, polished experience**: a first-time player "gets" the game
within seconds and feels the payoff of the core loop as fast as possible. Feature count is
not the goal. Every `/explore` (or other loop) iteration should name which lever below it
pulled and what a player now sees, feels, or waits for differently. If it changes none of
those, say so plainly in its log entry. *(This playbook is shared by cubes, rushie and qbr;
keep the four levers in sync across their CLAUDE.md files.)*

1. **Research the competition first.** Before inventing a solution, check how shipped games
   in the genre solve it. Look at top **iOS App Store** titles (their first-session flow,
   screenshots, and especially 1-3★ reviews, which amount to a free complaint list) and
   **Reddit** (r/iosgaming, the genre's subreddit, each competitor's own subreddit) for
   what players praise, quit over, and ask for. Record the sources and the concrete
   takeaway. A research-only pass that re-ranks the backlog is a valid iteration.
2. **Speed and performance, meaning less friction.** Measure cold-launch-to-first-
   interaction, the number of taps from launch into play, input-to-feedback latency, frame
   drops during the busiest animation, and layout shift. Time it on the Simulator/device
   before and after, and don't claim a speedup you didn't measure.
3. **Onboarding by doing.** Teach each mechanic in context the first time a player meets it,
   with progressive disclosure and no rules wall up front, then get out of the way.
   Verify it as a brand-new player would meet it (fresh install / cleared storage), not
   as someone who already knows the rules.
4. **Juice the core loop.** Use tight animations, haptics and sound on the action players
   repeat most, so the dopamine hit lands in the first ~30 seconds. Every core-loop event
   gets visual, haptic and audio feedback, scaled to how much the event matters. Respect
   Reduce Motion and the silent switch.

**For qbr specifically:** the closest comps are *Queen's Blood* (FF7 Rebirth), *Gwent*,
*Marvel Snap*, *Balatro*, *Inscryption* and *Slay the Spire*. Card-game rules are the least
intuitive of the three sibling games, so lever 3 carries the most weight here: the first
match should teach territory/placement by play, not by text. Lever 2 already has a
measured baseline in *Simulator research + optimization* below; extend it rather than
re-measuring from scratch. Stay inside the *IP guardrails* when borrowing from comps.

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
**RESOLVED BY DESIGN (/explore iteration 18) — conceding is correctly rare; do not
re-open without a rules change that makes hands matter.** `sim/src/concedediag.ts`
compares, on the SAME seeds, a concede plan vs the same plan never conceding, and looks
only at games where the concede fired: **deficit triggers (trail by 1/3/6) fire in
6-12% of games and on those games score ~20% vs ~47-49% for playing on** — the LOCKING
pass hands tempo to the trailing player (the passer cannot answer), so conceding after
Finance closes out throws a quarter you'd win half the time. A *correct* concede
(`PassPlan.concede: 'hopeless'` — only if playing your hand out alone never takes the
lead) fires in 1.9% and still scores 16.7% vs 17.9%: **saved cards don't help later
because the board saturates** (~3 cards go unplayed per match) — the same reason card
scarcity was a null. Pre-registered C1 (hopeless concede >= 53% vs never-concede): 51.6%
vs 51.7%, **FAIL** — recorded as a null. QBR's pass skill is banking a lead (M2), not
throwing a round. **Side finding, not acted on:** the shipped `DEFAULT_PASS_PLAN`
(concedeAt 6) costs its user ~1.7pp vs never conceding (51.7%); Finance uses it, so
fixing it strengthens every opponent and needs a full ladder re-tune (runbars, stakebars,
daily re-vet) — a deliberate call, not a drive-by. Original note follows:
Open design issue — conceding is worthless. In every config, conceding a lost
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
   (`client/src/Mascot.tsx`, inline SVG placeholder art). **v2 (user feedback
   2026-09-27: "it wasn't clear that was a binder"):** the v1 two-split-plates drawing
   didn't read as a clip. Now the silhouette carries it — black body with a rolled top
   edge, silver wire handles up like ears (dark-outlined so they hold on the grey tip
   bubble), a ruled sheet of paper in its bite — and a cute face on the body (big
   eyes, blush, the mouth carries the mood: smile / open / wavy with raised inner
   brows). Checked at 160 / 56 / 48 / 44px on teal and grey. NOT
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
**Stars:** retired 2026-09-27 (item 14). There is no deck power ceiling and no ★ on screen.
**Joker draft = "desk upgrade" on screen (user decision 2026-09-27):** the chart's button
reads "Pick a desk upgrade" and the draft screen is titled "Desk upgrade — before the …".
"Stop by the supply closet" was too cute to read as the action that starts the career.
Code, CSS and comments still say `closet` / `draft`.

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
10i. ~~Deck building~~ **DONE — superseded by item 13's builder (the bench is gone; old benches carry over as a built deck)**. Was: **DONE (/explore iteration 11, 2026-09-26; gap-analysis P2,
   variety).** Your deck -> "Specials in your deck": each unlocked special is **In deck** or
   **Benched** (its starter card comes back; the deck stays 15). `playerDeck(progress,
   benched)`; bench in guarded localStorage `qbr.bench.v1` (`client/src/bench.ts`). A
   career's **opening org chart** — where the VP's boss is already shown — has "Your deck —
   tailor it to the VP's boss" (only once something is unlocked; never on the daily, which
   is always the starter deck); the deck follows the bench until you walk out of that chart,
   then is fixed for the career (`Run` `fixedDeck`). **Pre-registered bars
   (`sim/src/deckbars.ts`, all 256 builds screened at 400 seeds, top 5 at 2000): DB1 no
   broken build — best is all-in 74.4% <= 75% PASS; DB2 a real choice (no boss) — best
   benched 73.6% < all-in 74.4% FAIL.** Benching with no boss is only a downgrade, by
   construction (iteration 5 made every special a strict upgrade). **Diagnostic that
   changed the design (`sim/src/deckboss.ts`, 2000 seeds per build x boss):** against a
   KNOWN boss it is a real choice — vs Micromanager benching Water Cooler Gossip **+5.2pp**
   (72.3 -> 77.5%), vs Legacy System benching Budget Cut **+4.0pp**; vs Auditor and
   Reply-All all-in stays best. Hence tailoring from the chart, not only from Home. **Caught
   in review:** the first build fixed the deck at career start, BEFORE the boss is drawn,
   so the hint "check the VP's boss first" was false and the measured choice unreachable.
   Tests first (cards 1, DeckView 2, career 2). Verified at 375x667 / 402x874: chart with the
   deck button fits (no scroll). **Not built:** telling the player which bench fits which
   boss — discovering it is the point; a future Bindy tip could hint after a VP loss.
10j. ~~Result animations~~ **DONE (/explore iteration 12, 2026-09-26; gap-analysis P2,
   polish).** The moments a player works toward snapped in. Now: every quarter / year /
   meeting result dialog gets a **rubber stamp** slammed on (`data-stamp`: APPROVED green =
   you won, REJECTED red = lost, TABLED grey = tie); while a quarter's result shows, the
   **banked lanes' `=SUM` cells pulse** (staggered 120ms per lane); after a win the org
   chart **stamps the tick** on the rung just beaten (`OrgChart justBeat`); a promotion
   **lifts your tile** with a gold ring (`promoted`); career-end **unlocked cards turn over
   one after another** (`data-fx="reveal"`, 300ms + 220ms each). CSS-only, all off under
   `prefers-reduced-motion`; pairs with iteration 9's sounds. Tests first
   (`results.test.tsx` 4: stamps + banked lanes over a closed-out year, chart tick /
   promotion, staggered reveal). Verified at 375x667 with focus emulation (headless pages
   freeze CSS animation otherwise): the stamp lands at full opacity over the Q1 result,
   no scroll.
10k. ~~More jokers and a boss~~ **DONE (/explore iteration 13, 2026-09-26; gap-analysis P2,
   variety).** Jokers 4 -> 6, drawable VP bosses 3 -> 4 (`mods.ts`, engine hooks in
   `game.ts`, all via the shared `spreadEffects` / `canPlay` / `freshBoard`, so preview, AI
   and reducer agree): **Paste Special** (you may play over your own card — the one
   sanctioned exception to the user's no-filled-cells rule) +7.6pp; **Ergonomic Chair**
   (your Ops home starts at $$ — the mirror of Legacy System) +19.1pp; boss **Change
   Freeze** (your spreads stop at the middle row and take nothing over) -6.1pp. New rule
   **`MAX_JOKERS = 4`**: a full desk keeps the closet shut. **Pre-registered bars, never
   moved, final 2000 seeds: runbars 6/6** (J1 54.0%, J2 69.5%, B1 6.1pp, L1 82 > 83 > 71 >
   66 > 60, L2 19.1%, L3 82.3%); **stakebars 3/3** (19.1 > 11.3 > 6.5 > 2.6%); **first
   career 3/3** (84.1%, 22.9%, climbs); **daily re-vetted** (the pool change moves every
   offer and VP draw): D1 20.0%, D2 100%, D3 249 setups (still a recorded FAIL, up from 71).
   **Honest history:** (1) **Newton's Cradle** (claims gain +2 budget) measured **+33.7pp —
   broken** (budget is what gates $$/$$$ cards) and cut; replaced by the Chair. (2) Change
   Freeze v1 (no takeovers for you) only -3.2pp, v2 (+ their takeovers win ties) -3.7pp —
   takeovers matter less than territory; v3 (spreads stop at the middle) -6.1pp. (3) With 6
   jokers a career drafted a 5th before the CEO, making the CEO EASIER than the VP (78.2% vs
   65.8%, L1 FAIL) — the ladder had been tuned with the 4-joker pool running dry; hence the
   desk cap. (4) The bigger pool lifted Standard promotion 14.0% -> 19.1% (still in L2), so
   Hostile board went 2/2 (1.9%, S2 FAIL) -> 2/1 (6.2%) -> 3/1 (7.0% — card edge saturates,
   again) -> **1 card / 2 $$ cells: 2.6%**. stakebars S3's "L2 = 14.0%" literal now follows
   L2 (0.1915), as the bar defines. Tests first (mods 4, run 1 rewritten).
10l. **App Store kit — DRAFTED (/explore iteration 14, 2026-09-26; gap-analysis P3).**
   `store/`: **`privacy-policy.md`** (no data collected; everything stays on device) and
   **`app-store-connect.md`** (App Privacy = **Data Not Collected**, verified in code: no
   fetch/XHR/WebSocket/beacon, no external URLs, only React + Capacitor core + Haptics, four
   local keys; accessibility labels to claim — Differentiate Without Color Alone + Reduced
   Motion yes, **VoiceOver not until tested on device**; age 4+; Games → Card / Strategy;
   name / subtitle / promo / description / keywords, character counts checked — the first
   name draft was 31 chars, one over). **`store/screenshots/6.9/`**: five 1320x2868 PNGs of
   real game states (Home, the org chart with avatars and the VP's boss, a Hostile Takeover
   preview flipping 2, an APPROVED Q1 vs the Intern, the deck view), re-render with
   `store/screenshots/render.mjs` (a temp preview server on 5188 + headless Chrome on 9333;
   `ALL=1` for all five). Caveat: no iOS status bar. **Needs the user:** a contact email in
   the policy, a public URL for it (e.g. GitHub Pages) and a Support URL, then entering the
   kit in App Store Connect; nothing was published or submitted.
11. **Multiplayer: "Play your coworker" (user request 2026-09-26) — BUILT; awaiting the
   two-iPhone test (user).** **Client + native half DONE (/explore iteration 16):** Home's
   bottom row now reads **Settings · Play your coworker** (shown only in the iOS app —
   `nearbySupported()`; App takes an injectable `nearby` link factory for tests).
   `CoworkerView`: your name (saved in settings) -> **"Look for a coworker"** — discovery
   and so iOS's local-network prompt start only on that tap (a change from Cubes, whose
   background start risks a sticky, uncontextual denial) -> "A coworker is nearby / Play
   them" / "Bo wants to play / Let's go · Not now" / "Waiting…" (the ported
   `pairingReducer`) -> **`NetGame`**, which runs the lockstep `coworkerReducer` and
   renders `Game` from this phone's chair (the guest gets `mirrorMatch`); `Game` gained
   `initialMatch` + `remote {onLocalAction, incoming}` — no AI, the coworker's moves go
   through the same apply path, so animation, sounds, results and stamps all work. Separate
   `record.coworker` ("Coworkers NW · NL" on Home). Native: `MultipeerPlugin.swift`
   (Cubes', service `qbr-cowork`), `QBRViewController.swift` (registers it through the
   reflected bridge — Cubes' documented Capacitor 8 workaround; storyboard now uses it),
   Info.plist `NSLocalNetworkUsageDescription` + `NSBonjourServices _qbr-cowork._tcp/_udp`,
   both files added to `project.pbxproj`. Tests first: `remote.test.tsx` (2),
   **`coworker.test.tsx` (3): two NetGames in one page over a loopback — each shows the
   other's name across the table, a card placed on one lands mirrored on the other as the
   opponent's, turns hand over, a disconnect is reported**; `coworkerFlow.test.tsx` (3):
   the whole Home -> ask -> accept -> match flow with a scripted coworker running the real
   protocol. **Verified:** Simulator build SUCCEEDED, app launches, Home shows the row, no
   bridge-registration failure in the log. **Privacy docs updated** (nearby play sends name,
   deck, moves only to the other phone — still Data Not Collected). **Not verified (needs
   two physical iPhones — the Simulator cannot do Multipeer):** discovery, the invite
   election, and a real match over the air. Test: install the TestFlight build on two
   phones, open QBR on both, tap "Play your coworker" -> "Look for a coworker" on each.
   v1 limits: plain years (no jokers/bosses — seat-bound), no reconnect. **Rematch DONE
   (/explore iteration 17):** after a year, a post-match panel ("You beat Bo." / "A flat
   year with Bo.") offers **Rematch** / Back to home; both must ask (`rematch` message,
   `rematchAgreed`), then the host deals a fresh seed and both boards restart in lockstep
   over the same connection; each year is recorded once. Tests: protocol (2: agreement
   gating, stray `start` ignored) + two NetGames passing out a flat year, both tapping
   Rematch -> fresh Q1 on both, two results recorded.
   Earlier engine notes (iteration 15) follow.
   **Engine half DONE (/explore iteration 15):** `shared/src/qbr/mirror.ts` —
   `mirrorMatch` / `mirrorAction` show seat 1 the match from its own chair (seats swap,
   board flips left-right), so the guest can use every seat-0 screen unchanged. Proven
   by a commutation property, `mirror(reduce(m, a)) === reduce(mirror(m), mirror(a))`,
   over 200 whole random matches (>2,000 moves: both decks, abilities, takeovers,
   quarter boundaries) + involution; refuses mods (jokers/bosses are seat-bound, so v1
   coworker matches have none). `shared/src/net/coworker.ts` — **lockstep, not
   host-authoritative** (the reducer is pure and seeded, so both phones hold the same
   match and exchange only moves): Cubes' consent `pairingReducer` ported, then
   `hello {v, token, name, deck}` (each brings their OWN deck; the larger token hosts
   and is seat 0), `start {seed}`, and `act {n, action, hash}` — the receiver checks
   turn, sequence and legality, applies, and compares state hashes: any divergence is
   **`desync`**, never played through. Tests (`coworker.test.ts` 7): pairing race /
   stray OK / decline; **40 whole matches over an in-memory loopback between two
   reducers with real AI, boards identical after every move**, each seat drawing only
   its own deck; version / deck / out-of-turn / out-of-sequence / illegal / bad-hash
   guards. **Remaining (client + native):** port Cubes' `MultipeerPlugin.swift` +
   `multipeerLink` + `useNearby` (service type e.g. `_qbr-cowork._tcp`), a nearby banner,
   Home's "Play your coworker" line, a `NetGame` that renders `mirrorMatch` for the
   guest, the coworker record, Info.plist keys — then the two-iPhone test (user). The
   original notes follow.
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
12. ~~Scoring you can read at a glance (user request 2026-09-27)~~ **DONE 2026-09-27.** Ask: a
   quarter's score is the points from the lanes you're winning, nothing from the lanes you're
   losing, and who owns each lane should be obvious at every moment. The rule was already true
   (`revenue()`); presentation only — reducer, sims and every bar untouched. Each `=SUM` cell
   now shows only the **banked value, big, on the leader's SOLID colour** (`--mine-ink` /
   `--theirs-ink`, white ink, ▲ / ▼ as the non-colour cue), with the trailing total small and
   struck through (`s[data-lost]`: it scores nothing); a tie is plain grey ("–" when empty,
   "2 = 2" otherwise). `data-lead` = you / them / none. The score by the pass button reads
   "Q1: 3–4" in blue / red, so the coloured cells visibly add up to it. `laneLabel` says
   "Sales: you lead, banking 5; Finance 3, banks nothing" / "tied 2 to 2, nobody banks";
   Bindy's `lanes` tip adds "only the leader scores the lane". Tests first
   (`scoring.test.tsx` 4, red then green). Verified at 375x667 (no scroll) and in greyscale
   (achromatopsia): owners still read from the arrows.
13. **Card collection + deck builder + star ceiling (user requests 2026-09-27) — BUILT; P1 a
   recorded FAIL.** Asks, in order: wins earn MORE cards and you build your own 15, with every
   winnable card greyed out from the start; then "rebalance, and a deck cannot exceed some
   power ceiling — a simple constraint we can render and teach".
   **Collection (shared `collection.ts`):** 16 `COLLECTIBLES` + the 8 SPECIALS =
   `UNLOCKABLES` (24), unlocked by milestones over many careers via two new `Progress`
   counters, `meetings` (won, summed) and `promotions`. `collectionOf`, `deckProblem` (15 cards,
   owned copies, star cap), `defaultDeck` (starter + each unlocked special, in unlock order,
   **while it fits the cap**), `resolveDeck`. Client `DeckView` is a builder (tap out / tap in;
   saved only when full and legal; locked cards shown greyed with how + progress); `deck.ts`
   (`qbr.deck.v1`) replaced the bench.
   **The ceiling = ★ stars — RETIRED 2026-09-27 (item 14: no ceiling now).** Every card has a 1-5★ rating (`STARS`) and a deck holds at most
   `STAR_CAP` = 49★ (starter 48★). Shown on every card in the builder, a "★ n / 49" meter with
   a standing one-line rule, a refusal naming the numbers ("Keynote is 1★ — that makes 50★,
   over the 49★ limit…"), and a one-time Bindy tip. Ratings are MEASURED: `sim/src/starfit.ts`
   ridge-fits each card's additive win-share contribution over 500 random legal decks plus
   every deck found by capped hill climbs (6 rounds x 3 starts), binned by quintile.
   **Rebalance (both seats play the starter deck, so everything moved):** Standup v2 -> v1;
   Cold Call `fwd` v2 -> forward FAN v2; Coffee Mug +1 card every quarter -> opening hand only
   (was 74% after the fan, J2 caps 70%); Circular Reference wraps straight sideways reaches
   only; specials re-tuned to stay upgrades (Coffee Run $ v3 up/down, Budget Cut = fan v3,
   Performance Review v2, Golden Parachute -> $$$ v9, Hostile Takeover v9); Red Pen/Deadline
   = fan + weaken, Mentorship $$ v3 up/down +2 lane. Ladder eased (Finance and VP edge 0, CEO
   edge 1); stakes re-cut (Budget freeze 1 $$ home cell, Restructuring +1 card, Hostile board
   +1 card and 1 $$ cell); daily re-vetted (D1 14.2%).
   **Bars, 2000 seeds, final:** matchbars M1-M4 PASS (seat 52.8%); runbars J1/J2/B1/L1/L2/L3
   PASS (promoted 16.1%; rungs 90 > 84 > 77 > 66 > 42%); stakebars S1/S2 PASS (16.1 > 9.2 >
   6.2 > 2.8%), S3's literal re-pointed at L2; firstcareer F1/F2 PASS (86.3%, 12.8%);
   unlockbars U1/U2/U3 PASS (+1.4..+6.1pp, all specials 71.9%); collectionbars C1/C2 PASS,
   **P2 PASS** (best capped 84.0% vs default 68.8%), **P1 FAIL: best capped build 84.0% (> 75%)**;
   uncapped for comparison: best uncapped build 88.4% (57★). Rebalance bar R1 (starter spread halves) FAIL: 15.4pp.
   **What was learned (do not re-run without new ideas):**
   (1) **Power follows cost and reach, not stats**: $ cards +3..+15pp, $$$ -5..-8pp whatever
   their value — a $$$ card waits for budget; raising values barely moves it (R1's fail).
   (2) **Forward reach hurts**: cells claimed deep in rival territory hand them budget when
   retaken — Budget Cut with a leap was -7pp vs without; forward-only cheap cards are the
   worst in strong decks.
   (3) **Power is not additive**: two archetypes — "sideways" cheap spreaders and a forward
   "rush" of paired cheap cards — each ~+15pp over the default at EQUAL stars. No linear cap
   between the starter deck (48★) and the default can hold the best build to 75%; a cap below
   the starter would make the starter illegal. Also tried: a deck cost floor (swaps are
   cost-neutral), "at most 7 $ cards" (the best deck already fits it), single-context ratings
   (moved the exploit around). **P1 and P2 were only jointly feasible once the default deck
   fell to <= 72%** — a pre-registration mistake worth remembering: check bars for mutual
   consistency before running.
   **User decision 2026-09-27: 84% is acceptable for now — paused; do not re-open without a new
   ask.** Was open: the cap cuts the peak (88.4% uncapped -> 84.0%) and makes building a real
   choice, but a tuned deck still beats the starter-deck ladder ~84%. Counterweight options:
   VP/CEO or stakes play built decks; or measure "the ceiling" against a strong reference deck
   rather than the starter.
14. ~~Replace stars with caps on the existing currencies (user request 2026-09-27)~~ **DONE
   2026-09-27 as "no ceiling" (user decision after the measurement below: drop the limit).**
   Stars are gone: `STARS` / `STAR_CAP` / `stars` / `deckStars` removed from shared, the star
   check out of `deckProblem`, and `defaultDeck(p)` is now `playerDeck(p)` (starter + every
   unlocked special, the deck U3 measured at 71.9%). Client: no ★ on `CardFace`, no star meter,
   hint, refusal or `stars` Bindy tip in `DeckView` (only "your deck is full" remains). Sim:
   `starfit.ts` deleted; `collectionbars.ts` keeps VCAP / DCAP / FLOOR as exploration flags,
   default no cap. Tests first (shared red then green: "no power ceiling: the strongest
   measured build is legal", "default deck = starter + every unlocked special"; DeckView
   "shows no star ratings…", "any owned cards make a legal deck"; **not confirmed red:** the
   two DeckView tests, since the shared failure stopped the run first). Verified at 375x667
   and 402x874: no ★ on the page, no tip, no sideways scroll. Consequence, accepted: the best
   known build is 88.4% vs the starter-deck ladder (was 84.0% with stars). The counterweight
   is still open (item 16's takeover change moves the meta; or VP/CEO play built decks).
   Original ask and measurement follow. User tried the ★ ceiling on a real build: "too much cognitive load". Ask: remove
   stars entirely and cap decks on things the player already reads on every card — a limit on
   **total card strength** (sum of values) and on **aggregate dollars** (sum of costs, $=1,
   $$=2, $$$=3). Notes for when it is picked up: supersedes item 13's `STARS` / `STAR_CAP`
   (the star meter, per-card ★, the refusal text and the `stars` Bindy tip all go; `deckProblem`
   gets the two new limits). Item 13's finding (2) says power follows COST and REACH, not
   value, so a value cap bites mostly on $$$ cards and a dollar cap may be the stronger lever
   — pre-register the P1 / P2 bars (check they are jointly feasible first, item 13's
   lesson), measure both caps' levels with `collectionbars.ts`, and make sure the starter
   deck and the default deck are legal. Keep the rendering as simple as the ask: two meters
   the card faces already explain.
   **Measured (/explore, 2026-09-27).** Bars pre-registered before the first run: Q1 starter
   + every default deck legal; **Q2 best buildable deck <= 84.0%** (the star cap's result the
   user accepted); Q3 best >= default + 3pp. `collectionbars.ts` gained `VCAP` (most total
   value), `DCAP` (most total $) and uses `FLOOR` (least total $); any of them replaces the
   star cap. Starter deck = value 41, $26. Hill climbs at 300 seeds, re-measured at 2000:
   | rule | climb found | default |
   |---|---|---|
   | stars <= 49 (control) | 84.0% (reproduces) | 68.8% |
   | $ <= 26 | 88.4% (= uncapped) | 71.9% |
   | value <= 46 / 44 / 43 / 42 / 41 | 88.4 / 85.4 / 85.4 / 81.7 / 81.7% | 66-71% |
   | $ >= 26 | 80.0% | 69.0% |
   | value <= 44, $ >= 25 | 80.7% | 70.0% |
   | value <= 41 / 42 / 43, $ >= 26 | 85.1 / 84.6 / 88.2% | 58-63% |
   **Honest read: single climbs are lower bounds, so compare the best KNOWN legal deck.** The
   88.2% deck (cc coffeerun corneroffice deadline gossip hackathon highfive memo pip pivot
   stakeholder x2 summerintern teambuilding vision) has **value 41, $26, exactly the starter's
   totals**, so it is legal under EVERY currency rule that keeps the starter legal. Best known:
   **no cap 88.4%, any currency cap 88.2%, stars 84.0%. Q2 FAILS for every currency rule;**
   Q1/Q3 pass. Why: item 13's finding (1) again: power is shape and cost, not printed value,
   so a deck can match the starter's totals and still be far stronger. A $ MAXIMUM never bites
   (strong decks are cheap); a $ minimum or value cap only bites at the starter's own totals.
   **Options for the user:** (a) ship the currency caps anyway: simple, but nearly no ceiling
   (88.2%); (b) drop the ceiling entirely, the simplest UI, 88.4%, and counter strong decks
   another way (item 16's takeover change moves the whole meta; or VP/CEO play built decks);
   (c) keep stars (84.0%) with a lighter presentation.
15. ~~Orgs: choose which org to tackle, most locked at first (user request 2026-09-27)~~ **DONE
   2026-09-28 (user: "build now").** Balatro's deck choice as **orgs**. **Picker moved off Home
   (user, same day)** onto the career's opening org chart (`OrgPicker.tsx`, above the tree, not
   on the daily): browsing an org redraws its WHOLE tree — every rung's portrait, character,
   meeting, boss/seniority, and a gold "Beat → unlocks Coffee Run" line (rung specials not yet
   owned; the top rung adds "opens Tech" while the next org is locked). Locked orgs are fully
   browsable, greyed "🔒 Tech · 2/3 — Get promoted in Finance to open.", with the chart's start
   button disabled. The tree scrolls INSIDE the window (picker and start button stay on screen:
   five rungs + unlock lines outgrew an iPhone SE by 65-77px) and opens scrolled to the bottom
   — you and the rung you face. Verified 375x667 / 402x874: window scroll 0, start button
   visible in every case. A brand-new player is still two taps from the first card. Tests:
   `orgs.test.tsx` rewritten (not on Home; picker on the chart; a locked org's full tree with 5
   portraits and a disabled start; rung unlock lines; a Tech career). (Original: Home showed
   the picker from day one; locked orgs browsable, greyed, Start career disabled.) Finance -> Tech -> HR, each opened by a
   promotion in the one before (an old promotion counts as Finance). **Each org plays
   differently:** its own cast of five (10 new 16x16 placeholder-in-code avatars: New Grad,
   Scrum Master, Tech Lead, CTO, Founder; Recruiter, HR Partner, Comp Lead, CHRO, Board Chair —
   fictional office types), its own VP-rung boss pool and top boss, and its own opponent
   deck. Finance = the original ladder (3rd rung renamed **The Controller**, avatar key CTL) +
   starter deck. **Tech**: forward-rush deck (Email Chain x2, Sticky Note x2, Hackathon x2, Cold
   Call x2, Reorg x2, Memo x2, Blue-Sky, Slide Deck, Keynote; no purple), CTO draws Legacy System
   or Micromanager, Founder = Change Freeze. **HR**: people deck (High Five x2, Standup x2,
   Mentorship, PIP, Deadline, Stakeholder, Synergy, CC, Memo, Offsite x2, Headcount, Slide Deck;
   boosts, weakens and purple), CHRO draws Auditor or Micromanager, Board Chair = Reply-All; Comp
   Lead / CHRO / Board Chair draw +1 / +1 / +2 cards, the Chair with two $$ home cells.
   Shared: `ORGS` / `orgOf` / `orgUnlocked` / `ladder` / `meetingDeck` (run.ts, re-exported by
   orgs.ts), `RunState.org`, `Progress.orgsPromoted`; client: `record.orgsPromoted`,
   `recordRun(..., org)`, `Game opponentDeck`, `Run org`, OrgChart reads the org's ladder, chart
   title "Org chart — New hire · Tech", deck button names the org's boss rung ("the CTO's
   boss"). Finance careers deal exactly as before (same boss + offers per seed), so daily
   seeds and records carry over. **Assumed (user left open):** stakes shared across orgs; the
   daily stays Finance. **Bars pre-registered in `sim/src/orgbars.ts` before the first run, 2000
   careers per org: O1 PASS, O2 PASS** — Finance promoted 17.8% (89.3 > 84.3 > 80.3 > 67.3 >
   43.6), Tech 8.5% (94.3 > 88.0 > 84.8 > 47.9 > 25.0), HR 5.5% (85.4 > 69.3 > 55.5 > 45.1 >
   37.5). **Honest history:** HR's first deck (all boosts + purple) was brutal — the starter deck
   won 14.8% against it, the Recruiter only 70.5% (bar 75%), promotion 3.1%; the softest
   variant made HR EASIER than Tech (17.9%). Seven tuning rounds on HR's deck and rung levers
   (card edge saturates again; two $$ home cells on the CHRO over-shot to 23%) ended at the
   deck above. **Thin margin: HR 5.5% vs the 5% floor.** Also fixed: a veteran's Home (Resume +
   org + stake pickers) overflowed an iPhone SE by 25px -> the pitch shows to first-timers
   only and compact spacing tightened; verified 375x667 / 402x874, window scroll 0 for a fresh
   player, a veteran, and the Tech chart. Tests first: shared `orgs.test.ts` 7; client
   `orgs.test.tsx` 3 (picker from day one + locks, a Tech career climbs the Tech cast, the
   record), avatars cover every org with no shared faces. **Not built yet:** org-specific card
   unlocks ("more spots to unlock cards" — the user's third benefit): next step, e.g. a
   collectible per org promotion; per-org stakes; an org in the daily.
   **Three more orgs (user: "add a few more orgs", 2026-09-28): six in all, easiest to hardest
   Finance -> Marketing -> Sales -> Legal -> Tech -> HR.** O2 (later orgs harder by >= 1pp) and
   O1's 5% floor meant new orgs had to slot BETWEEN Finance and HR, not after. **Marketing**
   (Content Writer / Designer / Growth Lead / Marketing Director / CMO; boosts + wide spreads:
   High Five x2, Team Building, CC x2, Blue-Sky, Whiteboard, Keynote, ...; pool Legacy + Auditor,
   top Change Freeze). **Sales** (SDR / Account Exec / Sales Manager / VP of Sales / CRO; cheap
   forward fans: Cold Call x3, CC x2, Stakeholder x2, ...; pool Auditor + Freeze, top Legacy).
   **Legal** (Paralegal / Associate / Senior Counsel / General Counsel / Managing Partner; Red Pen
   x2, Deadline, Stakeholder x2, Merger, Headcount, ...; pool Auditor + Legacy, top Reply-All with
   +2 cards). 15 more placeholder-in-code portraits, composed from parts (hair / eyewear / facial
   hair / clothes) with distinct palettes by `avatars_gen.py` (scratch; the maps live in
   avatars.tsx). An org you were already promoted in stays open when new orgs are inserted
   before it (Tech now follows Legal). **orgbars, 2000 careers per org: O1 PASS, O2 PASS —
   17.8 > 16.1 > 14.1 > 11.7 > 8.5 > 5.5%.** Honest history: first pass Sales 10.3 / Marketing 8.2
   / Legal 9.3 (O2 FAIL); +1 card on the VP-rungs over-shot (~44%, broke the climb); Marketing
   ended easier than Sales, so the chain order was swapped rather than re-tuned. Verified on
   screen: each new tree shows 5 portraits and the right "opens …" chain. Ask: the app should feel more EXPANSIVE to a new player. The CEO may be hard to
   beat, but it doesn't look like much is locked away. Borrow Balatro's deck choice: before a
   career you pick an **org** to climb, most shown locked from day one. The first is
   **Finance**, then **Tech**, then **HR**, and so on. Each org brings more diverse characters,
   more places to unlock cards, and a sense of a bigger universe.
   Notes for when it is picked up:
   - **Shape.** An org = a ladder of rungs with its own cast (names, 16x16 avatars
     — placeholder-in-code per the IP guardrails), its own VP boss pool, and at least one rule
     twist of its own (like a Balatro deck's), so orgs differ in play, not only in skin.
     Clearing an org (promotion) unlocks the next. Locked orgs show greyed on the picker with
     how to open them, like locked cards in the builder (item 13).
   - **Naming clash.** Today's ladder has a rung called "Finance" (Budget review), and Finance
     is also the default opponent's name in one-year games. If Finance becomes the first org,
     rename that rung or make the org's cast Finance-themed throughout.
   - **Relation to existing systems.** Stakes (10d) are Balatro's per-deck stakes, so decide
     whether stakes are tracked per org. Collectible unlocks (item 13) could move partly onto
     org milestones ("promoted in Tech"), which gives each org its own card rewards. The daily
     career (10h) would pick an org per day.
   - **Keep the first session fast (10f).** A brand-new player must still go Home -> chart ->
     Intern in two taps. With one org open, skip the picker (or pre-select Finance) until a
     second org unlocks.
   - **Bars.** Each org needs the ladder bars re-run for its own cast and twist (L1 difficulty
     climbs, L2 promotion in 10-40%, L3 first rung >= 75%), and later orgs should be harder
     but still winnable, like stakes S1/S2.
16. ~~Takeover only from special "purple" cells (user request 2026-09-27)~~ **DONE 2026-09-28
   (user: "build now … include some tooltips when it's introduced, cause it's not a simple
   concept").** **Rule:** `CardDef.takes` = purple offsets. Green reach (`spread`) only
   claims EMPTY cells; a purple cell claims an empty cell too and flips ANY enemy card it
   reaches — no value check (assumed from "completely flip"). `MATCH_RULES.takeover = false`;
   the old "any reach flips a weaker card" survives only in Phase 0 `DEFAULT_RULES`.
   `spreadTargets` = green ∪ purple, `takeTargets` = purple; Change Freeze still blocks.
   **Content:** Stakeholder (starter, x2) and its upgrades PIP / Deadline, Hostile Takeover and
   Merger take FORWARD (diagonals stay green). **Paste Special** now: a card pasted over your
   own flips WEAKER enemy cards anywhere it reaches (the old rule, for that play).
   **Teaching (user asked):** purple glyph cells with a white centre dot (non-colour cue);
   flip preview in purple stripes; three one-time Bindy tips, each at first meeting —
   `purple` (a purple card in your hand; those cards glow: "See the purple square? It takes
   over … Green squares only claim empty cells."), `purple-preview` (first purple flip
   preview), `purple-lost` (first time their purple takes your card; the taken cell glows).
   VoiceOver / inspector: "spreads ahead-left, ahead-right; takes over 1 ahead". The old
   orange `takeover` tip is gone.
   **Bars (pre-registered: every existing bar still passes; never moved), 2000 seeds, final:**
   flips per match 3.90 -> **0.51** (45% of matches see one, was 96%); match M1-M4 PASS
   (seat 49.8%, passing 64.2%, headroom 63.3%, 24 turns); runbars J1 58.4% / J2 65.5% / B1 /
   L1 89.3 > 84.3 > 80.3 > 67.3 > 43.6% / L2 17.8% / L3 PASS; stakebars S1/S2 PASS (17.8 > 9.6
   > 6.9 > 3.6%), S3's literal re-pointed at L2 (0.178); firstcareer F1/F2 PASS (85.6%, 15.3%);
   unlockbars U1 +1.2 / U2 +5.5 / U3 74.2% PASS; collectionbars C1/C2 PASS; daily re-vetted
   (1096 days, D1 13.4%, D2 100%, D3 the recorded FAIL). **Honest history:** round 1 failed J1
   (Paste Special +1.1pp — pasting used to flip via the old rule), U1 (Team Building +1.0) and U3
   (79.2%: Hostile Takeover with a whole purple fan was +9.9pp). Round 2: Team Building v3 -> 4,
   Hostile Takeover purple forward only, Paste "all reach purple" — which was BROKEN (76.9%,
   J2 caps 70). Round 3: Paste = weaker cards flip, Coffee Run v3 -> 2, Hostile Takeover v9 ->
   8: all pass. **Checked on screen** (375x667): the purple tip + glowing Stakeholders; the
   greyed purple was first too pale (#b89ad6) to see, now #8c55c9. **Not verified:** the
   purple-preview and purple-lost tips on screen (unit + DOM tests only), device.
   Original notes follow.
   Ask: an ordinary card shouldn't overpower an adjacent square that holds an enemy card. A
   card adds value to its own cell (blue on the card's shape glyph) and gives strength to the
   cells it reaches (green). Flipping a filled enemy square should be something only
   **special cards** do, and the cells of their shape that can flip are drawn in **purple**.
   Notes for when it is picked up:
   - **Today's rule.** Matches run `takeover: true`: ANY spread that reaches an enemy card of
     strictly lower value flips it (`spreadEffects` in `shared/src/qbr/game.ts`, the `flip`
     list; previewed as orange stripes, animated as a card turning over, with the `takeover`
     Bindy tip and a swish cue). The change: ordinary (green) reach claims empty cells only,
     and a card flips only through reach cells marked as takeover (purple) in its shape. That
     is probably a per-reach-cell flag on `CardDef.spread`, so one card can mix green and
     purple cells. Decide whether a purple flip still needs "strictly lower value".
   - **Content.** Hostile Takeover (special) is the obvious first purple card. A few
     collectibles (item 13) could become the takeover family, which gives the builder a clear
     archetype. Price them by the house rule: cheap reach is king, so a cheap purple card can
     be broken.
   - **Client.** Purple cells on `CardFace` glyphs (hand, builder, unlocks). The flip preview
     and fx stay, but only fire for purple reach. Update `spreadWords` / `cardLabel` ("takes
     over 1 ahead"), the `takeover` tip text, and keep a non-colour cue for purple cells
     (e.g. a dot or ring) per the colour-blind rule.
   - **Bars.** This is a core-rules change that both seats feel. Re-run everything: matchbars
     M1-M4 (takeover was worth ~8pp of headroom in the single-quarter sweep, so check M3),
     runbars, stakebars, firstcareer, unlockbars, collectionbars (and item 14's caps), then
     re-vet the daily. Mirror (`mirror.ts`) and coworker lockstep tests must still pass.
     Bosses that touch takeovers (Change Freeze) need a look.
17. ~~Guided first turn~~ **DONE (/explore 2026-09-27; playbook levers 1 + 3, research ->
   onboarding by doing).** **Research first:** Marvel Snap guarantees a playable card in the
   opening hand (QBR already does: `cheapOpener`) and orders its unlocks so each new card
   teaches the next combo
   ([mobilegamer.biz](https://mobilegamer.biz/second-dinner-reveals-the-secrets-of-marvel-snaps-onboarding-and-card-design/));
   Queen's Blood teaches through real matches, and guides say its tutorial "goes by rather
   quickly" and stays unclear "until you play a few rounds"
   ([GameSpot](https://www.gamespot.com/gallery/final-fantasy-7-rebirth-queens-blood-tips-guide/2900-5133/),
   [Gamer Guides](https://www.gamerguides.com/final-fantasy-vii-rebirth/guide/minigames/queens-blood/queens-blood-tutorial-final-fantasy-vii-rebirth));
   indie card-game feedback on itch.io keeps saying "play first, read after" and "it clicked
   halfway through the first match". **Checked as a brand-new player** (cleared storage, 375x667):
   the first turn opened on a THREE-sentence Bindy bubble ("Tap a card, then a yellow cell to
   preview its spread. Tap the same cell again to commit.") covering Finance's row and the
   headers, repeating what the formula bar already says step by step, and nothing on screen
   pointed at what to tap. **Now:** until the player's first card is ever placed, the next
   thing to tap GLOWS (`data-guide`, a pulsing gold ring): the playable cards, then after
   picking one its legal cells, then after a preview only that cell, with a "tap again" badge
   (`data-guide-badge`). Bindy's `place` tip is one short line per step ("Your move — tap a
   glowing card." / "Now tap a glowing cell to see its spread." / "Like it? Tap the same cell
   again to place it.") and advances as the player acts instead of waiting to be dismissed;
   the first placed card marks `place` seen, ends the guide for good, and hands over to the
   `lanes` tip. It now also works if the opponent moves first (it used to need turn 0).
   Reduced motion: a still ring, no pulse. Tests first (`onboarding.test.tsx` 5, 4 red then
   green; `tips.test.tsx` updated for the new rule). Verified headlessly at 375x667 and 402x874
   through the real first career (Home -> chart -> Intern): 4 cards glow -> 3 cells -> 1 cell +
   badge -> placed, lanes tip, no window scroll. The badge was then moved from the cell's
   bottom edge (it covered the ▲ owner chevron) to the top; **not re-screenshotted after that
   one-line CSS move, and not verified on a device.** **Simulator-verified 2026-09-27**
   (iPhone SE 3rd gen, fresh install, `VITE_QBR_START=year`): the playable cards carry the
   gold glow and Bindy shows the one short line, under the real status bar.
18. ~~Tips point at what they're about~~ **DONE (/explore 2026-09-27; lever 3, follow-on to
   item 17).** Checked in item 17's new-player walkthrough: after the first card, Bindy's
   `lanes` tip was a 31-word paragraph of rules and pointed at nothing; `cost` was 26 words.
   Now every rules tip names its subject (`Tip.points`: `'sums' | 'unaffordable' | 'lives' |
   'pass'`) and `Game` makes that thing glow with the same `data-guide` ring while the tip
   shows: the `=SUM` row (lanes), the grey cards (cost), your lives (lives, at Q2), the Close
   out button (closeout-ahead). Long lines cut to one: lanes "Those cells are yours now. Only a
   lane's leader scores it — watch the =SUM row." (16 words), cost "Grey cards need a richer
   cell. Spreads add $ — tap one to see why." (15). The lanes tip now shows the moment your
   first card lands, while the opponent thinks, not after their reply. Tests first
   (`pointers.test.tsx` 3, red then green; `onboarding.test.tsx` narrowed to the placement
   guide itself, `tips.test.tsx` updated). **Honest history:** the first cost line measured 17
   words against the pre-set 16 and was trimmed. Verified at 375x667 through the real first
   career: `=SUM` row glows right after placing, then the grey cards; no window scroll. The
   lives and Close out pointers were then **verified in real play** (headless script playing
   whole years at 375x667 until each tip fired): at Q2 the lives tip lights your lives + card
   count; when Finance closes out while you lead, the tip lights the Close out button.
   **Not verified:** device.
19. ~~No text under 11px~~ **DONE (/explore 2026-09-27; levers 1 + UI clarity).** **Research:**
   Balatro's iPhone port is praised, but reviewers note text is "less so" readable "on tiny
   devices" ([Engadget](https://www.engadget.com/gaming/balatro-is-an-almost-perfect-mobile-port-163050971.html),
   [148Apps](https://www.148apps.com/balatro/review/)); Marvel Snap's low-star reviews are
   mostly monetization (N/A here), bad opening hands and "pointless" cards
   ([App Store](https://apps.apple.com/us/app/marvel-snap/id1592081003)). Apple's HIG minimum
   text size is 11pt. **Measured first:** a headless font audit at 375x667 (every visible text
   node's computed size, over Home, deck builder, org chart, upgrade draft and a game)
   found 9-10.5px text: card names 10.5, placed-card names 10, lane labels 10, "needs $$" 9,
   joker tray name/glyph 10, ability badges 9, lock text/progress 9, copies/"left" 10, rung
   initials 10, joker blurbs 10. **Now:** every `font-size` in `styles.css` is >= 11px (16
   rules raised; card names `clamp(11px, 2.9vw, 12px)`); re-audit at 375x667 and 402x874:
   **zero** sub-11px text on all five screens, game still fits (no window scroll, pass button
   on screen). **Honest history:** at 11-12px "Performance Review" clipped to "Performanc" in
   the hand, so the long words got soft hyphens like `Stake\u00ADholder` (Perfor-mance,
   Improve-ment, State-ment, Para-chute). Guards (`readability.test.ts`, both red on the old
   code then green): no `font-size` below 11px in the stylesheet; every 9+-letter word in a
   card name has a soft hyphen. **Simulator-verified 2026-09-27** (iPhone SE 3rd gen): the org
   chart (`VITE_QBR_START=career`) and a game (`=year`) render the 11px text unclipped and
   fit under the status bar; hyphenated names break cleanly. **Not verified:** Dynamic Type
   (sizes are still fixed px) and on-device legibility.
20. **Opening-hand luck — MEASURED NULL, no mulligan needed (/explore 2026-09-27; research +
   balance).** Hypothesis from research: Marvel Snap's low-star reviews blame losses on a bad
   starting hand with "little recovery possible"
   ([App Store](https://apps.apple.com/us/app/marvel-snap/id1592081003)); QBR has no mulligan
   either. `sim/src/openinghand.ts` (bars pre-registered in its header): starter-deck mirrors,
   smart-greedy both seats, 2000 seeds, grouped by $ cards in seat 0's 8-card opening hand.
   **H1 PASS** (every group >= 5% of hands within 15pp of the overall 51.8%):
   | $ cards in hand | 2 | 3 | 4 | 5 |
   |---|---|---|---|---|
   | share of hands | 9.0% | 31.7% | 37.4% | 17.8% |
   | seat-0 win share | **61.7%** | 54.3% | 48.8% | 47.9% |
   By the DIFFERENCE with the opponent's hand: -3 -> 71.9%, -1 -> 54.0%, 0 -> 54.0%, +1 ->
   42.3%. **Finding: the hand that LOOKS bad (few playable cards, many grey) is the stronger
   one** — in a mirror the expensive cards carry the high values that win lanes once spreads
   build budget. (Not the same as item 5's "cheap spreaders are king", which is about deck
   building, not the draw.) So no mulligan; the only gap is perception, which item 18's
   grey-cards tip addresses. **Not measured:** the same split under lookahead play or with
   built decks.
21. ~~Card inspector~~ **DONE (/explore 2026-09-27; accessibility + UI clarity; the first step
   of the Larger Text route in "Next up").** Tap and HOLD any card (hand, a placed card on the
   board, and every card in the deck builder, locked ones included) for 450ms (`HOLD_MS`) to
   see it large: cost, name, the spread drawn at 22px cells, value, and one sentence ("Needs a
   $$ cell. Value 3. Spreads left, right, 1 ahead, 1 behind. It gives +2 to your cards it
   reaches."). `client/src/Inspector.tsx`: `useHold()` (one timer per component; a hold
   swallows the click that follows, so it never selects, places or removes a card; iOS's
   long-press menu suppressed) and `CardInspector` (text in `em` under `font:
   -apple-system-body`, so it follows the iOS text-size setting, scoped to the overlay).
   Deck builder hint: "Hold any card to see it up close." **In play (2026-09-28):** a one-time,
   lowest-priority Bindy tip `inspect` once you have 2+ cards on the sheet ("Hold any card —
   in your hand or on the sheet — to see it up close."), since the builder hint alone left it
   undiscoverable mid-game (test first, `pointers.test.tsx`). Tests first (`inspector.test.tsx`
   5, red then green). **Honest history:** jsdom passed, but a REAL touch hold in headless
   Chrome (CDP touch events) never showed it: when the finger lifts the browser sends a click
   where it lifted, which is now the overlay, and that closed it at once. Found by logging
   the event order (pointerdown -> pointerup, no cancel) and ruling out timer throttling and
   the disabled state; fixed by closing only on a tap that STARTED on the overlay; a test
   for that exact click was added red first. Verified with real CDP touch at 375x667 and
   402x874: hold opens it without selecting, a tap closes it. **Not verified:** iOS WebKit's
   own long-press behaviour (Simulator has no tap automation here; device), and how far
   `-apple-system-body` scales it at the largest accessibility sizes.
22. ~~A lane changing hands pops~~ **DONE (/explore 2026-09-27; lever 4, juice).** After item
   12 made lane ownership readable, the moment that decides a quarter (a play swings who
   leads a lane) still just recoloured the `=SUM` cell. Now `moveFx` also returns `lead`
   (lanes whose leader the play changed, and who leads now), computed from the shared
   `rowResults` before vs after `reducer`, so it cannot disagree with scoring. That `=SUM`
   cell pops (scale 0.85 -> 1.12 -> 1 in 360ms, inside the 420ms move-fx budget; off under
   reduced motion), for either side's moves, and `moveResolved` adds two rising notes when
   you take a lane, two falling when you lose one (behind the Sound setting). Tests first
   (`motion.test.ts` lead: takes / no change / takeover swing; `scoring.test.tsx` the popped
   cell is the lane you now lead). Verified in the real build at 375x667: mid-pop the cell's
   transform is scale 1.13, no window scroll. **Not verified:** how it feels on a device; no
   haptic added (flips already carry one).
23. ~~Tips and result dialogs follow the iOS text size~~ **DONE (/explore 2026-09-28;
   accessibility, Larger Text route step 2 after item 21).** `client/src/textscale.ts`: on
   WebKit (where `CSS.supports('font', '-apple-system-body')`), measure the size iOS gives
   `-apple-system-body` (17px at the default setting) and set `--text-scale` =
   clamp(px/17, 1, 2.4) on the root; re-measured when the app returns to the foreground.
   Elsewhere (Chrome, jsdom) nothing is set and everything stays as designed. Only text that
   floats OVER the board scales: Bindy's tip text (`calc(13px * var(--text-scale, 1))`) and
   result-dialog paragraphs (`calc(1em * ...)`); dialogs got `max-height: 100%; overflow-y:
   auto` so huge text scrolls instead of pushing the button off. The board, hand and bars are
   untouched, so the fixed layout can't break. Tests first (`textscale.test.ts` 3: ratio +
   cap + floor; unsupported -> no-op; supported -> sets the var). **Simulator-verified**
   (iPhone SE, fresh install, `VITE_QBR_START=year`; `xcrun simctl ui <UDID> content_size
   accessibility-extra-large`, reset to `large` after): default size unchanged; at the
   accessibility size Bindy's line is ~2.4x with the board as before. **Not verified:** a
   result dialog at the largest sizes, device. **Still left for the Larger Text label:** Home,
   Settings, org chart, draft and deck-builder text (they sit in the layout, so they need
   their own overflow handling), then a 200% pass through every common task.
24. **Rename: "Quarterly Business Reviews", not "Reports" (user request 2026-09-28) — NOT
   STARTED.** "That's the QBR I was aiming for." Every player-facing "Quarterly Business Reports"
   becomes "Quarterly Business Reviews": Home's title bar ("QBR — Quarterly Business Reports"),
   `store/app-store-connect.md` (name / subtitle / description), the privacy policy, and this
   file's pitch. Check the one-year window title ("QBR.xls — Q1 Review" already fits) and the
   store screenshots (re-render Home). A copy change; no rules or bars move.
25. **Content for the orgs: exec modifiers, desk upgrades, org-locked cards (user request
   2026-09-28, /loop every 10m) — IN PROGRESS.** Ask: build out levels, "the potential deck that
   starts locked", more desk upgrades before a level, and a list of interesting modifiers execs
   could bring so the locked orgs are engaging.
   **Research (iteration 1).** Balatro's boss blinds
   ([list](https://balatrocalculator.blog/blog/balatro-boss-blinds-guide/)): the fair ones are
   announced in advance, one readable line, and have counterplay through building/playing; the
   hated ones hide information (face-down cards), stack constraints, or punish one narrow
   strategy. The best ones change HOW you play ("can't repeat a hand type", "only one hand type
   counts"), not just the numbers. Slay the Spire's boss relics
   ([list](https://slaythespire.wiki.gg/wiki/Relics_List)) are strong upgrades WITH a real
   drawback — a trade the player chooses; QBR's desk has none. **House rules for QBR content:**
   one line; shown on the org chart before the career; counterable by deck or play; never
   hides information; price by "cheap reach is king".
   **Menu — exec modifiers (bosses), by engine hook, and the org each fits:**
   | modifier | rule (one line) | hook | org |
   |---|---|---|---|
   | Quota ✓ | Lead the Sales lane or you bank nothing that quarter | revenue | Sales (built) |
   | ~~Brand Guidelines~~ | cut: both versions measured too mild (+1.9 / −1.1pp) | canPlay | — |
   | Scope Creep | Their spreads reach one cell further forward | spreadTargets (seat 1) | Tech |
   | Red Tape | You can only place in your home row and the row in front | canPlay | Legal |
   | Performance Calibration | Each quarter your highest-value card loses 2 | cellValue | HR |
   | Budget Cuts | Your spreads add no $ to the cells they claim | spreadEffects budget | Finance |
   | Office Politics | Their claims next to your cards lower those cards by 1 | spreadEffects weaken | HR |
   | Synergy Offsite ✓ | Their cards next to another of theirs are worth +1 | cellValue | Marketing (built) |
   | Cold Outreach | They start each quarter with the cell in front of each home claimed | freshBoard | Sales |
   | Tech Debt | Your $$$ cards can't be played in Q1 | canPlay | Tech |
   | Fine Print | Their purple reach also covers their diagonals | takeTargets (seat 1) | Legal |
   Rejected up front: anything face-down / hidden (information denial), "player draws fewer" (measured
   collapse to 0.5% promotion, 10d), stacking two bosses at once.
   **Menu — desk upgrades (jokers); tradeoffs marked ⚖:**
   | upgrade | rule | hook |
   |---|---|---|
   | Standing Desk | Your $ cards are worth +1 | cellValue |
   | Expense Account | Your $$$ cards may go on $$ cells | canPlay |
   | Label Maker | Your cards in your home row are worth +1 | cellValue |
   | Second Monitor | +1 card before Q2 | bonusDraw (refill) |
   | Noise-Cancelling Headphones | The boss rule is off in Q1 | mods by quarter |
   | ⚖ Energy Drink | +2 cards in your opening hand, but −1 before Q2 | bonusDraw |
   | ⚖ Corner Office | Your cards in Ops are worth +2, your Sales cards −1 | cellValue |
   | ⚖ Red-Eye Flight | Your spreads add +1 extra $, but you start each quarter with 1 fewer $ home cell | spreadEffects / freshBoard |
   **Org-locked cards ("the deck that starts locked"):** each org promotion unlocks that org's
   signature card (shown on the org chart's top rung: "Beat → opens Sales · unlocks Viral
   Post"), priced as strict upgrades per item 5's rule. Candidates: Marketing *Viral Post* ($,
   wide sideways + boost 1), Sales *Closing Call* ($$, purple forward, v4), Legal *Cease & Desist*
   ($$, weaken 2 in lane), Tech *Hotfix* ($, forward 2 + claim), HR *Team Offsite* ($$, boost 2
   lane), Finance *Audit Trail* ($$$, purple forward fan).
   **Build order (one per iteration, each measured against its harness, bars never moved):**
   (1) research + this menu — DONE; (2) the modifier engine + first 2 exec modifiers on
   Sales/Marketing — **DONE (iteration 2):** **Quota** ("Lead the Sales lane or you bank nothing
   that quarter") lives in `revenue()`, so the match result, the AI's evaluation, pass plans and
   the on-screen score all agree; the Sales CRO's top boss (was Legacy System). **Synergy
   Offsite** ("Their cards next to another of theirs are worth +1", `cellValue` seat 1) is the
   Marketing CMO's (was Change Freeze). `DRAWABLE_BOSSES` (Finance's VP pool) is now PINNED to
   its original four, so new modifiers never reshuffle Finance careers or the vetted dailies.
   **Bars (2000 seeds, never moved):** B1 PASS — Quota −16.4pp, Synergy Offsite −23.8pp
   (smallest is still Change Freeze −7.6); orgbars O1 + O2 PASS — 17.8 > **15.2** > **13.3** >
   11.7 > 8.5 > 5.5%. **Honest history:** Brand Guidelines was tried twice and CUT as a measured
   null — v1 "no second copy of a card on your side" was +1.9pp FOR the player, v2 "cards only on
   cells of exactly their cost" −1.1pp (B1 needs 5). Quota at the CRO with its seniority (+1
   card, 2 $$ cells) over-shot Sales to 8.5% (below Legal); softening to 1 $$ cell made it WORSE
   (7.8%) — the opponent's $$ home cells start in the Sales lane, the very lane Quota makes you
   win — so the CRO is Quota alone. The CMO took five settings (19.5 / 13.1 / 17.4 / 16.8 on the
   line / 15.2%); final: Synergy Offsite + two $$ home cells. Tests first for Quota and both
   Brand Guidelines versions (mods.test.ts); **the Synergy Offsite test was written together with
   its code, not confirmed red first.** **Not verified on screen:** the two new boss rules on the
   org chart and Bindy's boss tip (both read `BOSSES` generically). (3) 3 desk upgrades incl. one ⚖, J1/J2;
   (4) org-locked signature cards, U1/U2 + C1/C2; (5+) the rest of the menu, one org at a time.
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
- ~~P2 **Deck building**~~ DONE iteration 11 (10i): bench specials, tailored to the VP's boss.
- ~~P2 **Daily seeded career**~~ DONE iteration 10 (10h): vetted daily seeds, Budget freeze, streaks.
- P2 More jokers/bosses — first batch DONE iteration 13 (10k): 6 jokers + 5 bosses, desk cap 4. More remain (Pivot Table, helpers, "The Board").

**Polish / App Store**
- ~~P2 Sound for flips, quarter results, promotion, unlocks~~ DONE iteration 9 (10g).
  ~~Animations for row wins / quarter results / promotion / unlocks~~ DONE iteration 12 (10j).
- P3 App Store kit DRAFTED iteration 14 (10l): screenshots, privacy policy, listing copy. Still user-side: commissioned art to replace placeholder-in-code art,
  privacy policy / product page; real-device verification via TestFlight.

## Next up (not yet built)
- **Larger Text — do NOT claim the App Store label in v1 (research, /explore 2026-09-27).**
  Apple's criteria: text scales to **at least 200%** and players can finish **all common
  tasks** at that size; same bar for games
  ([criteria](https://www.developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria),
  [WWDC25](https://developer.apple.com/videos/play/wwdc2025/224/)). QBR's common task is
  reading ~66px card faces on a 3x5 board at 375px wide; doubling that text cannot fit, and
  a WKWebView ignores the iOS text-size setting unless the root font uses
  `-apple-system-body` and sizes are in rem. The honest route is a **card inspector**: tap
  and hold any card (hand, board, builder) to see it large (name, cost, full spread,
  value, ability in words, as `cardLabel` already says), scaled with Dynamic Type; then
  menus, dialogs and tips in rem. Only then evaluate the label at 200%. (Inspector DONE:
  item 21; tips + result dialogs DONE: item 23. Remaining: Home / Settings / chart / draft /
  builder text, then a 200% evaluation.) Until then the
  kit (item 10l) claims Differentiate Without Color + Reduced Motion only.
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
- Art authored in this repo is **placeholder-in-code** (SVG/pixel maps like `avatars.tsx`,
  `Mascot.tsx`, `icon/`), sized so a commissioned set can replace it 1:1. Say so when
  recording it.

## Exploration loop — `/explore`
`.claude/commands/explore.md` runs ONE iteration: orient from this file, pick one hypothesis
(open thread first, else a playbook lever or balance/content), pre-register any bar, do the
work, verify it, record it here, and push once. **This file is canonical:** the command only
holds the procedure, and the facts it relies on live here.

**Push policy (standing user instruction):** commit and push every finished iteration to
`origin/main`. From a worktree, fast-forward with `git push origin HEAD:main`, never force-
push or rewrite history, and confirm with `git fetch origin main`. **Each push triggers an
Xcode Cloud -> TestFlight build, so push once per iteration, not per micro-commit.**

**Recording:** a finished backlog item is struck through and marked **DONE** in place (or
gets its own numbered entry), covering what was found, what was checked first, what changed
(file/function level), the numbers or test names, an **"Honest history"** line if the first
attempt failed, and an explicit **not verified** line for any gap. Filed-but-unbuilt ideas
go under "Next up". Rejected hypotheses are recorded too. No separate memory files.

### Do not re-open without a stated new reason
- **Measured nulls:** hand **scarcity** as the passing lever (smaller hands made passing
  matter *less*); **adding** special cards to the deck (expensive specials were net negative,
  so they replace starter cards instead); "Formatting needs both neighbours" (too weak);
  symmetric Legacy-System concrete (it *helped* the player); CEO with 3 boosted home cells
  (easier than 2, because the lever is not monotone).
- **User decisions:** no placing a card on a filled cell except via a joker; player-facing
  words are **career** / **one year**; the app icon is **one simple idea** (the mini
  spreadsheet); the feedback loop is **TestFlight**, not a web server.
- **Balance rules:** cheap spreaders are king and $$$ cards are liabilities, so price new
  content accordingly. Bars are pre-registered in the harness header before the first run
  and never moved; tune the content, not the bar. Judge at the registered seed count (2000
  for run/unlock bars), since 1000-seed runs are noisy (~±1.6pp) and have produced false
  fails here. App and sim share one source of truth (`opponentPolicy`, `spreadEffects`,
  `playerDeck`), so never re-implement a rule inside a harness.

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
# more bar harnesses in packages/sim/src (each states its pre-registered bar in its
# header): unlockbars (U1-U3), stakebars, firstcareer, dailybars, deckbars,
# collectionbars, thinktime, cardpower
```
Reuse an existing harness before writing a new one; re-run the relevant bars after any
rules change, because past tunings go stale when the option space moves (no-paste-over
knocked the Micromanager under its bar).

**Headless phone-layout check** (after any visual change): `pnpm --dir packages/client
build`, serve it temporarily with `vite preview --port 5188`, and drive headless Chrome over
CDP at **375x667 (SE)** and **402x874 (17 Pro)**. Confirm no overlap, no window scroll and the
pass button on screen, and look at the screenshots. Then **stop the preview server**; never
leave a dev server running. jsdom tests find playable cards by `data-playable="true"`.
Worktrees: a background Claude session edits in `.claude/worktrees/<name>`
(gitignored) and fast-forwards `main`; run a second dev server there on 5177.

## iOS Simulator
After adding any Capacitor plugin, run `cap sync ios` and **commit
`ios/App/CapApp-SPM/Package.swift`**, because Xcode Cloud only runs `cap copy`. Native
haptics go through `@capacitor/haptics` only (`navigator.vibrate` does nothing on iPhone),
and haptics and touch-triggered audio can only be verified on a real device.
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

## Simulator research + optimization (goal set 2026-09-26: "research and optimize in simulator")
Measured on iOS Simulators (iPhone SE 3rd gen, 17 Pro, 17 Pro Max) and headlessly; each
finding is either fixed or recorded as not worth optimizing.
1. **AI think time — NOT a bottleneck** (`sim/src/thinktime.ts`, 11,000+ opponent moves,
   every rung, hardest stake, full 4-joker desk): median <= 0.3ms, p99 <= 7.8ms, max 55ms
   (JIT warm-up) for the lookahead rungs. Even at 3-4x slower on-device JS, p99 stays near
   ~30ms inside the 450ms "thinking" delay. Do not move the AI to a worker for speed.
2. **Launch showed a white screen with the stock Capacitor logo — FIXED.** The launch
   storyboard was Capacitor's default `Splash` image on `systemBackgroundColor`; the first
   frame after launch on the SE was plain white, then the teal desktop. Now
   `LaunchScreen.storyboard` is a plain teal (#0f7b7b) view (same in dark mode) and
   `capacitor.config.ts` sets `ios.backgroundColor` teal for the web view before the page
   paints; the unused 2732px stock splash PNGs are removed. Verified by capturing frames
   right after a cold launch on the SE: first frame teal, then Home — no white flash.
   (iOS caches launch screens: uninstall before re-checking.)
3. **Launch timing:** first paint ~70ms after navigation start once warm; the first launch
   after install spends 1-2s in WebKit process start-up — not reachable from our JS. JS
   bundle 224 KB (74 KB gzip): nothing to win there.
4. **Real safe areas — VERIFIED, no change needed.** Headless Chrome cannot emulate the
   Dynamic Island / home indicator, so a year was screenshotted on the Simulators: on the
   17 Pro Max the window starts clear below the Dynamic Island and "Close out" sits above
   the home indicator; on the SE (status bar, home button) the window clears the status bar
   and the pass button is on screen. The joker tray lives inside `.app`, whose padding
   includes `env(safe-area-inset-top)`, so it can't slide under the island either.
   **Dev hook for this** (no tap automation — idb/cliclick not installed): build the client
   with `VITE_QBR_START=year` (or `career`) and the app opens straight into one; unset in
   every shipped build. Recipe: `VITE_QBR_START=year pnpm build && pnpm exec cap sync ios`,
   then the Simulator build/install from "iOS Simulator" above, `xcrun simctl io <UDID>
   screenshot`. Rebuild WITHOUT the variable before archiving.
5. **Install size — 5.1 MB, nothing to optimize.** Capacitor's frameworks are 4.4 MB (fixed
   cost); the app binary 408 KB; all game assets 256 KB; the asset catalog 32 KB (after
   removing the stock splash).
6. **Memory over a long session — no leaks.** 30 whole years played back to back in the same
   client (headless Chrome, 402x874; forced GC before each sample): DOM nodes 84 -> 94 and
   event listeners flat at 140 throughout; JS heap 2.4 MB -> 3.7 MB after the first 5 years
   (warm-up: compiled code, first game state), then +0.36 MB over the next 25 (~14 KB/year,
   measured on React's development build). Timers, audio and listeners all clean up.
**Conclusion of the Simulator research:** one real defect (the white launch flash) — fixed;
AI speed, safe areas, launch cost, install size and memory are all measured and fine.
