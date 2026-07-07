import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, createSeriesMarkers } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, SeriesMarker, ISeriesMarkersPluginApi } from 'lightweight-charts';
import type { CandleData } from '@/types/trading';

interface CandlestickChartProps {
  candles: CandleData[];
  signal?: { type: 'BUY' | 'SELL' | 'HOLD'; price: number; timestamp: number } | null;
}

function normalizeChartCandles(candles: CandleData[]): CandleData[] {
  const byTime = new Map<number, CandleData>();

  candles
    .filter(c => Number.isFinite(c.time) && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)
    .forEach(candle => {
      const existing = byTime.get(candle.time);
      if (!existing) {
        byTime.set(candle.time, { ...candle });
        return;
      }

      byTime.set(candle.time, {
        time: candle.time,
        open: existing.open,
        high: Math.max(existing.high, candle.high),
        low: Math.min(existing.low, candle.low),
        close: candle.close,
        volume: (existing.volume || 0) + (candle.volume || 0),
      });
    });

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

export const CandlestickChart = ({ candles, signal }: CandlestickChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersPrimitiveRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.1)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#60a5fa',
          width: 1,
          style: 2,
          labelBackgroundColor: '#60a5fa',
        },
        horzLine: {
          color: '#60a5fa',
          width: 1,
          style: 2,
          labelBackgroundColor: '#60a5fa',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#60a5fa',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    volumeSeriesRef.current = volumeSeries;

    // Initialize markers primitive
    const markersPrimitive = createSeriesMarkers(candlestickSeries, []);
    markersPrimitiveRef.current = markersPrimitive;

    chart.applyOptions({
      localization: {
        priceFormatter: (price: number) => price.toFixed(2),
      },
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update candlestick data
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const normalizedCandles = normalizeChartCandles(candles);

    const candleData: CandlestickData[] = normalizedCandles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = normalizedCandles.map(c => ({
      time: c.time as Time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    chartRef.current?.timeScale().scrollToPosition(5, true);
  }, [candles]);

  // Update signal markers
  useEffect(() => {
    if (!markersPrimitiveRef.current || !signal) return;

    const marker: SeriesMarker<Time> = {
      time: Math.floor(signal.timestamp / 1000) as Time,
      position: signal.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: signal.type === 'BUY' ? '#10b981' : signal.type === 'SELL' ? '#ef4444' : '#f59e0b',
      shape: signal.type === 'BUY' ? 'arrowUp' : signal.type === 'SELL' ? 'arrowDown' : 'circle',
      text: signal.type,
      size: 2,
    };

    markersPrimitiveRef.current.setMarkers([marker]);
  }, [signal]);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">Live Chart</span>
          <span className="text-xs text-slate-400">1 Minute</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Bullish
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Bearish
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
};
