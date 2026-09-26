---
name: explore
description: Run one iteration of QBR's Exploration Loop — pick a hypothesis (competitive research, juice/animation, sound/haptics, balance, new content, UI clarity), do real work to validate or build it, verify it the way this project actually can, and record the outcome in CLAUDE.md.
---

Adapted from Rushie's `.claude/commands/explore.md` (itself adapted from nexus's) for QBR's
shape: a solo, portrait mobile card battle on a deterministic sim — a Queen's Blood-style
territory game on a 3x5 spreadsheet, played as best-of-3 "years", climbed as an org-chart
"career" (Intern -> Manager -> Finance -> VP -> CEO) with Balatro-style jokers, bosses and
unlockable special cards. So:
- **"The baseline"** = the measured numbers already in `CLAUDE.md` (Phase 0 bars, match bars
  M1-M4, joker/boss/ladder bars J1/J2/B1/L1-L3, unlock bars U1-U3).
- **"The gate"** = this project's pre-register-then-measure discipline (`packages/sim`
  harnesses), the full test suite + `pnpm typecheck`, and a clean Simulator build.
- **Memory** = `CLAUDE.md` itself. There is no `.claude/memory/` directory for this project.

Run exactly **one iteration**. Do real work — actually research, measure, build and verify.
Do not just plan.

## 1. Orient

- Read `CLAUDE.md` top to bottom enough to know the live state: "Rules as built", the phone
  layout decisions ("do not regress"), "Best-of-3 match", both "Backlog" lists, "Next up",
  "Terminology" and the "IP guardrails".
- Grep it for open threads before inventing anything:
  - `Next up` / `not yet built` / `Not yet built` — filed ideas nobody has picked up.
  - `Open design issue` / `Thin margin` / `first to revisit` / `to watch` — deliberately
    deferred follow-ups with their own stated reason.
  - `not verified` / `Only verifiable on a real device` / `Honest gap` — known verification or
    test-coverage holes.
- **Never re-open a measured null or a user decision** without a genuinely new reason, stated
  explicitly. Current examples:
  - measured nulls: hand **scarcity** as the passing lever (smaller hands made passing matter
    *less*); **adding** special cards to the deck (expensive specials were net negative — they
    replace starter cards instead); "Formatting needs both neighbours" (too weak); symmetric
    Legacy-System concrete (it *helped* the player); CEO with 3 boosted home cells (easier
    than 2 — the lever is not monotone).
  - user decisions (not ours to relitigate): **no placing a card on a filled cell** except via
    a future joker; player-facing words are **career** / **one year**; the app icon is **one
    simple idea** (the mini spreadsheet); feedback loop is **TestFlight**, not a web server.

## 2. Pick the next hypothesis (mix rule)

- **Prefer** an open thread surfaced in step 1.
- **Else** invent a fresh one from this project's own recurring axes — pick ONE, not a survey:
  - **Competitive research**: what do Queen's Blood, Gwent (and Rogue Mage), Marvel Snap,
    Balatro, Slay the Spire, Inscryption or other grid/lane card games do that QBR doesn't —
    or do worse that QBR already avoids? Ground it in QBR's own measured identity (spread
    shapes, budget `$` economy, locking pass, org-chart ladder, "cheap spreaders are king")
    rather than generic "add feature X" advice.
  - **Juice / animation**: placements, claims and takeover flips animate (`motion.ts`,
    all inside the 450ms AI delay); row wins, the `=SUM` row, quarter results, promotions
    and unlocks still **snap**. Is there one moment that should get a real transition
    without slowing the AI's turn or breaking the phone layout?
  - **Sound / haptics**: is every action that "registers" wired to a cue in `feedback.ts`
    (tap / place / confirm / denied exist; flips, row wins, quarter results, promotions,
    unlocks do not yet)? Native haptics only via `@capacitor/haptics` — `navigator.vibrate`
    does nothing on iPhone.
  - **Balance / difficulty**: re-run a harness against the CURRENT rules — a past tuning can
    go stale the instant an unrelated change moves the option space (this project already
    saw the no-paste-over rule knock the Micromanager under its bar). Watch the recorded thin
    margins (Hostile Takeover +1.2pp, Circular Reference 69.5%, Stamp 54.0%).
  - **New content**: a joker, boss, special card, helper (keycap/sticky note) or ladder rung
    in the shape of the existing catalog (`mods.ts`, `cards.ts` SPECIALS, `run.ts`
    MEETINGS). Price cards by the project's own rule — **cheap spreaders are king, $$$ cards
    are liabilities** — and put every new item through the relevant bars.
  - **UI clarity**: something a player can't read from the screen (why a card is grey, what a
    boss does, where you are on the ladder were all fixes of this kind). Bindy tips
    (`tips.ts`) are one-time; don't turn them into nagging.
