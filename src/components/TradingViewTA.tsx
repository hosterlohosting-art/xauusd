import { useState } from 'react';
import { Loader2 } from 'lucide-react';

// TradingView Technical Analysis via iframe - REAL signals
export const TradingViewTA = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">TradingView Technical Analysis</span>
          <span className="text-xs text-slate-400">OANDA:XAUUSD</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">REAL</span>
        </div>
      </div>
      <div className="relative" style={{ height: '420px' }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading Technical Analysis...</p>
            </div>
          </div>
        )}
        <iframe
          src="https://www.tradingview.com/symbols/OANDA-XAUUSD/technicals/"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="TradingView Technical Analysis XAU/USD"
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
};
