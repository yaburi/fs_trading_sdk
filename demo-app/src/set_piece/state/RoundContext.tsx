import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PointRegion } from '@functionspace/core';

/**
 * Round state — held above the routes so Stake / Game / Confirm share
 * the same stake amount and accumulated kick regions across navigation.
 *
 * Resets when a new market is started.
 */

const MAX_KICKS = 5;
const DEFAULT_STAKE = 10;

interface RoundState {
  marketId: string | null;
  stake: number;
  kicks: PointRegion[];
}

interface RoundContextValue extends RoundState {
  /** Set the active market and reset round state (clear kicks, set default stake). */
  startRound: (marketId: string, defaultStake?: number) => void;
  setStake: (stake: number) => void;
  addKick: (region: PointRegion) => void;
  resetKicks: () => void;
  clear: () => void;
  /** Convenience: how many more kicks are allowed. */
  kicksRemaining: number;
}

const RoundContext = createContext<RoundContextValue | null>(null);

export function RoundProvider({ children }: { children: ReactNode }) {
  const [marketId, setMarketId] = useState<string | null>(null);
  const [stake, setStakeState] = useState<number>(DEFAULT_STAKE);
  const [kicks, setKicks] = useState<PointRegion[]>([]);

  const startRound = useCallback((id: string, defaultStake: number = DEFAULT_STAKE) => {
    setMarketId((prev) => {
      // Only reset kicks if the market actually changed.
      if (prev !== id) {
        setKicks([]);
        setStakeState(defaultStake);
      }
      return id;
    });
  }, []);

  const setStake = useCallback((next: number) => {
    setStakeState(Math.max(1, Math.round(next * 100) / 100));
  }, []);

  const addKick = useCallback((region: PointRegion) => {
    setKicks((prev) => (prev.length >= MAX_KICKS ? prev : [...prev, region]));
  }, []);

  const resetKicks = useCallback(() => setKicks([]), []);

  const clear = useCallback(() => {
    setMarketId(null);
    setStakeState(DEFAULT_STAKE);
    setKicks([]);
  }, []);

  const value = useMemo<RoundContextValue>(
    () => ({
      marketId,
      stake,
      kicks,
      kicksRemaining: Math.max(0, MAX_KICKS - kicks.length),
      startRound,
      setStake,
      addKick,
      resetKicks,
      clear,
    }),
    [marketId, stake, kicks, startRound, setStake, addKick, resetKicks, clear],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}

export function useRound(): RoundContextValue {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error('useRound must be used within RoundProvider');
  return ctx;
}

export const ROUND_CONSTANTS = {
  MAX_KICKS,
  DEFAULT_STAKE,
} as const;
