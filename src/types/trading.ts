export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorValue {
  time: number;
  value: number;
  signal?: 'buy' | 'sell' | 'neutral';
}

export interface MACDResult {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface SignalResult {
  id: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  price: number;
  timestamp: number;
  indicators: {
    rsi: number;
    macd: 'bullish' | 'bearish' | 'neutral';
    ma: 'bullish' | 'bearish' | 'neutral';
    bollinger: 'upper' | 'lower' | 'middle';
    stochastic: 'overbought' | 'oversold' | 'neutral';
  };
  reason: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to 100
  sources: {
    technical: number;
    trend: number;
    volatility: number;
  };
}

export interface PriceData {
  current: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface TrendAnalysis {
  direction: 'uptrend' | 'downtrend' | 'sideways';
  strength: number; // 0-100
  support: number;
  resistance: number;
  description: string;
}
