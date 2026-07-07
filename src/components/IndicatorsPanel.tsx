import { useTechnicalIndicators } from '@/hooks/useTechnicalIndicators';
import type { CandleData } from '@/types/trading';
import { Activity, TrendingUp, BarChart3, Waves, ArrowUpDown } from 'lucide-react';

interface IndicatorsPanelProps {
  candles: CandleData[];
}

export const IndicatorsPanel = ({ candles }: IndicatorsPanelProps) => {
  const indicators = useTechnicalIndicators(candles);

  if (!indicators) {
    return (
      <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Technical Indicators
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { rsi, macd, bollinger, movingAverages, stochastic, atr } = indicators;

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        Technical Indicators
      </h3>

      <div className="space-y-4">
        {/* RSI */}
        <IndicatorRow 
          label="RSI (14)"
          value={rsi}
          icon={<TrendingUp className="w-4 h-4" />}
          gauge={rsi}
          maxValue={100}
          zones={[
            { min: 0, max: 30, color: 'bg-emerald-500', label: 'Oversold' },
            { min: 30, max: 70, color: 'bg-slate-500', label: 'Neutral' },
            { min: 70, max: 100, color: 'bg-red-500', label: 'Overbought' }
          ]}
        />

        {/* MACD */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-300">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">MACD (12,26,9)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricBox label="MACD" value={macd.macd} color={macd.macd > 0 ? 'text-emerald-400' : 'text-red-400'} />
            <MetricBox label="Signal" value={macd.signal} color={macd.signal > 0 ? 'text-emerald-400' : 'text-red-400'} />
            <MetricBox label="Histogram" value={macd.histogram} color={macd.histogram > 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Waves className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Bollinger Bands (20,2)</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricBox label="Upper" value={bollinger.upper} color="text-cyan-400" />
            <MetricBox label="Middle" value={bollinger.middle} color="text-slate-300" />
            <MetricBox label="Lower" value={bollinger.lower} color="text-cyan-400" />
          </div>
        </div>

        {/* Moving Averages */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-slate-300">
              <ArrowUpDown className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium">Moving Averages</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MetricBox label="SMA 20" value={movingAverages.sma20} color="text-orange-400" />
            <MetricBox label="SMA 50" value={movingAverages.sma50} color="text-orange-400" />
            <MetricBox label="EMA 12" value={movingAverages.ema12} color="text-blue-400" />
            <MetricBox label="EMA 26" value={movingAverages.ema26} color="text-blue-400" />
          </div>
        </div>

        {/* Stochastic */}
        <IndicatorRow 
          label="Stochastic %K"
          value={stochastic.k}
          icon={<Activity className="w-4 h-4" />}
          gauge={stochastic.k}
          maxValue={100}
          zones={[
            { min: 0, max: 20, color: 'bg-emerald-500', label: 'Oversold' },
            { min: 20, max: 80, color: 'bg-slate-500', label: 'Neutral' },
            { min: 80, max: 100, color: 'bg-red-500', label: 'Overbought' }
          ]}
        />

        {/* ATR */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Activity className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-medium">ATR (14)</span>
            </div>
            <span className="text-lg font-bold text-pink-400">{atr.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Average True Range - Volatility measure</p>
        </div>
      </div>
    </div>
  );
};

const IndicatorRow = ({ 
  label, 
  value, 
  icon, 
  gauge, 
  maxValue, 
  zones 
}: { 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  gauge: number; 
  maxValue: number;
  zones: { min: number; max: number; color: string; label: string }[];
}) => {
  const percentage = (gauge / maxValue) * 100;
  const currentZone = zones.find(z => gauge >= z.min && gauge <= z.max);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-300">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">{value.toFixed(1)}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {currentZone?.label}
          </span>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${currentZone?.color || 'bg-slate-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const MetricBox = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="bg-slate-900/50 rounded-lg p-2 text-center">
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    <p className={`text-sm font-bold ${color}`}>{value.toFixed(2)}</p>
  </div>
);
