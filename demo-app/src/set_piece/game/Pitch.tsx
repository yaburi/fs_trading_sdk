import { useEffect, useRef, type MutableRefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { MarketState, ConsensusCurve, PointRegion } from '@functionspace/core';

/**
 * The pitch canvas — the visual home of every kick.
 *
 * Coordinate system (viewBox 400 x 300):
 *   - goal mouth:  x ∈ [GOAL_LEFT, GOAL_RIGHT], y ∈ [GOAL_TOP, GOAL_BOTTOM]
 *   - goal-line = outcome axis: y = GOAL_BOTTOM
 *     lower-bound at x = GOAL_LEFT, upper-bound at x = GOAL_RIGHT
 *   - ball / penalty spot:   (BALL_X, BALL_Y)
 */

const VIEW_W = 400;
const VIEW_H = 300;

export const PITCH = {
  viewW: VIEW_W,
  viewH: VIEW_H,
  goalLeft: 50,
  goalRight: 350,
  goalTop: 40,
  goalBottom: 140,
  axisY: 140,
  ballX: 200,
  ballY: 230,
  keeperMaxHeight: 90,
} as const;

const GOAL_WIDTH = PITCH.goalRight - PITCH.goalLeft;

/** 0..1 normalized goal position → pixel x in viewBox coords. */
export function aimToPixelX(aim: number) {
  return PITCH.goalLeft + aim * GOAL_WIDTH;
}

/** Outcome-space value → pixel x. */
export function outcomeToPixelX(value: number, lo: number, hi: number) {
  if (hi === lo) return aimToPixelX(0.5);
  return aimToPixelX((value - lo) / (hi - lo));
}

export interface BallTarget {
  /** 0..1 normalized goal position. */
  x: number;
}

export interface BeliefCurve {
  points: { x: number; y: number }[];
}

/** Coral aim dot variants. `live` reads a ref each animation frame and mutates
 *  its own DOM without re-rendering the Pitch. `locked` is a static position. */
export type AimDescriptor =
  | { kind: 'live'; phaseRef: MutableRefObject<number> }
  | { kind: 'locked'; x: number };

/** Curved shot-meter overlay. `phaseRef` oscillates 0..1 and is mapped along
 *  the arc so the apex corresponds to phase = 1.0 (the sweet-spot center). */
export interface TimingDescriptor {
  phaseRef: MutableRefObject<number>;
  /** Half-width of the sweet spot around phase = 1.0. */
  sweetSpotHalfWidth: number;
  /** When true, the indicator pins to its last position. */
  locked?: boolean;
}

interface PitchProps {
  market: MarketState;
  consensus: ConsensusCurve | null;
  aim?: AimDescriptor | null;
  /** Previously-landed kicks rendered as small coral markers on the goal-line. */
  kicks?: PointRegion[];
  /** Composed-belief density curve, drawn as a coral line over the goal mouth. */
  belief?: BeliefCurve | null;
  /** When set, the ball animates from the penalty spot to this position. */
  ballTarget?: BallTarget | null;
  /** Called when the flying ball reaches its target. */
  onBallSettled?: () => void;
  /** When set, the curved shot-meter overlay is rendered on the right side. */
  timing?: TimingDescriptor | null;
}

export function Pitch({
  market,
  consensus,
  aim,
  kicks = [],
  belief,
  ballTarget,
  onBallSettled,
  timing,
}: PitchProps) {
  const { lowerBound, upperBound } = market.config;
  const decimals = market.decimals ?? 0;
  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const ballAtPenalty = !ballTarget;
  const ballTargetPixel = ballTarget
    ? {
        x: aimToPixelX(ballTarget.x) - PITCH.ballX,
        y: PITCH.goalBottom - PITCH.ballY,
      }
    : { x: 0, y: 0 };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        borderRadius: 'var(--sp-radius-md)',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 80% 60% at 50% 20%, var(--sp-pitch-grass-glow), var(--sp-pitch-grass-fade) 70%), linear-gradient(180deg, var(--sp-pitch-top) 0%, var(--sp-pitch-bot) 100%)',
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id="keeperGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--sp-keeper-light)" />
            <stop offset="100%" stopColor="var(--sp-keeper-dark)" />
          </linearGradient>
          <radialGradient id="ballGloss" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="var(--sp-ball-gloss)" />
            <stop offset="60%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
        </defs>

        {/* Penalty arc */}
        <path
          d={`M ${PITCH.ballX - 60} ${PITCH.ballY - 12} Q ${PITCH.ballX} ${
            PITCH.ballY - 28
          } ${PITCH.ballX + 60} ${PITCH.ballY - 12}`}
          fill="none"
          stroke="var(--sp-surface)"
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Payout heat zones paint the goal interior with the heat ramp so
         * the big-payout regions are visible behind the keeper. Rendered first
         * so the keeper silhouette overlays it: tall (dense) sections cover the
         * red, short (thin) sections leave the green exposed. */}
        {consensus && consensus.points.length > 1 ? (
          <PayoutHeatZones
            points={consensus.points}
            lowerBound={lowerBound}
            upperBound={upperBound}
          />
        ) : null}

        {/* Keeper silhouette */}
        {consensus && consensus.points.length > 1 ? (
          <KeeperPath
            points={consensus.points}
            lowerBound={lowerBound}
            upperBound={upperBound}
            dim={belief != null && belief.points.length > 1}
          />
        ) : null}

        {/* Net hint */}
        <g stroke="var(--sp-surface)" strokeWidth="0.6" opacity="0.55">
          {Array.from({ length: 10 }, (_, i) => {
            const x = PITCH.goalLeft + (GOAL_WIDTH / 10) * (i + 1);
            return (
              <line
                key={`nv${i}`}
                x1={x}
                y1={PITCH.goalTop + 2}
                x2={x}
                y2={PITCH.goalBottom - 1}
              />
            );
          })}
          {Array.from({ length: 4 }, (_, i) => {
            const y =
              PITCH.goalTop + ((PITCH.goalBottom - PITCH.goalTop) / 5) * (i + 1);
            return (
              <line
                key={`nh${i}`}
                x1={PITCH.goalLeft + 1}
                y1={y}
                x2={PITCH.goalRight - 1}
                y2={y}
              />
            );
          })}
        </g>

        {/* Goal frame */}
        <g
          stroke="var(--sp-surface)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <line
            x1={PITCH.goalLeft - 2}
            y1={PITCH.goalTop}
            x2={PITCH.goalRight + 2}
            y2={PITCH.goalTop}
          />
          <line
            x1={PITCH.goalLeft}
            y1={PITCH.goalTop}
            x2={PITCH.goalLeft}
            y2={PITCH.goalBottom}
          />
          <line
            x1={PITCH.goalRight}
            y1={PITCH.goalTop}
            x2={PITCH.goalRight}
            y2={PITCH.goalBottom}
          />
        </g>

        {/* Goal-line / outcome axis */}
        <line
          x1={PITCH.goalLeft - 8}
          y1={PITCH.goalBottom}
          x2={PITCH.goalRight + 8}
          y2={PITCH.goalBottom}
          stroke="var(--sp-surface)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Axis bound labels */}
        <text
          x={PITCH.goalLeft}
          y={PITCH.goalBottom + 22}
          textAnchor="middle"
          fontFamily="var(--sp-font-mono)"
          fontSize="11"
          fontWeight="600"
          fill="var(--sp-text)"
          opacity="0.55"
        >
          {fmt(lowerBound)}
        </text>
        <text
          x={PITCH.goalRight}
          y={PITCH.goalBottom + 22}
          textAnchor="middle"
          fontFamily="var(--sp-font-mono)"
          fontSize="11"
          fontWeight="600"
          fill="var(--sp-text)"
          opacity="0.55"
        >
          {fmt(upperBound)}
        </text>

        {/* Payout legend — maps color → meaning without implying that the
         * strip always runs low-to-high left-to-right. The peak crowd density
         * can sit anywhere, so the legend describes the colors themselves.
         * Hidden during timing so the arc above the ball reads cleanly. */}
        {consensus && consensus.points.length > 1 && !timing ? (
          <text
            x={(PITCH.goalLeft + PITCH.goalRight) / 2}
            y={PITCH.goalBottom + 38}
            textAnchor="middle"
            fontFamily="var(--sp-font-body)"
            fontSize="9"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            <tspan fill="#EF4444">RED</tspan>
            <tspan fill="var(--sp-text-secondary)" fontWeight="500">{' = LOW PAYOUT · '}</tspan>
            <tspan fill="#22C55E">GREEN</tspan>
            <tspan fill="var(--sp-text-secondary)" fontWeight="500">{' = BIG PAYOUT'}</tspan>
          </text>
        ) : null}

        {/* Ball trail — Score! Hero-style coral arc when the ball is in flight */}
        <AnimatePresence>
          {ballTarget && (
            <motion.path
              key="trail"
              d={`M ${PITCH.ballX} ${PITCH.ballY} Q ${
                (PITCH.ballX + aimToPixelX(ballTarget.x)) / 2
              } ${PITCH.goalTop - 12} ${aimToPixelX(ballTarget.x)} ${PITCH.goalBottom}`}
              fill="none"
              stroke="var(--sp-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="3 5"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 0.65, pathLength: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>

        {/* Composed belief curve (your prediction) — sits above keeper, under frame */}
        {belief && belief.points.length > 1 ? (
          <BeliefPath
            points={belief.points}
            lowerBound={lowerBound}
            upperBound={upperBound}
          />
        ) : null}

        {/* Past kick markers (from prior kicks this round) */}
        {kicks.map((k, i) => {
          const px = outcomeToPixelX(k.center, lowerBound, upperBound);
          return (
            <g key={i} transform={`translate(${px}, ${PITCH.goalBottom})`}>
              <circle cx="0" cy="0" r="4" fill="var(--sp-accent)" opacity="0.65" />
              <circle cx="0" cy="0" r="2" fill="var(--sp-accent)" />
            </g>
          );
        })}

        {/* Aim dot: live oscillator OR static locked position. */}
        {aim?.kind === 'live' && <AimDotLive phaseRef={aim.phaseRef} />}
        {aim?.kind === 'locked' && (
          <g transform={`translate(${aimToPixelX(aim.x)}, ${PITCH.goalBottom})`}>
            <circle cx="0" cy="0" r="5" fill="var(--sp-accent)" />
            <circle cx="0" cy="0" r="2" fill="var(--sp-surface)" />
          </g>
        )}

        {/* Curved shot-meter (NBA 2K style) on the right edge — top is perfect */}
        {timing && (
          <TimingArc
            phaseRef={timing.phaseRef}
            sweetSpotHalfWidth={timing.sweetSpotHalfWidth}
            locked={timing.locked}
          />
        )}

        {/* Ball; animated by framer-motion */}
        <motion.g
          animate={ballTargetPixel}
          initial={false}
          transition={
            ballAtPenalty
              ? { duration: 0 }
              : { type: 'spring', stiffness: 180, damping: 18, mass: 0.6 }
          }
          onAnimationComplete={() => {
            if (!ballAtPenalty) onBallSettled?.();
          }}
        >
          <g transform={`translate(${PITCH.ballX}, ${PITCH.ballY})`}>
            <ellipse cx="0" cy="12" rx="11" ry="2.8" fill="var(--sp-ball-shadow)" />
            <circle cx="0" cy="0" r="11" fill="var(--sp-surface)" stroke="var(--sp-text)" strokeWidth="1.4" />
            <polygon points="0,-5 4.8,-1.5 3,4 -3,4 -4.8,-1.5" fill="var(--sp-text)" />
            <circle cx="0" cy="0" r="11" fill="url(#ballGloss)" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

/** Self-animating aim dot. Reads phaseRef on every frame and mutates its own
 *  group's transform. Parent never re-renders during oscillation. */
function AimDotLive({ phaseRef }: { phaseRef: MutableRefObject<number> }) {
  const groupRef = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = groupRef.current;
      if (g) {
        const x = aimToPixelX(phaseRef.current);
        g.setAttribute('transform', `translate(${x}, ${PITCH.goalBottom})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phaseRef]);
  const goalHeight = PITCH.goalBottom - PITCH.goalTop;
  return (
    <g ref={groupRef} transform={`translate(${aimToPixelX(phaseRef.current)}, ${PITCH.goalBottom})`}>
      {/* Vertical aim beam: dashed coral column from above the crossbar
       *  down to the dot, so the aiming column is unmistakable. */}
      <line
        x1="0"
        y1={-goalHeight - 8}
        x2="0"
        y2="-2"
        stroke="var(--sp-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
        strokeDasharray="3 4"
      />
      {/* Downward chevron sitting above the crossbar, pointing at the column. */}
      <polygon
        points={`-5,${-goalHeight - 12} 5,${-goalHeight - 12} 0,${-goalHeight - 4}`}
        fill="var(--sp-accent)"
        opacity="0.95"
      />
      {/* Pulsing outer halo: draws the eye and makes oscillation obvious. */}
      <circle cx="0" cy="0" r="14" fill="var(--sp-accent)" opacity="0.28">
        <animate attributeName="r" values="12;19;12" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.08;0.4" dur="1.1s" repeatCount="indefinite" />
      </circle>
      {/* Static inner halo for solid presence. */}
      <circle cx="0" cy="0" r="10" fill="var(--sp-accent)" opacity="0.45" />
      {/* Larger, brighter core. */}
      <circle cx="0" cy="0" r="6.5" fill="var(--sp-accent)" />
      <circle cx="0" cy="0" r="2.4" fill="var(--sp-surface)" />
    </g>
  );
}

/**
 * Curved vertical shot-meter, inspired by the NBA 2K release meter. A
 * quadratic bezier curves up the right edge of the pitch; the indicator
 * slides along the curve as the phase oscillates 0..1, and the green
 * sweet zone sits at the very top so the perfect release is the apex.
 *
 * The arc lives inside the same SVG as the pitch so it scales with the
 * canvas, and the indicator is animated by mutating its own group
 * transform every rAF tick (no React re-renders during the sweep).
 */
// Compact arc that floats directly above the ball at the penalty spot,
// horizontally centered on BALL_X so the meter reads like a release gauge
// rising up out of the boot. Height ~55px keeps it out of the goal mouth
// and out of the ball's flight path landing zone.
const ARC = {
  p0: { x: 206, y: 202 },
  p1: { x: 188, y: 175 },
  p2: { x: 210, y: 148 },
} as const;

function arcPointAt(t: number) {
  const u = 1 - t;
  return {
    x: u * u * ARC.p0.x + 2 * u * t * ARC.p1.x + t * t * ARC.p2.x,
    y: u * u * ARC.p0.y + 2 * u * t * ARC.p1.y + t * t * ARC.p2.y,
  };
}

function TimingArc({
  phaseRef,
  sweetSpotHalfWidth,
  locked = false,
}: {
  phaseRef: MutableRefObject<number>;
  sweetSpotHalfWidth: number;
  locked?: boolean;
}) {
  const indicatorRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (locked) return;
    let raf = 0;
    const tick = () => {
      const g = indicatorRef.current;
      if (g) {
        const p = arcPointAt(Math.max(0, Math.min(1, phaseRef.current)));
        g.setAttribute('transform', `translate(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phaseRef, locked]);

  // Full track path
  const trackD = `M ${ARC.p0.x} ${ARC.p0.y} Q ${ARC.p1.x} ${ARC.p1.y} ${ARC.p2.x} ${ARC.p2.y}`;

  // Sweet zone is the top slice of the bezier. Split the curve at
  // tSplit = 1 - 2 * halfWidth using De Casteljau so the green segment
  // is itself a quadratic bezier we can stroke.
  const tSplit = Math.max(0, 1 - sweetSpotHalfWidth * 2);
  const splitStart = arcPointAt(tSplit);
  const splitCtrl = {
    x: (1 - tSplit) * ARC.p1.x + tSplit * ARC.p2.x,
    y: (1 - tSplit) * ARC.p1.y + tSplit * ARC.p2.y,
  };
  const sweetD = `M ${splitStart.x.toFixed(2)} ${splitStart.y.toFixed(2)} Q ${splitCtrl.x.toFixed(2)} ${splitCtrl.y.toFixed(2)} ${ARC.p2.x} ${ARC.p2.y}`;

  const initial = arcPointAt(Math.max(0, Math.min(1, phaseRef.current)));

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Soft drop shadow under the track */}
      <path
        d={trackD}
        stroke="rgba(0, 0, 0, 0.22)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        transform="translate(0.6, 1.4)"
      />
      {/* Track base */}
      <path
        d={trackD}
        stroke="var(--sp-surface)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {/* Track inner shading for a touch of depth */}
      <path
        d={trackD}
        stroke="var(--sp-text)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.14"
      />
      {/* Sweet-zone halo */}
      <path
        d={sweetD}
        stroke="#22C55E"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      {/* Sweet-zone core */}
      <path
        d={sweetD}
        stroke="#22C55E"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      {/* Tiny glint at the very top to mark the apex */}
      <circle cx={ARC.p2.x} cy={ARC.p2.y} r="1.8" fill="var(--sp-surface)" opacity="0.9" />

      {/* Indicator: small puck that slides up the curve */}
      <g ref={indicatorRef} transform={`translate(${initial.x.toFixed(2)}, ${initial.y.toFixed(2)})`}>
        <circle cx="0" cy="0" r="5.5" fill="var(--sp-text)" opacity="0.22" />
        <circle
          cx="0"
          cy="0"
          r="3.4"
          fill={locked ? 'var(--sp-accent)' : 'var(--sp-text)'}
          style={{ transition: 'fill 0.18s var(--sp-ease)' }}
        />
        <circle cx="0" cy="0" r="1.4" fill="var(--sp-surface)" />
      </g>
    </g>
  );
}

interface KeeperPathProps {
  points: { x: number; y: number }[];
  lowerBound: number;
  upperBound: number;
  dim?: boolean;
}

function KeeperPath({ points, lowerBound, upperBound, dim }: KeeperPathProps) {
  const inRange = points.filter((p) => p.x >= lowerBound && p.x <= upperBound);
  if (inRange.length === 0) return null;
  const maxY = Math.max(...inRange.map((p) => p.y));
  if (!isFinite(maxY) || maxY <= 0) return null;

  const yFor = (density: number) =>
    PITCH.goalBottom - (density / maxY) * PITCH.keeperMaxHeight;

  let d = `M ${PITCH.goalLeft} ${PITCH.goalBottom}`;
  for (const p of inRange) {
    d += ` L ${outcomeToPixelX(p.x, lowerBound, upperBound).toFixed(2)} ${yFor(p.y).toFixed(2)}`;
  }
  d += ` L ${PITCH.goalRight} ${PITCH.goalBottom} Z`;

  return (
    <path
      d={d}
      fill="url(#keeperGradient)"
      opacity={dim ? 0.55 : 1}
      style={{ transition: 'opacity 0.4s var(--sp-ease)' }}
    />
  );
}

interface PayoutHeatZonesProps {
  points: { x: number; y: number }[];
  lowerBound: number;
  upperBound: number;
}

/**
 * Heat ramp painted across the inside of the goal mouth. Each x position
 * gets a color from the heat ramp based on inverse crowd density:
 *   red (low payout / dense crowd) to amber to green (big payout).
 * The keeper silhouette renders on top, so tall (dense) regions cover the
 * red and short (thin) regions leave the green exposed. This double-encodes
 * the "thin crowd, bigger payout" pattern into both color and visible area.
 */
function PayoutHeatZones({ points, lowerBound, upperBound }: PayoutHeatZonesProps) {
  const inRange = points.filter((p) => p.x >= lowerBound && p.x <= upperBound);
  if (inRange.length < 2) return null;
  const maxY = Math.max(...inRange.map((p) => p.y));
  if (!isFinite(maxY) || maxY <= 0) return null;

  const sorted = [...inRange].sort((a, b) => a.x - b.x);

  const interpAt = (xOutcome: number): number => {
    if (xOutcome <= sorted[0].x) return sorted[0].y;
    const last = sorted[sorted.length - 1];
    if (xOutcome >= last.x) return last.y;
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1];
      const b = sorted[i];
      if (xOutcome >= a.x && xOutcome <= b.x) {
        const t = (xOutcome - a.x) / (b.x - a.x);
        return a.y + t * (b.y - a.y);
      }
    }
    return last.y;
  };

  const N_STOPS = 32;
  const stops: { offset: number; color: string }[] = [];
  for (let i = 0; i < N_STOPS; i++) {
    const t = i / (N_STOPS - 1);
    const xOutcome = lowerBound + t * (upperBound - lowerBound);
    const density = interpAt(xOutcome);
    const heat = Math.max(0, Math.min(1, 1 - density / maxY));
    stops.push({ offset: t, color: colorForHeat(heat) });
  }

  const goalH = PITCH.goalBottom - PITCH.goalTop;
  const goalW = PITCH.goalRight - PITCH.goalLeft;

  return (
    <g>
      <defs>
        <linearGradient id="payoutHeatGradient" x1="0" x2="1" y1="0" y2="0">
          {stops.map((s, i) => (
            <stop
              key={i}
              offset={`${(s.offset * 100).toFixed(2)}%`}
              stopColor={s.color}
            />
          ))}
        </linearGradient>
        {/* Vertical falloff so the heat is densest at the back of the net
         *  and fades toward the goal-line, where the keeper and aim markers
         *  need clearer reads. */}
        <linearGradient id="payoutHeatFalloff" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="70%" stopColor="white" stopOpacity="0.75" />
          <stop offset="100%" stopColor="white" stopOpacity="0.35" />
        </linearGradient>
        <mask id="payoutHeatMask">
          <rect
            x={PITCH.goalLeft}
            y={PITCH.goalTop}
            width={goalW}
            height={goalH}
            fill="url(#payoutHeatFalloff)"
          />
        </mask>
      </defs>
      <rect
        x={PITCH.goalLeft}
        y={PITCH.goalTop}
        width={goalW}
        height={goalH}
        fill="url(#payoutHeatGradient)"
        opacity={0.55}
        mask="url(#payoutHeatMask)"
      />
    </g>
  );
}

