import { useMemo } from 'react';
import type { CandleData } from '@/types/trading';
import type { DataQuality } from './useRealGoldData';

// ============================================================
// ADVANCED TRADING STRATEGY ENGINE
// Professional-grade multi-confluence system
// ============================================================

export interface StrategyResult {
  // Overall signal
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  
  // Individual strategy scores
  scores: {
    smartMoney: number;      // Smart Money Concepts
    trendFollowing: number;  // Trend-based strategies
    meanReversion: number;   // Mean reversion strategies
    momentum: number;        // Momentum strategies
    volume: number;          // Volume analysis
    pattern: number;         // Pattern recognition
    fibonacci: number;       // Fibonacci levels
    pivotPoints: number;     // Pivot point analysis
    multiTimeframe: number;  // MTF confluence
    newsSentiment: number;   // News impact
  };
  
  // Detailed analysis
  analysis: {
    description: string;
    reasons: string[];
    warnings: string[];
    bestEntry: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    riskPercent: number;
  };

  // Predictive probability layer
  prediction: {
    direction: 'BUY' | 'SELL' | 'HOLD';
    probability: number;
    buyProbability: number;
    sellProbability: number;
    holdProbability: number;
    modelEdge: number;
    expectedMove: number;
    expectedMovePercent: number;
    horizonMinutes: number;
    backtestWinRate: number | null;
    backtestTrades: number;
    profitFactor: number | null;
    calibration: 'live-backtested' | 'warming-up';
  };

  readiness: {
    grade: 'A+' | 'A' | 'B' | 'C' | 'NO TRADE';
    score: number;
    allowTrade: boolean;
    session: 'London/NY overlap' | 'London' | 'New York' | 'Asia/low liquidity';
    confirmations: string[];
    blockers: string[];
    dataQualityScore: number;
  };
  
  // Key levels
  levels: {
    support: number[];
    resistance: number[];
    pivot: number;
    vwap: number;
    fib382: number;
    fib500: number;
    fib618: number;
  };
  
  // Strategy used
  strategies: string[];
  
  // Timestamp
  timestamp: number;
}

// ==================== MATH HELPERS ====================
const sma = (data: number[], period: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(0); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j];
    result.push(sum / period);
  }
  return result;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number, decimals: number = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const ema = (data: number[], period: number): number[] => {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let prevEma = data[0];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(data[0]); continue; }
    const val = data[i] * multiplier + prevEma * (1 - multiplier);
    result.push(val);
    prevEma = val;
  }
  return result;
};

const atr = (highs: number[], lows: number[], closes: number[], period: number): number[] => {
  const tr: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { tr.push(highs[i] - lows[i]); continue; }
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(tr1, tr2, tr3));
  }
  return sma(tr, period);
};

// ==================== VWAP ====================
function calcVWAP(candles: CandleData[]): number {
  let cumulativeTPV = 0;
  let cumulativeVol = 0;
  const startIdx = Math.max(0, candles.length - 50);
  for (let i = startIdx; i < candles.length; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1000;
    cumulativeTPV += tp * vol;
    cumulativeVol += vol;
  }
  return cumulativeVol > 0 ? cumulativeTPV / cumulativeVol : candles[candles.length - 1].close;
}

// ==================== FIBONACCI ====================
function calcFibonacci(candles: CandleData[]) {
  const recent = candles.slice(-50);
  if (recent.length === 0) {
    return {
      swingHigh: 0,
      swingLow: 0,
      fib236: 0,
      fib382: 0,
      fib500: 0,
      fib618: 0,
      fib786: 0,
    };
  }
  const swingHigh = Math.max(...recent.map(c => c.high));
  const swingLow = Math.min(...recent.map(c => c.low));
  const range = swingHigh - swingLow;
  return {
    swingHigh,
    swingLow,
    fib236: swingHigh - range * 0.236,
    fib382: swingHigh - range * 0.382,
    fib500: swingHigh - range * 0.5,
    fib618: swingHigh - range * 0.618,
    fib786: swingHigh - range * 0.786,
  };
}

// ==================== PIVOT POINTS ====================
function calcPivotPoints(candles: CandleData[]) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] || last;
  const pivot = (prev.high + prev.low + prev.close) / 3;
  const r1 = 2 * pivot - prev.low;
  const r2 = pivot + (prev.high - prev.low);
  const s1 = 2 * pivot - prev.high;
  const s2 = pivot - (prev.high - prev.low);
  return { pivot, r1, r2, s1, s2 };
}

