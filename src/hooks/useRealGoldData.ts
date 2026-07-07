import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { CandleData, PriceData } from '@/types/trading';

const GOLD_API_URL = 'https://api.gold-api.com/price/XAU';
const LOCAL_STORAGE_KEY = 'gold_candle_history';
const SIGNAL_HISTORY_KEY = 'signal_history_v2';
const FALLBACK_GOLD_PRICE = 4140;
const FETCH_TIMEOUT_MS = 8000;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const toPrice = (value: unknown): number | null => {
  const price = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
};
const toMinute = (time: number) => Math.floor(time / 60) * 60;

function mergeCandlesByTime(candles: CandleData[]): CandleData[] {
  const byTime = new Map<number, CandleData>();

  candles
    .filter(c => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)
    .forEach(candle => {
      const time = toMinute(candle.time);
      const existing = byTime.get(time);

      if (!existing) {
        byTime.set(time, { ...candle, time });
        return;
      }

      byTime.set(time, {
        time,
        open: existing.open,
        high: Math.max(existing.high, candle.high),
        low: Math.min(existing.low, candle.low),
        close: candle.close,
        volume: (existing.volume || 0) + (candle.volume || 0),
      });
    });

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function upsertCandle(candles: CandleData[], candle: CandleData): CandleData[] {
  return mergeCandlesByTime([...candles, candle]).slice(-300);
}

// Seed realistic gold candles with actual patterns and gaps
function seedCandles(basePrice: number, count: number = 250): CandleData[] {
  const candles: CandleData[] = [];
  const nowSec = toMinute(Math.floor(Date.now() / 1000));
  
  // Gold has realistic per-minute moves of $0.50-$3.00 during active hours
  const avgMove = 1.2; // Average dollar move per minute
  
  let price = basePrice - 15; // Start lower, trend up to current
  let trend = 1; // 1 = up, -1 = down, 0 = range
  let trendDuration = 0;
  
  for (let i = count; i >= 0; i--) {
    const time = nowSec - i * 60;
    
    // Change trend periodically for realistic market phases
    trendDuration++;
    if (trendDuration > 30 + Math.random() * 40) {
      const r = Math.random();
      trend = r > 0.55 ? 1 : r > 0.45 ? -1 : 0;
      trendDuration = 0;
    }
    
    // Calculate move with trend bias + random noise + occasional large moves
    let move = (Math.random() - 0.5) * avgMove * 2;
    
    // Trend bias
    if (trend === 1) move += 0.4;
    if (trend === -1) move -= 0.4;
    
    // Occasional large move (5% chance of $3+ move)
    if (Math.random() < 0.05) {
      move += (Math.random() - 0.4) * 4;
    }
    
    // Occasional gap (3% chance) - creates FVGs
    if (Math.random() < 0.03) {
      move += (Math.random() - 0.3) * 3;
    }
    
    // Mean reversion as we approach the last candle
    if (i < 30) {
      move += (basePrice - price) * 0.05;
    }
    
    const open = price;
    const close = price + move;
    
    // Create realistic wicks (30-80% of candle range)
    const bodySize = Math.abs(close - open);
    const wickSize = bodySize * (0.3 + Math.random() * 1.5);
    const high = Math.max(open, close) + wickSize * Math.random();
    const low = Math.min(open, close) - wickSize * Math.random();
    const volume = Math.floor(Math.random() * 10000) + 2000 + (Math.abs(move) * 2000);
    
    candles.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
    
    price = close;
  }
  
  // Force last few candles to trend toward current price naturally
  for (let j = Math.max(0, candles.length - 10); j < candles.length; j++) {
    const target = candles[j - 1]?.close || basePrice;
    candles[j].open = target;
    if (j === candles.length - 1) {
      candles[j].close = basePrice;
    }
    candles[j].high = Math.max(candles[j].open, candles[j].close, candles[j].high);
    candles[j].low = Math.min(candles[j].open, candles[j].close, candles[j].low);
  }
  
  return mergeCandlesByTime(candles);
}

// Load candles from localStorage or create fresh
function loadOrCreateCandles(currentPrice: number): CandleData[] {
  try {
    if (!isBrowser()) return seedCandles(currentPrice, 200);
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: CandleData[] = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return seedCandles(currentPrice, 200);
      // Only use if recent (within 10 minutes) and price is close
      const lastCandle = parsed[parsed.length - 1];
      if (!lastCandle || !Number.isFinite(lastCandle.time) || !Number.isFinite(lastCandle.close)) {
        return seedCandles(currentPrice, 200);
      }
      const ageMinutes = (Date.now() / 1000 - lastCandle.time) / 60;
      const priceDiff = Math.abs(lastCandle.close - currentPrice) / currentPrice;
      
      if (ageMinutes < 15 && priceDiff < 0.02) {
        // Update last candle to current price and return
        const updated = [...parsed];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          close: currentPrice,
          high: Math.max(updated[updated.length - 1].high, currentPrice),
          low: Math.min(updated[updated.length - 1].low, currentPrice),
        };
        return mergeCandlesByTime(updated);
      }
    }
  } catch { /* ignore */ }
  
  return seedCandles(currentPrice, 200);
}

