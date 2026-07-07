import { useFVGDetection } from '@/hooks/usePatternRecognition';
import type { CandleData } from '@/types/trading';
import { Layers, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface FVGDetectorProps {
  candles: CandleData[];
}

export const FVGDetector = ({ candles }: FVGDetectorProps) => {
  const fvgs = useFVGDetection(candles);

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          Fair Value Gaps (FVG)
        </h3>
        <span className="text-xs text-slate-400">{fvgs.length} gaps detected</span>
      </div>

      {fvgs.length === 0 ? (
        <div className="text-center py-8">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No FVGs detected in recent candles</p>
          <p className="text-xs text-slate-600 mt-1">FVGs appear when price gaps without overlap</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {fvgs.map((fvg, index) => (
            <div 
              key={index}
              className={`p-3 rounded-xl border ${
                fvg.type === 'bullish' 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {fvg.type === 'bullish' 
                    ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                    : <TrendingDown className="w-4 h-4 text-red-400" />
                  }
                  <span className={`text-sm font-bold ${
                    fvg.type === 'bullish' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {fvg.type === 'bullish' ? 'Bullish FVG' : 'Bearish FVG'}
                  </span>
                </div>
                <span className={`text-xs font-bold ${
                  fvg.confidence > 70 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {fvg.confidence}% strength
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{fvg.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Target className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-slate-300">
                  Zone: <span className="font-mono">{fvg.bottom.toFixed(2)}</span> - <span className="font-mono">{fvg.top.toFixed(2)}</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    fvg.type === 'bullish' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${fvg.confidence}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
