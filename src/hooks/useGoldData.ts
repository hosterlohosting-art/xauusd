import { useState, useEffect, useRef, useCallback } from 'react';
import type { CandleData, PriceData } from '@/types/trading';

const GOLD_API_URL = 'https://api.gold-api.com/price/XAU';

interface GoldApiResponse {
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  name: string;
  price: number;
  symbol: string;
  updatedAt: string;
  updatedAtReadable: string;
}

// Generate realistic candles AROUND the real gold price
const generateCandlesAroundRealPrice = (realPrice: number, count: number = 200): CandleData[] => {
  const candles: CandleData[] = [];
  // Start from ~3 hours ago, building up to current real price
  let basePrice = realPrice * (1 - (Math.random() * 0.008 - 0.004)); // ±0.4% variation start
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = count; i >= 0; i--) {
    const time = now - i * 60; // 1-minute candles
    const volatility = realPrice * 0.0006; // 0.06% per minute volatility (realistic for gold)
    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * volatility * 2;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 8000) + 3000;
    
    candles.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });
    
    basePrice = close;
  }
  
  // Force the last candle to close near the real price
  const lastCandle = candles[candles.length - 1];
  lastCandle.close = realPrice;
  lastCandle.high = Math.max(lastCandle.high, realPrice);
  lastCandle.low = Math.min(lastCandle.low, realPrice);
  
  return candles;
};

export const useGoldData = () => {
  const [realPrice, setRealPrice] = useState<number | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [priceData, setPriceData] = useState<PriceData>({
    current: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    change: 0,
    changePercent: 0,
    timestamp: Date.now()
  });
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const candlesRef = useRef<CandleData[]>([]);
  const realPriceRef = useRef<number | null>(null);
  const dayHighRef = useRef<number>(0);
  const dayLowRef = useRef<number>(999999);
  const dayOpenRef = useRef<number>(0);
  
  candlesRef.current = candles;
  realPriceRef.current = realPrice;

  // Fetch REAL gold price from API
  const fetchRealPrice = useCallback(async () => {
    try {
      const response = await fetch(GOLD_API_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: GoldApiResponse = await response.json();
      setRealPrice(data.price);
      setError(null);
      return data.price;
    } catch (err) {
      console.error('Failed to fetch gold price:', err);
      setError('Failed to fetch real gold price. Retrying...');
      return null;
    }
  }, []);

  // Initialize with real price
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      setIsLoading(true);
      const price = await fetchRealPrice();
      if (!mounted) return;
      
      if (price) {
        const initialCandles = generateCandlesAroundRealPrice(price, 200);
        candlesRef.current = initialCandles;
        setCandles(initialCandles);
        
        // Calculate proper day stats from ALL candles
        const allHighs = initialCandles.map(c => c.high);
        const allLows = initialCandles.map(c => c.low);
        const dayHigh = Math.max(...allHighs);
        const dayLow = Math.min(...allLows);
        const dayOpen = initialCandles[0].open;
        const yesterday = initialCandles[Math.max(0, initialCandles.length - 1440)] || initialCandles[0];
        
        dayHighRef.current = dayHigh;
        dayLowRef.current = dayLow;
        dayOpenRef.current = dayOpen;
        
        setPriceData({
          current: price,
          open: dayOpen,
          high: dayHigh,
          low: dayLow,
          close: price,
          change: Math.round((price - yesterday.close) * 100) / 100,
          changePercent: Math.round(((price - yesterday.close) / yesterday.close) * 10000) / 100,
          timestamp: Date.now()
        });
      }
      setIsLoading(false);
    };
    
    init();
    return () => { mounted = false; };
  }, [fetchRealPrice]);

  // Live update: fetch real price every 10 seconds + simulate micro-movements
  const updatePrice = useCallback(async () => {
    // Fetch real price periodically (every 10 seconds)
    const newRealPrice = await fetchRealPrice();
    const currentRealPrice = newRealPrice || realPriceRef.current;
    
    if (!currentRealPrice || candlesRef.current.length === 0) return;
    
    const lastCandle = candlesRef.current[candlesRef.current.length - 1];
    const now = Date.now();
    
    // Simulate micro-movement around real price (±$0.50)
    const microJitter = (Math.random() - 0.5) * 1.0;
    const displayPrice = Math.round((currentRealPrice + microJitter) * 100) / 100;
    
    // Update day high/low
    if (displayPrice > dayHighRef.current) dayHighRef.current = displayPrice;
    if (displayPrice < dayLowRef.current) dayLowRef.current = displayPrice;
    
    const updatedCandle: CandleData = {
      ...lastCandle,
      close: displayPrice,
      high: Math.max(lastCandle.high, displayPrice),
      low: Math.min(lastCandle.low, displayPrice),
      volume: (lastCandle.volume || 0) + Math.floor(Math.random() * 200) + 50
    };
    
    const newCandles = [...candlesRef.current.slice(0, -1), updatedCandle];
    
    // Add new candle every minute
    if (now / 1000 - lastCandle.time > 60) {
      const newCandle: CandleData = {
        time: Math.floor(now / 1000),
        open: currentRealPrice,
        high: currentRealPrice,
        low: currentRealPrice,
        close: currentRealPrice,
        volume: Math.floor(Math.random() * 3000) + 1000
      };
      newCandles.push(newCandle);
      
      if (newCandles.length > 300) {
        newCandles.shift();
      }
    }
    
    candlesRef.current = newCandles;
    setCandles(newCandles);
    
    const yesterday = newCandles[Math.max(0, newCandles.length - 1440)] || newCandles[0];
    
    setPriceData({
      current: displayPrice,
      open: dayOpenRef.current,
      high: dayHighRef.current,
      low: dayLowRef.current,
      close: displayPrice,
      change: Math.round((currentRealPrice - yesterday.close) * 100) / 100,
      changePercent: Math.round(((currentRealPrice - yesterday.close) / yesterday.close) * 10000) / 100,
      timestamp: now
    });
  }, [fetchRealPrice]);

  useEffect(() => {
    if (isLive && !isLoading) {
      intervalRef.current = setInterval(updatePrice, 5000); // Update every 5 seconds
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isLive, isLoading, updatePrice]);

  const toggleLive = () => setIsLive(!isLive);

  return { candles, priceData, isLive, toggleLive, isLoading, error, realPrice };
};
