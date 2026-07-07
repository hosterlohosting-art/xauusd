import { useState, useEffect, useRef } from 'react';
import type { CandleData } from '@/types/trading';
import { useEnhancedSignal } from './useEnhancedSignal';
import type { EnhancedSignal } from './useEnhancedSignal';

export interface StableSignal extends EnhancedSignal {
  stableFor: number;
  timesFlipped: number;
  dataStatus: string;
}

// Minimum seconds before signal can change
const MIN_STABLE_SECONDS = 15;
// Number of consecutive opposite readings required to flip
const REQUIRED_FLIP_COUNT = 3;

export const useStableSignal = (candles: CandleData[]): StableSignal | null => {
  const [stableSignal, setStableSignal] = useState<StableSignal | null>(null);
  const rawSignal = useEnhancedSignal(candles);
  
  const historyRef = useRef<{
    lastType: 'BUY' | 'SELL' | 'HOLD' | null;
    lastChangeTime: number;
    pendingType: 'BUY' | 'SELL' | 'HOLD' | null;
    pendingCount: number;
    totalFlips: number;
  }>({
    lastType: null,
    lastChangeTime: Date.now(),
    pendingType: null,
    pendingCount: 0,
    totalFlips: 0,
  });

  useEffect(() => {
    if (!rawSignal) return;

    const now = Date.now();
    const h = historyRef.current;
    const elapsedSinceChange = (now - h.lastChangeTime) / 1000;

    // First signal ever
    if (h.lastType === null) {
      h.lastType = rawSignal.type;
      h.lastChangeTime = now;
      setStableSignal({
        ...rawSignal,
        stableFor: 0,
        timesFlipped: 0,
        dataStatus: `Analyzing ${candles.length} real price candles`,
      });
      return;
    }

    // Signal is the same - keep it stable
    if (rawSignal.type === h.lastType) {
      h.pendingType = null;
      h.pendingCount = 0;
      
      setStableSignal(prev => {
        if (!prev) return null;
        return {
          ...rawSignal,
          type: h.lastType!,
          stableFor: Math.floor(elapsedSinceChange),
          timesFlipped: h.totalFlips,
          dataStatus: `Signal stable ${Math.floor(elapsedSinceChange)}s | ${candles.length} candles`,
        };
      });
      return;
    }

    // Signal wants to change - not stable long enough
    if (elapsedSinceChange < MIN_STABLE_SECONDS) {
      setStableSignal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          confidence: Math.max(prev.confidence - 5, 30),
          stableFor: Math.floor(elapsedSinceChange),
          dataStatus: `Lock ${Math.ceil(MIN_STABLE_SECONDS - elapsedSinceChange)}s | Raw: ${rawSignal.type}`,
        };
      });
      return;
    }

    // Track pending flip
    if (h.pendingType !== rawSignal.type) {
      h.pendingType = rawSignal.type;
      h.pendingCount = 1;
    } else {
      h.pendingCount++;
    }

    // Require multiple consecutive readings before flipping
    if (h.pendingCount < REQUIRED_FLIP_COUNT) {
      setStableSignal(prev => {
        if (!prev) return null;
        return {
          ...prev,
          confidence: Math.max(prev.confidence - 10, 20),
          stableFor: Math.floor(elapsedSinceChange),
          dataStatus: `Confirm ${rawSignal.type} (${h.pendingCount}/${REQUIRED_FLIP_COUNT})`,
        };
      });
      return;
    }

    // ALLOW THE FLIP
    h.totalFlips++;
    h.lastType = rawSignal.type;
    h.lastChangeTime = now;
    h.pendingType = null;
    h.pendingCount = 0;

    setStableSignal({
      ...rawSignal,
      type: rawSignal.type,
      stableFor: 0,
      timesFlipped: h.totalFlips,
      dataStatus: `Changed to ${rawSignal.type} | Flip #${h.totalFlips}`,
    });

  }, [rawSignal, candles.length]);

  return stableSignal;
};
