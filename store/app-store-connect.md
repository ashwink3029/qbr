# App Store Connect — QBR submission kit

Drafted 2026-09-26 (/explore iteration 14). Everything here is a **draft for the developer
to review and enter**; nothing has been submitted.

## App Privacy ("nutrition label")

Verified against the code, not assumed (`packages/client/src`, iteration 14): no `fetch`,
XHR, WebSocket or beacon calls and no external URLs; the only dependencies are React,
Capacitor core and `@capacitor/haptics` (on-device); the app stores exactly four
local-only keys (`qbr.record.v1`, `qbr.settings.v1`, `qbr.tips.v1`, `qbr.bench.v1`).

- **Data collection:** "No, we do not collect data from this app." → label **Data Not Collected**.
- **Tracking:** none (no ATT prompt needed).
- **Privacy Policy URL:** required. Host `store/privacy-policy.md` somewhere public (e.g.
  GitHub Pages on the repo) and paste the URL. _Needs: a contact email in the policy._
- Re-check this section before shipping multiplayer (backlog 11): Multipeer uses the local
  network (Info.plist `NSLocalNetworkUsageDescription`) but still sends nothing off-device.

## Accessibility (App Store Accessibility Nutrition Labels, 2025)

Claim only what is built and tested:

| Feature | Claim? | Evidence |
|---|---|---|
| Differentiate Without Color Alone | **Yes** | owner chevrons by shape + position (`data-owner`), `=SUM` ▲/▼; checked under achromatopsia emulation (iteration 3) |
| Reduced Motion | **Yes** | every animation off under `prefers-reduced-motion` (iterations 1, 7, 12) |
| VoiceOver | **Not yet** | aria labels exist for cells, cards, lanes (`a11y.ts`) but have **not been tested with real VoiceOver on device** — test first |
| Larger Text | No | fixed px sizes; Dynamic Type not supported |
| Sufficient Contrast / Dark Interface / Captions / Audio Descriptions | No / n.a. | not evaluated / no dark mode / no spoken audio |

## Age rating

No violence, gambling, user content, web access or purchases → expected **4+**. (It is a
card game with no wagering and no in-app purchases.)

## Category

Primary **Games → Card**; secondary **Games → Strategy**.

## Product page copy (draft — within the IP guardrails in CLAUDE.md)

**Name (≤30):** `Quarterly Business Reports` (26 — `QBR: Quarterly Business Reports` is 31, one over)
**Subtitle (≤30):** `QBR · a spreadsheet card game` (29)

**Promotional text (≤170, this is 151):**
Climb the org chart from Intern to CEO in a territory card battle played on a
spreadsheet. New every day: a Daily career that is the same for everyone.

**Description:**
> Corporate life is a card game. Now it is literally one.
>
> QBR is a lane-and-territory card battle played on a 3×5 spreadsheet. Place a card on a
> cell you own and it spreads in its shape, claiming the cells it reaches. Win a lane to
> bank its total. Best of three quarters wins the year.
>
> • Climb the org chart — beat the Intern, the Manager, Finance, the VP and the CEO, each
>   smarter than the last, in a best-of-three meeting.
> • Build your desk — pick jokers from the supply closet between meetings: an Ergonomic
>   Chair, Conditional Formatting, Circular Reference and more.
> • Read the boss — the VP brings a rule-breaker (the Micromanager, the Auditor, a Change
>   Freeze…) and you see it before the career starts. Tailor your deck to beat it.
> • Unlock special cards — Hostile Takeover, Golden Parachute, a Performance Improvement
>   Plan that weakens a whole lane.
> • Four stakes for the promoted, and a Daily career: one shared setup, one try a day,
>   keep your streak.
> • Know when to close out — pass at the right moment and let your rival overspend.
>
> Offline. No ads, no accounts, no data collected.

**Keywords (≤100, comma-separated; this is 94):**
`card game,strategy,deckbuilder,roguelike,office,spreadsheet,territory,lanes,solo,offline,daily`

**Support URL:** required — the repo's GitHub page or a simple page. _Needs the developer._

_IP check:_ no Excel / Microsoft / Office / Clippy / Gwent / Queen's Blood / Final Fantasy
names or trade dress; "spreadsheet" is generic. Do not mention other games in the copy.

## Screenshots

`store/screenshots/6.9/` — 1320×2868 PNGs (the required 6.9" iPhone size; App Store
Connect scales these for smaller iPhones). Rendered from the real client (headless Chrome,
440×956 CSS px at 3x). **Caveat:** they show no iOS status bar — fine for a full-screen
game, but re-capture on a device/Simulator if Apple or you prefer the real chrome.
