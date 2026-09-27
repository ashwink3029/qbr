---
name: explore
description: Run one iteration of QBR's Exploration Loop — pick one hypothesis (competitive research, speed, onboarding, juice/sound/haptics, balance, new content, UI clarity), do real work to validate or build it, verify it, and record the outcome in CLAUDE.md.
---

One iteration of the loop. **`CLAUDE.md` is canonical** for everything this command
references: the goal and playbook, rules, bars, harnesses, the phone-layout check, the
Simulator recipe, IP guardrails, what not to re-open, the recording format and the push
policy. If this file and `CLAUDE.md` ever disagree, `CLAUDE.md` wins; fix this file. Do
real work (research, measure, build, verify), not a plan.

## 1. Orient
- Read `CLAUDE.md`'s **"Product goal & polish playbook"**, "Rules as built", the phone
  layout decisions, both Backlog lists, "Next up", "Terminology", "IP guardrails" and
  **"Exploration loop"** (including *Do not re-open*).
- Grep it for open threads before inventing anything: `Next up`, `not yet built`,
  `Open design issue`, `Thin margin`, `first to revisit`, `to watch`, `not verified`,
  `Honest gap`.

## 2. Pick ONE hypothesis
- **Prefer** an open thread from step 1.
- **Else** pick one of the playbook's four levers (competitor research, speed, onboarding
  by doing, core-loop juice), or balance/new content or UI clarity (something a player
  can't read from the screen). Check `CLAUDE.md` for what's already built before assuming
  a gap, e.g. `feedback.ts` cues and `motion.ts` animations.
- Before doing the work, state what would count as success: a pre-registered bar (balance
  or content), a failing-then-passing test plus a clean build (feel or UI), or sourced
  findings (research).

## 3. Execute
- **Research:** use real web search (App Store listings/reviews, Reddit), cite it, and ground
  it in QBR's measured identity. It can end three ways: build a scoped refinement, file it
  under "Next up" in enough detail to pick up cold, or reject it with reasons.
- **Balance / content:** use the harnesses in `CLAUDE.md` "How to run" under the balance
  rules in *Do not re-open*. If a number is surprising, suspect the harness or the AI eval
  before the rules.
- **Feel / UI / onboarding / speed:** test first (confirm it fails), build, then run the
  full suite + `pnpm typecheck`. Run the headless phone-layout check for anything visual,
  then build and launch per "iOS Simulator". Art follows "IP guardrails".
- Say plainly what isn't verified; "renders correctly" and "feels right on a phone" are
  different claims.

## 4. Record, push, status
Record and push per `CLAUDE.md` "Exploration loop", and confirm the push landed. End with
one paragraph: the hypothesis, which lever or kind it was, the concrete result (numbers
against the bar, test + build, or the sourced conclusion), whether it shipped, was filed or
was rejected, the commit, and what the next iteration should pick up.
