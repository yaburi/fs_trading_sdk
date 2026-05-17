import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { MarketState, ConsensusCurve, Region } from '@functionspace/core';
import type { ShotType } from './useKickEngine';

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
  /** Previously-landed kicks rendered as small coral markers on the goal-line.
   *  PointRegion = single dot at center; RangeRegion = bracketed band. */
  kicks?: Region[];
  /** Composed-belief density curve, drawn as a coral line over the goal mouth. */
  belief?: BeliefCurve | null;
  /** When set, the ball animates from the penalty spot to this position. */
  ballTarget?: BallTarget | null;
  /** Called when the flying ball reaches its target. */
  onBallSettled?: () => void;
  /** When set, the curved shot-meter overlay is rendered on the right side. */
  timing?: TimingDescriptor | null;
  /** Reshapes the ball's flight curve per shot. Default `strike`. */
  shotType?: ShotType;
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
  shotType = 'strike',
}: PitchProps) {
  const { lowerBound, upperBound } = market.config;
  const decimals = market.decimals ?? 0;
  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <div
      className="sp-pitch-canvas"
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 'var(--sp-radius-md)',
        overflow: 'hidden',
        // Layered: distant sky → stand → grass. Mimics what you'd see
        // from a low camera behind the penalty spot.
        background: [
          'radial-gradient(ellipse 90% 60% at 50% 14%, rgba(255, 240, 200, 0.18), transparent 60%)',
          'linear-gradient(180deg, #1B2541 0%, #2A3960 22%, #6B8E5F 38%, #6FA265 60%, #7DB672 100%)',
        ].join(', '),
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        // xMidYMax anchors the pitch to the bottom of the container, so when
        // the canvas is taller than 4:3 (desktop) the extra room appears as
        // sky above the goal frame -- not blank space below the ball.
        preserveAspectRatio="xMidYMax meet"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id="keeperGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--sp-keeper-light)" />
            <stop offset="100%" stopColor="var(--sp-keeper-dark)" />
          </linearGradient>

          {/* Ball is a real 3D-ish sphere with a hard top-left highlight and
           *  occlusion shadow on the bottom-right. */}
          <radialGradient id="ballSphere" cx="35%" cy="30%" r="62%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F4F4F0" />
            <stop offset="100%" stopColor="#B7B7B0" />
          </radialGradient>
          <radialGradient id="ballGloss" cx="32%" cy="22%" r="35%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Goal posts get a vertical gradient so the round face catches
           *  light at the top-left and falls into shadow on the back. */}
          <linearGradient id="postFace" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F1F1F0" />
            <stop offset="100%" stopColor="#B7B7B6" />
          </linearGradient>
          <linearGradient id="crossbarFace" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F1F1F0" />
            <stop offset="100%" stopColor="#B7B7B6" />
          </linearGradient>

          {/* Grass with a hint of mowed stripes. Subtle alternating bands of
           *  brightness paint a "diagonal stripe" pattern across the field. */}
          <pattern id="grassStripes" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <rect width="32" height="32" fill="transparent" />
            <rect x="0" y="0" width="16" height="32" fill="rgba(255,255,255,0.025)" />
          </pattern>

          {/* Net: a tight diamond mesh applied as a fill pattern over the
           *  goal interior. White with very low opacity so the keeper /
           *  heat zones still read through. */}
          <pattern id="goalNet" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <path
              d="M 0 4.5 L 4.5 0 L 9 4.5 L 4.5 9 Z"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="0.55"
              strokeLinejoin="round"
            />
            <circle cx="4.5" cy="4.5" r="0.5" fill="rgba(255,255,255,0.25)" />
          </pattern>

          {/* Crowd silhouette: tightly packed dots up top. We render this
           *  as a stippled mask so the band reads as "people" instead of a
           *  flat color block. */}
          <pattern id="crowdDots" x="0" y="0" width="4" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1.5" r="0.65" fill="rgba(0,0,0,0.42)" />
            <circle cx="3" cy="1.5" r="0.55" fill="rgba(0,0,0,0.32)" />
          </pattern>

          {/* Stadium-light bloom directly above the goal. Two soft suns
           *  flare from the rim of the lower-bowl. */}
          <radialGradient id="floodlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 248, 220, 0.55)" />
            <stop offset="60%" stopColor="rgba(255, 248, 220, 0.1)" />
            <stop offset="100%" stopColor="rgba(255, 248, 220, 0)" />
          </radialGradient>

          {/* Soft drop shadow for the ball and goal posts. */}
          <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
        </defs>

        {/* === STADIUM BACKDROP ============================================ */}
        {/* Lower stand strip — slightly darker than sky, with a crowd
         *  stipple over the top half so the band reads as occupants. */}
        <rect x="0" y="0" width={VIEW_W} height="40" fill="rgba(20, 28, 56, 0.55)" />
        <rect x="0" y="6" width={VIEW_W} height="22" fill="url(#crowdDots)" />
        {/* Two floodlight bloom suns flank the stadium roof. */}
        <ellipse cx="90" cy="22" rx="80" ry="28" fill="url(#floodlight)" />
        <ellipse cx="310" cy="22" rx="80" ry="28" fill="url(#floodlight)" />
        {/* Horizon line where the stand meets the grass. */}
        <rect x="0" y="38" width={VIEW_W} height="3" fill="rgba(0,0,0,0.18)" />

        {/* === PITCH MARKINGS ============================================== */}
        {/* Diagonal stripes overlaid on the grass for that mowed feel. */}
        <rect x="0" y="38" width={VIEW_W} height={VIEW_H - 38} fill="url(#grassStripes)" />
        {/* Six-yard box (small inner rectangle around the goal). */}
        <rect
          x={PITCH.goalLeft - 28}
          y={PITCH.goalBottom}
          width={GOAL_WIDTH + 56}
          height="32"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.6"
        />
        {/* Penalty box (larger rectangle). */}
        <rect
          x={PITCH.goalLeft - 80}
          y={PITCH.goalBottom}
          width={GOAL_WIDTH + 160}
          height="78"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.4"
        />
        {/* Penalty arc — the "D" at the front of the box. */}
        <path
          d={`M ${PITCH.ballX - 28} ${PITCH.ballY - 5} Q ${PITCH.ballX} ${PITCH.ballY - 22} ${PITCH.ballX + 28} ${PITCH.ballY - 5}`}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.4"
        />
        {/* Penalty spot — small painted disc the ball sits on. */}
        <circle cx={PITCH.ballX} cy={PITCH.ballY + 4} r="2.2" fill="rgba(255,255,255,0.85)" />

        {/* === GOAL FRAME ================================================== */}
        {/* Three planes per upright + crossbar:
         *   - back shadow rectangle (a touch darker / offset right)
         *   - face gradient (catches the light)
         *   - bottom-cap circle (sits on the ground; sells "tube" not "stick") */}
        {/* Crossbar shadow under the bar onto the net. */}
        <rect
          x={PITCH.goalLeft - 4}
          y={PITCH.goalTop + 5}
          width={GOAL_WIDTH + 8}
          height="3"
          fill="rgba(0,0,0,0.18)"
          filter="url(#softShadow)"
        />

        {/* Net fill (paint inside the goal mouth before the keeper / heat). */}
        <rect
          x={PITCH.goalLeft + 1}
          y={PITCH.goalTop + 1}
          width={GOAL_WIDTH - 2}
          height={PITCH.goalBottom - PITCH.goalTop - 2}
          fill="url(#goalNet)"
        />

        {/* Payout heat zones paint the goal interior with the heat ramp so
         * the big-payout regions are visible behind the keeper. Rendered first
         * so the keeper silhouette overlays it. */}
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

        {/* === GOAL FRAME (continued) — drawn over the net + heat so the
         *   posts look like they wrap in front of the mesh. */}
        {/* Left upright */}
        <rect x={PITCH.goalLeft - 3} y={PITCH.goalTop - 1} width="5" height={PITCH.goalBottom - PITCH.goalTop + 2} fill="url(#postFace)" />
        <rect x={PITCH.goalLeft + 1.5} y={PITCH.goalTop - 1} width="1" height={PITCH.goalBottom - PITCH.goalTop + 2} fill="rgba(0,0,0,0.22)" />
        {/* Right upright */}
        <rect x={PITCH.goalRight - 2} y={PITCH.goalTop - 1} width="5" height={PITCH.goalBottom - PITCH.goalTop + 2} fill="url(#postFace)" />
        <rect x={PITCH.goalRight + 1.5} y={PITCH.goalTop - 1} width="1" height={PITCH.goalBottom - PITCH.goalTop + 2} fill="rgba(0,0,0,0.22)" />
        {/* Crossbar */}
        <rect x={PITCH.goalLeft - 4} y={PITCH.goalTop - 3} width={GOAL_WIDTH + 8} height="5" fill="url(#crossbarFace)" />
        <rect x={PITCH.goalLeft - 4} y={PITCH.goalTop + 1.5} width={GOAL_WIDTH + 8} height="1" fill="rgba(0,0,0,0.18)" />
        {/* Base caps at the bottom of each post for grounded weight. */}
        <ellipse cx={PITCH.goalLeft - 0.5} cy={PITCH.goalBottom + 1} rx="4.5" ry="2" fill="rgba(0,0,0,0.25)" />
        <ellipse cx={PITCH.goalRight + 0.5} cy={PITCH.goalBottom + 1} rx="4.5" ry="2" fill="rgba(0,0,0,0.25)" />

        {/* Goal-line / outcome axis */}
        <line
          x1={PITCH.goalLeft - 8}
          y1={PITCH.goalBottom}
          x2={PITCH.goalRight + 8}
          y2={PITCH.goalBottom}
          stroke="rgba(255,255,255,0.95)"
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
          fontWeight="700"
          fill="#FFFFFF"
          opacity="0.95"
          style={{ paintOrder: 'stroke' }}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="2"
        >
          {fmt(lowerBound)}
        </text>
        <text
          x={PITCH.goalRight}
          y={PITCH.goalBottom + 22}
          textAnchor="middle"
          fontFamily="var(--sp-font-mono)"
          fontSize="11"
          fontWeight="700"
          fill="#FFFFFF"
          opacity="0.95"
          style={{ paintOrder: 'stroke' }}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="2"
        >
          {fmt(upperBound)}
        </text>

        {/* Payout legend — explicitly tells the user that the thin (green)
         *  zones pay more than the crowded (red) zones. Hidden during
         *  timing so the arc above the ball reads cleanly. */}
        {consensus && consensus.points.length > 1 && !timing ? (
          <text
            x={(PITCH.goalLeft + PITCH.goalRight) / 2}
            y={PITCH.goalBottom + 38}
            textAnchor="middle"
            fontFamily="var(--sp-font-body)"
            fontSize="9"
            fontWeight="700"
            letterSpacing="0.06em"
            style={{ paintOrder: 'stroke' }}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="2.2"
          >
            <tspan fill="#FF8B7A">RED</tspan>
            <tspan fill="#FFFFFF" fontWeight="600">{' = WHERE THE CROWD IS · '}</tspan>
            <tspan fill="#86F0B0">GREEN</tspan>
            <tspan fill="#FFFFFF" fontWeight="600">{' = BIGGER PAYOUT'}</tspan>
          </text>
        ) : null}

        {/* Composed belief curve (your prediction) — sits above keeper, under frame */}
        {belief && belief.points.length > 1 ? (
          <BeliefPath
            points={belief.points}
            lowerBound={lowerBound}
            upperBound={upperBound}
          />
        ) : null}

        {/* Past kick markers (from prior kicks this round). */}
        <KickMarkers
          kicks={kicks}
          lowerBound={lowerBound}
          upperBound={upperBound}
          formatOutcome={fmt}
          units={market.xAxisUnits || ''}
        />

        {/* Aim dot: live oscillator OR static locked position. */}
        {aim?.kind === 'live' && <AimDotLive phaseRef={aim.phaseRef} />}
        {aim?.kind === 'locked' && (
          <g transform={`translate(${aimToPixelX(aim.x)}, ${PITCH.goalBottom})`}>
            <circle cx="0" cy="0" r="5" fill="var(--sp-accent)" />
            <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
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

        {/* Ball + flight. When ballTarget is set, kicks off the cinematic
         *  per-shot-type animation. When null, the ball idles on the
         *  penalty spot. */}
        <BallFlight
          target={ballTarget ?? null}
          shotType={shotType}
          onSettled={onBallSettled}
        />
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
        opacity="0.65"
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
      <circle cx="0" cy="0" r="10" fill="var(--sp-accent)" opacity="0.45" />
      <circle cx="0" cy="0" r="6.5" fill="var(--sp-accent)" />
      <circle cx="0" cy="0" r="2.4" fill="#FFFFFF" />
    </g>
  );
}

