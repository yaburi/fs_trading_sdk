# Set Piece — Build Progress

Living checklist of build phases. Update on every task transition. Spec lives in [`SPEC.md`](./SPEC.md).

> **Rule for the agent:** when starting a task, mark it ▶ in_progress. When finished, mark it ✓ and append a short "What landed" note + key files touched. Never delete completed entries.

---

## Status at a glance

| # | Task | Status |
|---|---|---|
| 1 | Theme, fonts, and page shell | ✓ done |
| 2 | First-time explainer modal (deferred polish) | ☐ pending |
| 3 | Market list screen | ✓ done |
| 4 | Stake screen | ✓ done |
| 5 | Game screen — pitch, goal, keeper, ball | ✓ done |
| 6 | Game screen — aim, timing, wind, kick state machine | ✓ done |
| 7 | Belief composition + live overlay | ☐ pending |
| 8 | Confirm screen + buy submission | ☐ pending |
| 9 | My Calls screen | ☐ pending |
| 10 | Polish pass + end-to-end test | ☐ pending |

---

## Log

### ✓ Task #1 — Theme, fonts, and page shell

**What landed**
- 9-token Set Piece theme (`paper centered light` palette) mapped to `FSThemeInput`
- Google Fonts: Bricolage Grotesque, Inter, Geist Mono, Caveat
- CSS variable mirror of theme tokens for direct CSS use
- `PageShell` — sticky header band, centered 520px column, sticky footer slot
- `Card` — surface and inset variants, tappable (hover lift)
- `Pill` — primary / secondary / ghost / accent variants × 3 sizes
- Vite server pinned to port 3000 (`strictPort: true`)
- `vite-env.d.ts` for typed `import.meta.env`
- Smoke-test screen at `/` so we can eyeball the foundation
- Existing `App_*.tsx` starter kits left intact, swappable via `main.tsx`

**Key files**
```
demo-app/index.html                          # font links, viewport meta
demo-app/vite.config.ts                      # port 3000
demo-app/src/main.tsx                        # imports set_piece/App
demo-app/src/vite-env.d.ts                   # env typings
demo-app/src/set_piece/App.tsx               # smoke-test screen
demo-app/src/set_piece/theme.ts              # FSThemeInput + design tokens
demo-app/src/set_piece/styles.css            # CSS variables + globals
demo-app/src/set_piece/components/PageShell.tsx
demo-app/src/set_piece/components/Card.tsx
demo-app/src/set_piece/components/Pill.tsx
```

**Open follow-ups**
- Canvas placeholder needed to be bigger; updated proportions on first feedback
- Pre-existing TS errors in `App_*.tsx` and `PositionTable.tsx` left alone (not ours)

---

### Flow change (post-task-#1, before task-#2)

Decided to drop the dedicated splash + auth screen. Instead:

- **Market list is the entry surface.** Tiny brand mark + tagline in the sticky header.
- **App opens in guest mode** (SDK guest mode = read-only browse). Pick / stake / play / preview all work without login.
- **Auth is gated on trade only.** On the confirm screen, when `!isAuthenticated`, the CTA reads "Sign in to kick" and opens a bottom-sheet with `PasswordlessAuthWidget`. After auth succeeds, the buy retries automatically.
- **First-time explainer modal** (3 cards: Aim → Time → Kick) is a deferred polish item, not a route.

Reflected in tasks #2 (renamed) and #8 (description updated). SPEC.md updated.

---

### ✓ Task #3 — Market list screen

**What landed**
- `react-router-dom` v7 wired up with flat routes (`/`, `/m/:marketId/stake`, `/play`, `/confirm`, `/calls`)
- `Header` component with brand mark, guest pill, wallet chip (shown when authed), and optional back button + center label for sub-routes
- `MarketRow` card: bold title, smart category tag picker (skips Sports/Soccer/Global, prefers WC and region tags), coral "WC 2026" chip, range in Geist Mono, units helper
- `MarketList` route: hero headline + tagline, `useMarkets({ categories: ['World Cup'], state: 'open', sortBy: 'totalVolume' })`, skeleton loading state, error card with retry, empty state, counter ("N markets open")
- Placeholder routes for Stake / Game / Confirm / MyCalls so navigation works end-to-end
- App opens in guest mode (no credentials in config); SDK auto-sends `Username: guest` header

