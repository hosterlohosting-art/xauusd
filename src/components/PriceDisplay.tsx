import { useEffect, useRef, useState } from 'react';
import type { PriceData } from '@/types/trading';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

interface PriceDisplayProps {
  priceData: PriceData;
}

export const PriceDisplay = ({ priceData }: PriceDisplayProps) => {
  const currentPrice = priceData.current;
  const [flashColor, setFlashColor] = useState<string>('');
  const prevPriceRef = useRef(currentPrice);

  useEffect(() => {
    const prevPrice = prevPriceRef.current;
    if (currentPrice > prevPrice) {
      setFlashColor('flash-green');
    } else if (currentPrice < prevPrice) {
      setFlashColor('flash-red');
    }
    const timer = setTimeout(() => setFlashColor(''), 300);
    prevPriceRef.current = currentPrice;
    return () => clearTimeout(timer);
  }, [currentPrice]);

  const isPositive = priceData.change >= 0;
  const timeString = new Date(priceData.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className={`price-display ${flashColor} rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">XAU/USD</h1>
            <p className="text-xs text-slate-400">Gold Spot US Dollar</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{timeString}</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold text-white tracking-tight">
              {priceData.current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-lg text-slate-400 mb-1">USD</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-semibold">
                {isPositive ? '+' : ''}{priceData.change.toFixed(2)} ({isPositive ? '+' : ''}{priceData.changePercent}%)
              </span>
            </div>
            <span className="text-xs text-slate-500">Today</span>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">Open</span>
            <span className="text-white font-mono">{priceData.open.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">High</span>
            <span className="text-emerald-400 font-mono">{priceData.high.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">Low</span>
            <span className="text-red-400 font-mono">{priceData.low.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
