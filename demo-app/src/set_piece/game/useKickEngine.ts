import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { MarketState, PointRegion } from '@functionspace/core';

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
 *   PointRegion to the round and reset to ready.
 *
 * The aiming and timing phases are exposed as mutable refs (not state)
 * so the 60fps oscillation never triggers a React re-render. View
 * components subscribe via their own rAF and mutate DOM attributes
 * directly. State changes only on phase transitions.
 */

export type KickState = 'ready' | 'aiming' | 'timing' | 'flying' | 'landed';

export interface Wind {
  dir: number;
  speed: number;
}

const AIM_PERIOD_MS = 1400;
const TIMING_PERIOD_MS = 1100;
// Sweet spot anchored to the top of the oscillation (phase = 1.0) so the
// indicator must reach the apex of the timing arc, NBA 2K shot-meter style.
const SWEET_SPOT_CENTER = 1.0;
const SWEET_SPOT_HALF_WIDTH = 0.1;

const BASE_SPREAD_PCT = 0.04;
const WORST_SPREAD_ADD = 0.18;
const WIND_SPREAD_ADD = 0.08;
const JITTER_PCT = 0.06;

export interface KickEngine {
  state: KickState;
  aimPhaseRef: MutableRefObject<number>;
  timingPhaseRef: MutableRefObject<number>;
  aimX: number | null;
  power: number;
  wind: Wind;
  landingX: number | null;
  sweetSpot: { center: number; halfWidth: number };
  primaryLabel: string;
  startKick: () => void;
  primaryAction: () => void;
  onLanded: () => void;
  commit: () => PointRegion | null;
  reset: () => void;
}

function randomWind(): Wind {
  const dirSign = Math.random() < 0.5 ? -1 : 1;
  const dirMag = 0.3 + Math.random() * 0.7;
  return { dir: dirSign * dirMag, speed: 0.15 + Math.random() * 0.7 };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function useKickEngine(market: MarketState | null): KickEngine {
  const [state, setState] = useState<KickState>('ready');
  const [aimX, setAimX] = useState<number | null>(null);
  const [power, setPower] = useState(1);
  const [wind, setWind] = useState<Wind>({ dir: 0, speed: 0 });
  const [landingX, setLandingX] = useState<number | null>(null);

  const aimPhaseRef = useRef(0);
  const timingPhaseRef = useRef(0);

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
    setWind(randomWind());
    setAimX(null);
    setPower(1);
    setLandingX(null);
    aimPhaseRef.current = 0;
    timingPhaseRef.current = 0;
    setState('aiming');
  }, []);

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
      ? 1 - (dist / SWEET_SPOT_HALF_WIDTH) * 0.15
      : Math.max(0, 0.7 - (dist - SWEET_SPOT_HALF_WIDTH) * 1.6);
    setPower(p);

    const ax = aimX ?? 0.5;
    const jitter = wind.dir * (1 - p) * JITTER_PCT;
    setLandingX(clamp01(ax + jitter));
    setState('flying');
  }, [aimX, wind]);

  const onLanded = useCallback(() => {
    setState('landed');
  }, []);

  const commit = useCallback((): PointRegion | null => {
    if (!market || landingX == null) return null;
    const { lowerBound, upperBound } = market.config;
    const range = upperBound - lowerBound;
    const center = lowerBound + landingX * range;
    const spreadPct =
      BASE_SPREAD_PCT + (1 - power) * WORST_SPREAD_ADD + wind.speed * WIND_SPREAD_ADD;
    const spread = Math.max(range * 0.02, spreadPct * range);
    setState('ready');
    setAimX(null);
    setLandingX(null);
    setPower(1);
    return { type: 'point', center, spread, weight: 1 };
  }, [market, landingX, power, wind]);

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
    wind,
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
