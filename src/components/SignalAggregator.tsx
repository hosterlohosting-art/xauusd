import { useState, useEffect } from 'react';
import { Globe, TrendingUp, TrendingDown, Minus, RefreshCw, Shield } from 'lucide-react';

interface AggregatedSignal {
  id: string;
  source: string;
  type: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: string;
  indicator: string;
}

const generateAggregatedSignals = (): AggregatedSignal[] => {
  const sources = [
    { source: 'TradingView', type: 'Community', weight: 85 },
    { source: 'Investing.com', type: 'Technical', weight: 90 },
    { source: 'DailyFX', type: 'Fundamental', weight: 80 },
    { source: 'ForexFactory', type: 'News-Based', weight: 75 },
    { source: 'FXStreet', type: 'Analysis', weight: 88 },
    { source: 'Bloomberg', type: 'Institutional', weight: 95 },
    { source: 'Reuters', type: 'News', weight: 92 },
    { source: 'Kitco', type: 'Gold Specialist', weight: 87 },
  ];

  return sources.map((s, index) => {
    const rand = Math.random();
    const signal: 'BUY' | 'SELL' | 'HOLD' = rand > 0.55 ? 'BUY' : rand > 0.3 ? 'SELL' : 'HOLD';
    const confidence = Math.floor(Math.random() * 25) + s.weight - 15;
    const indicators = ['RSI', 'MACD', 'Moving Average', 'Bollinger', 'Fibonacci', 'Ichimoku', 'Pivot Points', 'Volume Profile'];
    
    return {
      id: `agg-${index}-${Date.now()}`,
      source: s.source,
      type: s.type,
      signal,
      confidence: Math.min(98, confidence),
      timestamp: `${Math.floor(Math.random() * 15) + 1}m ago`,
      indicator: indicators[Math.floor(Math.random() * indicators.length)]
    };
  }).sort((a, b) => b.confidence - a.confidence);
};

export const SignalAggregator = () => {
  const [signals, setSignals] = useState<AggregatedSignal[]>([]);
  const [consensus, setConsensus] = useState({ buy: 0, sell: 0, hold: 0 });

  useEffect(() => {
    const newSignals = generateAggregatedSignals();
    setSignals(newSignals);
    
    const buyCount = newSignals.filter(s => s.signal === 'BUY').length;
    const sellCount = newSignals.filter(s => s.signal === 'SELL').length;
    const holdCount = newSignals.filter(s => s.signal === 'HOLD').length;
    setConsensus({ buy: buyCount, sell: sellCount, hold: holdCount });
  }, []);

  const refreshSignals = () => {
    const newSignals = generateAggregatedSignals();
    setSignals(newSignals);
    const buyCount = newSignals.filter(s => s.signal === 'BUY').length;
    const sellCount = newSignals.filter(s => s.signal === 'SELL').length;
    const holdCount = newSignals.filter(s => s.signal === 'HOLD').length;
    setConsensus({ buy: buyCount, sell: sellCount, hold: holdCount });
  };

  const total = consensus.buy + consensus.sell + consensus.hold;
  const buyPercent = total > 0 ? (consensus.buy / total) * 100 : 0;
  const sellPercent = total > 0 ? (consensus.sell / total) * 100 : 0;
  
  const overallSignal = consensus.buy > consensus.sell + 2 ? 'STRONG BUY' :
    consensus.buy > consensus.sell ? 'BUY' :
    consensus.sell > consensus.buy + 2 ? 'STRONG SELL' :
    consensus.sell > consensus.buy ? 'SELL' : 'NEUTRAL';

  const getSignalColor = (signal: string) => {
    if (signal === 'BUY' || signal === 'STRONG BUY') return 'text-emerald-400';
    if (signal === 'SELL' || signal === 'STRONG SELL') return 'text-red-400';
    return 'text-amber-400';
  };

  const getSignalBg = (signal: string) => {
    if (signal === 'BUY' || signal === 'STRONG BUY') return 'bg-emerald-500/10 border-emerald-500/30';
    if (signal === 'SELL' || signal === 'STRONG SELL') return 'bg-red-500/10 border-red-500/30';
    return 'bg-amber-500/10 border-amber-500/30';
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-sky-400" />
          Signal Aggregator
        </h3>
        <button 
          onClick={refreshSignals}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Consensus */}
      <div className={`p-4 rounded-xl border mb-4 ${getSignalBg(overallSignal)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">Market Consensus</span>
          <span className={`text-lg font-black ${getSignalColor(overallSignal)}`}>{overallSignal}</span>
        </div>
        <div className="flex items-center gap-1 h-3">
          <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${buyPercent}%` }} />
          <div className="h-full bg-amber-500" style={{ width: `${(consensus.hold / total) * 100}%` }} />
          <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${sellPercent}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-emerald-400">{consensus.buy} Buy</span>
          <span className="text-amber-400">{consensus.hold} Hold</span>
          <span className="text-red-400">{consensus.sell} Sell</span>
        </div>
      </div>

      {/* Signal Sources */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar">
        {signals.map((sig) => (
          <div key={sig.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {sig.signal === 'BUY' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                 sig.signal === 'SELL' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                 <Minus className="w-4 h-4 text-amber-400" />}
                <div>
                  <p className="text-sm font-bold text-white">{sig.source}</p>
                  <p className="text-xs text-slate-500">{sig.type} | {sig.indicator}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  sig.signal === 'BUY' ? 'text-emerald-400' :
                  sig.signal === 'SELL' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {sig.signal}
                </p>
                <p className="text-xs text-slate-500">{sig.timestamp}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-3 h-3 text-slate-500" />
              <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    sig.signal === 'BUY' ? 'bg-emerald-500' :
                    sig.signal === 'SELL' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${sig.confidence}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{sig.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
