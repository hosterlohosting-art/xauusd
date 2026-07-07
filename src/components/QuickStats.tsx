import { useMemo } from 'react';
import type { CandleData } from '@/types/trading';
import { BarChart3, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface QuickStatsProps {
  candles: CandleData[];
  priceData: {
    high: number;
    low: number;
    change: number;
    changePercent: number;
  };
}

export const QuickStats = ({ candles, priceData }: QuickStatsProps) => {
  const stats = useMemo(() => {
    if (candles.length < 2) return null;

    const lastCandles = candles.slice(-20);
    const bullishCandles = lastCandles.filter(c => c.close >= c.open).length;
    const bullishPercent = Math.round((bullishCandles / lastCandles.length) * 100);
    
    // Calculate 24H high/low from ALL candles (not just current tick)
    const allHighs = candles.map(c => c.high);
    const allLows = candles.map(c => c.low);
    const dayHigh = Math.max(...allHighs);
    const dayLow = Math.min(...allLows);
    
    const volatility = ((dayHigh - dayLow) / dayLow * 100).toFixed(2);
    
    const avgVolume = Math.round(lastCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / lastCandles.length);
    
    const priceRange = dayHigh - dayLow;
    const currentPrice = candles[candles.length - 1].close;
    const positionInRange = priceRange > 0 
      ? ((currentPrice - dayLow) / priceRange * 100).toFixed(1) 
      : '50';

    return {
      dayHigh,
      dayLow,
      volatility,
      avgVolume,
      priceRange,
      positionInRange,
      bullishPercent,
      bullishCandles,
      totalCandles: lastCandles.length,
      currentPrice
    };
  }, [candles]);

  if (!stats) return null;

  const isPositive = priceData.change >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard 
        label="24H Change"
        value={`${isPositive ? '+' : ''}${priceData.change.toFixed(2)}`}
        subValue={`(${isPositive ? '+' : ''}${priceData.changePercent}%)`}
        icon={<TrendingUp className="w-4 h-4" />}
        color={isPositive ? 'emerald' : 'red'}
      />
      <StatCard 
        label="24H High"
        value={stats.dayHigh.toFixed(2)}
        icon={<TrendingUp className="w-4 h-4" />}
        color="emerald"
      />
      <StatCard 
        label="24H Low"
        value={stats.dayLow.toFixed(2)}
        icon={<TrendingDown className="w-4 h-4" />}
        color="red"
      />
      <StatCard 
        label="Volatility"
        value={`${stats.volatility}%`}
        icon={<Activity className="w-4 h-4" />}
        color="amber"
      />
      <StatCard 
        label="Bullish Candles"
        value={`${stats.bullishPercent}%`}
        subValue={`${stats.bullishCandles}/${stats.totalCandles}`}
        icon={<Zap className="w-4 h-4" />}
        color="emerald"
      />
      <StatCard 
        label="Avg Volume"
        value={stats.avgVolume.toLocaleString()}
        icon={<BarChart3 className="w-4 h-4" />}
        color="blue"
      />
      <StatCard 
        label="24H Range"
        value={`${stats.priceRange.toFixed(2)}`}
        subValue={`Position: ${stats.positionInRange}%`}
        icon={<Activity className="w-4 h-4" />}
        color="purple"
      />
      <StatCard 
        label="Active Trend"
        value={stats.bullishPercent > 60 ? 'BULLISH' : stats.bullishPercent < 40 ? 'BEARISH' : 'NEUTRAL'}
        icon={<TrendingUp className="w-4 h-4" />}
        color={stats.bullishPercent > 60 ? 'emerald' : stats.bullishPercent < 40 ? 'red' : 'amber'}
      />
    </div>
  );
};

const StatCard = ({ 
  label, 
  value, 
  subValue, 
  icon, 
  color 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
  icon: React.ReactNode; 
  color: string;
}) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border ${colors.border} backdrop-blur-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <span className={colors.text}>{icon}</span>
        </div>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-lg font-bold ${colors.text}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
};