**Key files**
```
demo-app/src/set_piece/App.tsx                       # router setup
demo-app/src/set_piece/components/Header.tsx
demo-app/src/set_piece/components/MarketRow.tsx
demo-app/src/set_piece/routes/MarketList.tsx
demo-app/src/set_piece/routes/{Stake,Game,Confirm,MyCalls}.tsx  # placeholders
```

**Notes for future tasks**
- Filter is `categories: ['World Cup']` returning 9 markets. Switch to `['Soccer']` for 12 (adds EPL / UCL / Messi) if scope wants to broaden.
- `MarketState.marketId` exists in the typed shape; the raw `/api/views/markets/list` returns `market_id` (snake_case). The core `discoverMarkets` mapper handles the conversion — so React-side just trust the typed object.

**Follow-up (post-completion):** Added colored icon bubbles per market for visual differentiation (Tripsy-style). New file `components/MarketIcon.tsx` with 10 inline SVG glyphs and 12 pastel palette entries; keyword-matcher on `market.title` chooses the icon + color. No icon library dep.

---

### ✓ Task #4 — Stake screen

**What landed**
- `state/RoundContext.tsx` — shared round state across stake → game → confirm (marketId, stake, kicks[], helpers). Resets when entering a new market. Cap of 5 kicks per round. Provider wraps the Routes in `App.tsx`.
- `routes/Stake.tsx` — real screen with:
  - Market summary card reusing the colored `MarketIcon`, title, range in Geist Mono, and consensus mean hint ("crowd expects ~X")
  - Stake card with HUGE mono number (64px Bricolage-display + Geist-mono digits), themed range slider (coral fill, coral thumb), and 5 quick-pick pills ($1 / $5 / $10 / $25 / MAX)
  - Sticky footer CTA ("Start kicking →") in `PageShell`'s footer slot
- Themed native `<input type=range>` via `.sp-stake-slider` CSS — gradient-filled track using a `--sp-fill` percentage CSS var, coral thumb with subtle glow, grab/grabbing cursor states, cross-browser (Chromium + Firefox)
- Wallet-aware max: when authenticated, capped at `min($100, walletValue)`. Guest mode capped at $100 hard.
- Skeleton state while market data loads
- Continue CTA navigates to `/m/:marketId/play`

**Key files**
```
demo-app/src/set_piece/state/RoundContext.tsx
demo-app/src/set_piece/routes/Stake.tsx
demo-app/src/set_piece/styles.css        # added .sp-stake-slider rules
demo-app/src/set_piece/App.tsx           # wrapped Routes in RoundProvider
```

**Notes**
- `setStake` clamps to min $1 and rounds to 2 decimals.
- `startRound(marketId)` is called in a `useEffect` on the Stake screen — first entry resets kicks; revisiting the same market preserves them (intentional, so user can refine kicks if they navigate back).

---

### ✓ Task #5 — Game screen: pitch, goal, keeper, ball

**What landed**
- `game/Pitch.tsx` — SVG canvas (viewBox 400×300, 4:3) with:
  - Soft sage radial gradient + paper base, gives a "floodlit pitch" feel without going dark
  - Goal frame: white crossbar + posts (3.5px stroke, rounded)
  - Net hint: thin subtle vertical + horizontal mesh inside the goal mouth
  - **Goal-line IS the outcome axis.** Lower-bound numeral under the left post, upper-bound under the right, both Geist Mono
  - Faint penalty arc above the ball for depth cue
  - Ball at the penalty spot with paper drop-shadow + radial gloss highlight