// ==================== SUPPORT/RESISTANCE ====================
function findKeyLevels(candles: CandleData[]): { support: number[]; resistance: number[] } {
  const support: number[] = [];
  const resistance: number[] = [];
  const lookback = 20;
  
  for (let i = lookback; i < candles.length - lookback; i++) {
    // Local low = support
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isLow = false; break;
      }
    }
    if (isLow) support.push(candles[i].low);
    
    // Local high = resistance
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isHigh = false; break;
      }
    }
    if (isHigh) resistance.push(candles[i].high);
  }
  
  // Cluster nearby levels
  const cluster = (arr: number[], tolerance: number): number[] => {
    if (arr.length === 0) return arr;
    arr.sort((a, b) => a - b);
    const clusters: number[][] = [[arr[0]]];
    for (let i = 1; i < arr.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const avg = lastCluster.reduce((s, v) => s + v, 0) / lastCluster.length;
      if (Math.abs(arr[i] - avg) < tolerance) {
        lastCluster.push(arr[i]);
      } else {
        clusters.push([arr[i]]);
      }
    }
    return clusters.map(c => c.reduce((s, v) => s + v, 0) / c.length);
  };
  
  const currentPrice = candles[candles.length - 1].close;
  const tolerance = currentPrice * 0.002;
  
  const clusteredSupport = cluster(support, tolerance)
    .filter(level => level < currentPrice)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const clusteredResistance = cluster(resistance, tolerance)
    .filter(level => level > currentPrice)
    .sort((a, b) => a - b)
    .slice(0, 3);

  return {
    support: clusteredSupport,
    resistance: clusteredResistance,
  };
}

// ==================== ORDER BLOCKS (SMC) ====================
function detectOrderBlocks(candles: CandleData[]): { bullish: number[]; bearish: number[] } {
  const bullish: number[] = [];
  const bearish: number[] = [];
  
  for (let i = 5; i < candles.length - 1; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    
    // Bullish OB: Strong bearish candle before strong bullish move
    if (prev.close < prev.open && // Previous was bearish
        c.close > c.open && // Current is bullish
        c.close > prev.open && // Engulfing
        c.close - c.open > (c.high - c.low) * 0.6) { // Strong body
      bullish.push(prev.low);
    }
    
    // Bearish OB: Strong bullish candle before strong bearish move
    if (prev.close > prev.open && // Previous was bullish
        c.close < c.open && // Current is bearish
        c.close < prev.open && // Engulfing
        c.open - c.close > (c.high - c.low) * 0.6) { // Strong body
      bearish.push(prev.high);
    }
  }
  
  return { bullish: bullish.slice(-3), bearish: bearish.slice(-3) };
}

// ==================== LIQUIDITY SWEEPS ====================
function detectLiquiditySweeps(candles: CandleData[]): { type: 'bullish' | 'bearish'; level: number }[] {
  const sweeps: { type: 'bullish' | 'bearish'; level: number }[] = [];
  if (candles.length < 20) return sweeps;
  
  const recent = candles.slice(-10);
  const prevHigh = Math.max(...candles.slice(-20, -10).map(c => c.high));
  const prevLow = Math.min(...candles.slice(-20, -10).map(c => c.low));
  
  // Bullish sweep: Price sweeps below previous low then reverses up
  const lowest = Math.min(...recent.map(c => c.low));
  const lastClose = recent[recent.length - 1].close;
  if (lowest < prevLow && lastClose > prevLow) {
    sweeps.push({ type: 'bullish', level: prevLow });
  }
  
  // Bearish sweep: Price sweeps above previous high then reverses down
  const highest = Math.max(...recent.map(c => c.high));
  if (highest > prevHigh && lastClose < prevHigh) {
    sweeps.push({ type: 'bearish', level: prevHigh });
  }
  
  return sweeps;
}

// ==================== RSI ====================
function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1];
    if (change > 0) gains += change; else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ==================== MACD ====================
function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const idx = closes.length - 1;
  return {
    macd: macdLine[idx],
    signal: signalLine[idx],
    histogram: macdLine[idx] - signalLine[idx],
  };
}

// ==================== STOCHASTIC ====================
function calcStochastic(candles: CandleData[], period: number = 14): number {
  if (candles.length < period) return 50;
  const recent = candles.slice(-period);
  const lowestLow = Math.min(...recent.map(c => c.low));
  const highestHigh = Math.max(...recent.map(c => c.high));
  const currentClose = candles[candles.length - 1].close;
  if (highestHigh === lowestLow) return 50;
  return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
}

// ==================== BOLLINGER BANDS ====================
function calcBollinger(closes: number[], period: number = 20, stdDev: number = 2) {
  const middle = sma(closes, period);
  const idx = closes.length - 1;
  const recent = closes.slice(-period);
  const mean = recent.reduce((s, v) => s + v, 0) / period;
  const variance = recent.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return {
    upper: mean + stdDev * std,
    middle: middle[idx],
    lower: mean - stdDev * std,
  };
}

