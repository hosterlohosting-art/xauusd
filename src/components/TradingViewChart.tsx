import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface TradingViewChartProps {
  signalType?: 'BUY' | 'SELL' | 'HOLD' | null;
}

// TradingView Advanced Chart via iframe - REAL DATA from OANDA
export const TradingViewChart = ({ signalType }: TradingViewChartProps) => {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build TradingView chart URL with all settings
  const tvUrl = new URL('https://www.tradingview.com/chart/');
  tvUrl.searchParams.set('symbol', 'OANDA:XAUUSD');
  tvUrl.searchParams.set('interval', '1');
  tvUrl.searchParams.set('theme', 'dark');
  tvUrl.searchParams.set('style', '1'); // Candlestick
  tvUrl.searchParams.set('timezone', 'exchange');
  tvUrl.searchParams.set('hide_top_toolbar', 'false');
  tvUrl.searchParams.set('hide_legend', 'false');
  tvUrl.searchParams.set('save_image', 'false');
  tvUrl.searchParams.set('calendar', 'true');

  useEffect(() => {
    // Pre-load check
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">Real-Time Chart</span>
          <span className="text-xs text-slate-400">OANDA Data</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">LIVE</span>
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
          {signalType && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              signalType === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
              signalType === 'SELL' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              Signal: {signalType}
            </span>
          )}
        </div>
      </div>
      
      {/* TradingView iframe */}
      <div className="relative" style={{ height: '500px' }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading TradingView Chart...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={tvUrl.toString()}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="TradingView XAU/USD Chart"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      
      <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Powered by <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">TradingView</a>
        </span>
        <span className="text-xs text-slate-500">
          Data: OANDA | Real-time streaming
        </span>
      </div>
    </div>
  );
};
