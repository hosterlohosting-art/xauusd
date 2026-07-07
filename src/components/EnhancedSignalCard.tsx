import type { StrategyResult } from '@/hooks/useAdvancedStrategy';
import { ArrowUp, ArrowDown, Minus, Target, Shield, Zap, TrendingUp, Activity, Layers, BookOpen, AlertTriangle, Percent, Gauge, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface EnhancedSignalCardProps {
  strategy: StrategyResult | null;
}

export const EnhancedSignalCard = ({ strategy }: EnhancedSignalCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!strategy) {
    return (
      <div className="rounded-2xl p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-slate-700/50 animate-pulse mx-auto mb-3" />
          <p className="text-slate-400">Loading professional strategy engine...</p>
          <p className="text-xs text-slate-600 mt-1">6 strategies initializing</p>
        </div>
      </div>
    );
  }

  const isBuy = strategy.type === 'BUY';
  const isSell = strategy.type === 'SELL';
  const isHold = strategy.type === 'HOLD';

  const gradientClass = isBuy
    ? 'from-emerald-900/40 via-emerald-800/20 to-slate-900 border-emerald-500/50'
    : isSell
    ? 'from-red-900/40 via-red-800/20 to-slate-900 border-red-500/50'
    : 'from-amber-900/40 via-amber-800/20 to-slate-900 border-amber-500/50';

  const showTradeLevels = !isHold;
  
  // Count strategies used
  const strategyCount = strategy.strategies.length;
  
  // Signal strength label
  const getStrengthLabel = () => {
    if (strategy.confidence >= 85) return 'STRONG';
    if (strategy.confidence >= 70) return 'MODERATE';
    if (strategy.confidence >= 55) return 'WEAK';
    return 'WAIT';
  };

  return (
    <div className={`rounded-2xl p-6 bg-gradient-to-br ${gradientClass} border shadow-2xl transition-all duration-500`}>
      {/* Top Row: Signal + Confidence */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isBuy ? 'bg-emerald-500/20' : isSell ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
            {isBuy ? <ArrowUp className="w-8 h-8 text-emerald-400" /> : isSell ? <ArrowDown className="w-8 h-8 text-red-400" /> : <Minus className="w-8 h-8 text-amber-400" />}
          </div>
          <div>
            <h2 className={`text-3xl font-black ${isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-amber-400'}`}>
              {strategy.type}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                strategy.confidence >= 85 ? 'bg-emerald-500/20 text-emerald-400' :
                strategy.confidence >= 70 ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-700 text-slate-400'
              }`}>
                {getStrengthLabel()}
              </span>
              <span className="text-xs text-slate-500">{strategyCount} strategies</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 mb-1 justify-end">
            <Percent className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Prediction</span>
          </div>
          <div className={`text-2xl font-bold ${strategy.confidence >= 80 ? 'text-emerald-400' : strategy.confidence >= 60 ? 'text-amber-400' : 'text-slate-400'}`}>
            {strategy.confidence}%
          </div>
        </div>
      </div>

      {/* Prediction Bar */}
      <div className="mb-4">
        <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${isBuy ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : isSell ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
            style={{ width: `${strategy.confidence}%` }}
          />
        </div>
      </div>

      {/* Predictive Probability Layer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <PredictionStat
          label={`${strategy.prediction.direction} %`}
          value={`${strategy.prediction.probability}%`}
          tone={isBuy ? 'emerald' : isSell ? 'red' : 'amber'}
          icon={<Percent className="w-3 h-3" />}
        />
        <PredictionStat
          label="Model Edge"
          value={`${strategy.prediction.modelEdge}%`}
          tone={strategy.prediction.modelEdge >= 30 ? 'blue' : 'slate'}
          icon={<Gauge className="w-3 h-3" />}
        />
        <PredictionStat
          label={`${strategy.prediction.horizonMinutes}M Move`}
          value={`${strategy.prediction.expectedMove >= 0 ? '+' : ''}${strategy.prediction.expectedMove.toFixed(2)}`}
          subValue={`${strategy.prediction.expectedMovePercent >= 0 ? '+' : ''}${strategy.prediction.expectedMovePercent.toFixed(3)}%`}
          tone={strategy.prediction.expectedMove > 0 ? 'emerald' : strategy.prediction.expectedMove < 0 ? 'red' : 'amber'}
          icon={<Activity className="w-3 h-3" />}
        />
        <PredictionStat
          label="Recent Accuracy"
          value={strategy.prediction.backtestWinRate === null ? 'Warming' : `${strategy.prediction.backtestWinRate}%`}
          subValue={`${strategy.prediction.backtestTrades} tests`}
          tone={strategy.prediction.backtestWinRate !== null && strategy.prediction.backtestWinRate >= 55 ? 'emerald' : 'amber'}
          icon={<Zap className="w-3 h-3" />}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-4">
        <ProbabilityPill label="BUY" value={strategy.prediction.buyProbability} tone="emerald" />
        <ProbabilityPill label="SELL" value={strategy.prediction.sellProbability} tone="red" />
        <ProbabilityPill label="HOLD" value={strategy.prediction.holdProbability} tone="amber" />
      </div>

      <div className={`rounded-xl p-3 border mb-4 ${
        strategy.readiness.allowTrade
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {strategy.readiness.allowTrade
              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              : <XCircle className="w-4 h-4 text-red-400" />}
            <span className={`text-sm font-black ${strategy.readiness.allowTrade ? 'text-emerald-400' : 'text-red-400'}`}>
              {strategy.readiness.grade}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Readiness {strategy.readiness.score}% | {strategy.readiness.session}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {strategy.readiness.confirmations.slice(0, 3).map((item, index) => (
            <div key={`ok-${index}`} className="flex items-start gap-1.5 text-emerald-300">
              <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
          {strategy.readiness.blockers.slice(0, 3).map((item, index) => (
            <div key={`block-${index}`} className="flex items-start gap-1.5 text-red-300">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Score Breakdown */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        <ScoreBadge icon={<BookOpen className="w-2.5 h-2.5" />} label="SMC" value={strategy.scores.smartMoney} />
        <ScoreBadge icon={<TrendingUp className="w-2.5 h-2.5" />} label="Trend" value={strategy.scores.trendFollowing} />
        <ScoreBadge icon={<Zap className="w-2.5 h-2.5" />} label="Momentum" value={strategy.scores.momentum} />
        <ScoreBadge icon={<Layers className="w-2.5 h-2.5" />} label="Reversion" value={strategy.scores.meanReversion} />
        <ScoreBadge icon={<Activity className="w-2.5 h-2.5" />} label="Volume" value={strategy.scores.volume} />
      </div>

      {/* Trade Levels - ONLY show for BUY/SELL */}
      {showTradeLevels ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-slate-400">Entry</span>
              </div>
              <p className="text-white font-mono font-bold text-sm">{strategy.analysis.bestEntry.toFixed(2)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Shield className="w-3 h-3 text-red-400" />
                <span className="text-xs text-slate-400">Stop Loss</span>
              </div>
              <p className="text-red-400 font-mono font-bold text-sm">{strategy.analysis.stopLoss.toFixed(2)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/30">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-slate-400">Take Profit</span>
              </div>
              <p className="text-emerald-400 font-mono font-bold text-sm">{strategy.analysis.takeProfit.toFixed(2)}</p>
            </div>
          </div>

          {/* Risk/Reward + Risk % */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <span className="text-xs text-slate-400">Risk : Reward</span>
              <p className="text-lg font-bold text-yellow-400">1:{strategy.analysis.riskRewardRatio.toFixed(1)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <span className="text-xs text-slate-400">Risk</span>
              <p className="text-lg font-bold text-orange-400">{strategy.analysis.riskPercent.toFixed(2)}%</p>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 mb-4">
          <p className="text-sm text-amber-300 text-center">
            Market is consolidating - no clear entry signal
          </p>
          <p className="text-xs text-slate-400 text-center mt-1">
            Strategies disagree. Wait for confluence before entering.
          </p>
        </div>
      )}

      {/* Signal Reasons */}
      <div className="space-y-1.5 mb-3">
        {strategy.analysis.reasons.map((reason, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${isBuy ? 'bg-emerald-400' : isSell ? 'bg-red-400' : 'bg-amber-400'}`} />
            <span className="text-slate-300">{reason}</span>
          </div>
        ))}
      </div>
      
      {/* Warnings */}
      {strategy.analysis.warnings.length > 0 && (
        <div className="mt-2 space-y-1">
          {strategy.analysis.warnings.map((warning, index) => (
            <div key={index} className="flex items-start gap-1.5 text-xs text-amber-400/80">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Toggle Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="mt-3 w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
      >
        <BookOpen className="w-3 h-3" />
        {showDetails ? 'Hide Strategy Details' : 'Show Strategy Details'}
      </button>
      
      {showDetails && (
        <div className="mt-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 text-xs">
          <h4 className="font-bold text-slate-300 mb-2">All Strategy Scores (0-100)</h4>
          <div className="grid grid-cols-2 gap-2">
            <ScoreRow label="Smart Money" value={strategy.scores.smartMoney} />
            <ScoreRow label="Trend Following" value={strategy.scores.trendFollowing} />
            <ScoreRow label="Momentum" value={strategy.scores.momentum} />
            <ScoreRow label="Mean Reversion" value={strategy.scores.meanReversion} />
            <ScoreRow label="Volume" value={strategy.scores.volume} />
            <ScoreRow label="Multi-Timeframe" value={strategy.scores.multiTimeframe} />
            <ScoreRow label="Fibonacci" value={strategy.scores.fibonacci} />
            <ScoreRow label="Pivot Points" value={strategy.scores.pivotPoints} />
          </div>

          <h4 className="font-bold text-slate-300 mt-3 mb-1">Prediction Calibration</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
            <span>Mode: <span className="text-blue-400">{strategy.prediction.calibration}</span></span>
            <span>Profit Factor: <span className="text-yellow-400 font-mono">{strategy.prediction.profitFactor?.toFixed(2) || 'n/a'}</span></span>
            <span>Backtests: <span className="text-slate-300 font-mono">{strategy.prediction.backtestTrades}</span></span>
            <span>Horizon: <span className="text-slate-300 font-mono">{strategy.prediction.horizonMinutes}m</span></span>
            <span>Data Quality: <span className="text-slate-300 font-mono">{strategy.readiness.dataQualityScore}%</span></span>
            <span>Readiness: <span className="text-slate-300 font-mono">{strategy.readiness.score}%</span></span>
          </div>
          
          <h4 className="font-bold text-slate-300 mt-3 mb-1">Strategies Triggered</h4>
          <div className="flex flex-wrap gap-1">
            {strategy.strategies.map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 text-[10px]">{s}</span>
            ))}
          </div>
          
          {/* Key Levels */}
          <h4 className="font-bold text-slate-300 mt-3 mb-1">Key Levels</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
            <span>VWAP: <span className="text-yellow-400 font-mono">{strategy.levels.vwap.toFixed(2)}</span></span>
            <span>Pivot: <span className="text-purple-400 font-mono">{strategy.levels.pivot.toFixed(2)}</span></span>
            <span>Fib 38.2%: <span className="text-blue-400 font-mono">{strategy.levels.fib382.toFixed(2)}</span></span>
            <span>Fib 61.8%: <span className="text-emerald-400 font-mono">{strategy.levels.fib618.toFixed(2)}</span></span>
            {strategy.levels.support.length > 0 && (
              <span className="col-span-2">Support: {strategy.levels.support.map(s => s.toFixed(2)).join(', ')}</span>
            )}
            {strategy.levels.resistance.length > 0 && (
              <span className="col-span-2">Resistance: {strategy.levels.resistance.map(r => r.toFixed(2)).join(', ')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreBadge = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => {
  const isBullish = value > 60;
  const isBearish = value < 40;
  const colorClass = isBullish ? 'text-emerald-400 bg-emerald-500/10' : isBearish ? 'text-red-400 bg-red-500/10' : 'text-slate-400 bg-slate-700/50';
  
  return (
    <div className={`rounded-lg p-1.5 text-center ${colorClass}`}>
      <div className="flex items-center justify-center gap-0.5 mb-0.5">
        {icon}
        <span className="text-[9px] leading-none">{label}</span>
      </div>
      <p className="text-[11px] font-bold leading-tight">{value}</p>
    </div>
  );
};

const PredictionStat = ({
  label,
  value,
  subValue,
  tone,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  tone: 'emerald' | 'red' | 'amber' | 'blue' | 'slate';
  icon: React.ReactNode;
}) => {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/30',
  };

  return (
    <div className={`rounded-lg p-2 border ${tones[tone]}`}>
      <div className="flex items-center gap-1 text-[10px] opacity-90">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-sm font-black leading-tight mt-1">{value}</p>
      {subValue && <p className="text-[10px] text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  );
};

const ProbabilityPill = ({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'red' | 'amber' }) => {
  const color = tone === 'emerald' ? 'bg-emerald-400' : tone === 'red' ? 'bg-red-400' : 'bg-amber-400';
  const text = tone === 'emerald' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-amber-400';

  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/30 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className={`text-[11px] font-bold ${text}`}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const ScoreRow = ({ label, value }: { label: string; value: number }) => {
  const barColor = value > 60 ? 'bg-emerald-400' : value < 40 ? 'bg-red-400' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`font-mono w-6 text-right ${value > 60 ? 'text-emerald-400' : value < 40 ? 'text-red-400' : 'text-amber-400'}`}>{value}</span>
    </div>
  );
};
