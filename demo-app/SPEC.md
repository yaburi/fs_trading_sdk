# Set Piece — Design & Build Spec

> Mobile-first prediction market app where every World Cup 2026 market is a free kick.
> Aim, time, kick, repeat. The curve emerges from your kicks. Bet on it.

Built for the FunctionSpace Builder Competition (closes 18 May 2026).

---

## 1. Concept

**Name:** Set Piece (soccer term for free kicks/corners; also "set a piece of your wallet on this market")

**Tagline:** Predict the World Cup, one free kick at a time.

**Audience:** Soccer fans following the 2026 FIFA World Cup (June-July 2026). Casual-to-engaged. Mobile-first. Want a fun, expressive way to make calls on tournament outcomes rather than abstract sliders.

**Why it fits the rubric:**
- **Usefulness (50%)** — Targets a real timed audience (WC starts ~3 weeks after judging). Casual fans get a fun on-ramp to prediction markets they'd otherwise ignore.
- **Creativity (40%)** — Free-kick minigame is a non-obvious application of belief-construction. Skill-based interaction respects user intent while introducing fun randomness.
- **Market selection (10%)** — Curated to the 18 FIFA World Cup 2026 markets. Niche, perfectly fitted, not a default popular-market list.

---

## 2. Core mechanic — kick → belief mapping

Every kick is one `PointRegion` in `generateBelief([...regions], numBuckets, lowerBound, upperBound)`. Multiple kicks compose additively into a single belief vector passed to `useBuy`.

| Kick element | Engine concept | Range / behavior |
|---|---|---|
| **Aim** (oscillator tap) | `center` of `PointRegion` | Anywhere on `[lowerBound, upperBound]` |
| **Timing** (sweet spot tap) | `spread` | Sweet hit → tight spread (~5% of range). Off hit → wide (~20%) |
| **Wind** (random per kick) | small `center` jitter + matching `spread` widening | ±10-15% of range; spread grows proportionally so user intent is preserved |
| **Kicks taken** | Number of regions in the array | 1 = unimodal Gaussian. 2-5 = multimodal / asymmetric |
| **Stake** (set pre-round slider) | `collateral` for `useBuy` | $1 minimum, capped by wallet |
| **Goalkeeper silhouette** | Visual treatment of `useConsensus` data | Tall where consensus is dense; faded where it's thin. Aiming where keeper is faded = bet against the crowd = naturally higher previewed payout |

**Composition example (3 kicks at 120, 125, 220 yellow cards):**
```ts
const regions: PointRegion[] = [
  { type: 'point', center: 120, spread: 8, weight: 1 },
  { type: 'point', center: 125, spread: 6, weight: 1 },
  { type: 'point', center: 220, spread: 14, weight: 1 },
];
const belief = generateBelief(regions, numBuckets, lowerBound, upperBound);
```

---

## 3. App flow

App opens directly into the market list as a **guest**. Login is gated on trade only via a bottom-sheet `PasswordlessAuthWidget`.

```
1. Market list  — entry surface; brand mark in sticky header; 18 WC 2026 markets
2. Stake        — slider, default $1, capped by wallet (works as guest)
3. Game         — center-card pitch view; 1-5 kicks; composed belief grows live
4. Confirm      — final curve + previewed payout
                — CTA "GOAL!"  (authenticated) → useBuy
                — CTA "Sign in to kick" (guest) → opens PasswordlessAuthWidget modal,
                  auto-retries useBuy on success
5. My calls     — your open WC positions; sell via PositionTable
```

**First-time explainer modal** — a single bottom-sheet shown on first visit only (localStorage flag), 3 cards: Aim → Time → Kick. Skippable. Treated as polish, not a route.

Cap kicks at 5 per round. After every kick, the user picks: "Take another kick" OR "Done, set my belief."

---

## 4. Visual identity

### Palette ("paper centered light")

```
primary       #0F0F10   near-black — CTA pills, consensus curve stroke
accent        #FF6B3D   warm coral — user's preview line, hot moments, brand pop
positive      #16A34A   grass green — GOAL, gains, on-target
negative      #DC2626   red card — losses, errors
background    #F4F4F5   cool light gray — page background
surface       #FFFFFF   pure white — floating cards
text          #0F0F10   near-black — primary text
textSecondary #71717A   zinc gray — body, helpers
border        #E4E4E7   hairline — card borders, dividers
```

> Mapped to `FSThemeInput` for `FunctionSpaceProvider theme={theme}` in `demo-app/src/main.tsx` or App.

### Typography

| Role | Family | Weights |
|---|---|---|
| **Display** (hero, market titles, big numbers) | Bricolage Grotesque | 700-800 |
| **Body** (paragraph, helpers, labels) | Inter | 400, 500, 600 |
| **Numerics** (range bounds, payouts, kick counts) | Geist Mono | 500 |

