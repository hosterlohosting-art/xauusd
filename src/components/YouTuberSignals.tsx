import { useState, useEffect } from 'react';
import { Youtube, TrendingUp, TrendingDown, Users, Clock, ThumbsUp, Eye } from 'lucide-react';

interface TraderSignal {
  id: string;
  name: string;
  channel: string;
  subscribers: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  time: string;
  accuracy: number;
  reasoning: string;
  viewers: number;
}

const generateTraderSignals = (): TraderSignal[] => {
  const traders: Omit<TraderSignal, 'id' | 'signal' | 'confidence' | 'time' | 'reasoning' | 'viewers'>[] = [
    { name: 'Gold Master Pro', channel: '@GoldMasterPro', subscribers: '245K', accuracy: 87 },
    { name: 'XAUUSD Scalper', channel: '@XAUScalper', subscribers: '189K', accuracy: 82 },
    { name: 'Forex Gold Trader', channel: '@ForexGoldTrader', subscribers: '312K', accuracy: 79 },
    { name: 'Gold Signal Hub', channel: '@GoldSignalHub', subscribers: '156K', accuracy: 91 },
    { name: 'Bullion Analyst', channel: '@BullionAnalyst', subscribers: '98K', accuracy: 85 },
    { name: 'Precious Metal Pro', channel: '@PreciousMetalPro', subscribers: '178K', accuracy: 76 },
  ];

  const signals: TraderSignal[] = traders.map((trader, index) => {
    const rand = Math.random();
    const signal: 'BUY' | 'SELL' | 'HOLD' = rand > 0.6 ? 'BUY' : rand > 0.3 ? 'SELL' : 'HOLD';
    const confidence = Math.floor(Math.random() * 30) + 60;
    const minutes = Math.floor(Math.random() * 30) + 1;
    
    const reasonings: Record<string, string[]> = {
      BUY: [
        'RSI divergence on 4H timeframe suggesting bullish reversal',
        'Price bouncing off key support with strong volume',
        'Golden cross forming on daily chart',
        'Fair Value Gap at 2680 likely to be filled upward',
        'Breakout from descending channel confirmed'
      ],
      SELL: [
        'Double top pattern forming at resistance',
        'Bearish engulfing on daily timeframe',
        'Price rejected at 0.618 Fibonacci level',
        'Overbought conditions on multiple timeframes',
        'Liquidity sweep above highs complete'
      ],
      HOLD: [
        'Waiting for breakout confirmation from range',
        'NFP data release upcoming - caution advised',
        'Mixed signals across timeframes',
        'Consolidation phase - patience required',
        'FOMC meeting imminent - avoid new positions'
      ]
    };

    return {
      ...trader,
      id: `trader-${index}-${Date.now()}`,
      signal,
      confidence,
      time: `${minutes}m ago`,
      reasoning: reasonings[signal][Math.floor(Math.random() * reasonings[signal].length)],
      viewers: Math.floor(Math.random() * 5000) + 500
    };
  });

  return signals.sort((a, b) => b.accuracy - a.accuracy);
};

export const YouTuberSignals = () => {
  const [signals, setSignals] = useState<TraderSignal[]>([]);
  const [filter, setFilter] = useState<'all' | 'BUY' | 'SELL'>('all');

  useEffect(() => {
    setSignals(generateTraderSignals());
    
    const interval = setInterval(() => {
      setSignals(generateTraderSignals());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const filteredSignals = filter === 'all' ? signals : signals.filter(s => s.signal === filter);

  const getSignalColor = (signal: string) => {
    if (signal === 'BUY') return 'bg-emerald-500/10 border-emerald-500/30';
    if (signal === 'SELL') return 'bg-red-500/10 border-red-500/30';
    return 'bg-amber-500/10 border-amber-500/30';
  };

  const getSignalTextColor = (signal: string) => {
    if (signal === 'BUY') return 'text-emerald-400';
    if (signal === 'SELL') return 'text-red-400';
    return 'text-amber-400';
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          Top Trader Signals
        </h3>
        <div className="flex items-center gap-1">
          {(['all', 'BUY', 'SELL'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                filter === f 
                  ? f === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                    f === 'SELL' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {filteredSignals.map((trader) => (
          <div 
            key={trader.id}
            className={`p-3 rounded-xl border ${getSignalColor(trader.signal)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  trader.signal === 'BUY' ? 'bg-emerald-500/20' :
                  trader.signal === 'SELL' ? 'bg-red-500/20' :
                  'bg-amber-500/20'
                }`}>
                  {trader.signal === 'BUY' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                   trader.signal === 'SELL' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                   <ThumbsUp className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{trader.name}</p>
                  <p className="text-xs text-slate-400">{trader.channel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${getSignalTextColor(trader.signal)}`}>
                  {trader.signal}
                </p>
                <p className="text-xs text-slate-500">{trader.confidence}% conf</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 mb-2">{trader.reasoning}</p>
            
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {trader.subscribers}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {trader.viewers}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {trader.time}
                </span>
                <span className={`px-2 py-0.5 rounded-full ${
                  trader.accuracy > 85 ? 'bg-emerald-500/20 text-emerald-400' :
                  trader.accuracy > 75 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {trader.accuracy}% acc
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