/**
 * Cinematic ball flight. Replaces framer-motion's spring on the ball group
 * with a per-frame parametric path computation that lets us:
 *
 *   - vary the curve shape per shot type (strike = laser; curl = bend; chip
 *     = high arc; sweep = floaty roll)
 *   - vary the duration & easing per shot type
 *   - drive the ball's rotation, the shadow scale, and the trail in lockstep
 *     with the same `t` value, so everything stays physically coherent
 *
 * The ball lives in two coordinate systems: the parametric path is computed
 * relative to its rest position at the penalty spot, then translated into
 * viewBox coords by the group transform.
 */
interface BallFlightProps {
  target: BallTarget | null;
  shotType: ShotType;
  onSettled?: () => void;
}

interface ShotProfile {
  durationMs: number;
  /** Easing curve mapping t ∈ [0, 1] → eased ∈ [0, 1]. */
  ease: (t: number) => number;
  /** Lateral curve shape: how much the ball "bends" sideways during flight,
   *  in viewBox pixels. + or - swings the curve to one side. The argument is
   *  the signed horizontal travel (negative = aimed left of start). */
  bend: (signedHorizontal: number) => number;
  /** Apex height of the parabolic arc in viewBox pixels above the straight-
   *  line path. Higher = chip-shot feel, lower = laser. */
  arcHeight: number;
  /** Ball rotations during the flight. */
  spinRevolutions: number;
  /** Trail style for this shot. */
  trail: 'tight' | 'curl' | 'lofted' | 'sweep';
}

