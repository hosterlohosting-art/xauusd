import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, Time } from 'lightweight-charts';
import type { CandleData } from '@/types/trading';
import { Loader2, Wifi, Download, LineChart as LineChartIcon, TrendingUp, Layers } from 'lucide-react';
import { aggregateCandles } from '@/hooks/useAdvancedStrategy';

interface RealCandleChartProps {
  candles: CandleData[];
  supportLevels?: number[];
  resistanceLevels?: number[];
  pivotLevel?: number;
  vwapLevel?: number;
  fibLevels?: { fib382: number; fib500: number; fib618: number };
  signalType?: 'BUY' | 'SELL' | 'HOLD' | null;
  onExport?: () => void;
}

type TimeFrame = '1m' | '5m' | '15m' | '1h';

const TF_MAP: Record<TimeFrame, number> = { '1m': 1, '5m': 5, '15m': 15, '1h': 60 };

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

export const RealCandleChart = ({ 
  candles, 
  supportLevels = [], 
  resistanceLevels = [],
  pivotLevel,
  vwapLevel,
  fibLevels,
  signalType, 
  onExport 
}: RealCandleChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const srLinesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<string>('Initializing...');
  const [activeTF, setActiveTF] = useState<TimeFrame>('1m');
  const [showSR, setShowSR] = useState(true);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showFib, setShowFib] = useState(false);
  const initialLoadRef = useRef(false);

  // Create chart ONCE
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#60a5fa', width: 1, style: 2, labelBackgroundColor: '#60a5fa' },
        horzLine: { color: '#60a5fa', width: 1, style: 2, labelBackgroundColor: '#60a5fa' },
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.15)' },
      timeScale: { 
        borderColor: 'rgba(148, 163, 184, 0.15)', 
        timeVisible: true, 
        secondsVisible: false,
        rightOffset: 10,
      },
      handleScroll: { vertTouchDrag: false },
      autoSize: true,
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
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.88, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    return () => { chart.remove(); };
  }, []);

  // Clear S/R lines
  const clearSRLines = useCallback(() => {
    srLinesRef.current.forEach(line => {
      try { chartRef.current?.removeSeries(line); } catch { /* ignore */ }
    });
    srLinesRef.current = [];
  }, []);

  // Draw S/R lines
  const drawSRLines = useCallback((chartData: CandlestickData[]) => {
    if (!chartRef.current || chartData.length === 0) return;
    clearSRLines();
    
    const firstTime = chartData[0].time;
    const lastTime = chartData[chartData.length - 1].time;
    
    // Support lines (green)
    if (showSR) {
      supportLevels.forEach((level, i) => {
        const line = chartRef.current!.addSeries(LineSeries, {
          color: `rgba(16, 185, 129, ${0.6 - i * 0.15})`,
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: true,
          title: `S${i + 1}`,
        });
        line.setData([
          { time: firstTime, value: level },
          { time: lastTime, value: level },
        ]);
        srLinesRef.current.push(line);
      });
      
      // Resistance lines (red)
      resistanceLevels.forEach((level, i) => {
        const line = chartRef.current!.addSeries(LineSeries, {
          color: `rgba(239, 68, 68, ${0.6 - i * 0.15})`,
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: true,
          title: `R${i + 1}`,
        });
        line.setData([
          { time: firstTime, value: level },
          { time: lastTime, value: level },
        ]);
        srLinesRef.current.push(line);
      });
      
      // Pivot line
      if (pivotLevel) {
        const line = chartRef.current!.addSeries(LineSeries, {
          color: 'rgba(168, 85, 247, 0.7)',
          lineWidth: 1,
          lineStyle: 3,
          lastValueVisible: true,
          title: 'P',
        });
        line.setData([
          { time: firstTime, value: pivotLevel },
          { time: lastTime, value: pivotLevel },
        ]);
        srLinesRef.current.push(line);
      }
    }
    
    // VWAP
    if (showVWAP && vwapLevel) {
      const line = chartRef.current!.addSeries(LineSeries, {
        color: 'rgba(250, 204, 21, 0.8)',
        lineWidth: 2,
        lineStyle: 0,
        lastValueVisible: true,
        title: 'VWAP',
      });
      line.setData([
        { time: firstTime, value: vwapLevel },
        { time: lastTime, value: vwapLevel },
      ]);
      srLinesRef.current.push(line);
    }
    
    // Fibonacci levels
    if (showFib && fibLevels) {
      const fibColors = ['rgba(59, 130, 246, 0.5)', 'rgba(245, 158, 11, 0.5)', 'rgba(16, 185, 129, 0.5)'];
      const fibLabels = ['38.2%', '50%', '61.8%'];
      const fibValues = [fibLevels.fib382, fibLevels.fib500, fibLevels.fib618];
      
      fibValues.forEach((level, i) => {
        const line = chartRef.current!.addSeries(LineSeries, {
          color: fibColors[i],
          lineWidth: 1,
          lineStyle: 2,
          lastValueVisible: true,
          title: fibLabels[i],
        });
        line.setData([
          { time: firstTime, value: level },
          { time: lastTime, value: level },
        ]);
        srLinesRef.current.push(line);
      });
    }
  }, [supportLevels, resistanceLevels, pivotLevel, vwapLevel, fibLevels, showSR, showVWAP, showFib, clearSRLines]);

  // Update chart data whenever candles or timeframe change
  useEffect(() => {
    if (candles.length === 0 || !candlestickSeriesRef.current || !volumeSeriesRef.current) return;
    
    // Aggregate candles based on timeframe
    const tfMultiplier = TF_MAP[activeTF];
    const displayCandles = normalizeChartCandles(tfMultiplier > 1 ? aggregateCandles(candles, tfMultiplier) : candles);
    
    const chartData: CandlestickData[] = displayCandles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    
    const volumeData: HistogramData[] = displayCandles.map(c => ({
      time: c.time as Time,
      value: c.volume || Math.abs(c.close - c.open) * 5000 + 1000,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
    }));
    
    candlestickSeriesRef.current.setData(chartData);
    volumeSeriesRef.current.setData(volumeData);
    
    const lastCandle = displayCandles[displayCandles.length - 1];
    setLastPrice(lastCandle.close);
    setDataSource(`Live OHLC - ${activeTF} (${displayCandles.length} candles)`);
    
    // Draw S/R lines
    drawSRLines(chartData);
    
    if (!initialLoadRef.current) {
      chartRef.current?.timeScale().fitContent();
      initialLoadRef.current = true;
      setLoading(false);
    }
  }, [candles, activeTF, drawSRLines]);

  // Re-draw S/R lines when toggles change
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    const tfMultiplier = TF_MAP[activeTF];
    const displayCandles = normalizeChartCandles(tfMultiplier > 1 ? aggregateCandles(candles, tfMultiplier) : candles);
    const chartData: CandlestickData[] = displayCandles.map(c => ({
      time: c.time as Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    drawSRLines(chartData);
  }, [showSR, showVWAP, showFib, candles, activeTF, drawSRLines]);

  const tfButtons: { label: string; value: TimeFrame }[] = [
    { label: '1M', value: '1m' },
    { label: '5M', value: '5m' },
    { label: '15M', value: '15m' },
    { label: '1H', value: '1h' },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-slate-700/50 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">Candlestick Chart</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">{activeTF.toUpperCase()}</span>
          {lastPrice && (
            <span className="flex items-center gap-1 text-xs">
              <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-yellow-400 font-mono font-bold">${lastPrice.toFixed(2)}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Timeframe buttons */}
          <div className="flex bg-slate-800/80 rounded-lg p-0.5 mr-2">
            {tfButtons.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setActiveTF(tf.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTF === tf.value
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {/* Toggle buttons */}
          <button
            onClick={() => setShowSR(!showSR)}
            title="Support/Resistance"
            className={`p-1.5 rounded-lg transition-all ${showSR ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowVWAP(!showVWAP)}
            title="VWAP"
            className={`p-1.5 rounded-lg transition-all ${showVWAP ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowFib(!showFib)}
            title="Fibonacci"
            className={`p-1.5 rounded-lg transition-all ${showFib ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
          </button>
          {onExport && (
            <button
              onClick={onExport}
              title="Export CSV"
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          
          {signalType && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              signalType === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
              signalType === 'SELL' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              {signalType}
            </span>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-1.5 border-b border-slate-800/50 text-xs">
        {showSR && (
          <>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400/60"/>Support</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400/60"/>Resistance</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-400/60 border-dotted"/>Pivot</span>
          </>
        )}
        {showVWAP && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-400"/>VWAP</span>}
        {showFib && (
          <>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400/50"/>Fib 38.2%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400/50"/>Fib 50%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400/50"/>Fib 61.8%</span>
          </>
        )}
      </div>
      
      {/* Chart */}
      <div className="relative" style={{ height: '520px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading Live Chart...</p>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
      
      {/* Data source footer */}
      <div className="px-4 py-1.5 border-t border-slate-800/50 text-xs text-slate-500 flex justify-between">
        <span>{dataSource}</span>
        <span>{candles.length} 1M candles in memory</span>
      </div>
    </div>
  );
};
