import { useMemo } from 'react';
import type { CandleData } from '@/types/trading';

export interface PatternResult {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
  candles: number;
}

// Candlestick body and wick calculations
const getBody = (c: CandleData) => Math.abs(c.close - c.open);
const getUpperWick = (c: CandleData) => c.high - Math.max(c.open, c.close);
const getLowerWick = (c: CandleData) => Math.min(c.open, c.close) - c.low;
const getTotalRange = (c: CandleData) => c.high - c.low;
const isBullish = (c: CandleData) => c.close > c.open;
const isBearish = (c: CandleData) => c.close < c.open;

// Scan backward through candles to find most recent pattern
function scanBackward(
  candles: CandleData[], 
  check: (c: CandleData) => PatternResult | null
): PatternResult | null {
  for (let i = candles.length - 1; i >= 0; i--) {
    const result = check(candles[i]);
    if (result) return result;
  }
  return null;
}

function detectHammer(candles: CandleData[]): PatternResult | null {
  return scanBackward(candles, (c) => {
    const body = getBody(c);
    const lowerWick = getLowerWick(c);
    const upperWick = getUpperWick(c);
    const range = getTotalRange(c);
    if (range === 0) return null;
    const lowerWickRatio = lowerWick / range;
    const bodyRatio = body / range;
    const upperWickRatio = upperWick / range;
    if (lowerWickRatio > 0.5 && bodyRatio < 0.4 && upperWickRatio < 0.15) {
      return {
        name: 'Hammer',
        type: 'bullish',
        confidence: Math.round(lowerWickRatio * 100),
        description: 'Long lower wick with small body - bullish reversal at support',
        strength: lowerWickRatio > 0.65 ? 'strong' : 'moderate',
        candles: 1
      };
    }
    return null;
  });
}

function detectShootingStar(candles: CandleData[]): PatternResult | null {
  return scanBackward(candles, (c) => {
    const body = getBody(c);
    const upperWick = getUpperWick(c);
    const lowerWick = getLowerWick(c);
    const range = getTotalRange(c);
    if (range === 0) return null;
    const upperWickRatio = upperWick / range;
    const bodyRatio = body / range;
    if (upperWickRatio > 0.5 && bodyRatio < 0.4 && lowerWick < body) {
      return {
        name: 'Shooting Star',
        type: 'bearish',
        confidence: Math.round(upperWickRatio * 100),
        description: 'Long upper wick with small body - bearish reversal at resistance',
        strength: upperWickRatio > 0.65 ? 'strong' : 'moderate',
        candles: 1
      };
    }
    return null;
  });
}

function detectDoji(candles: CandleData[]): PatternResult | null {
  return scanBackward(candles, (c) => {
    const body = getBody(c);
    const range = getTotalRange(c);
    if (range === 0) return null;
    const bodyRatio = body / range;
    if (bodyRatio < 0.15) {
      return {
        name: 'Doji',
        type: 'neutral',
        confidence: Math.round((1 - bodyRatio * 5) * 100),
        description: 'Indecision in the market - potential reversal or continuation',
        strength: bodyRatio < 0.05 ? 'strong' : 'moderate',
        candles: 1
      };
    }
    return null;
  });
}

function detectEngulfing(candles: CandleData[]): PatternResult | null {
  if (candles.length < 2) return null;
  // Scan backward for most recent engulfing
  for (let i = candles.length - 1; i >= 1; i--) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const prevBody = getBody(prev);
    const currBody = getBody(curr);
    
    if (isBearish(prev) && isBullish(curr) && 
        curr.close > prev.open && curr.open < prev.close &&
        currBody > prevBody * 1.0) {
      return {
        name: 'Bullish Engulfing',
        type: 'bullish',
        confidence: Math.round(Math.min(95, 50 + (currBody / prevBody) * 25)),
        description: 'Current bullish candle completely engulfs previous bearish candle',
        strength: currBody > prevBody * 1.5 ? 'strong' : 'moderate',
        candles: 2
      };
    }
    if (isBullish(prev) && isBearish(curr) && 
        curr.close < prev.open && curr.open > prev.close &&
        currBody > prevBody * 1.0) {
      return {
        name: 'Bearish Engulfing',
        type: 'bearish',
        confidence: Math.round(Math.min(95, 50 + (currBody / prevBody) * 25)),
        description: 'Current bearish candle completely engulfs previous bullish candle',
        strength: currBody > prevBody * 1.5 ? 'strong' : 'moderate',
        candles: 2
      };
    }
  }
  return null;
}