// Tuned per-shot personality. Strike is short + flat + fast; chip is the
// hang-time shot; curl bends hard and lands a touch later; sweep floats wide
// and lazy. Durations are intentionally long (1.1-1.7s) for the cinematic feel.
const SHOT_PROFILES: Record<ShotType, ShotProfile> = {
  strike: {
    durationMs: 1150,
    // Strong ease-out: ball leaves the boot quickly and decelerates into net.
    ease: (t) => 1 - Math.pow(1 - t, 2.2),
    bend: () => 0,
    arcHeight: 14,
    spinRevolutions: 5,
    trail: 'tight',
  },
  curl: {
    durationMs: 1500,
    // ease-in-out so the curl reads as a tracked arc — slow setup, peak
    // bend mid-flight, snap into target.
    ease: (t) => 0.5 - Math.cos(t * Math.PI) / 2,
    // Bend is perpendicular to flight, sized to the travel. Sign comes from
    // travel direction so a left-bound shot curls back rightward (and v/v).
    bend: (sx) => (sx >= 0 ? 1 : -1) * 26,
    arcHeight: 22,
    spinRevolutions: 4,
    trail: 'curl',
  },
  chip: {
    durationMs: 1650,
    // Linear-ish on the way up, slower coming down — gives the hang-time
    // perception even though apex is geometric.
    ease: (t) => t * t * (3 - 2 * t),
    bend: () => 0,
    arcHeight: 48,
    spinRevolutions: 2.5,
    trail: 'lofted',
  },
  sweep: {
    durationMs: 1700,
    // Slow and floaty: gentle ease-in-out matched with low arc and high spin
    // so the ball looks like it's drifting on a long pass.
    ease: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    bend: (sx) => (sx >= 0 ? 1 : -1) * 14,
    arcHeight: 18,
    spinRevolutions: 6,
    trail: 'sweep',
  },
};