- State the hypothesis and what you'd need to see to call it a real improvement — a measured
  number for a balance/content idea, a failing-then-passing test + clean build for a
  feel/UI idea, sourced findings for a research idea — **before** doing the work.

## 3. Execute — shape depends on the hypothesis

**Research.**
- Use real web search, not recollection, and cite what you used. Grep `CLAUDE.md` for the
  relevant precedent first so findings are about QBR, not generic.
- Three legitimate endings: (a) build a scoped refinement now, (b) file it under "Next up"
  with enough detail that a future `/explore` can pick it up cold, (c) reject it with the
  reasoning.

**Balance / content / difficulty.**
- Reuse the existing harnesses (from `packages/sim`, via `./node_modules/.bin/tsx src/<x>.ts`
  or the root `pnpm` scripts): `measure` + `sweep` (single-quarter Phase 0 bars), `matchbars`
  (`pnpm match`, M1-M4), `passplan`, `matchsweep`, `nopaste`, `runbars` (jokers J1/J2, bosses
  B1, career ladder L1-L3), `unlockbars` (specials U1-U3). Write a new one only if none can
  answer the question.
- **Pre-register the bar before the first run** — write it in the harness header and state it
  in the status, then **never move it**; tune the content, not the bar. Judge at the seed
  count the bar was registered at (2000 for the run/unlock bars) — 1000-seed runs are noisy
  (~±1.6pp) and have produced false fails here before.
- The app and the sim must share one source of truth (e.g. `opponentPolicy(kind)`,
  `spreadEffects`, `playerDeck`) — never re-implement a rule in a harness.
- If a number looks surprising, trace it to the harness or the AI before trusting it (the
  CEO home-boost non-monotonicity is an AI-eval artifact, not a rules fact).

**Feel / animation / sound / haptics / UI.**
- Write the test FIRST proving the mechanism doesn't exist yet, confirm it fails, then build,
  then confirm it passes — structural DOM assertions in jsdom (element/class/data-attribute
  present), since jsdom has no layout. Tests find playable cards by `data-playable="true"`.
- Run the full suite + `pnpm typecheck` clean.
- Check the phone layout headlessly when anything visual changed: `pnpm --dir
  packages/client build`, serve it **temporarily** (`vite preview --port 5188`), drive
  headless Chrome over CDP with device metrics **375x667 (SE) and 402x874 (17 Pro)**, confirm
  no overlap / no window scroll / pass button on screen, look at the screenshots — then **stop
  the preview server**. Never leave a dev server running for the user.
- Build for the Simulator and confirm install/launch (recipe in `CLAUDE.md` "iOS
  Simulator"). After adding any Capacitor plugin: `cap sync ios` and **commit
  `ios/App/CapApp-SPM/Package.swift`** — Xcode Cloud only runs `cap copy`.
- State plainly what ISN'T verified: haptics and touch-triggered audio can only be felt on a
  real device; "renders correctly" and "feels right on a phone" are different claims.

**Art.** Follow the IP guardrails: original shapes only, nothing that evokes Excel/Office
trade dress, Clippy, real people or other games' characters. Art authored here is
**placeholder-in-code** (SVG/pixel maps like `avatars.tsx`, `Mascot.tsx`, `icon/`) sized so a
commissioned set can replace it 1:1 — say so in the record.

## 4. Record the outcome

- Update `CLAUDE.md` in this project's established voice:
  - a finished item gets its own numbered entry (or its existing entry struck through and
    marked **DONE**) under the relevant Backlog list: what was asked/found, what was checked
    before touching anything, what changed (file/function level), the measured numbers or
    test names that prove it, an **"Honest history"** line if the first attempt failed, and
    an explicit **not verified** line where there's a gap;
  - filed-but-not-built ideas go under **"Next up"**;
  - a rejected hypothesis is recorded too (under the relevant section or "Next up" as a
    closed note) — a well-reasoned null is progress, not a wasted iteration.
- Don't create separate memory files for project facts; `CLAUDE.md` is the record.

## 5. Commit and push policy

Standing user instruction for this repo: **commit and push every finished iteration to
`origin/main`** (SSH remote `git@github.com:ashwink3029/qbr.git`). From a worktree, commit on
the worktree branch and fast-forward main with `git push origin HEAD:main`; never force-push
or rewrite history. **Each push triggers an Xcode Cloud -> TestFlight build**, so push once
per iteration, not per micro-commit. Verify it landed (`git fetch origin main` and compare)
before calling the iteration done.

## 6. Status

End with a one-paragraph status: the hypothesis, what kind it was (research / balance /
content / feel / UI), the concrete result (measured numbers against the pre-registered bar,
or the test + build that verifies it, or the sourced research conclusion), whether it
shipped, was filed or was rejected, the commit pushed, and what the next `/explore`
iteration should pick up.