// ==================== ADX (TREND STRENGTH) ====================
function calcADX(candles: CandleData[], period: number = 14): number {
  if (candles.length < period * 2) return 25;
  const dxValues: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    const plusDM = candles[i].high - candles[i - 1].high;
    const minusDM = candles[i - 1].low - candles[i].low;
    const plusDI = plusDM > 0 && plusDM > minusDM ? plusDM : 0;
    const minusDI = minusDM > 0 && minusDM > plusDM ? minusDM : 0;
    dxValues.push(tr > 0 ? Math.abs(plusDI - minusDI) / tr * 100 : 0);
  }
  const adx = sma(dxValues, period);
  return adx[adx.length - 1] || 25;
}

function calcDirectionalScore(candles: CandleData[]): number {
  if (candles.length < 50) return 50;

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const price = closes[closes.length - 1];
  const sma20v = sma(closes, 20).at(-1) || price;
  const sma50v = sma(closes, 50).at(-1) || price;
  const ema12v = ema(closes, 12);
  const ema26v = ema(closes, 26);
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const stoch = calcStochastic(candles);
  const vwap = calcVWAP(candles);
  const atrValue = atr(highs, lows, closes, 14).at(-1) || price * 0.001;

  let score = 50;
  score += price > sma20v ? 8 : -8;
  score += sma20v > sma50v ? 10 : -10;
  score += (ema12v.at(-1) || price) > (ema26v.at(-1) || price) ? 8 : -8;
  score += macd.histogram > 0 ? 8 : -8;
  score += rsi > 55 ? 8 : rsi < 45 ? -8 : 0;
  score += stoch > 60 ? 5 : stoch < 40 ? -5 : 0;
  score += price > vwap + atrValue * 0.25 ? 5 : price < vwap - atrValue * 0.25 ? -5 : 0;

  return clamp(score, 5, 95);
}

function backtestDirectionalEdge(candles: CandleData[], horizonMinutes: number) {
  const minLookback = 60;
  const maxSamples = 180;
  const start = Math.max(minLookback, candles.length - maxSamples - horizonMinutes);
  let trades = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;

  for (let i = start; i < candles.length - horizonMinutes; i++) {
    const sample = candles.slice(0, i + 1);
    const score = calcDirectionalScore(sample);
    const edge = Math.abs(score - 50);
    if (edge < 8) continue;

    const direction = score > 50 ? 1 : -1;
    const entry = candles[i].close;
    const exit = candles[i + horizonMinutes].close;
    const move = (exit - entry) * direction;

    trades++;
    if (move > 0) {
      wins++;
      grossWin += move;
    } else {
      grossLoss += Math.abs(move);
    }
  }

  return {
    trades,
    winRate: trades > 0 ? (wins / trades) * 100 : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : null,
  };
}

function buildPrediction(
  candles: CandleData[],
  normalizedScore: number,
  signalType: 'BUY' | 'SELL' | 'HOLD',
  atrValue: number,
  price: number
): StrategyResult['prediction'] {
  const horizonMinutes = 5;
  const rawBuyProbability = clamp(normalizedScore, 5, 95);
  const rawSellProbability = clamp(100 - normalizedScore, 5, 95);
  const rawDirectionalProbability = signalType === 'BUY'
    ? rawBuyProbability
    : signalType === 'SELL'
    ? rawSellProbability
    : 50;
  const backtest = backtestDirectionalEdge(candles, horizonMinutes);
  const hasBacktest = backtest.winRate !== null && backtest.trades >= 12;
  const calibratedProbability = hasBacktest
    ? rawDirectionalProbability * 0.65 + backtest.winRate! * 0.35
    : rawDirectionalProbability;
  const modelEdge = clamp(Math.abs(normalizedScore - 50) * 2, 0, 100);
  const holdProbability = clamp(100 - modelEdge * 1.2, 5, 85);
  const buyProbability = signalType === 'BUY'
    ? calibratedProbability
    : clamp(rawBuyProbability * (1 - holdProbability / 130), 5, 90);
  const sellProbability = signalType === 'SELL'
    ? calibratedProbability
    : clamp(rawSellProbability * (1 - holdProbability / 130), 5, 90);
  const directionMultiplier = signalType === 'SELL' ? -1 : signalType === 'BUY' ? 1 : 0;
  const expectedMove = directionMultiplier * atrValue * clamp(modelEdge / 55, 0.15, 1.8);

  return {
    direction: signalType,
    probability: Math.round(clamp(calibratedProbability, signalType === 'HOLD' ? 45 : 50, 92)),
    buyProbability: Math.round(clamp(buyProbability, 3, 94)),
    sellProbability: Math.round(clamp(sellProbability, 3, 94)),
    holdProbability: Math.round(holdProbability),
    modelEdge: Math.round(modelEdge),
    expectedMove: round(expectedMove),
    expectedMovePercent: price > 0 ? round((expectedMove / price) * 100, 3) : 0,
    horizonMinutes,
    backtestWinRate: backtest.winRate === null ? null : Math.round(backtest.winRate),
    backtestTrades: backtest.trades,
    profitFactor: backtest.profitFactor === null ? null : round(backtest.profitFactor, 2),
    calibration: hasBacktest ? 'live-backtested' : 'warming-up',
  };
}