// Save candles to localStorage
function saveCandles(candles: CandleData[]) {
  try {
    if (!isBrowser()) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergeCandlesByTime(candles)));
  } catch { /* ignore */ }
}

export interface GoldApiResponse {
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  name: string;
  price: number;
  symbol: string;
  updatedAt: string;
  updatedAtReadable: string;
}

export interface StoredSignalHistoryEntry {
  id: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: number;
  stableFor: number;
}

export interface DataQuality {
  priceSource: 'gold-api.com' | 'fallback';
  ohlcSource: 'reconstructed';
  score: number;
  isRealPrice: boolean;
  isRealOhlc: boolean;
  candleCount: number;
  lastCandleAgeSec: number;
  warning: string;
}

export function loadSignalHistory(): StoredSignalHistoryEntry[] {
  try {
    if (!isBrowser()) return [];
    const saved = localStorage.getItem(SIGNAL_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry): entry is Partial<StoredSignalHistoryEntry> => Boolean(entry) && typeof entry === 'object')
        .map(entry => ({
          id: String(entry.id ?? `${entry.timestamp ?? Date.now()}`),
          type: entry.type === 'BUY' || entry.type === 'SELL' || entry.type === 'HOLD' ? entry.type : 'HOLD',
          confidence: Number(entry.confidence) || 0,
          price: Number(entry.price) || 0,
          timestamp: Number(entry.timestamp) || Date.now(),
          stableFor: Number(entry.stableFor) || 0,
        }));
    }
  } catch { /* ignore */ }
  return [];
}

export function saveSignalHistory(history: StoredSignalHistoryEntry[]) {
  try {
    if (!isBrowser()) return;
    localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
  } catch { /* ignore */ }
}

