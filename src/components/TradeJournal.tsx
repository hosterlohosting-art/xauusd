import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Database, Download, Target, Trash2, XCircle } from 'lucide-react';
import type { CandleData } from '@/types/trading';
import type { StrategyResult } from '@/hooks/useAdvancedStrategy';
import { backendDelete, backendGet, backendPut } from '@/lib/backend';

type TradeStatus = 'OPEN' | 'TP' | 'SL' | 'EXPIRED';

interface JournalTrade {
  id: string;
  type: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  readinessScore: number;
  readinessGrade: string;
  openedAt: number;
  openedCandleTime: number;
  closedAt?: number;
  closePrice?: number;
  status: TradeStatus;
  resultR: number;
  reasons: string[];
  blockers: string[];
  session: string;
}

interface TradeJournalProps {
  candles: CandleData[];
  strategy: StrategyResult;
}

const STORAGE_KEY = 'gold_trade_journal_v1';
const MAX_OPEN_MINUTES = 90;
const MIN_SIGNAL_COOLDOWN_MINUTES = 10;

const loadJournal = (): JournalTrade[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveJournal = (trades: JournalTrade[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades.slice(0, 250)));
  } catch {
    // ignore storage failures
  }
};

const hitTrade = (trade: JournalTrade, candle: CandleData): JournalTrade | null => {
  if (trade.status !== 'OPEN') return null;

  if (trade.type === 'BUY') {
    const hitSl = candle.low <= trade.stopLoss;
    const hitTp = candle.high >= trade.takeProfit;
    if (!hitSl && !hitTp) return null;
    const status = hitSl && hitTp ? 'SL' : hitTp ? 'TP' : 'SL';
    const closePrice = status === 'TP' ? trade.takeProfit : trade.stopLoss;
    const risk = Math.abs(trade.entry - trade.stopLoss);
    return {
      ...trade,
      status,
      closePrice,
      closedAt: candle.time * 1000,
      resultR: risk > 0 ? (closePrice - trade.entry) / risk : 0,
    };
  }

  const hitSl = candle.high >= trade.stopLoss;
  const hitTp = candle.low <= trade.takeProfit;
  if (!hitSl && !hitTp) return null;
  const status = hitSl && hitTp ? 'SL' : hitTp ? 'TP' : 'SL';
  const closePrice = status === 'TP' ? trade.takeProfit : trade.stopLoss;
  const risk = Math.abs(trade.stopLoss - trade.entry);
  return {
    ...trade,
    status,
    closePrice,
    closedAt: candle.time * 1000,
    resultR: risk > 0 ? (trade.entry - closePrice) / risk : 0,
  };
};

