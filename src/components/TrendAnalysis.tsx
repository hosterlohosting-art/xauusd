import { useTrendAnalysis } from '@/hooks/useTechnicalIndicators';
import type { CandleData } from '@/types/trading';
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowDown, ArrowUp } from 'lucide-react';

interface TrendAnalysisProps {
  candles: CandleData[];
}

export const TrendAnalysis = ({ candles }: TrendAnalysisProps) => {
  const trend = useTrendAnalysis(candles);

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-400" />
        Trend Analysis
      </h3>

      {/* Trend Direction */}
      <div className="mb-4">
        <div className={`flex items-center gap-4 p-4 rounded-xl ${
          trend.direction === 'uptrend' ? 'bg-emerald-500/10 border border-emerald-500/30' :
          trend.direction === 'downtrend' ? 'bg-red-500/10 border border-red-500/30' :
          'bg-amber-500/10 border border-amber-500/30'
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            trend.direction === 'uptrend' ? 'bg-emerald-500/20' :
            trend.direction === 'downtrend' ? 'bg-red-500/20' :
            'bg-amber-500/20'
          }`}>
            {trend.direction === 'uptrend' ? <TrendingUp className="w-7 h-7 text-emerald-400" /> :
             trend.direction === 'downtrend' ? <TrendingDown className="w-7 h-7 text-red-400" /> :
             <Minus className="w-7 h-7 text-amber-400" />}
          </div>
          <div>
            <p className={`text-2xl font-black ${
              trend.direction === 'uptrend' ? 'text-emerald-400' :
              trend.direction === 'downtrend' ? 'text-red-400' :
              'text-amber-400'
            }`}>
              {trend.direction === 'uptrend' ? 'UPTREND' : trend.direction === 'downtrend' ? 'DOWNTREND' : 'SIDEWAYS'}
            </p>
            <p className="text-sm text-slate-400">Current Market Direction</p>
          </div>
        </div>
      </div>

      {/* Trend Strength */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Trend Strength</span>
          <span className={`text-sm font-bold ${
            trend.strength > 70 ? 'text-emerald-400' : 
            trend.strength > 40 ? 'text-amber-400' : 'text-slate-400'
          }`}>{trend.strength}%</span>
        </div>
        <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              trend.strength > 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
              trend.strength > 40 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
              'bg-gradient-to-r from-slate-600 to-slate-400'
            }`}
            style={{ width: `${trend.strength}%` }}
          />
        </div>
      </div>

      {/* Support and Resistance */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-400">Support</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{trend.support.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Buy zone near this level</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp className="w-4 h-4 text-red-400" />
            <span className="text-sm text-slate-400">Resistance</span>
          </div>
          <p className="text-xl font-bold text-red-400">{trend.resistance.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">Sell zone near this level</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
        <p className="text-sm text-slate-300 leading-relaxed">{trend.description}</p>
      </div>
    </div>
  );
};