// Heat → 3-stop color ramp: vivid red → warm amber → vivid green. Punched
// brighter than the muted theme tokens so the cold end actually reads on the
// pitch surface, and the hot end glows without leaning too far into yellow.
const HEAT_COLD: [number, number, number] = [0xef, 0x44, 0x44]; // #EF4444 red-500
const HEAT_WARM: [number, number, number] = [0xf9, 0x73, 0x16]; // #F97316 orange-500
const HEAT_HOT: [number, number, number] = [0x22, 0xc5, 0x5e]; // #22C55E green-500

function colorForHeat(heat: number): string {
  const mix = (a: [number, number, number], b: [number, number, number], t: number) => {
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  };
  if (heat < 0.5) return mix(HEAT_COLD, HEAT_WARM, heat * 2);
  return mix(HEAT_WARM, HEAT_HOT, (heat - 0.5) * 2);
}

interface BeliefPathProps {
  points: { x: number; y: number }[];
  lowerBound: number;
  upperBound: number;
}

function BeliefPath({ points, lowerBound, upperBound }: BeliefPathProps) {
  const inRange = points.filter((p) => p.x >= lowerBound && p.x <= upperBound);
  if (inRange.length < 2) return null;
  const maxY = Math.max(...inRange.map((p) => p.y));
  if (!isFinite(maxY) || maxY <= 0) return null;

  const yFor = (density: number) =>
    PITCH.goalBottom - (density / maxY) * PITCH.keeperMaxHeight;

  const d = inRange
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'} ${outcomeToPixelX(p.x, lowerBound, upperBound).toFixed(2)} ${yFor(p.y).toFixed(2)}`,
    )
    .join(' ');

  return (
    <g>
      {/* Soft halo */}
      <path
        d={d}
        stroke="var(--sp-accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.18"
      />
      {/* Crisp line */}
      <path
        d={d}
        stroke="var(--sp-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
}
