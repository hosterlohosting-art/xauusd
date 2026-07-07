import { useMemo } from 'react';
import type { CandleData, SignalResult, MarketSentiment, TrendAnalysis } from '@/types/trading';
import { RSI, MACD, BollingerBands, SMA, EMA, ATR, StochasticOscillator } from 'trading-signals';

export const useTechnicalIndicators = (candles: CandleData[]) => {
  const indicators = useMemo(() => {
    if (candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const lastClose = closes[closes.length - 1];

    // RSI
    const rsi = new RSI(14);
    closes.forEach(c => rsi.update(c, false));
    const rsiValue = rsi.getResult() || 50;

    // MACD
    const macdShort = new EMA(12);
    const macdLong = new EMA(26);
    const macdSignal = new EMA(9);
    const macd = new MACD(macdShort, macdLong, macdSignal);
    closes.forEach(c => macd.update(c, false));
    const macdResult = macd.getResult();
    const macdLine = macdResult?.macd || 0;
    const signalLine = macdResult?.signal || 0;
    const histogram = macdResult?.histogram || 0;

    // Bollinger Bands
    const bb = new BollingerBands(20, 2);
    closes.forEach(c => bb.update(c, false));
    const bbResult = bb.getResult();
    const bbUpper = bbResult?.upper || lastClose * 1.02;
    const bbMiddle = bbResult?.middle || lastClose;
    const bbLower = bbResult?.lower || lastClose * 0.98;

    // Moving Averages
    const sma20 = new SMA(20);
    const sma50 = new SMA(50);
    const ema12 = new EMA(12);
    const ema26 = new EMA(26);
    
    closes.forEach(c => {
      sma20.update(c, false);
      sma50.update(c, false);
      ema12.update(c, false);
      ema26.update(c, false);
    });

    const sma20Value = sma20.getResult() || lastClose;
    const sma50Value = sma50.getResult() || lastClose;
    const ema12Value = ema12.getResult() || lastClose;
    const ema26Value = ema26.getResult() || lastClose;

    // Stochastic
    const stoch = new StochasticOscillator(14, 3, 3);
    const stochResults: { stochK: number; stochD: number }[] = [];
    for (let i = 0; i < candles.length; i++) {
      const result = stoch.update({
        close: closes[i],
        high: highs[i],
        low: lows[i]
      }, false);
      if (result) stochResults.push(result);
    }
    const lastStoch = stochResults[stochResults.length - 1] || { stochK: 50, stochD: 50 };

    // ATR
    const atr = new ATR(14);
    for (let i = 0; i < candles.length; i++) {
      atr.update({
        close: closes[i],
        high: highs[i],
        low: lows[i]
      }, false);
    }
    const atrValue = atr.getResult() || lastClose * 0.005;

    return {
      rsi: Math.round(rsiValue * 100) / 100,
      macd: {
        macd: Math.round(macdLine * 100) / 100,
        signal: Math.round(signalLine * 100) / 100,
        histogram: Math.round(histogram * 100) / 100
      },
      bollinger: {
        upper: Math.round(bbUpper * 100) / 100,
        middle: Math.round(bbMiddle * 100) / 100,
        lower: Math.round(bbLower * 100) / 100
      },
      movingAverages: {
        sma20: Math.round(sma20Value * 100) / 100,
        sma50: Math.round(sma50Value * 100) / 100,
        ema12: Math.round(ema12Value * 100) / 100,
        ema26: Math.round(ema26Value * 100) / 100
      },
      stochastic: {
        k: Math.round(lastStoch.stochK * 100) / 100,
        d: Math.round(lastStoch.stochD * 100) / 100
      },
      atr: Math.round(atrValue * 100) / 100,
      lastClose,
      lastCandle: candles[candles.length - 1]
    };
  }, [candles]);

  return indicators;
};

export const useSignalGeneration = (candles: CandleData[]): SignalResult | null => {
  const indicators = useTechnicalIndicators(candles);
  
  return useMemo(() => {
    if (!indicators) return null;

    const {
      rsi,
      macd,
      bollinger,
      movingAverages,
      stochastic,
      atr,
      lastClose
    } = indicators;

    const reasons: string[] = [];
    let buyScore = 0;
    let sellScore = 0;

    // RSI Analysis
    if (rsi < 30) {
      buyScore += 25;
      reasons.push(`RSI oversold at ${rsi} - potential reversal up`);
    } else if (rsi > 70) {
      sellScore += 25;
      reasons.push(`RSI overbought at ${rsi} - potential reversal down`);
    } else if (rsi < 45) {
      buyScore += 10;
      reasons.push(`RSI leaning bullish at ${rsi}`);
    } else if (rsi > 55) {
      sellScore += 10;
      reasons.push(`RSI leaning bearish at ${rsi}`);
    } else {
      reasons.push(`RSI neutral at ${rsi}`);
    }

    // MACD Analysis
    let macdSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (macd.histogram > 0 && macd.macd > macd.signal) {
      buyScore += 20;
      macdSignal = 'bullish';
      reasons.push('MACD bullish crossover - momentum rising');
    } else if (macd.histogram < 0 && macd.macd < macd.signal) {
      sellScore += 20;
      macdSignal = 'bearish';
      reasons.push('MACD bearish crossover - momentum falling');
    } else {
      reasons.push('MACD neutral - waiting for crossover');
    }

    // Moving Average Analysis
    let maSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (lastClose > movingAverages.ema12 && movingAverages.ema12 > movingAverages.ema26) {
      buyScore += 20;
      maSignal = 'bullish';
      reasons.push('Price above EMA12 & EMA12 > EMA26 - bullish alignment');
    } else if (lastClose < movingAverages.ema12 && movingAverages.ema12 < movingAverages.ema26) {
      sellScore += 20;
      maSignal = 'bearish';
      reasons.push('Price below EMA12 & EMA12 < EMA26 - bearish alignment');
    } else if (lastClose > movingAverages.sma20) {
      buyScore += 10;
      maSignal = 'bullish';
      reasons.push('Price above SMA20 - short-term bullish');
    } else {
      sellScore += 10;
      maSignal = 'bearish';
      reasons.push('Price below SMA20 - short-term bearish');
    }

    // Bollinger Bands Analysis
    let bbSignal: 'upper' | 'lower' | 'middle' = 'middle';
    if (lastClose <= bollinger.lower) {
      buyScore += 20;
      bbSignal = 'lower';
      reasons.push('Price at lower Bollinger Band - oversold bounce likely');
    } else if (lastClose >= bollinger.upper) {
      sellScore += 20;
      bbSignal = 'upper';
      reasons.push('Price at upper Bollinger Band - overbought pullback likely');
    } else {
      const bbPosition = (lastClose - bollinger.lower) / (bollinger.upper - bollinger.lower);
      if (bbPosition < 0.3) {
        buyScore += 5;
        bbSignal = 'lower';
        reasons.push('Price in lower Bollinger region');
      } else if (bbPosition > 0.7) {
        sellScore += 5;
        bbSignal = 'upper';
        reasons.push('Price in upper Bollinger region');
      } else {
        reasons.push('Price in middle Bollinger region');
      }
    }

    // Stochastic Analysis
    let stochSignal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    if (stochastic.k < 20) {
      buyScore += 15;
      stochSignal = 'oversold';
      reasons.push(`Stochastic oversold at ${stochastic.k} - bounce potential`);
    } else if (stochastic.k > 80) {
      sellScore += 15;
      stochSignal = 'overbought';
      reasons.push(`Stochastic overbought at ${stochastic.k} - pullback potential`);
    } else {
      reasons.push(`Stochastic neutral at ${stochastic.k}`);
    }

    // Determine signal
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;

    if (buyScore > sellScore + 15) {
      signalType = 'BUY';
      confidence = Math.min(95, 50 + (buyScore - sellScore));
    } else if (sellScore > buyScore + 15) {
      signalType = 'SELL';
      confidence = Math.min(95, 50 + (sellScore - buyScore));
    } else {
      confidence = 50 - Math.abs(buyScore - sellScore) * 0.5;
    }

    // Calculate entry, stop loss and take profit
    const entryPrice = lastClose;
    const stopLoss = signalType === 'BUY' 
      ? Math.round((entryPrice - atr * 2) * 100) / 100
      : signalType === 'SELL'
      ? Math.round((entryPrice + atr * 2) * 100) / 100
      : undefined;
    const takeProfit = signalType === 'BUY'
      ? Math.round((entryPrice + atr * 3) * 100) / 100
      : signalType === 'SELL'
      ? Math.round((entryPrice - atr * 3) * 100) / 100
      : undefined;

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: signalType,
      confidence: Math.round(confidence),
      price: lastClose,
      timestamp: Date.now(),
      indicators: {
        rsi,
        macd: macdSignal,
        ma: maSignal,
        bollinger: bbSignal,
        stochastic: stochSignal
      },
      reason: reasons,
      entryPrice,
      stopLoss,
      takeProfit
    };
  }, [indicators]);
};