function detectMorningStar(candles: CandleData[]): PatternResult | null {
  if (candles.length < 3) return null;
  for (let i = candles.length - 1; i >= 2; i--) {
    const c1 = candles[i - 2], c2 = candles[i - 1], c3 = candles[i];
    const c1Body = getBody(c1), c2Body = getBody(c2), c3Body = getBody(c3);
    if (isBearish(c1) && c1Body > getTotalRange(c1) * 0.5 &&
        c2Body < getTotalRange(c2) * 0.3 &&
        isBullish(c3) && c3Body > c1Body * 0.8 &&
        c3.close > (c1.open + c1.close) / 2) {
      return {
        name: 'Morning Star',
        type: 'bullish',
        confidence: 85,
        description: 'Three-candle bullish reversal pattern - strong buy signal',
        strength: 'strong',
        candles: 3
      };
    }
  }
  return null;
}

function detectEveningStar(candles: CandleData[]): PatternResult | null {
  if (candles.length < 3) return null;
  for (let i = candles.length - 1; i >= 2; i--) {
    const c1 = candles[i - 2], c2 = candles[i - 1], c3 = candles[i];
    const c1Body = getBody(c1), c2Body = getBody(c2), c3Body = getBody(c3);
    if (isBullish(c1) && c1Body > getTotalRange(c1) * 0.5 &&
        c2Body < getTotalRange(c2) * 0.3 &&
        isBearish(c3) && c3Body > c1Body * 0.8 &&
        c3.close < (c1.open + c1.close) / 2) {
      return {
        name: 'Evening Star',
        type: 'bearish',
        confidence: 85,
        description: 'Three-candle bearish reversal pattern - strong sell signal',
        strength: 'strong',
        candles: 3
      };
    }
  }
  return null;
}

function detectHarami(candles: CandleData[]): PatternResult | null {
  if (candles.length < 2) return null;
  for (let i = candles.length - 1; i >= 1; i--) {
    const prev = candles[i - 1], curr = candles[i];
    const prevBody = getBody(prev), currBody = getBody(curr), prevRange = getTotalRange(prev);
    if (prevBody > prevRange * 0.3 && currBody < prevBody * 0.6 &&
        curr.high < Math.max(prev.open, prev.close) &&
        curr.low > Math.min(prev.open, prev.close)) {
      return {
        name: isBullish(prev) ? 'Bearish Harami' : 'Bullish Harami',
        type: isBullish(prev) ? 'bearish' : 'bullish',
        confidence: 70,
        description: 'Small candle inside previous large candle - potential reversal',
        strength: 'moderate',
        candles: 2
      };
    }
  }
  return null;
}

function detectThreeWhiteSoldiers(candles: CandleData[]): PatternResult | null {
  if (candles.length < 3) return null;
  for (let i = candles.length - 1; i >= 2; i--) {
    const c1 = candles[i - 2], c2 = candles[i - 1], c3 = candles[i];
    if (isBullish(c1) && isBullish(c2) && isBullish(c3) &&
        getBody(c1) > getTotalRange(c1) * 0.3 &&
        getBody(c2) > getTotalRange(c2) * 0.3 &&
        getBody(c3) > getTotalRange(c3) * 0.3 &&
        c2.close > c1.close && c3.close > c2.close) {
      return {
        name: 'Three White Soldiers',
        type: 'bullish',
        confidence: 90,
        description: 'Three consecutive strong bullish candles - very strong uptrend signal',
        strength: 'strong',
        candles: 3
      };
    }
  }
  return null;
}