function getTradingSession() {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 12 && utcHour < 16) return { label: 'London/NY overlap' as const, score: 15 };
  if (utcHour >= 7 && utcHour < 12) return { label: 'London' as const, score: 11 };
  if (utcHour >= 16 && utcHour < 21) return { label: 'New York' as const, score: 10 };
  return { label: 'Asia/low liquidity' as const, score: 4 };
}

function buildReadiness(
  signalType: 'BUY' | 'SELL' | 'HOLD',
  scores: StrategyResult['scores'],
  prediction: StrategyResult['prediction'],
  rr: number,
  riskPercent: number,
  atrPercent: number,
  dataQuality?: DataQuality
): StrategyResult['readiness'] {
  const session = getTradingSession();
  const dataQualityScore = dataQuality?.score ?? 55;
  const confirmations: string[] = [];
  const blockers: string[] = [];

  if (signalType === 'HOLD') blockers.push('No directional edge strong enough yet');

  const directionalScores = signalType === 'BUY'
    ? [scores.smartMoney, scores.trendFollowing, scores.momentum, scores.meanReversion, scores.volume, scores.multiTimeframe].filter(v => v >= 60)
    : signalType === 'SELL'
    ? [scores.smartMoney, scores.trendFollowing, scores.momentum, scores.meanReversion, scores.volume, scores.multiTimeframe].filter(v => v <= 40)
    : [];

  if (directionalScores.length >= 4) confirmations.push(`${directionalScores.length}/6 strategy groups aligned`);
  else blockers.push(`Only ${directionalScores.length}/6 strategy groups aligned`);

  if (prediction.probability >= 72) confirmations.push(`Prediction probability ${prediction.probability}%`);
  else blockers.push(`Prediction below elite threshold (${prediction.probability}%)`);

  if (prediction.modelEdge >= 35) confirmations.push(`Model edge ${prediction.modelEdge}%`);
  else blockers.push(`Weak model edge (${prediction.modelEdge}%)`);

  if (prediction.backtestWinRate !== null && prediction.backtestTrades >= 40 && prediction.backtestWinRate >= 56) {
    confirmations.push(`Recent backtest ${prediction.backtestWinRate}% over ${prediction.backtestTrades} tests`);
  } else if (prediction.backtestTrades < 40) {
    blockers.push(`Needs more backtest samples (${prediction.backtestTrades}/40)`);
  } else if (prediction.backtestWinRate !== null) {
    blockers.push(`Recent backtest edge too low (${prediction.backtestWinRate}%)`);
  }

  if (prediction.profitFactor !== null && prediction.profitFactor >= 1.15) {
    confirmations.push(`Profit factor ${prediction.profitFactor.toFixed(2)}`);
  } else {
    blockers.push('Profit factor not strong enough');
  }

  if (rr >= 1.5) confirmations.push(`Risk/reward 1:${rr.toFixed(1)}`);
  else blockers.push(`Risk/reward too weak (1:${rr.toFixed(1)})`);

  if (riskPercent <= 0.35) confirmations.push(`Controlled risk ${riskPercent.toFixed(2)}%`);
  else blockers.push(`Risk too wide (${riskPercent.toFixed(2)}%)`);

  if (atrPercent <= 0.45) confirmations.push('Volatility acceptable');
  else blockers.push('Volatility elevated');

  if (dataQualityScore >= 65) confirmations.push(`Data quality ${dataQualityScore}%`);
  else blockers.push(`Data quality below professional threshold (${dataQualityScore}%)`);

  if (dataQuality && !dataQuality.isRealOhlc) {
    blockers.push('Broker-grade OHLC feed not connected');
  }

  if (session.score >= 10) confirmations.push(`${session.label} session`);
  else blockers.push('Low-liquidity session');

  const readinessScore = Math.round(
    prediction.probability * 0.25 +
    prediction.modelEdge * 0.18 +
    Math.min(100, (prediction.backtestWinRate ?? 45)) * 0.17 +
    Math.min(100, Math.max(0, rr / 2.2 * 100)) * 0.15 +
    dataQualityScore * 0.15 +
    session.score * 0.10
  );
  const criticalBlockers = blockers.filter(b =>
    b.includes('Broker-grade') ||
    b.includes('No directional') ||
    b.includes('Data quality') ||
    b.includes('Prediction below')
  ).length;
  const allowTrade = signalType !== 'HOLD' && readinessScore >= 72 && criticalBlockers === 0 && blockers.length <= 2;
  const grade = !allowTrade
    ? 'NO TRADE'
    : readinessScore >= 90
    ? 'A+'
    : readinessScore >= 82
    ? 'A'
    : readinessScore >= 74
    ? 'B'
    : 'C';

  return {
    grade,
    score: readinessScore,
    allowTrade,
    session: session.label,
    confirmations: confirmations.slice(0, 6),
    blockers: blockers.slice(0, 6),
    dataQualityScore,
  };
}