export const useMarketSentiment = (candles: CandleData[]): MarketSentiment => {
  const indicators = useTechnicalIndicators(candles);
  
  return useMemo(() => {
    if (!indicators) {
      return {
        overall: 'neutral',
        score: 0,
        sources: { technical: 0, trend: 0, volatility: 0 }
      };
    }

    const { rsi, macd, lastClose, movingAverages, atr } = indicators;

    // Technical score (-100 to 100)
    let technicalScore = 0;
    if (rsi < 30) technicalScore += 40;
    else if (rsi < 40) technicalScore += 20;
    else if (rsi > 70) technicalScore -= 40;
    else if (rsi > 60) technicalScore -= 20;

    if (macd.histogram > 0) technicalScore += 30;
    else technicalScore -= 30;

    // Trend score
    let trendScore = 0;
    if (lastClose > movingAverages.sma20) trendScore += 30;
    else trendScore -= 30;
    if (lastClose > movingAverages.sma50) trendScore += 20;
    else trendScore -= 20;

    // Volatility score (lower volatility = more predictable)
    const volatility = (atr / lastClose) * 100;
    const volatilityScore = Math.max(-50, Math.min(50, 50 - volatility * 10));

    const totalScore = Math.max(-100, Math.min(100, technicalScore + trendScore + volatilityScore));

    let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (totalScore > 30) overall = 'bullish';
    else if (totalScore < -30) overall = 'bearish';

    return {
      overall,
      score: Math.round(totalScore),
      sources: {
        technical: Math.round(technicalScore),
        trend: Math.round(trendScore),
        volatility: Math.round(volatilityScore)
      }
    };
  }, [indicators]);
};