- **Keeper silhouette** = consensus density rendered as a single SVG path that rises from the goal-line. Built from `useConsensus(marketId, 80)` points, normalized to a peak height of ~90px, filled with a vertical gradient (10% → 30% black) so the bottom reads "solid" and the top fades into the air. Tall where the crowd expects the outcome, faded where they don't.
- Constants exported as `PITCH` (viewW, viewH, goalLeft/right/top/bottom, ballX/Y) so future kick mechanics can land coordinates correctly.
- `routes/Game.tsx` rewritten:
  - Compact market+stake strip (icon + 2-line title + stake + kick dots)
  - Pitch in an inset card
  - Sticky footer with two CTAs: `Done · set belief` (left, disabled until ≥1 kick) and `Kick` (right, primary, disabled until task #6 wires it)
  - Placeholder note pointing at task #6

**Key files**
```
demo-app/src/set_piece/game/Pitch.tsx
demo-app/src/set_piece/routes/Game.tsx
```

**Notes**
- Coordinate system is single source of truth in `PITCH` const — task #6 will use `PITCH.goalLeft/goalRight/goalBottom` to map aim/kick positions onto the goal-line, and `PITCH.ballX/ballY` as the takeoff point for ball animation.
- Keeper path falls back to "no keeper" if consensus has no points in range or peak density is 0 (e.g. a freshly created market). Mechanic still works — user just doesn't see the consensus blob until data arrives.

---

### ✓ Task #6 — Kick mechanic: aim, timing, wind, state machine

**What landed**

- **`game/useKickEngine.ts`** — pure state machine hook driving the full kick lifecycle:
  - States: `ready → aiming → timing → flying → landed → ready`
  - `aimPhase` and `timingPhase` oscillate via `requestAnimationFrame` (1.4s and 1.1s periods, sinusoidal)
  - `primaryAction()` transitions state based on current state — single button drives the whole flow
  - Wind is generated once per kick (random dir + speed)
  - On `lockTiming`: distance from sweet-spot center → `power` (1 = perfect, falls off outside the band). landingX = aimX + small wind-jitter scaled by miss.
  - `commit()` returns a `PointRegion` with center = `lowerBound + landingX*range` and spread = `(4% + (1-power)*18% + wind.speed*8%) * range`. Resets state to `ready`.
  - Tunable constants pulled to the top of the file (period, sweet spot, spread mapping).

- **`game/Pitch.tsx`** — extended from task #5 with overlay rendering:
  - Aim dot: coral circle on the goal-line at `aimToPixelX(aimDot.x)`. Pulsing halo when unlocked, solid when locked.
  - Past kicks: small coral dots on the goal-line at each region's `center` value.
  - Ball: now wrapped in a `motion.g` (framer-motion) animating between penalty spot and target landing position. Spring physics (stiffness 180, damping 18). `onAnimationComplete` fires `onBallSettled` to advance the engine.
  - Exports `aimToPixelX` and `outcomeToPixelX` helpers so any future overlay (belief curve, percentile bands) can stay in sync.

- **`game/TimingMeter.tsx`** — coral sweet-spot band on a 18px pill track, sweeping dark indicator. Locks state visualizes the captured timing.

- **`game/WindChip.tsx`** — pill with a directional arrow icon (rotates 0° or 180° based on `wind.dir` sign) and a friendly km/h string. Renders muted between kicks.

- **`routes/Game.tsx`** — wires the engine + Pitch + WindChip + TimingMeter:
  - Stake / kick-dots / wind strip on the top card
  - Pitch with live aim, past kicks, animated ball
  - Phase hint line under the canvas with contextual copy per state ("Tap Lock aim where you want to score", etc.)
  - Timing meter card slides in only during the timing+flying phases
  - Sticky footer: secondary "Done · set belief" (left, disabled with 0 kicks or mid-action) + primary action (right, label changes by state: "Start kick" → "Lock aim" → "Lock timing")
  - 650ms hold after ball settles, then auto-commits the kick into `RoundContext` so the new marker appears on the goal-line.

**Key files**
```
demo-app/src/set_piece/game/useKickEngine.ts    # state machine
demo-app/src/set_piece/game/Pitch.tsx           # extended with overlays
demo-app/src/set_piece/game/TimingMeter.tsx     # new
demo-app/src/set_piece/game/WindChip.tsx        # new
demo-app/src/set_piece/routes/Game.tsx          # full wire-up
```

**Notes for task #7**
- A `PointRegion` is committed to `round.kicks[]` after every successful kick — task #7 reads that array and composes the live belief overlay via `generateBelief()`.
- Engine never reaches into RoundContext directly; Game.tsx is the single coordinator. Keeps the engine pure / testable.
- Wind affects landing visually (small jitter) AND spread mathematically (proportional widening) — but the jitter scales with `(1 - power)` so a perfectly-timed kick lands almost exactly where the user aimed regardless of wind.
