import { useMemo } from 'react';
import type { CandleData } from '@/types/trading';
import { Clock, TrendingUp, TrendingDown, Minus, Activity, Shield } from 'lucide-react';

interface TimeFrameSignal {
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  trend: 'up' | 'down' | 'sideways';
  strength: number;
}

interface MultiTimeframeAnalysisProps {
  candles: CandleData[];
}

export const MultiTimeframeAnalysis = ({ candles }: MultiTimeframeAnalysisProps) => {
  const timeframes = useMemo((): TimeFrameSignal[] => {
    if (candles.length < 50) return [];

    // Use different lookback periods for each timeframe to get DIFFERENT results
    const configs = [
      { label: '1M', lookback: 20, fastPeriod: 3, slowPeriod: 8 },
      { label: '5M', lookback: 50, fastPeriod: 5, slowPeriod: 12 },
      { label: '15M', lookback: 100, fastPeriod: 8, slowPeriod: 20 },
      { label: '1H', lookback: 200, fastPeriod: 12, slowPeriod: 26 },
    ];

    return configs.map(cfg => {
      const slice = candles.slice(-cfg.lookback);
      const trend = calculateTrend(slice);
      const signal = generateSignal(slice, cfg.fastPeriod, cfg.slowPeriod);
      
      return {
        timeframe: cfg.label,
        signal: signal.signal,
        confidence: signal.confidence,
        trend: trend.direction,
        strength: trend.strength,
      };
    });
  }, [candles]);

  const overallAlignment = useMemo(() => {
    if (timeframes.length === 0) return { alignment: 'NEUTRAL', score: 50 };
    
    const buyCount = timeframes.filter(t => t.signal === 'BUY').length;
    const sellCount = timeframes.filter(t => t.signal === 'SELL').length;
    
    if (buyCount >= 3) return { alignment: 'STRONG BUY', score: 90 };
    if (buyCount === 2) return { alignment: 'BUY', score: 70 };
    if (sellCount >= 3) return { alignment: 'STRONG SELL', score: 90 };
    if (sellCount === 2) return { alignment: 'SELL', score: 70 };
    return { alignment: 'MIXED', score: 50 };
  }, [timeframes]);

  const getSignalColor = (signal: string) => {
    if (signal === 'BUY') return 'text-emerald-400';
    if (signal === 'SELL') return 'text-red-400';
    return 'text-amber-400';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-amber-400" />;
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Multi-Timeframe Analysis
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          overallAlignment.alignment.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' :
          overallAlignment.alignment.includes('SELL') ? 'bg-red-500/20 text-red-400' :
          'bg-amber-500/20 text-amber-400'
        }`}>
          {overallAlignment.alignment}
        </div>
      </div>

      {/* Alignment Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Timeframe Agreement</span>
          <span className={`text-xs font-bold ${
            overallAlignment.score > 70 ? 'text-emerald-400' : 
            overallAlignment.score > 50 ? 'text-amber-400' : 'text-slate-400'
          }`}>
            {overallAlignment.score}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              overallAlignment.alignment.includes('BUY') ? 'bg-emerald-500' :
              overallAlignment.alignment.includes('SELL') ? 'bg-red-500' :
              'bg-amber-500'
            }`}
            style={{ width: `${overallAlignment.score}%` }}
          />
        </div>
      </div>

      {timeframes.length === 0 ? (
        <div className="text-center py-4">
          <Activity className="w-6 h-6 text-slate-600 mx-auto mb-2 animate-spin" />
          <p className="text-xs text-slate-500">Analyzing timeframes...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeframes.map((tf) => (
            <div key={tf.timeframe} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white w-8">{tf.timeframe}</span>
                  {getTrendIcon(tf.trend)}
                  <span className={`text-sm font-bold ${getSignalColor(tf.signal)}`}>
                    {tf.signal}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-slate-500" />
                  <span className={`text-xs font-bold ${
                    tf.confidence > 70 ? 'text-emerald-400' : 
                    tf.confidence > 40 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {tf.confidence}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      tf.signal === 'BUY' ? 'bg-emerald-500' :
                      tf.signal === 'SELL' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`}
                    style={{ width: `${tf.confidence}%` }}
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

// Helper functions
function calculateTrend(candles: CandleData[]): { direction: 'up' | 'down' | 'sideways'; strength: number } {
  if (candles.length < 2) return { direction: 'sideways', strength: 0 };
  
  const firstPrice = candles[0].close;
  const lastPrice = candles[candles.length - 1].close;
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  let direction: 'up' | 'down' | 'sideways' = 'sideways';
  if (change > 0.03) direction = 'up';
  else if (change < -0.03) direction = 'down';
  
  const strength = Math.min(100, Math.max(20, Math.abs(change) * 30));
  
  return { direction, strength: Math.round(strength) };
}

function generateSignal(candles: CandleData[], fastPeriod: number = 5, slowPeriod: number = 10): { signal: 'BUY' | 'SELL' | 'HOLD'; confidence: number } {
  if (candles.length < slowPeriod + 2) return { signal: 'HOLD', confidence: 0 };
  
  const closes = candles.map(c => c.close);
  
  const fp = Math.min(fastPeriod, Math.floor(candles.length / 3));
  const sp = Math.min(slowPeriod, Math.floor(candles.length / 2));
  
  const smaFast = closes.slice(-fp).reduce((a, b) => a + b, 0) / fp;
  const smaSlow = closes.slice(-sp).reduce((a, b) => a + b, 0) / sp;
  
  if (smaFast > smaSlow * 1.0005) {
    const confidence = Math.min(95, Math.round(55 + ((smaFast - smaSlow) / smaSlow) * 8000));
    return { signal: 'BUY', confidence };
  }
  if (smaFast < smaSlow * 0.9995) {
    const confidence = Math.min(95, Math.round(55 + ((smaSlow - smaFast) / smaSlow) * 8000));
    return { signal: 'SELL', confidence };
  }
  
  return { signal: 'HOLD', confidence: 45 };
}