All three are free on Google Fonts / Vercel. Load via `<link>` tags in `index.html`.

### Layout system

- Center column, `max-width: 520px` everywhere
- Phone mockup vibe even on desktop — narrow column with page padding
- Card radius: 20px (large), 14px (mid), 10px (small)
- Pills: `border-radius: 999px` for chips and buttons
- Shadow: `0 1px 2px rgb(0 0 0 / 0.04)` for cards
- Section gaps: 24-32px outside, 12-16px inside
- Page padding: 16px mobile, 24px desktop

### Signature touches (from references)

- **Tripsy** — colorful pastel icon bubbles as ornament, peach pop, tabular numerics for stats
- **Apara** — playful inside cleanliness (e.g., hanging-tag motif could become "ticket stub" for confirmed positions)
- **ElevenLabs** — soft gradient orbs with grain texture (use sparingly: maybe behind the "GOAL!" celebration)
- **Arie** — handwritten script font for ONE moment (the GOOOOAL celebration title)
- **Football.fun** — pill-shaped position rows with jersey avatars; big number + small delta layout; gold coin badge style

---

## 5. Game canvas

Game lives **inside a card** on the centered light background. Not full-bleed. Soft, illustrated, premium-product feel — not video-game.

```
┌──────── 520px max ────────┐
│ YELLOW CARDS    ●●●●○ $1  │   header: bold market name + kick dots + stake chip
│ in WC 2026                │
│                           │
│ 80 ───────────────── 300  │   chalk range, Geist Mono digits
│                           │
│ ┌─ inner game card ─────┐ │   light gray (#FAFAFA) inner surface
│ │     ════╤════         │ │   clean SVG goal
│ │    ░░██████░░         │ │   keeper silhouette = consensus density
│ │   ─●──────●──         │ │   outcome axis with kick markers
│ │                       │ │
│ │         ⚽            │ │   ball, soft drop shadow
│ └───────────────────────┘ │
│                           │
│ AIM    ←──○──→            │   labelled controls
│ TIMING ▓▓▓░░░▓▓▓          │   sweet zone in coral
│ WIND   ↘ 12 km/h          │   chip-style indicator
│                           │
│ ┌────── KICK ──────┐      │   black pill CTA, full width
│                           │
│ take another | done       │   muted secondary actions after kick lands
└───────────────────────────┘
```

### Element treatments

| Element | Treatment |
|---|---|
| Pitch | Flat SVG, no photoreal texture. Soft gradient under for floodlight feel. |
| Goal | Clean white SVG, 2-3px stroke, no posts shading |
| Ball | Vector pentagon-hex pattern, ~24px, soft drop shadow |
| Trail | Coral gradient stroke fading behind ball as it flies (Score! Hero style) |
| Keeper | Stretched silhouette, alpha = `consensus[i]` density at each x-position |
| Aim oscillator | Pulsing coral dot ON the ball (FIFA 23 dot-on-ball move) |
| Timing bar | Horizontal track with coral sweet-spot band |
| Wind indicator | Chip top-right: directional arrow icon + speed string |
| Kick markers | Small coral dots on the axis after the ball lands |
| Belief overlay | Drawn live across the goal mouth as kicks compose; coral stroke |

### Motion

Restrained, spring-physics, not arcade:
- Ball flight: spring with mass, friction
- Aim oscillator: smooth sinusoidal, ~1Hz
- Timing meter: linear sweep, ~1.2s cycle
- "GOAL!" reveal: scale-in + soft confetti (pastel pops, not chaos)
- Score animation: handwritten "GOOOAL" in script font (Caveat or similar), fades after 1.5s

---

## 6. Tech stack

### SDK hooks (do not reimplement)

```ts
// From @functionspace/react
useMarkets({ categories: ['World Cup', 'Soccer'] })  // market list
useMarket(marketId)                                  // current market state
useConsensus(marketId, 200)                          // consensus density curve
useBuy(marketId)                                     // place position
usePreviewPayout(marketId)                           // preview before submit
useAuth()                                            // login state

// From @functionspace/core
generateBelief(regions, numBuckets, lowerBound, upperBound)
```

### SDK widgets (reuse, do not rewrite)

- `PasswordlessAuthWidget` — login screen (REQUIRED by competition rules)
- `PositionTable` — "My calls" screen, with `tabs={['open-orders', 'trade-history']}`
- Possibly `MarketCard` styling for the market list (or fully custom — TBD)

### Libraries

- `framer-motion` — ball physics, page transitions, score animation
- (Already in repo) React 18, Vite, TypeScript

### File structure (target)

