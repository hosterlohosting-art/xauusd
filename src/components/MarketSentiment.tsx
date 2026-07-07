import { useMarketSentiment } from '@/hooks/useTechnicalIndicators';
import type { CandleData } from '@/types/trading';
import { Brain, TrendingUp, TrendingDown, Minus, Gauge, Waves, BarChart3 } from 'lucide-react';

interface MarketSentimentProps {
  candles: CandleData[];
}

export const MarketSentiment = ({ candles }: MarketSentimentProps) => {
  const sentiment = useMarketSentiment(candles);

  const getScoreColor = (score: number) => {
    if (score > 30) return 'text-emerald-400';
    if (score > 0) return 'text-emerald-300';
    if (score > -30) return 'text-red-300';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score > 30) return 'bg-emerald-500';
    if (score > 0) return 'bg-emerald-400';
    if (score > -30) return 'bg-red-400';
    return 'bg-red-500';
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        AI Market Sentiment
      </h3>

      {/* Overall Sentiment */}
      <div className={`flex items-center gap-4 p-4 rounded-xl mb-4 ${
        sentiment.overall === 'bullish' ? 'bg-emerald-500/10 border border-emerald-500/30' :
        sentiment.overall === 'bearish' ? 'bg-red-500/10 border border-red-500/30' :
        'bg-amber-500/10 border border-amber-500/30'
      }`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          sentiment.overall === 'bullish' ? 'bg-emerald-500/20' :
          sentiment.overall === 'bearish' ? 'bg-red-500/20' :
          'bg-amber-500/20'
        }`}>
          {sentiment.overall === 'bullish' ? <TrendingUp className="w-7 h-7 text-emerald-400" /> :
           sentiment.overall === 'bearish' ? <TrendingDown className="w-7 h-7 text-red-400" /> :
           <Minus className="w-7 h-7 text-amber-400" />}
        </div>
        <div>
          <p className={`text-2xl font-black ${
            sentiment.overall === 'bullish' ? 'text-emerald-400' :
            sentiment.overall === 'bearish' ? 'text-red-400' :
            'text-amber-400'
          }`}>
            {sentiment.overall.toUpperCase()}
          </p>
          <p className="text-sm text-slate-400">Overall Market Sentiment</p>
        </div>
      </div>

      {/* Sentiment Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Sentiment Score</span>
          <span className={`text-sm font-bold ${getScoreColor(sentiment.score)}`}>
            {sentiment.score > 0 ? '+' : ''}{sentiment.score}
          </span>
        </div>
        <div className="relative w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-slate-500 z-10" />
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${getScoreBg(sentiment.score)}`}
            style={{ 
              width: `${Math.abs(sentiment.score)}%`,
              marginLeft: sentiment.score >= 0 ? '50%' : `${50 - Math.abs(sentiment.score)}%`
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-red-400">Bearish</span>
          <span className="text-xs text-slate-500">Neutral</span>
          <span className="text-xs text-emerald-400">Bullish</span>
        </div>
      </div>

      {/* Source Breakdown */}
      <div className="space-y-3">
        <SourceBar 
          label="Technical Analysis"
          score={sentiment.sources.technical}
          icon={<BarChart3 className="w-4 h-4 text-blue-400" />}
        />
        <SourceBar 
          label="Trend Strength"
          score={sentiment.sources.trend}
          icon={<TrendingUp className="w-4 h-4 text-orange-400" />}
        />
        <SourceBar 
          label="Volatility"
          score={sentiment.sources.volatility}
          icon={<Waves className="w-4 h-4 text-cyan-400" />}
        />
      </div>

      {/* Gauge Visualization */}
      <div className="mt-4 flex justify-center">
        <div className="relative w-32 h-16">
          <svg viewBox="0 0 120 60" className="w-full h-full">
            <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
            <path 
              d="M 10 60 A 50 50 0 0 1 110 60" 
              fill="none" 
              stroke={sentiment.score > 0 ? '#10b981' : sentiment.score < 0 ? '#ef4444' : '#f59e0b'} 
              strokeWidth="10" 
              strokeLinecap="round"
              strokeDasharray={`${Math.abs(sentiment.score) * 1.57} 157`}
              strokeDashoffset={sentiment.score < 0 ? -78.5 : 0}
              className="transition-all duration-1000"
            />
            <text x="60" y="45" textAnchor="middle" className="fill-white text-lg font-bold">
              {Math.abs(sentiment.score)}
            </text>
          </svg>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">Score</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SourceBar = ({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) => {
  const getColor = (s: number) => {
    if (s > 20) return 'bg-emerald-500';
    if (s > 0) return 'bg-emerald-400';
    if (s > -20) return 'bg-red-400';
    return 'bg-red-500';
  };

  const getTextColor = (s: number) => {
    if (s > 20) return 'text-emerald-400';
    if (s > 0) return 'text-emerald-300';
    if (s > -20) return 'text-red-300';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-slate-300">{label}</span>
        </div>
        <span className={`text-sm font-bold ${getTextColor(score)}`}>
          {score > 0 ? '+' : ''}{score}
        </span>
      </div>
      <div className="relative w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-slate-500 z-10" />
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getColor(score)}`}
          style={{ 
            width: `${Math.min(Math.abs(score) * 2, 100)}%`,
            marginLeft: score >= 0 ? '50%' : `${50 - Math.min(Math.abs(score) * 2, 50)}%`
          }}
        />
      </div>
    </div>
  );
};