export const TradeJournal = ({ candles, strategy }: TradeJournalProps) => {
  const [trades, setTrades] = useState<JournalTrade[]>(loadJournal);
  const [storeStatus, setStoreStatus] = useState<'SYNCED' | 'LOCAL'>('LOCAL');

  const latestCandle = candles[candles.length - 1];

  useEffect(() => {
    let cancelled = false;
    void backendGet<JournalTrade[]>('/api/trades', loadJournal()).then(remoteTrades => {
      if (cancelled) return;
      if (remoteTrades.length > 0) {
        setTrades(remoteTrades);
        saveJournal(remoteTrades);
      }
      setStoreStatus(remoteTrades ? 'SYNCED' : 'LOCAL');
    });
    return () => { cancelled = true; };
  }, []);

  const persistTrades = useCallback((next: JournalTrade[]) => {
    const limited = next.slice(0, 250);
    saveJournal(limited);
    setStoreStatus('LOCAL');
    void backendPut('/api/trades', limited).then(result => {
      setStoreStatus(result ? 'SYNCED' : 'LOCAL');
    });
  }, []);

  useEffect(() => {
    if (!latestCandle) return;

    setTrades(prev => {
      let changed = false;
      const updated = prev.map(trade => {
        if (trade.status !== 'OPEN') return trade;
        const openedSec = Math.floor(trade.openedAt / 1000);
        const candlesAfterOpen = candles.filter(c => c.time > openedSec);
        for (const candle of candlesAfterOpen) {
          const resolved = hitTrade(trade, candle);
          if (resolved) {
            changed = true;
            return resolved;
          }
        }

        if ((latestCandle.time - openedSec) / 60 >= MAX_OPEN_MINUTES) {
          changed = true;
          return {
            ...trade,
            status: 'EXPIRED' as const,
            closePrice: latestCandle.close,
            closedAt: latestCandle.time * 1000,
            resultR: 0,
          };
        }

        return trade;
      });

      if (changed) persistTrades(updated);
      return changed ? updated : prev;
    });
  }, [candles, latestCandle, persistTrades]);

  useEffect(() => {
    if (!latestCandle || !strategy.readiness.allowTrade || (strategy.type !== 'BUY' && strategy.type !== 'SELL')) return;
    const tradeType = strategy.type;

    setTrades(prev => {
      const lastSimilar = prev.find(trade => trade.type === tradeType);
      const hasOpenSameDirection = prev.some(trade => trade.status === 'OPEN' && trade.type === tradeType);
      const inCooldown = lastSimilar
        ? (Date.now() - lastSimilar.openedAt) / 60000 < MIN_SIGNAL_COOLDOWN_MINUTES
        : false;

      if (hasOpenSameDirection || inCooldown) return prev;

      const trade: JournalTrade = {
        id: `${Date.now()}-${tradeType}`,
        type: tradeType,
        entry: strategy.analysis.bestEntry,
        stopLoss: strategy.analysis.stopLoss,
        takeProfit: strategy.analysis.takeProfit,
        confidence: strategy.confidence,
        readinessScore: strategy.readiness.score,
        readinessGrade: strategy.readiness.grade,
        openedAt: Date.now(),
        openedCandleTime: latestCandle.time,
        status: 'OPEN',
        resultR: 0,
        reasons: strategy.analysis.reasons.slice(0, 4),
        blockers: strategy.readiness.blockers.slice(0, 4),
        session: strategy.readiness.session,
      };

      const next = [trade, ...prev].slice(0, 250);
      persistTrades(next);
      return next;
    });
  }, [latestCandle, strategy, persistTrades]);

  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === 'TP' || t.status === 'SL');
    const wins = trades.filter(t => t.status === 'TP').length;
    const losses = trades.filter(t => t.status === 'SL').length;
    const open = trades.filter(t => t.status === 'OPEN').length;
    const netR = closed.reduce((sum, trade) => sum + trade.resultR, 0);
    const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
    return { closed: closed.length, wins, losses, open, netR, winRate };
  }, [trades]);

  const clearJournal = () => {
    setTrades([]);
    saveJournal([]);
    void backendDelete('/api/trades');
  };

  const exportJournal = () => {
    const headers = 'Opened,Type,Entry,StopLoss,TakeProfit,Status,ClosePrice,ResultR,Confidence,Readiness,Session\n';
    const rows = trades.map(trade => [
      new Date(trade.openedAt).toISOString(),
      trade.type,
      trade.entry.toFixed(2),
      trade.stopLoss.toFixed(2),
      trade.takeProfit.toFixed(2),
      trade.status,
      trade.closePrice?.toFixed(2) || '',
      trade.resultR.toFixed(2),
      trade.confidence,
      trade.readinessScore,
      trade.session,
    ].join(',')).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XAUUSD_trade_journal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusStyle = (status: TradeStatus) => {
    if (status === 'TP') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (status === 'SL') return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (status === 'EXPIRED') return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Trade Journal
        </h3>
        <div className="flex items-center gap-2">
          <span className={`hidden sm:flex items-center gap-1 text-xs font-bold ${storeStatus === 'SYNCED' ? 'text-emerald-400' : 'text-amber-400'}`}>
            <Database className="w-3.5 h-3.5" />
            {storeStatus === 'SYNCED' ? 'Backend saved' : 'Local fallback'}
          </span>
          {trades.length > 0 && (
            <button onClick={exportJournal} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors" title="Export journal">
              <Download className="w-4 h-4" />
            </button>
          )}
          {trades.length > 0 && (
            <button onClick={clearJournal} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" title="Clear journal">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Metric label="Win Rate" value={`${stats.winRate}%`} tone={stats.winRate >= 55 ? 'emerald' : 'amber'} />
        <Metric label="Net R" value={`${stats.netR >= 0 ? '+' : ''}${stats.netR.toFixed(2)}R`} tone={stats.netR >= 0 ? 'emerald' : 'red'} />
        <Metric label="Wins" value={`${stats.wins}`} tone="emerald" />
        <Metric label="Losses" value={`${stats.losses}`} tone="red" />
        <Metric label="Open" value={`${stats.open}`} tone="blue" />
      </div>

      <p className="text-xs text-slate-500 mb-2">
        Auto-logs only trade-ready BUY/SELL setups, then checks future candles for TP or SL first.
      </p>

      <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar">
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No trade-ready setups logged yet</p>
          </div>
        ) : (
          trades.slice(0, 30).map(trade => (
            <div key={trade.id} className={`p-3 rounded-xl border ${statusStyle(trade.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {trade.status === 'TP' ? <CheckCircle2 className="w-4 h-4" /> : trade.status === 'SL' ? <XCircle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                    <span className="text-sm font-black">{trade.type}</span>
                    <span className="text-xs text-slate-400">{trade.readinessGrade} / {trade.readinessScore}%</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Entry {trade.entry.toFixed(2)} | SL {trade.stopLoss.toFixed(2)} | TP {trade.takeProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{trade.session} | {new Date(trade.openedAt).toLocaleTimeString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{trade.status}</p>
                  <p className={`text-xs font-mono ${trade.resultR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trade.resultR >= 0 ? '+' : ''}{trade.resultR.toFixed(2)}R
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Metric = ({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'red' | 'amber' | 'blue' }) => {
  const classes = {
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    red: 'text-red-400 border-red-500/20 bg-red-500/10',
    amber: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
  };

  return (
    <div className={`rounded-xl p-3 text-center border ${classes[tone]}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
};