export const useTrendAnalysis = (candles: CandleData[]): TrendAnalysis => {
  const indicators = useTechnicalIndicators(candles);
  
  return useMemo(() => {
    if (!indicators || candles.length < 50) {
      return {
        direction: 'sideways',
        strength: 50,
        support: 0,
        resistance: 0,
        description: 'Analyzing trend...'
      };
    }

    const { lastClose, movingAverages } = indicators;
    const recentCandles = candles.slice(-50);
    
    // Calculate trend using linear regression on recent closes
    const n = recentCandles.length;
    const xMean = (n - 1) / 2;
    const yMean = recentCandles.reduce((sum, c) => sum + c.close, 0) / n;
    
    let slope = 0;
    let ssxx = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      const dy = recentCandles[i].close - yMean;
      slope += dx * dy;
      ssxx += dx * dx;
    }
    
    slope = slope / ssxx;
    
    // Trend direction
    let direction: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';
    const slopePercent = (slope / lastClose) * 100;
    
    if (slopePercent > 0.02) direction = 'uptrend';
    else if (slopePercent < -0.02) direction = 'downtrend';

    // Trend strength (0-100)
    const rSquared = Math.abs(slopePercent) * 100;
    const strength = Math.min(100, Math.max(20, rSquared * 5));

    // Support and resistance
    const lows = recentCandles.map(c => c.low).sort((a, b) => a - b);
    const highs = recentCandles.map(c => c.high).sort((a, b) => b - a);
    
    const support = lows[Math.floor(lows.length * 0.1)];
    const resistance = highs[Math.floor(highs.length * 0.1)];

    let description = '';
    if (direction === 'uptrend') {
      description = `Strong upward momentum detected. Price trading above key moving averages (${movingAverages.sma20.toFixed(2)} / ${movingAverages.sma50.toFixed(2)}). Consider buying on pullbacks to support at ${support.toFixed(2)}.`;
    } else if (direction === 'downtrend') {
      description = `Downward pressure observed. Price below moving averages (${movingAverages.sma20.toFixed(2)} / ${movingAverages.sma50.toFixed(2)}). Watch for break below ${support.toFixed(2)} or recovery above ${resistance.toFixed(2)}.`;
    } else {
      description = `Market consolidating in a range. Support at ${support.toFixed(2)}, resistance at ${resistance.toFixed(2)}. Wait for breakout confirmation before entering.`;
    }

    return {
      direction,
      strength: Math.round(strength),
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      description
    };
  }, [indicators, candles]);
};