function BallFlight({ target, shotType, onSettled }: BallFlightProps) {
  const groupRef = useRef<SVGGElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const trailGhostsRef = useRef<SVGGElement>(null);
  const settledOnceRef = useRef(false);

  // Game.tsx rebuilds the `target` object on flying→landed even though the
  // x value doesn't change — depending on it directly retriggered the
  // animation. Key the effect on the numeric x instead.
  const targetX = target?.x ?? null;

  // Reset the ball to its rest position whenever the target goes back to null
  // (i.e. between kicks). Without this, the group stays parked at the last
  // landing position because we drive it imperatively below.
  useEffect(() => {
    if (targetX != null) return;
    settledOnceRef.current = false;
    const g = groupRef.current;
    const ball = ballRef.current;
    const shadow = shadowRef.current;
    const trail = trailRef.current;
    const ghosts = trailGhostsRef.current;
    if (g) g.setAttribute('transform', `translate(${PITCH.ballX}, ${PITCH.ballY})`);
    if (ball) ball.setAttribute('transform', 'rotate(0)');
    if (shadow) {
      shadow.setAttribute('rx', '11');
      shadow.setAttribute('ry', '2.8');
      shadow.setAttribute('opacity', '0.55');
    }
    if (trail) {
      trail.setAttribute('d', '');
      trail.setAttribute('opacity', '0');
    }
    if (ghosts) ghosts.innerHTML = '';
  }, [targetX]);

  // Flight animation: when target appears, animate via parametric path until
  // we hit t = 1, then call onSettled exactly once.
  useEffect(() => {
    if (targetX == null) return;
    settledOnceRef.current = false;

    const profile = SHOT_PROFILES[shotType];
    const startX = PITCH.ballX;
    const startY = PITCH.ballY;
    const endX = aimToPixelX(targetX);
    const endY = PITCH.goalBottom;
    const sx = endX - startX;
    const sy = endY - startY;
    const bendMag = profile.bend(sx);

    // Direction-perpendicular unit vector for sideways curve offsets. The
    // dominant axis here is vertical (up the screen), so we use the screen-x
    // axis as the bend direction; this matches the player POV looking at the
    // goal from behind the ball.
    const bendDirX = 1; // simple horizontal bend; positive = right
    const bendDirY = 0;

    // For the visible trail, sample 24 points along the same parametric
    // function we use to drive the ball. Render that polyline as a smooth
    // dashed coral line that fades as the ball moves.
    const trail = trailRef.current;
    const ghosts = trailGhostsRef.current;
    if (ghosts) ghosts.innerHTML = '';
    if (trail) {
      const samples = 28;
      let d = '';
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const eased = profile.ease(t);
        const p = pathAt(eased, startX, startY, sx, sy, bendMag, bendDirX, bendDirY, profile.arcHeight);
        d += `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
      }
      trail.setAttribute('d', d);
      trail.setAttribute('opacity', '0.6');
    }

    let raf = 0;
    const begin = performance.now();
    const tick = (now: number) => {
      const elapsed = now - begin;
      const t = Math.min(1, elapsed / profile.durationMs);
      const eased = profile.ease(t);
      const p = pathAt(eased, startX, startY, sx, sy, bendMag, bendDirX, bendDirY, profile.arcHeight);

      const g = groupRef.current;
      if (g) g.setAttribute('transform', `translate(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);

      // Spin the ball based on horizontal travel + a base spin rate. Per shot
      // the spin amount varies so each shot reads with its own personality.
      const ball = ballRef.current;
      if (ball) {
        const angle = profile.spinRevolutions * 360 * eased;
        ball.setAttribute('transform', `rotate(${angle.toFixed(1)})`);
      }

      // Shadow tracks the projected ground point (i.e. where the ball *would*
      // be if gravity took it straight down). Its scale shrinks with apex
      // height to imply altitude. The shadow opacity fades for chip shots
      // (longer hang time, less ground contact).
      const shadow = shadowRef.current;
      if (shadow) {
        const heightAboveGround = startY + sy * eased - p.y;
        const altitude = Math.max(0, heightAboveGround);
        const scale = Math.max(0.35, 1 - altitude / 100);
        shadow.setAttribute('rx', (11 * scale).toFixed(2));
        shadow.setAttribute('ry', (2.8 * scale).toFixed(2));
        shadow.setAttribute('opacity', (0.55 * scale).toFixed(2));
      }

      // Drop a fading ghost ball behind the live ball every few frames, for
      // sweep/chip especially. Capped to a small pool so we don't pile up DOM.
      if (ghosts && (profile.trail === 'sweep' || profile.trail === 'lofted')) {
        const lastT = parseFloat(ghosts.dataset.lastT ?? '0');
        if (eased - lastT >= 0.08) {
          ghosts.dataset.lastT = String(eased);
          const ghost = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ghost.setAttribute('cx', p.x.toFixed(2));
          ghost.setAttribute('cy', p.y.toFixed(2));
          ghost.setAttribute('r', '4');
          ghost.setAttribute('fill', '#FFFFFF');
          ghost.setAttribute('opacity', '0.4');
          ghost.style.transition = 'opacity 600ms ease-out, r 600ms ease-out';
          ghosts.appendChild(ghost);
          requestAnimationFrame(() => {
            ghost.setAttribute('opacity', '0');
            ghost.setAttribute('r', '1.5');
          });
          // Reap after the transition ends so we don't leak nodes.
          setTimeout(() => ghost.remove(), 700);
        }
      }

      // Fade the static trail as the ball nears the goal so it doesn't
      // linger on top of the kick marker after landing.
      if (trail) {
        const opacity = (1 - eased) * 0.55 + 0.1 * (1 - eased);
        trail.setAttribute('opacity', opacity.toFixed(2));
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!settledOnceRef.current) {
        settledOnceRef.current = true;
        if (trail) trail.setAttribute('opacity', '0');
        onSettled?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetX, shotType, onSettled]);

  return (
    <g>
      {/* Static trail line drawn behind the ball during flight. */}
      <path
        ref={trailRef}
        fill="none"
        stroke="var(--sp-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 5"
        opacity="0"
      />
      {/* Ghost-ball pool for sweep/chip motion. */}
      <g ref={trailGhostsRef} />

      {/* The live ball. */}
      <g ref={groupRef} transform={`translate(${PITCH.ballX}, ${PITCH.ballY})`}>
        <ellipse
          ref={shadowRef}
          cx="0"
          cy="14"
          rx="11"
          ry="2.8"
          fill="rgba(0, 0, 0, 0.55)"
          opacity="0.55"
        />
        <g ref={ballRef}>
          <circle cx="0" cy="0" r="11" fill="url(#ballSphere)" stroke="#161616" strokeWidth="0.8" />
          {/* Iconic black pentagons rotated with the ball. */}
          <polygon points="0,-5 4.8,-1.5 3,4 -3,4 -4.8,-1.5" fill="#161616" />
          <polygon points="-9,-1.5 -6.2,0.5 -7.4,3.4" fill="#161616" opacity="0.85" />
          <polygon points="9,-1.5 6.2,0.5 7.4,3.4" fill="#161616" opacity="0.85" />
          {/* Top-left specular highlight. */}
          <circle cx="0" cy="0" r="11" fill="url(#ballGloss)" />
        </g>
      </g>
    </g>
  );
}

/** Parametric position at eased-t along the flight path. Encodes the parabolic
 *  arc (lifted off the straight line) plus a perpendicular bend (curl). */
function pathAt(
  t: number,
  sx0: number,
  sy0: number,
  dx: number,
  dy: number,
  bendMag: number,
  bendDirX: number,
  bendDirY: number,
  arcHeight: number,
): { x: number; y: number } {
  // Straight-line interpolant.
  const lx = sx0 + dx * t;
  const ly = sy0 + dy * t;
  // Sin-based arc lift (peaks at t = 0.5). Pulled negative because y grows
  // downward in SVG.
  const arc = Math.sin(t * Math.PI) * arcHeight;
  // Bend perpendicular to straight-line direction, peaks at t = 0.5.
  const bend = Math.sin(t * Math.PI) * bendMag;
  return {
    x: lx + bend * bendDirX,
    y: ly - arc + bend * bendDirY,
  };
}

/**
 * Curved vertical shot-meter, inspired by the NBA 2K release meter. A
 * quadratic bezier curves up the right edge of the pitch; the indicator
 * slides along the curve as the phase oscillates 0..1, and the green
 * sweet zone sits at the very top so the perfect release is the apex.
 */
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

  const trackD = `M ${ARC.p0.x} ${ARC.p0.y} Q ${ARC.p1.x} ${ARC.p1.y} ${ARC.p2.x} ${ARC.p2.y}`;

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
      <path d={trackD} stroke="rgba(0, 0, 0, 0.3)" strokeWidth="7" strokeLinecap="round" fill="none" transform="translate(0.6, 1.4)" />
      <path d={trackD} stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d={trackD} stroke="var(--sp-text)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.14" />
      <path d={sweetD} stroke="#22C55E" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.3" />
      <path d={sweetD} stroke="#22C55E" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.95" />
      <circle cx={ARC.p2.x} cy={ARC.p2.y} r="1.8" fill="#FFFFFF" opacity="0.9" />

      <g ref={indicatorRef} transform={`translate(${initial.x.toFixed(2)}, ${initial.y.toFixed(2)})`}>
        <circle cx="0" cy="0" r="5.5" fill="var(--sp-text)" opacity="0.22" />
        <circle
          cx="0"
          cy="0"
          r="3.4"
          fill={locked ? 'var(--sp-accent)' : 'var(--sp-text)'}
          style={{ transition: 'fill 0.18s var(--sp-ease)' }}
        />
        <circle cx="0" cy="0" r="1.4" fill="#FFFFFF" />
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

const HEAT_COLD: [number, number, number] = [0xef, 0x44, 0x44];
const HEAT_WARM: [number, number, number] = [0xf9, 0x73, 0x16];
const HEAT_HOT: [number, number, number] = [0x22, 0xc5, 0x5e];

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
      <path
        d={d}
        stroke="var(--sp-accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.18"
      />
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

interface KickMarkersProps {
  kicks: Region[];
  lowerBound: number;
  upperBound: number;
  formatOutcome: (n: number) => string;
  units: string;
}

function KickMarkers({
  kicks,
  lowerBound,
  upperBound,
  formatOutcome,
  units,
}: KickMarkersProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <g>
      {kicks.map((k, i) => {
        const isHover = hoverIdx === i;
        if (k.type === 'range') {
          const xLo = outcomeToPixelX(k.low, lowerBound, upperBound);
          const xHi = outcomeToPixelX(k.high, lowerBound, upperBound);
          const xMid = (xLo + xHi) / 2;
          const tooltip = units
            ? `${formatOutcome(k.low)}–${formatOutcome(k.high)} ${units}`
            : `${formatOutcome(k.low)}–${formatOutcome(k.high)}`;
          return (
            <g key={i}>
              <line
                x1={xLo}
                y1={PITCH.goalBottom}
                x2={xHi}
                y2={PITCH.goalBottom}
                stroke="var(--sp-accent)"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.55"
              />
              <line
                x1={xLo}
                y1={PITCH.goalBottom - 4}
                x2={xLo}
                y2={PITCH.goalBottom + 4}
                stroke="var(--sp-accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1={xHi}
                y1={PITCH.goalBottom - 4}
                x2={xHi}
                y2={PITCH.goalBottom + 4}
                stroke="var(--sp-accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x={xLo - 6}
                y={PITCH.goalBottom - 10}
                width={xHi - xLo + 12}
                height="20"
                fill="transparent"
                style={{ cursor: 'help' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
              {isHover && (
                <KickTooltip x={xMid} y={PITCH.goalBottom - 14} label={tooltip} />
              )}
            </g>
          );
        }

        if (k.type !== 'point') return null;

        const px = outcomeToPixelX(k.center, lowerBound, upperBound);
        const tooltip = units
          ? `${formatOutcome(k.center)} ${units}`
          : formatOutcome(k.center);
        return (
          <g key={i} transform={`translate(${px}, ${PITCH.goalBottom})`}>
            <circle cx="0" cy="0" r="4" fill="var(--sp-accent)" opacity="0.65" />
            <circle cx="0" cy="0" r="2" fill="var(--sp-accent)" />
            <circle
              cx="0"
              cy="0"
              r="10"
              fill="transparent"
              style={{ cursor: 'help' }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
            {isHover && <KickTooltip x={0} y={-14} label={tooltip} />}
          </g>
        );
      })}
    </g>
  );
}

function KickTooltip({ x, y, label }: { x: number; y: number; label: string }) {
  const padX = 6;
  const padY = 4;
  const w = Math.max(40, label.length * 6.2 + padX * 2);
  const h = 18;
  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx="5"
        fill="var(--sp-text)"
        opacity="0.92"
      />
      <polygon
        points={`-4,${-2} 4,${-2} 0,${4}`}
        fill="var(--sp-text)"
        opacity="0.92"
      />
      <text
        x="0"
        y={-h / 2 + 3}
        textAnchor="middle"
        fontFamily="var(--sp-font-mono)"
        fontSize="10"
        fontWeight="600"
        fill="var(--sp-surface)"
      >
        {label}
      </text>
    </g>
  );
}

