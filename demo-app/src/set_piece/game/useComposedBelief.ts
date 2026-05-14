import { useMemo } from 'react';
import {
  generateBelief,
  evaluateDensityCurve,
  computeStatistics,
} from '@functionspace/core';
import type {
  MarketState,
  PointRegion,
  BeliefVector,
  ConsensusSummary,
} from '@functionspace/core';

interface ComposedBelief {
  /** Raw belief vector ready to pass to useBuy.execute(). */
  vector: BeliefVector;
  /** Sampled curve {x, y}[] for chart rendering. */
  curve: { points: { x: number; y: number }[] };
  /** Aggregate stats for hints ("your call: ~143 cards"). */
  stats: ConsensusSummary;
}

/**
 * Compose all kicks for the current round into a single belief vector
 * plus a renderable density curve and summary stats.
 *
 * Returns `null` when no market is loaded or no kicks have been taken.
 *
 * Every kick is a PointRegion; `generateBelief` sums them and normalizes
 * to a valid BeliefVector. The vector + the market's numBuckets is exactly
 * what `useBuy.execute()` expects.
 */
export function useComposedBelief(
  market: MarketState | null,
  kicks: PointRegion[],
  numCurvePoints: number = 80,
): ComposedBelief | null {
  return useMemo(() => {
    if (!market || kicks.length === 0) return null;
    const { numBuckets, lowerBound, upperBound } = market.config;
    const vector = generateBelief(kicks, numBuckets, lowerBound, upperBound);
    const points = evaluateDensityCurve(vector, lowerBound, upperBound, numCurvePoints);
    const stats = computeStatistics(vector, lowerBound, upperBound);
    return { vector, curve: { points }, stats };
  }, [market, kicks, numCurvePoints]);
}
