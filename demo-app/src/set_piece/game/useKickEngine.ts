import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { MarketState, Region } from '@functionspace/core';

/**
 * Kick state machine.
 *
 *   ready -> aiming -> timing -> flying -> landed -> ready ...
 *
 * - aiming: a phase oscillates 0..1 sinusoidally; user taps "Lock aim"
 *   to capture it as `aimX` (normalized goal position).
 * - timing: a phase oscillates 0..1; user taps "Lock timing". Distance from
 *   the sweet-spot center maps to `power` (1 = perfect, 0 = worst).
 * - flying: ball animates from penalty spot to landing position. Caller
 *   signals `onLanded()` when the animation completes.
 * - landed: kick is captured. Caller can call `commit()` to push a
 *   Region to the round and reset to ready.
 *
 * The aiming and timing phases are exposed as mutable refs (not state)
 * so the 60fps oscillation never triggers a React re-render. View
 * components subscribe via their own rAF and mutate DOM attributes
 * directly. State changes only on phase transitions.
 */

export type KickState = 'ready' | 'aiming' | 'timing' | 'flying' | 'landed';

/**
 * Shot type chosen before the kick. Default 'strike' preserves the
 * original single-point behavior; the others reshape the committed
 * Region without changing the aim/time mechanic.
 *
 *  - strike: narrow PointRegion (default)
 *  - curl:   PointRegion with skew; sign derived from which half of the
 *            goal the user aimed at (left half = negative skew)
 *  - chip:   PointRegion with wider spread
 *  - sweep:  RangeRegion (band) centered on the aim
 */
export type ShotType = 'strike' | 'curl' | 'chip' | 'sweep';

const AIM_PERIOD_MS = 1100;
// Faster oscillation than aim so the meter genuinely punishes a slow tap.
const TIMING_PERIOD_MS = 750;
// Sweet spot anchored to the top of the oscillation (phase = 1.0) so the
// indicator must reach the apex of the timing arc, NBA 2K shot-meter style.
const SWEET_SPOT_CENTER = 1.0;
// Narrower than before -- previous 0.10 was too forgiving and most kicks
// hit perfect. 0.06 still feels reachable but rewards deliberate timing.
const SWEET_SPOT_HALF_WIDTH = 0.06;

// Spread tunables (no wind). Missing the sweet spot now meaningfully widens
// the kick: a fully whiffed kick can spray across ~30% of the range.
const BASE_SPREAD_PCT = 0.04;
const WORST_SPREAD_ADD = 0.28;

// Power falloff. Inside the sweet spot the power dips only slightly with
// distance from center; outside, it falls off fast so a near-miss is
// clearly worse than a perfect tap and a hard miss bottoms out near zero.
const SWEET_INTERIOR_DROP = 0.1;     // perfect = 1.0, edge of sweet zone = 0.9
const OUTSIDE_BASE = 0.6;             // power just outside sweet zone
const OUTSIDE_FALLOFF = 2.4;          // steeper than before (was 1.6)

// Shot-type spread multipliers. Applied on top of the timing-derived
// spread so timing still matters within each shot type.
const SHOT_SPREAD_MULT: Record<ShotType, number> = {
  strike: 1,
  curl: 1,
  chip: 2.2,
  sweep: 1,
};

// Range half-width for sweep, as a fraction of the outcome range.
const SWEEP_HALF_WIDTH_PCT = 0.12;

