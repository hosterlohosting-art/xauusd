import { usePatternRecognition } from '@/hooks/usePatternRecognition';
import type { CandleData } from '@/types/trading';
import { Search, TrendingUp, TrendingDown, Minus, Star, Zap, AlertTriangle } from 'lucide-react';

interface PatternRecognitionProps {
  candles: CandleData[];
}

export const PatternRecognition = ({ candles }: PatternRecognitionProps) => {
  const patterns = usePatternRecognition(candles);

  const getTypeIcon = (type: string) => {
    if (type === 'bullish') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (type === 'bearish') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-amber-400" />;
  };

  const getTypeColor = (type: string) => {
    if (type === 'bullish') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    if (type === 'bearish') return 'bg-red-500/10 border-red-500/30 text-red-400';
    return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
  };

  const getStrengthIcon = (strength: string) => {
    if (strength === 'strong') return <Zap className="w-3 h-3 text-yellow-400" />;
    if (strength === 'moderate') return <Star className="w-3 h-3 text-blue-400" />;
    return <AlertTriangle className="w-3 h-3 text-slate-400" />;
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          Chart Pattern Scanner
        </h3>
        <span className="text-xs text-slate-400">{patterns.length} patterns detected</span>
      </div>

      {patterns.length === 0 ? (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Scanning for patterns...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {patterns.map((pattern, index) => (
            <div 
              key={`${pattern.name}-${index}`}
              className={`p-3 rounded-xl border ${getTypeColor(pattern.type)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(pattern.type)}
                  <span className="text-sm font-bold">{pattern.name}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    {getStrengthIcon(pattern.strength)}
                    {pattern.strength}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-bold ${
                    pattern.confidence > 80 ? 'text-emerald-400' : 
                    pattern.confidence > 50 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {pattern.confidence}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">{pattern.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{pattern.candles} candle{pattern.candles > 1 ? 's' : ''}</span>
                <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      pattern.type === 'bullish' ? 'bg-emerald-500' : 
                      pattern.type === 'bearish' ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${pattern.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