// ==================== CANDLE AGGREGATION FOR TIMEFRAMES ====================
export function aggregateCandles(candles: CandleData[], timeframe: number): CandleData[] {
  if (candles.length === 0 || timeframe <= 1) return candles;
  const aggregated: CandleData[] = [];
  let current: CandleData | null = null;
  
  for (const candle of [...candles].sort((a, b) => a.time - b.time)) {
    const bucketTime = Math.floor(candle.time / (timeframe * 60)) * (timeframe * 60);
    
    if (!current || current.time !== bucketTime) {
      if (current) aggregated.push(current);
      current = { ...candle, time: bucketTime };
    } else {
      current.high = Math.max(current.high, candle.high);
      current.low = Math.min(current.low, candle.low);
      current.close = candle.close;
      current.volume = (current.volume || 0) + (candle.volume || 0);
    }
  }
  if (current) aggregated.push(current);
  return aggregated;
}

// ==================== MAIN STRATEGY ENGINE ====================
export function useAdvancedStrategy(candles: CandleData[], dataQuality?: DataQuality): StrategyResult {
  return useMemo(() => {
    if (candles.length < 30) {
      return getDefaultResult(candles[candles.length - 1]?.close || 0, dataQuality);
    }
    
    const current = candles[candles.length - 1];
    const price = current.close;
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    
    // === Calculate all indicators ===
    const vwap = calcVWAP(candles);
    const fib = calcFibonacci(candles);
    const pivot = calcPivotPoints(candles);
    const levels = findKeyLevels(candles);
    const ob = detectOrderBlocks(candles);
    const sweeps = detectLiquiditySweeps(candles);
    const rsi = calcRSI(closes, 14);
    const macd = calcMACD(closes);
    const stoch = calcStochastic(candles, 14);
    const bb = calcBollinger(closes, 20, 2);
    const adx = calcADX(candles, 14);
    const atr14 = atr(highs, lows, closes, 14);
    const currentATR = atr14[atr14.length - 1] || price * 0.001;
    
    // === SMA/EMA ===
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const ema12v = ema(closes, 12);
    const ema26v = ema(closes, 26);
    
    // === SCORING ENGINE ===
    let buyScore = 0;
    let sellScore = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];
    const strategies: string[] = [];
    
    // 1. SMART MONEY CONCEPTS (weight: 25%)
    let smcScore = 50;
    
    // Liquidity sweeps
    for (const sweep of sweeps) {
      if (sweep.type === 'bullish') {
        smcScore += 20;
        reasons.push(`Liquidity sweep below ${sweep.level.toFixed(2)} - bullish reversal`);
        strategies.push('Liquidity Sweep');
      } else {
        smcScore -= 20;
        reasons.push(`Liquidity sweep above ${sweep.level.toFixed(2)} - bearish reversal`);
        strategies.push('Liquidity Sweep');
      }
    }
    
    // Order blocks
    const nearestBullOB = ob.bullish.length > 0 ? ob.bullish[ob.bullish.length - 1] : null;
    const nearestBearOB = ob.bearish.length > 0 ? ob.bearish[ob.bearish.length - 1] : null;
    
    if (nearestBullOB && Math.abs(price - nearestBullOB) < currentATR * 2) {
      smcScore += 15;
      reasons.push(`Price at bullish Order Block (${nearestBullOB.toFixed(2)})`);
      strategies.push('Order Block');
    }
    if (nearestBearOB && Math.abs(price - nearestBearOB) < currentATR * 2) {
      smcScore -= 15;
      reasons.push(`Price at bearish Order Block (${nearestBearOB.toFixed(2)})`);
      strategies.push('Order Block');
    }
    
    // FVG confluence
    for (let i = 2; i < candles.length; i++) {
      const c1 = candles[i - 2], c2 = candles[i - 1];
      if (c2.low > c1.high && Math.abs(price - c1.high) < currentATR) {
        smcScore += 10;
        reasons.push(`Price near Bullish FVG zone (${c1.high.toFixed(2)}-${c2.low.toFixed(2)})`);
        strategies.push('Fair Value Gap');
        break;
      }
      if (c2.high < c1.low && Math.abs(price - c2.high) < currentATR) {
        smcScore -= 10;
        reasons.push(`Price near Bearish FVG zone (${c2.high.toFixed(2)}-${c1.low.toFixed(2)})`);
        strategies.push('Fair Value Gap');
        break;
      }
    }
    
    smcScore = Math.max(0, Math.min(100, smcScore));
    if (smcScore > 60) buyScore += smcScore * 0.25;
    else if (smcScore < 40) sellScore += (100 - smcScore) * 0.25;
    
    // 2. TREND FOLLOWING (weight: 20%)
    let trendScore = 50;
    const sma20v = sma20[sma20.length - 1];
    const sma50v = sma50[sma50.length - 1];
    const ema12vl = ema12v[ema12v.length - 1];
    const ema26vl = ema26v[ema26v.length - 1];
    
    if (price > sma20v && sma20v > sma50v) {
      trendScore += 25;
      reasons.push(`Uptrend: Price > SMA20 (${sma20v.toFixed(2)}) > SMA50 (${sma50v.toFixed(2)})`);
      strategies.push('Moving Average Trend');
    } else if (price < sma20v && sma20v < sma50v) {
      trendScore -= 25;
      reasons.push(`Downtrend: Price < SMA20 (${sma20v.toFixed(2)}) < SMA50 (${sma50v.toFixed(2)})`);
      strategies.push('Moving Average Trend');
    }
    
    if (ema12vl > ema26vl) {
      trendScore += 15;
      if (ema12vl > ema26vl && ema12v[ema12v.length - 2] <= ema26v[ema26v.length - 2]) {
        reasons.push('EMA12/26 golden cross detected');
        strategies.push('EMA Cross');
      }
    } else {
      trendScore -= 15;
    }
    
    // ADX trend strength
    if (adx > 25) {
      reasons.push(`Strong trend detected (ADX: ${adx.toFixed(1)})`);
      trendScore += price > sma20v ? 10 : -10;
    } else {
      warnings.push(`Weak trend (ADX: ${adx.toFixed(1)}) - range-bound market`);
    }
    
    trendScore = Math.max(0, Math.min(100, trendScore));
    if (trendScore > 60) buyScore += trendScore * 0.20;
    else if (trendScore < 40) sellScore += (100 - trendScore) * 0.20;
    
    // 3. MOMENTUM (weight: 20%)
    let momScore = 50;
    
    // RSI
    if (rsi < 30) {
      momScore += 25;
      reasons.push(`RSI oversold (${rsi.toFixed(1)}) - bullish reversal likely`);
      strategies.push('RSI Oversold');
    } else if (rsi > 70) {
      momScore -= 25;
      reasons.push(`RSI overbought (${rsi.toFixed(1)}) - bearish reversal likely`);
      strategies.push('RSI Overbought');
    } else if (rsi > 50) {
      momScore += 10;
    } else {
      momScore -= 10;
    }
    
    // MACD
    if (macd.histogram > 0 && macd.macd > macd.signal) {
      momScore += 20;
      reasons.push(`MACD bullish: histogram ${macd.histogram.toFixed(3)} > 0`);
      strategies.push('MACD Bullish');
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
      momScore -= 20;
      reasons.push(`MACD bearish: histogram ${macd.histogram.toFixed(3)} < 0`);
      strategies.push('MACD Bearish');
    }
    
    // Stochastic
    if (stoch < 20) {
      momScore += 15;
      reasons.push(`Stochastic oversold (${stoch.toFixed(1)})`);
      strategies.push('Stochastic Oversold');
    } else if (stoch > 80) {
      momScore -= 15;
      reasons.push(`Stochastic overbought (${stoch.toFixed(1)})`);
      strategies.push('Stochastic Overbought');
    }
    
    momScore = Math.max(0, Math.min(100, momScore));
    if (momScore > 60) buyScore += momScore * 0.20;
    else if (momScore < 40) sellScore += (100 - momScore) * 0.20;
    
    // 4. MEAN REVERSION (weight: 15%)
    let mrScore = 50;
    
    // Bollinger Bands
    if (price <= bb.lower) {
      mrScore += 30;
      reasons.push(`Price at lower Bollinger Band (${bb.lower.toFixed(2)}) - bounce expected`);
      strategies.push('Bollinger Bounce');
    } else if (price >= bb.upper) {
      mrScore -= 30;
      reasons.push(`Price at upper Bollinger Band (${bb.upper.toFixed(2)}) - pullback expected`);
      strategies.push('Bollinger Reversal');
    }
    
    // VWAP
    if (price < vwap - currentATR) {
      mrScore += 15;
      reasons.push(`Price below VWAP (${vwap.toFixed(2)}) - mean reversion likely`);
      strategies.push('VWAP Reversion');
    } else if (price > vwap + currentATR) {
      mrScore -= 15;
      reasons.push(`Price above VWAP (${vwap.toFixed(2)}) - mean reversion likely`);
      strategies.push('VWAP Reversion');
    }
    
    // Fibonacci
    if (Math.abs(price - fib.fib618) < currentATR) {
      mrScore += 10;
      reasons.push(`Price at 61.8% Fibonacci (${fib.fib618.toFixed(2)})`);
      strategies.push('Fibonacci 61.8%');
    }
    if (Math.abs(price - fib.fib382) < currentATR) {
      mrScore -= 10;
      reasons.push(`Price at 38.2% Fibonacci (${fib.fib382.toFixed(2)})`);
      strategies.push('Fibonacci 38.2%');
    }
    
    mrScore = Math.max(0, Math.min(100, mrScore));
    if (mrScore > 60) buyScore += mrScore * 0.15;
    else if (mrScore < 40) sellScore += (100 - mrScore) * 0.15;
    
    // 5. VOLUME (weight: 10%)
    let volScore = 50;
    const recentVol = candles.slice(-5).map(c => c.volume || 0);
    const prevVol = candles.slice(-10, -5).map(c => c.volume || 0);
    const avgRecent = recentVol.reduce((s, v) => s + v, 0) / Math.max(1, recentVol.length);
    const avgPrev = prevVol.reduce((s, v) => s + v, 0) / Math.max(1, prevVol.length);
    
    if (avgPrev > 0 && avgRecent > avgPrev * 1.5) {
      volScore += 20;
      reasons.push(`Volume spike detected (${(avgRecent/avgPrev).toFixed(1)}x average)`);
      strategies.push('Volume Spike');
    }
    
    // Check volume on bullish/bearish candles
    const bullishVol = candles.slice(-10).filter(c => c.close > c.open).reduce((s, c) => s + (c.volume || 0), 0);
    const bearishVol = candles.slice(-10).filter(c => c.close < c.open).reduce((s, c) => s + (c.volume || 0), 0);
    if (bullishVol > bearishVol * 1.3) {
      volScore += 10;
      reasons.push('Buying volume dominant');
    } else if (bearishVol > bullishVol * 1.3) {
      volScore -= 10;
      reasons.push('Selling volume dominant');
    }
    
    volScore = Math.max(0, Math.min(100, volScore));
    if (volScore > 60) buyScore += volScore * 0.10;
    else if (volScore < 40) sellScore += (100 - volScore) * 0.10;
    
    // 6. MULTI-TIMEFRAME (weight: 10%)
    let mtfScore = 50;
    
    // Check higher timeframe alignment
    const htfCandles = aggregateCandles(candles, 5); // 5M aggregated
    if (htfCandles.length > 20) {
      const htfCloses = htfCandles.map(c => c.close);
      const htfSMA20 = sma(htfCloses, 20);
      const htfPrice = htfCandles[htfCandles.length - 1].close;
      if (htfPrice > htfSMA20[htfSMA20.length - 1]) {
        mtfScore += 20;
        reasons.push('5M timeframe aligned bullish');
      } else {
        mtfScore -= 20;
        reasons.push('5M timeframe aligned bearish');
      }
    }
    
    const htfCandles15 = aggregateCandles(candles, 15); // 15M
    if (htfCandles15.length > 20) {
      const htfCloses = htfCandles15.map(c => c.close);
      const htfSMA10 = sma(htfCloses, 10);
      const htfPrice = htfCandles15[htfCandles15.length - 1].close;
      if (htfPrice > htfSMA10[htfSMA10.length - 1]) {
        mtfScore += 15;
        reasons.push('15M timeframe aligned bullish');
      } else {
        mtfScore -= 15;
        reasons.push('15M timeframe aligned bearish');
      }
    }
    
    mtfScore = Math.max(0, Math.min(100, mtfScore));
    if (mtfScore > 60) buyScore += mtfScore * 0.10;
    else if (mtfScore < 40) sellScore += (100 - mtfScore) * 0.10;
    
    // === FINAL SIGNAL CALCULATION ===
    const totalScore = buyScore - sellScore;
    const maxPossible = 100;
    const normalizedScore = ((totalScore + maxPossible) / (2 * maxPossible)) * 100;
    
    let signalType: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;
    
    if (normalizedScore >= 65) {
      signalType = 'BUY';
      confidence = Math.round(normalizedScore);
    } else if (normalizedScore <= 35) {
      signalType = 'SELL';
      confidence = Math.round(100 - normalizedScore);
    } else {
      signalType = 'HOLD';
      confidence = 50;
    }
    
    // === ENTRY/STOP/TP CALCULATION ===
    const atrValue = currentATR;
    let entry = price;
    let stopLoss: number;
    let takeProfit: number;
    
    if (signalType === 'BUY') {
      // Entry near support or current price
      const nearestSupport = levels.support.length > 0 
        ? levels.support.reduce((a, b) => Math.abs(b - price) < Math.abs(a - price) ? b : a)
        : price - atrValue * 1.5;
      entry = price;
      stopLoss = Math.min(nearestSupport - atrValue * 0.5, price - atrValue * 2);
      takeProfit = price + (price - stopLoss) * 2; // 1:2 R:R
      
      // Check if near Fibonacci support
      if (Math.abs(price - fib.fib618) < atrValue * 2) {
        stopLoss = fib.fib786 - atrValue * 0.5;
        takeProfit = fib.fib382;
        reasons.push(`Entry at 61.8% Fibonacci with target at 38.2% Fib`);
      }
    } else if (signalType === 'SELL') {
      const nearestResist = levels.resistance.length > 0
        ? levels.resistance.reduce((a, b) => Math.abs(b - price) < Math.abs(a - price) ? b : a)
        : price + atrValue * 1.5;
      entry = price;
      stopLoss = Math.max(nearestResist + atrValue * 0.5, price + atrValue * 2);
      takeProfit = price - (stopLoss - price) * 2; // 1:2 R:R
      
      if (Math.abs(price - fib.fib382) < atrValue * 2) {
        stopLoss = fib.fib236 + atrValue * 0.5;
        takeProfit = fib.fib618;
        reasons.push(`Entry at 38.2% Fibonacci with target at 61.8% Fib`);
      }
    } else {
      // HOLD - no trade levels
      stopLoss = price - atrValue * 2;
      takeProfit = price + atrValue * 4;
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    const rr = risk > 0 ? reward / risk : 0;
    
    // Add pivot point context
    if (Math.abs(price - pivot.pivot) < atrValue) {
      reasons.push(`Price at daily Pivot Point (${pivot.pivot.toFixed(2)})`);
    }
    
    // Add warnings
    if (adx < 20) {
      warnings.push('Low trend strength - avoid large positions');
    }
    if (currentATR > price * 0.005) {
      warnings.push('High volatility - widen stops');
    }
    if (confidence < 60) {
      warnings.push('Low confidence - consider waiting for better setup');
    }
    
    const uniqueStrategies = [...new Set(strategies)];
    const prediction = buildPrediction(candles, normalizedScore, signalType, atrValue, price);
    
    const scorePayload = {
      smartMoney: smcScore,
      trendFollowing: trendScore,
      meanReversion: mrScore,
      momentum: momScore,
      volume: volScore,
      pattern: smcScore,
      fibonacci: Math.abs(price - fib.fib618) < atrValue * 3 ? 70 : 50,
      pivotPoints: Math.abs(price - pivot.pivot) < atrValue * 2 ? 65 : 50,
      multiTimeframe: mtfScore,
      newsSentiment: 50,
    };
    const riskPercent = Math.round((risk / entry) * 10000) / 100;
    const readiness = buildReadiness(signalType, scorePayload, prediction, rr, riskPercent, (atrValue / price) * 100, dataQuality);
    const finalSignalType = readiness.allowTrade ? signalType : 'HOLD';
    const finalWarnings = readiness.allowTrade
      ? warnings
      : [...readiness.blockers, ...warnings];

    return {
      type: finalSignalType,
      confidence: finalSignalType === 'HOLD' ? Math.min(confidence, readiness.score) : prediction.probability,
      scores: scorePayload,
      analysis: {
        description: `${readiness.grade} setup: ${finalSignalType} with ${prediction.probability}% prediction using ${uniqueStrategies.length} strategies`,
        reasons: reasons.slice(0, 8),
        warnings: finalWarnings.slice(0, 6),
        bestEntry: Math.round(entry * 100) / 100,
        stopLoss: Math.round(stopLoss * 100) / 100,
        takeProfit: Math.round(takeProfit * 100) / 100,
        riskRewardRatio: Math.round(rr * 10) / 10,
        riskPercent,
      },
      prediction,
      readiness,
      levels: {
        support: levels.support,
        resistance: levels.resistance,
        pivot: pivot.pivot,
        vwap,
        fib382: fib.fib382,
        fib500: fib.fib500,
        fib618: fib.fib618,
      },
      strategies: uniqueStrategies,
      timestamp: Date.now(),
    };
  }, [candles, dataQuality]);
}

