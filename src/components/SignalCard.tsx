import type { SignalResult } from '@/types/trading';
import { ArrowUp, ArrowDown, Minus, Target, Shield, Zap } from 'lucide-react';

interface SignalCardProps {
  signal: SignalResult | null;
}

export const SignalCard = ({ signal }: SignalCardProps) => {
  if (!signal) {
    return (
      <div className="rounded-2xl p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-slate-700/50 animate-pulse mx-auto mb-3" />
          <p className="text-slate-400">Analyzing market data...</p>
        </div>
      </div>
    );
  }

  const isBuy = signal.type === 'BUY';
  const isSell = signal.type === 'SELL';

  const gradientClass = isBuy
    ? 'from-emerald-900/40 via-emerald-800/20 to-slate-900 border-emerald-500/50'
    : isSell
    ? 'from-red-900/40 via-red-800/20 to-slate-900 border-red-500/50'
    : 'from-amber-900/40 via-amber-800/20 to-slate-900 border-amber-500/50';

  const glowClass = isBuy
    ? 'shadow-emerald-500/20'
    : isSell
    ? 'shadow-red-500/20'
    : 'shadow-amber-500/20';

  return (
    <div className={`rounded-2xl p-6 bg-gradient-to-br ${gradientClass} border ${glowClass} shadow-2xl transition-all duration-500`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isBuy ? 'bg-emerald-500/20' : isSell ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
            {isBuy ? <ArrowUp className="w-8 h-8 text-emerald-400" /> : isSell ? <ArrowDown className="w-8 h-8 text-red-400" /> : <Minus className="w-8 h-8 text-amber-400" />}
          </div>
          <div>
            <h2 className={`text-3xl font-black ${isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-amber-400'}`}>
              {signal.type}
            </h2>
            <p className="text-xs text-slate-400">AI-Generated Signal</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Confidence</span>
          </div>
          <div className={`text-2xl font-bold ${signal.confidence > 70 ? 'text-emerald-400' : signal.confidence > 40 ? 'text-amber-400' : 'text-slate-400'}`}>
            {signal.confidence}%
          </div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isBuy ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : isSell ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* Entry/Stop Loss/Take Profit */}
      {(signal.entryPrice && (signal.stopLoss || signal.takeProfit)) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-slate-400">Entry</span>
            </div>
            <p className="text-white font-mono font-bold">{signal.entryPrice.toFixed(2)}</p>
          </div>
          {signal.stopLoss && (
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-red-400" />
                <span className="text-xs text-slate-400">Stop Loss</span>
              </div>
              <p className="text-red-400 font-mono font-bold">{signal.stopLoss.toFixed(2)}</p>
            </div>
          )}
          {signal.takeProfit && (
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-slate-400">Take Profit</span>
              </div>
              <p className="text-emerald-400 font-mono font-bold">{signal.takeProfit.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      {/* Signal Reasons */}
      <div className="space-y-2">
        {signal.reason.map((reason, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${isBuy ? 'bg-emerald-400' : isSell ? 'bg-red-400' : 'bg-amber-400'}`} />
            <span className="text-slate-300">{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