```
demo-app/src/
  App.tsx                  — entry, FunctionSpaceProvider wrapper
  theme.ts                 — Set Piece custom 9-token theme
  routes/
    Splash.tsx
    Auth.tsx
    Markets.tsx
    Stake.tsx
    Game.tsx
    Confirm.tsx
    MyCalls.tsx
  game/
    Pitch.tsx              — SVG pitch + goal + keeper
    Ball.tsx               — ball + trail animation
    AimOscillator.tsx      — pulsing dot, tap-to-lock
    TimingBar.tsx          — sweet spot mechanic
    WindChip.tsx           — random wind per kick
    BeliefOverlay.tsx      — live composed curve on goal mouth
    useKickState.ts        — per-round state machine, kick → PointRegion mapping
  components/
    Card.tsx
    Pill.tsx
    Header.tsx
    PageShell.tsx          — center column wrapper, max-width 520px
  styles/
    fonts.css              — Bricolage / Inter / Geist Mono imports
    globals.css            — CSS variables, reset
```

---

## 7. Hard rules (from builder.md)

These are non-negotiable. The engine will reject violators or they will fail at submission.

- **Auth:** `PasswordlessAuthWidget` only. No custom auth, no username/password forms.
- **Math:** All belief/probability/bucket math goes through `@functionspace/core` (`generateBelief`, `generateGaussian`, etc.). Never reimplement.
- **React:** Use `@functionspace/react` hooks for data, mutations, previews. No raw `fetch`, no hand-built trade payloads.
- **Trades:** `useBuy` and `useSell` only. Never call `buy()`/`sell()` from core directly inside React.
- **Engine errors:** Hooks handle the `{ success: false }` HTTP-200 convention. Trust them.
- **API endpoint:** `https://fs-engine-api-dev.onrender.com` (set in `demo-app/.env`). CORS is open.
- **Markets:** No custom market creation. Use existing markets via `useMarkets` / `discoverMarkets`.
- **Local port:** Dev server on `http://localhost:3000`. Kill the holder if occupied.
- **Commits:** No `Co-Authored-By`. No em-dashes ever in committed prose.

---

## 8. World Cup 2026 market scope

18 markets total (12 under Soccer category + 6 under World Cup category). All resolve around the WC 2026 tournament (June-July 2026).

Sample seen via `/api/views/markets/list`:
- Total VAR-Initiated Overturned Referee Decisions
- Average Match Attendance at WC Venues in Mexico
- Number of CONCACAF Teams Reaching Round of 16
- Number of CONMEBOL Teams Reaching Quarterfinals
- Total Minutes Played by Players Aged 21 or Younger (Knockout)
- Total Yellow Cards
- Total Viewers for WC Final
- (plus 11 more)

App filters `useMarkets` to categories `['World Cup', 'Soccer']`. If duplicates, dedupe by `marketId`.

---

## 9. Decisions locked

| # | Decision | Choice |
|---|---|---|
| 1 | UI ambition | Pre-built starter kit base; heavily customize on top |
| 2 | Domain | FIFA World Cup 2026 only |
| 3 | Standout interaction | Free-kick minigame, multi-kick belief composition |
| 4 | Goalkeeper feedback | Keeper = consensus density; aim where faded = higher payout (natural market math, no special rules) |
| 5 | Wind behavior | Adds small center jitter + proportional spread widening — respects user intent |
| 6 | Kicks per round | Player chooses, 1-5 (decide after each) |
| 7 | Stake timing | Set BEFORE the round, locked during play |
| 8 | Device | Mobile-first, desktop works (centered column) |
| 9 | Theme | Custom 9-token "paper centered light" palette (see §4) |
| 10 | Typography | Bricolage Grotesque (display) + Inter (body) + Geist Mono (numerics) |
| 11 | Accent | Warm coral #FF6B3D |
| 12 | Aesthetic direction | Premium product app that contains a mini-game, NOT a video game |

---

## 10. Open / future

- **Sound design** — kick whoosh, GOAL roar? TBD. Default off; toggle in header.
- **Onboarding** — first-time tooltip pass for aim/timing/wind? Keep minimal.
- **Sharing** — after a position, generate a shareable "ticket stub" card with belief curve + market name. Hooks into X submission requirement.
- **Calibration view** — see how past predictions did vs. resolved outcomes. Out of scope for v1, possible v2.
- **Leaderboard** — only useful if many users; skip for competition.

---

## 11. Resources

- SDK guides (internal): `packages/docs/static/core.txt`, `react.txt`, `ui.txt`, root `llms.txt`
- Engine API: `https://fs-engine-api-dev.onrender.com` (CORS open, dev endpoint)
- Starter kit base to fork from: TBD — likely `App_CustomShapeLayout` (closest in spirit: building beliefs through interaction)
- Competition rubric: 50% usefulness, 40% creativity, 10% market selection. Technical complexity NOT scored.