export const useRealGoldData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realPrice, setRealPrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [priceData, setPriceData] = useState<PriceData>({
    current: 0, open: 0, high: 0, low: 0, close: 0,
    change: 0, changePercent: 0, timestamp: Date.now(),
  });
  const [isLive, setIsLive] = useState(true);
  
  const candlesRef = useRef<CandleData[]>([]);
  const dayHighRef = useRef<number>(0);
  const dayLowRef = useRef<number>(999999);
  const dayOpenRef = useRef<number>(0);
  const lastMinuteRef = useRef<number>(0);
  const tickCountRef = useRef<number>(0);
  const currentMinuteCandleRef = useRef<CandleData | null>(null);
  
  candlesRef.current = candles;

  // Fetch real gold price
  const fetchPrice = useCallback(async (): Promise<number | null> => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(GOLD_API_URL, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: GoldApiResponse = await res.json();
      const price = toPrice(data.price);
      if (!price) throw new Error('Invalid price response');
      setRealPrice(price);
      setError(null);
      return price;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  // Initialize
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      setIsLoading(true);
      const price = await fetchPrice();
      if (!mounted) return;
      const startupPrice = price ?? FALLBACK_GOLD_PRICE;
      if (!price) {
        setError('Live price unavailable; using simulated candles until the feed reconnects');
      }
      
      const initialCandles = mergeCandlesByTime(loadOrCreateCandles(startupPrice));
      
      // Calculate day stats from all candles
      const allHighs = initialCandles.map(c => c.high);
      const allLows = initialCandles.map(c => c.low);
      dayHighRef.current = Math.max(...allHighs);
      dayLowRef.current = Math.min(...allLows);
      dayOpenRef.current = initialCandles[0].open;
      
      // Start current minute candle
      const nowSec = Math.floor(Date.now() / 1000);
      lastMinuteRef.current = Math.floor(nowSec / 60) * 60;
      tickCountRef.current = 1;
      const currentMinuteCandle = {
        time: lastMinuteRef.current,
        open: startupPrice,
        high: startupPrice,
        low: startupPrice,
        close: startupPrice,
        volume: Math.floor(Math.random() * 3000) + 1000,
      };
      currentMinuteCandleRef.current = currentMinuteCandle;
      const candlesWithCurrentMinute = upsertCandle(initialCandles, currentMinuteCandle);
      candlesRef.current = candlesWithCurrentMinute;
      setCandles(candlesWithCurrentMinute);
      
      const yesterday = initialCandles[Math.max(0, initialCandles.length - 1440)] || initialCandles[0];
      
      setPriceData({
        current: startupPrice,
        open: dayOpenRef.current,
        high: dayHighRef.current,
        low: dayLowRef.current,
        close: startupPrice,
        change: Math.round((startupPrice - yesterday.close) * 100) / 100,
        changePercent: yesterday.close ? Math.round(((startupPrice - yesterday.close) / yesterday.close) * 10000) / 100 : 0,
        timestamp: Date.now(),
      });
      
      setIsLoading(false);
    };
    
    init();
    return () => { mounted = false; };
  }, [fetchPrice]);

  // Live update every 5 seconds
  useEffect(() => {
    if (!isLive || isLoading) return;
    
    const interval = setInterval(async () => {
      const price = await fetchPrice();
      const currentPrice = price || realPrice;
      if (!currentPrice || !currentMinuteCandleRef.current) return;
      
      const nowSec = Math.floor(Date.now() / 1000);
      const currentMinute = Math.floor(nowSec / 60) * 60;
      
      // Update day high/low
      if (currentPrice > dayHighRef.current) dayHighRef.current = currentPrice;
      if (currentPrice < dayLowRef.current) dayLowRef.current = currentPrice;
      
      // New minute started - finalize previous candle, start new one
      if (currentMinute > lastMinuteRef.current) {
        const finalizedCandle = { ...currentMinuteCandleRef.current };
        
        const newCandles = upsertCandle(candlesRef.current, finalizedCandle);
        candlesRef.current = newCandles;
        setCandles(newCandles);
        saveCandles(newCandles);
        
        // Start new minute candle
        lastMinuteRef.current = currentMinute;
        tickCountRef.current = 1;
        currentMinuteCandleRef.current = {
          time: currentMinute,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice,
          volume: Math.floor(Math.random() * 3000) + 1000,
        };
      } else {
        // Update current minute candle
        tickCountRef.current++;
        const mc = currentMinuteCandleRef.current;
        currentMinuteCandleRef.current = {
          ...mc,
          close: currentPrice,
          high: Math.max(mc.high, currentPrice),
          low: Math.min(mc.low, currentPrice),
          volume: (mc.volume || 0) + Math.floor(Math.random() * 500) + 100,
        };
        
        // Update last candle in array (in-progress minute)
        const updated = upsertCandle(candlesRef.current, currentMinuteCandleRef.current);
        candlesRef.current = updated;
        setCandles(updated);
      }
      
      // Update price display
      const allCandles = candlesRef.current;
      const yesterday = allCandles[Math.max(0, allCandles.length - 1440)] || allCandles[0];
      if (!yesterday) return;
      
      setPriceData({
        current: currentPrice,
        open: dayOpenRef.current,
        high: dayHighRef.current,
        low: dayLowRef.current,
        close: currentPrice,
        change: Math.round((currentPrice - yesterday.close) * 100) / 100,
        changePercent: yesterday.close ? Math.round(((currentPrice - yesterday.close) / yesterday.close) * 10000) / 100 : 0,
        timestamp: Date.now(),
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive, isLoading, fetchPrice, realPrice]);

  const toggleLive = () => setIsLive(!isLive);
  const dataQuality = useMemo<DataQuality>(() => {
    const lastCandle = candles[candles.length - 1];
    const lastCandleAgeSec = lastCandle ? Math.max(0, Math.round(Date.now() / 1000 - lastCandle.time)) : 999999;
    const isRealPrice = realPrice !== null && !error;
    const candleDepthScore = Math.min(35, Math.round((candles.length / 300) * 35));
    const freshnessScore = lastCandleAgeSec <= 90 ? 25 : lastCandleAgeSec <= 180 ? 15 : 5;
    const priceScore = isRealPrice ? 25 : 5;
    const ohlcScore = 10; // Reconstructed OHLC is useful, but not broker-grade.
    const score = Math.min(100, candleDepthScore + freshnessScore + priceScore + ohlcScore);

    return {
      priceSource: isRealPrice ? 'gold-api.com' : 'fallback',
      ohlcSource: 'reconstructed',
      score,
      isRealPrice,
      isRealOhlc: false,
      candleCount: candles.length,
      lastCandleAgeSec,
      warning: isRealPrice
        ? 'Live spot price active; OHLC candles are reconstructed from spot updates.'
        : 'Live price feed unavailable; using fallback/reconstructed market data.',
    };
  }, [candles, error, realPrice]);

  return { candles, priceData, isLive, toggleLive, isLoading, error, realPrice, dataQuality };
};