export interface KickEngine {
  state: KickState;
  aimPhaseRef: MutableRefObject<number>;
  timingPhaseRef: MutableRefObject<number>;
  aimX: number | null;
  power: number;
  landingX: number | null;
  sweetSpot: { center: number; halfWidth: number };
  primaryLabel: string;
  startKick: () => void;
  primaryAction: () => void;
  onLanded: () => void;
  commit: () => Region | null;
  reset: () => void;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function useKickEngine(
  market: MarketState | null,
  shotType: ShotType = 'strike',
): KickEngine {
  const [state, setState] = useState<KickState>('ready');
  const [aimX, setAimX] = useState<number | null>(null);
  const [power, setPower] = useState(1);
  const [landingX, setLandingX] = useState<number | null>(null);

  const aimPhaseRef = useRef(0);
  const timingPhaseRef = useRef(0);
  // Capture the shot type at the moment of kick so changing the selector
  // mid-kick can't desync the committed region.
  const shotTypeRef = useRef<ShotType>(shotType);

  // Drive the oscillating phase via rAF without touching React state. View
  // components reading these refs run their own rAF loop and mutate DOM.
  useEffect(() => {
    if (state !== 'aiming') return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / AIM_PERIOD_MS;
      aimPhaseRef.current = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  useEffect(() => {
    if (state !== 'timing') return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / TIMING_PERIOD_MS;
      timingPhaseRef.current = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const startKick = useCallback(() => {
    setAimX(null);
    setPower(1);
    setLandingX(null);
    aimPhaseRef.current = 0;
    timingPhaseRef.current = 0;
    shotTypeRef.current = shotType;
    setState('aiming');
  }, [shotType]);

  const lockAim = useCallback(() => {
    const x = clamp01(aimPhaseRef.current);
    setAimX(x);
    setState('timing');
  }, []);

  const lockTiming = useCallback(() => {
    const phase = clamp01(timingPhaseRef.current);
    const dist = Math.abs(phase - SWEET_SPOT_CENTER);
    const inSweet = dist <= SWEET_SPOT_HALF_WIDTH;
    const p = inSweet
      ? 1 - (dist / SWEET_SPOT_HALF_WIDTH) * SWEET_INTERIOR_DROP
      : Math.max(0, OUTSIDE_BASE - (dist - SWEET_SPOT_HALF_WIDTH) * OUTSIDE_FALLOFF);
    setPower(p);

    // Landing equals the locked aim -- no jitter now that wind is gone.
    const ax = aimX ?? 0.5;
    setLandingX(clamp01(ax));
    setState('flying');
  }, [aimX]);

  const onLanded = useCallback(() => {
    setState('landed');
  }, []);

  const commit = useCallback((): Region | null => {
    if (!market || landingX == null) return null;
    const { lowerBound, upperBound } = market.config;
    const range = upperBound - lowerBound;
    const center = lowerBound + landingX * range;
    const type = shotTypeRef.current;

    const spreadPct = BASE_SPREAD_PCT + (1 - power) * WORST_SPREAD_ADD;
    const baseSpread = Math.max(range * 0.02, spreadPct * range);
    const spread = baseSpread * SHOT_SPREAD_MULT[type];

    // Reset transient state before returning so callers see a clean
    // engine immediately after commit.
    setState('ready');
    setAimX(null);
    setLandingX(null);
    setPower(1);

    if (type === 'sweep') {
      const halfWidth = range * SWEEP_HALF_WIDTH_PCT;
      const low = Math.max(lowerBound, center - halfWidth);
      const high = Math.min(upperBound, center + halfWidth);
      return { type: 'range', low, high, weight: 1, sharpness: 0.2 };
    }

    if (type === 'curl') {
      // Side derived from which half of the goal the user aimed at.
      // Left half (landingX < 0.5) bends left = negative skew (longer
      // left tail), right half bends right = positive skew.
      const skew = landingX < 0.5 ? -0.6 : 0.6;
      return { type: 'point', center, spread, weight: 1, skew };
    }

    return { type: 'point', center, spread, weight: 1 };
  }, [market, landingX, power]);

  const reset = useCallback(() => {
    setState('ready');
    setAimX(null);
    setLandingX(null);
    setPower(1);
  }, []);

  const primaryLabel: string =
    state === 'ready' ? 'Start kick'
    : state === 'aiming' ? 'Lock aim'
    : state === 'timing' ? 'Lock timing'
    : state === 'flying' ? '…'
    : 'Confirm kick';

  const primaryAction = useCallback(() => {
    if (state === 'ready') startKick();
    else if (state === 'aiming') lockAim();
    else if (state === 'timing') lockTiming();
  }, [state, startKick, lockAim, lockTiming]);

  return {
    state,
    aimPhaseRef,
    timingPhaseRef,
    aimX,
    power,
    landingX,
    sweetSpot: { center: SWEET_SPOT_CENTER, halfWidth: SWEET_SPOT_HALF_WIDTH },
    primaryLabel,
    startKick,
    primaryAction,
    onLanded,
    commit,
    reset,
  };
}
