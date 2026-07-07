import { useMemo } from 'react';
import type { CandleData } from '@/types/trading';
import { useSignalGeneration, useTechnicalIndicators } from './useTechnicalIndicators';
import { usePatternRecognition, useFVGDetection } from './usePatternRecognition';

export interface EnhancedSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  sources: {
    technical: number;
    patterns: number;
    fvg: number;
    trend: number;
  };
  reasons: string[];
  bestEntry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: string;
  timeframes: { label: string; signal: string; agreement: boolean }[];
}

export const useEnhancedSignal = (candles: CandleData[]): EnhancedSignal | null => {
  const baseSignal = useSignalGeneration(candles);
  const indicators = useTechnicalIndicators(candles);
  const patterns = usePatternRecognition(candles);
  const fvgs = useFVGDetection(candles);

  return useMemo(() => {
    if (!baseSignal || !indicators) return null;

    let buyScore = 0;
    let sellScore = 0;
    const reasons: string[] = [];
    const timeframes: { label: string; signal: string; agreement: boolean }[] = [];

    // 1. Technical Indicators (weight: 35%)
    const technicalWeight = 0.35;
    if (baseSignal.type === 'BUY') buyScore += baseSignal.confidence * technicalWeight;
    if (baseSignal.type === 'SELL') sellScore += baseSignal.confidence * technicalWeight;
    reasons.push(...baseSignal.reason.slice(0, 2));
    timeframes.push({ label: 'Technical', signal: baseSignal.type, agreement: baseSignal.confidence > 60 });

    // 2. Pattern Recognition (weight: 20%)
    let patternScore = 0;
    const bullishPatterns = patterns.filter(p => p.type === 'bullish');
    const bearishPatterns = patterns.filter(p => p.type === 'bearish');
    
    if (bullishPatterns.length > 0) {
      const avgConf = bullishPatterns.reduce((s, p) => s + p.confidence, 0) / bullishPatterns.length;
      buyScore += avgConf * 0.20;
      patternScore = avgConf;
      reasons.push(`${bullishPatterns[0].name} detected (${bullishPatterns[0].strength})`);
    }
    if (bearishPatterns.length > 0) {
      const avgConf = bearishPatterns.reduce((s, p) => s + p.confidence, 0) / bearishPatterns.length;
      sellScore += avgConf * 0.20;
      patternScore = Math.max(patternScore, avgConf);
      reasons.push(`${bearishPatterns[0].name} detected (${bearishPatterns[0].strength})`);
    }
    timeframes.push({ label: 'Patterns', signal: bullishPatterns.length > bearishPatterns.length ? 'BUY' : bearishPatterns.length > bullishPatterns.length ? 'SELL' : 'HOLD', agreement: patternScore > 50 });

    // 3. FVG Analysis (weight: 15%)
    let fvgScore = 0;
    const bullishFVGs = fvgs.filter(f => f.type === 'bullish');
    const bearishFVGs = fvgs.filter(f => f.type === 'bearish');
    
    if (bullishFVGs.length > 0) {
      const avgConf = bullishFVGs.reduce((s, f) => s + f.confidence, 0) / bullishFVGs.length;
      buyScore += avgConf * 0.15;
      fvgScore = avgConf;
      reasons.push(`Bullish FVG: ${bullishFVGs[0].bottom.toFixed(2)}-${bullishFVGs[0].top.toFixed(2)}`);
    }
    if (bearishFVGs.length > 0) {
      const avgConf = bearishFVGs.reduce((s, f) => s + f.confidence, 0) / bearishFVGs.length;
      sellScore += avgConf * 0.15;
      fvgScore = Math.max(fvgScore, avgConf);
      reasons.push(`Bearish FVG: ${bearishFVGs[0].bottom.toFixed(2)}-${bearishFVGs[0].top.toFixed(2)}`);
    }
    timeframes.push({ label: 'FVG', signal: bullishFVGs.length > bearishFVGs.length ? 'BUY' : bearishFVGs.length > bullishFVGs.length ? 'SELL' : 'HOLD', agreement: fvgScore > 50 });

    // 4. Trend Analysis (weight: 30%)
    const { lastClose, movingAverages } = indicators;
    let trendScore = 50;
    
    if (lastClose > movingAverages.sma20 && lastClose > movingAverages.sma50) {
      trendScore = 75;
      buyScore += 75 * 0.30;
      reasons.push('Price above SMA 20 & 50 - uptrend intact');
    } else if (lastClose < movingAverages.sma20 && lastClose < movingAverages.sma50) {
      trendScore = 75;
      sellScore += 75 * 0.30;
      reasons.push('Price below SMA 20 & 50 - downtrend intact');
    } else {
      reasons.push('Mixed trend signals - price between MAs');
    }
    timeframes.push({ label: 'Trend', signal: lastClose > movingAverages.sma20 ? 'BUY' : 'SELL', agreement: trendScore > 60 });

    // Determine final signal
    let finalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let finalConfidence = 50;
    const margin = buyScore - sellScore;

    if (margin > 20) {
      finalType = 'BUY';
      finalConfidence = Math.min(99, 50 + margin);
    } else if (margin < -20) {
      finalType = 'SELL';
      finalConfidence = Math.min(99, 50 + Math.abs(margin));
    } else {
      finalConfidence = 50 - Math.abs(margin) * 0.5;
    }

    // Calculate levels
    const atr = indicators.atr;
    const bestEntry = lastClose;
    const stopLoss = finalType === 'BUY' 
      ? Math.round((bestEntry - atr * 1.5) * 100) / 100
      : finalType === 'SELL'
      ? Math.round((bestEntry + atr * 1.5) * 100) / 100
      : bestEntry;
    const takeProfit = finalType === 'BUY'
      ? Math.round((bestEntry + atr * 3) * 100) / 100
      : finalType === 'SELL'
      ? Math.round((bestEntry - atr * 3) * 100) / 100
      : bestEntry;
    
    const risk = Math.abs(bestEntry - stopLoss);
    const reward = Math.abs(takeProfit - bestEntry);
    const riskReward = risk > 0 ? (reward / risk).toFixed(1) : '0';

    return {
      type: finalType,
      confidence: Math.round(finalConfidence),
      sources: {
        technical: Math.round(baseSignal.confidence),
        patterns: Math.round(patternScore),
        fvg: Math.round(fvgScore),
        trend: Math.round(trendScore),
      },
      reasons,
      bestEntry,
      stopLoss,
      takeProfit,
      riskReward: `1:${riskReward}`,
      timeframes,
    };
  }, [baseSignal, indicators, patterns, fvgs]);
};