function getDefaultResult(price: number, dataQuality?: DataQuality): StrategyResult {
  const prediction: StrategyResult['prediction'] = {
    direction: 'HOLD',
    probability: 50,
    buyProbability: 33,
    sellProbability: 33,
    holdProbability: 67,
    modelEdge: 0,
    expectedMove: 0,
    expectedMovePercent: 0,
    horizonMinutes: 5,
    backtestWinRate: null,
    backtestTrades: 0,
    profitFactor: null,
    calibration: 'warming-up',
  };
  const scores = {
    smartMoney: 50, trendFollowing: 50, meanReversion: 50, momentum: 50,
    volume: 50, pattern: 50, fibonacci: 50, pivotPoints: 50, multiTimeframe: 50, newsSentiment: 50,
  };

  return {
    type: 'HOLD',
    confidence: 50,
    scores,
    analysis: {
      description: 'Gathering data... Please wait for more candles.',
      reasons: ['Collecting initial candle data'],
      warnings: ['Not enough data for reliable signals yet'],
      bestEntry: price,
      stopLoss: price * 0.995,
      takeProfit: price * 1.01,
      riskRewardRatio: 2,
      riskPercent: 0.5,
    },
    prediction,
    readiness: buildReadiness('HOLD', scores, prediction, 0, 0, 0, dataQuality),
    levels: {
      support: [price * 0.99], resistance: [price * 1.01], pivot: price,
      vwap: price, fib382: price, fib500: price, fib618: price,
    },
    strategies: ['Waiting for data'],
    timestamp: Date.now(),
  };
}
