import { useState, useEffect } from 'react';
import type { SignalResult } from '@/types/trading';
import { Timer as TimerIcon, TrendingUp, TrendingDown, AlertTriangle, Lock, Shield } from 'lucide-react';

interface TimerProps {
  signal: SignalResult | null;
}

export const Timer = ({ signal }: TimerProps) => {
  const [countdown, setCountdown] = useState(30);
  const [lastSignalTime, setLastSignalTime] = useState(Date.now());
  const [signalAge, setSignalAge] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) return 30;
        return prev - 1;
      });
      setSignalAge(Math.floor((Date.now() - lastSignalTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSignalTime]);

  useEffect(() => {
    if (signal && signal.type !== 'HOLD') {
      setLastSignalTime(Date.now());
      setSignalAge(0);
      setCountdown(30);
    }
  }, [signal]);

  const getUrgencyColor = () => {
    if (countdown > 20) return 'text-emerald-400';
    if (countdown > 10) return 'text-amber-400';
    return 'text-red-400';
  };

  const getProgressColor = () => {
    if (countdown > 20) return 'bg-emerald-500';
    if (countdown > 10) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getFreshnessLabel = () => {
    if (signalAge < 15) return { label: 'FRESH', color: 'text-emerald-400', barColor: 'bg-emerald-500' };
    if (signalAge < 30) return { label: 'RECENT', color: 'text-amber-400', barColor: 'bg-amber-500' };
    if (signalAge < 60) return { label: 'AGING', color: 'text-orange-400', barColor: 'bg-orange-500' };
    return { label: 'STALE', color: 'text-red-400', barColor: 'bg-red-500' };
  };

  const freshness = getFreshnessLabel();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Price Refresh Timer */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TimerIcon className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-300">Next Price Update</span>
          </div>
          <span className={`text-2xl font-bold ${getUrgencyColor()}`}>{countdown}s</span>
        </div>
        <div className="w-full h-2 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${(countdown / 30) * 100}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">Gold price refreshes every 5 seconds</p>
      </div>

      {/* Signal Status with STABILITY */}
      <div className={`rounded-xl p-4 border backdrop-blur-sm ${
        signal?.type === 'BUY' ? 'bg-emerald-500/5 border-emerald-500/30' :
        signal?.type === 'SELL' ? 'bg-red-500/5 border-red-500/30' :
        'bg-amber-500/5 border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {signal?.type === 'BUY' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
             signal?.type === 'SELL' ? <TrendingDown className="w-5 h-5 text-red-400" /> :
             <AlertTriangle className="w-5 h-5 text-amber-400" />}
            <span className="text-sm text-slate-300">Active Signal</span>
          </div>
          <span className={`text-lg font-bold ${
            signal?.type === 'BUY' ? 'text-emerald-400' :
            signal?.type === 'SELL' ? 'text-red-400' :
            'text-amber-400'
          }`}>
            {signal?.type || 'ANALYZING'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Lock className="w-3 h-3 text-blue-400" />
          <p className="text-xs text-blue-400">
            Signal locks for 15s minimum
          </p>
        </div>
      </div>

      {/* Signal Freshness */}
      <div className="rounded-xl p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-300">Signal Age</span>
          </div>
          <span className={`text-sm font-bold ${freshness.color}`}>
            {freshness.label}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${freshness.barColor}`}
            style={{ width: `${Math.max(5, 100 - (signalAge / 60) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {signalAge < 60 ? `${signalAge}s old` : `${Math.floor(signalAge / 60)}m ${signalAge % 60}s old`}
        </p>
      </div>
    </div>
  );
};