function detectThreeBlackCrows(candles: CandleData[]): PatternResult | null {
  if (candles.length < 3) return null;
  for (let i = candles.length - 1; i >= 2; i--) {
    const c1 = candles[i - 2], c2 = candles[i - 1], c3 = candles[i];
    if (isBearish(c1) && isBearish(c2) && isBearish(c3) &&
        getBody(c1) > getTotalRange(c1) * 0.3 &&
        getBody(c2) > getTotalRange(c2) * 0.3 &&
        getBody(c3) > getTotalRange(c3) * 0.3 &&
        c2.close < c1.close && c3.close < c2.close) {
      return {
        name: 'Three Black Crows',
        type: 'bearish',
        confidence: 90,
        description: 'Three consecutive strong bearish candles - very strong downtrend signal',
        strength: 'strong',
        candles: 3
      };
    }
  }
  return null;
}

export const usePatternRecognition = (candles: CandleData[]): PatternResult[] => {
  return useMemo(() => {
    // Exclude the LAST candle - it's the in-progress minute that keeps changing
    // Only scan COMPLETED candles for reliable pattern detection
    const completedCandles = candles.slice(0, -1);
    if (completedCandles.length < 5) return [];
    
    const patterns: PatternResult[] = [];
    
    const hammer = detectHammer(completedCandles);
    if (hammer) patterns.push(hammer);
    
    const shootingStar = detectShootingStar(completedCandles);
    if (shootingStar) patterns.push(shootingStar);
    
    const doji = detectDoji(completedCandles);
    if (doji) patterns.push(doji);
    
    const engulfing = detectEngulfing(completedCandles);
    if (engulfing) patterns.push(engulfing);
    
    const morningStar = detectMorningStar(completedCandles);
    if (morningStar) patterns.push(morningStar);
    
    const eveningStar = detectEveningStar(completedCandles);
    if (eveningStar) patterns.push(eveningStar);
    
    const harami = detectHarami(completedCandles);
    if (harami) patterns.push(harami);
    
    const soldiers = detectThreeWhiteSoldiers(completedCandles);
    if (soldiers) patterns.push(soldiers);
    
    const crows = detectThreeBlackCrows(completedCandles);
    if (crows) patterns.push(crows);
    
    // Sort by confidence
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }, [candles]);
};

// FVG Detection
export interface FVGResult {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  confidence: number;
  description: string;
}

export const useFVGDetection = (candles: CandleData[]): FVGResult[] => {
  return useMemo(() => {
    // Exclude last candle - it's in-progress
    const completedCandles = candles.slice(0, -1);
    if (completedCandles.length < 5) return [];
    
    const fvgs: FVGResult[] = [];
    
    for (let i = 2; i < completedCandles.length; i++) {
      const c1 = completedCandles[i - 2]; // First candle
      const c2 = completedCandles[i - 1]; // Middle candle (gap)
      const c3 = completedCandles[i];     // Third candle
      
      // Bullish FVG: Current low > Previous high (gap up)
      if (c2.low > c1.high) {
        const gap = c2.low - c1.high;
        const avgRange = (getTotalRange(c1) + getTotalRange(c2) + getTotalRange(c3)) / 3;
        const confidence = Math.min(95, Math.round((gap / avgRange) * 100));
        
        fvgs.push({
          type: 'bullish',
          top: c2.low,
          bottom: c1.high,
          confidence,
          description: `Bullish FVG: ${c1.high.toFixed(2)} - ${c2.low.toFixed(2)} (gap: ${gap.toFixed(2)})`
        });
      }
      
      // Bearish FVG: Current high < Previous low (gap down)
      if (c2.high < c1.low) {
        const gap = c1.low - c2.high;
        const avgRange = (getTotalRange(c1) + getTotalRange(c2) + getTotalRange(c3)) / 3;
        const confidence = Math.min(95, Math.round((gap / avgRange) * 100));
        
        fvgs.push({
          type: 'bearish',
          top: c1.low,
          bottom: c2.high,
          confidence,
          description: `Bearish FVG: ${c2.high.toFixed(2)} - ${c1.low.toFixed(2)} (gap: ${gap.toFixed(2)})`
        });
      }
    }
    
    // Return last 5 FVGs
    return fvgs.slice(-5);
  }, [candles]);
};
