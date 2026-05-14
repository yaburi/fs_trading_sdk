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

interface PitchProps {
  market: MarketState;
  consensus: ConsensusCurve | null;
  /** Coral aim dot rendered on the goal-line. 0..1 normalized. */
  aimDot?: { x: number; locked: boolean } | null;
  /** Previously-landed kicks rendered as small coral markers on the goal-line. */
  kicks?: PointRegion[];
  /** Composed-belief density curve, drawn as a coral line over the goal mouth. */
  belief?: BeliefCurve | null;
  /** When set, the ball animates from the penalty spot to this position. */
  ballTarget?: BallTarget | null;
  /** Called when the flying ball reaches its target. */
  onBallSettled?: () => void;
}

export function Pitch({
  market,
  consensus,
  aimDot,
  kicks = [],
  belief,
  ballTarget,
  onBallSettled,
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
          'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(22, 163, 74, 0.14), rgba(22, 163, 74, 0.02) 70%), linear-gradient(180deg, #FAFBFA 0%, #EEF2EE 100%)',
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
            <stop offset="0%" stopColor="rgba(15, 15, 16, 0.10)" />
            <stop offset="100%" stopColor="rgba(15, 15, 16, 0.30)" />
          </linearGradient>
          <radialGradient id="ballGloss" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="60%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
        </defs>

        {/* Penalty arc */}
        <path
          d={`M ${PITCH.ballX - 60} ${PITCH.ballY - 12} Q ${PITCH.ballX} ${
            PITCH.ballY - 28
          } ${PITCH.ballX + 60} ${PITCH.ballY - 12}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          opacity="0.5"
        />

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
        <g stroke="#FFFFFF" strokeWidth="0.6" opacity="0.55">
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
          stroke="#FFFFFF"
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
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Axis bound labels */}
        <text
          x={PITCH.goalLeft}
          y={PITCH.goalBottom + 16}
          textAnchor="middle"
          fontFamily="var(--sp-font-mono)"
          fontSize="11"
          fontWeight="600"
          fill="#0F0F10"
          opacity="0.55"
        >
          {fmt(lowerBound)}
        </text>
        <text
          x={PITCH.goalRight}
          y={PITCH.goalBottom + 16}
          textAnchor="middle"
          fontFamily="var(--sp-font-mono)"
          fontSize="11"
          fontWeight="600"
          fill="#0F0F10"
          opacity="0.55"
        >
          {fmt(upperBound)}
        </text>

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

        {/* Live aim dot (oscillating or locked) */}
        {aimDot != null && (
          <g transform={`translate(${aimToPixelX(aimDot.x)}, ${PITCH.goalBottom})`}>
            {!aimDot.locked && (
              <circle
                cx="0"
                cy="0"
                r="9"
                fill="var(--sp-accent)"
                opacity="0.18"
              />
            )}
            <circle cx="0" cy="0" r="5" fill="var(--sp-accent)" />
            <circle
              cx="0"
              cy="0"
              r="2"
              fill="#FFFFFF"
            />
          </g>
        )}

        {/* Ball — animated by framer-motion */}
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
            <ellipse cx="0" cy="12" rx="11" ry="2.8" fill="rgba(0, 0, 0, 0.18)" />
            <circle cx="0" cy="0" r="11" fill="#FFFFFF" stroke="#0F0F10" strokeWidth="1.4" />
            <polygon points="0,-5 4.8,-1.5 3,4 -3,4 -4.8,-1.5" fill="#0F0F10" />
            <circle cx="0" cy="0" r="11" fill="url(#ballGloss)" />
          </g>
        </motion.g>
      </svg>
    </div>
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
