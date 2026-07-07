import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CheckCircle2, Database, Download, Gauge, Trash2, XCircle } from 'lucide-react';
import type { StrategyResult } from '@/hooks/useAdvancedStrategy';
import type { CandleData } from '@/types/trading';
import { backendDelete, backendGet, backendPut } from '@/lib/backend';

type PredictionStatus = 'PENDING' | 'CORRECT' | 'WRONG' | 'NEUTRAL' | 'EXPIRED';

interface PredictionRecord {
  id: string;
  direction: 'BUY' | 'SELL' | 'HOLD';
  probability: number;
  buyProbability: number;
  sellProbability: number;
  holdProbability: number;
  readinessGrade: string;
  readinessScore: number;
  allowTrade: boolean;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: number;
  openedCandleTime: number;
  horizonMinutes: number;
  expectedMove: number;
  status: PredictionStatus;
  resultR: number;
  resolvedAt?: number;
  resolvedPrice?: number;
  reasons: string[];
  blockers: string[];
}

interface PredictionArchiveProps {
  candles: CandleData[];
  strategy: StrategyResult;
}

const STORAGE_KEY = 'gold_prediction_archive_v1';
const HOLD_MOVE_THRESHOLD = 0.0015;

const loadPredictions = (): PredictionRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePredictions = (records: PredictionRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 500)));
  } catch {
    // ignore storage failures
  }
};

const resolvePrediction = (record: PredictionRecord, candles: CandleData[], latest: CandleData): PredictionRecord | null => {
  if (record.status !== 'PENDING') return null;
  const candlesAfterOpen = candles.filter(c => c.time > record.openedCandleTime);
  if (candlesAfterOpen.length === 0) return null;

  if (record.direction === 'BUY') {
    const risk = Math.abs(record.entry - record.stopLoss);
    for (const candle of candlesAfterOpen) {
      const hitSl = candle.low <= record.stopLoss;
      const hitTp = candle.high >= record.takeProfit;
      if (!hitSl && !hitTp) continue;
      const status: PredictionStatus = hitSl && hitTp ? 'WRONG' : hitTp ? 'CORRECT' : 'WRONG';
      const price = status === 'CORRECT' ? record.takeProfit : record.stopLoss;
      return {
        ...record,
        status,
        resolvedAt: candle.time * 1000,
        resolvedPrice: price,
        resultR: risk > 0 ? (price - record.entry) / risk : 0,
      };
    }
  }

  if (record.direction === 'SELL') {
    const risk = Math.abs(record.stopLoss - record.entry);
    for (const candle of candlesAfterOpen) {
      const hitSl = candle.high >= record.stopLoss;
      const hitTp = candle.low <= record.takeProfit;
      if (!hitSl && !hitTp) continue;
      const status: PredictionStatus = hitSl && hitTp ? 'WRONG' : hitTp ? 'CORRECT' : 'WRONG';
      const price = status === 'CORRECT' ? record.takeProfit : record.stopLoss;
      return {
        ...record,
        status,
        resolvedAt: candle.time * 1000,
        resolvedPrice: price,
        resultR: risk > 0 ? (record.entry - price) / risk : 0,
      };
    }
  }

  const ageMinutes = (latest.time - record.openedCandleTime) / 60;
  if (ageMinutes < record.horizonMinutes) return null;

  if (record.direction === 'HOLD') {
    const priceMove = Math.abs(latest.close - record.entry) / Math.max(record.entry, 1);
    return {
      ...record,
      status: priceMove <= HOLD_MOVE_THRESHOLD ? 'CORRECT' : 'WRONG',
      resolvedAt: latest.time * 1000,
      resolvedPrice: latest.close,
      resultR: 0,
    };
  }

  return {
    ...record,
    status: 'EXPIRED',
    resolvedAt: latest.time * 1000,
    resolvedPrice: latest.close,
    resultR: 0,
  };
};

export const PredictionArchive = ({ candles, strategy }: PredictionArchiveProps) => {
  const [records, setRecords] = useState<PredictionRecord[]>(loadPredictions);
  const [storeStatus, setStoreStatus] = useState<'SYNCED' | 'LOCAL'>('LOCAL');
  const lastSavedCandleRef = useRef<number | null>(null);
  const latestCandle = candles[candles.length - 1];

  useEffect(() => {
    let cancelled = false;
    void backendGet<PredictionRecord[]>('/api/predictions', loadPredictions()).then(remoteRecords => {
      if (cancelled) return;
      if (remoteRecords.length > 0) {
        setRecords(remoteRecords);
        savePredictions(remoteRecords);
      }
      setStoreStatus('SYNCED');
    });
    return () => { cancelled = true; };
  }, []);

  const persistRecords = useCallback((next: PredictionRecord[]) => {
    const limited = next.slice(0, 500);
    savePredictions(limited);
    setStoreStatus('LOCAL');
    void backendPut('/api/predictions', limited).then(result => {
      setStoreStatus(result ? 'SYNCED' : 'LOCAL');
    });
  }, []);

  useEffect(() => {
    if (!latestCandle) return;

    setRecords(prev => {
      let changed = false;
      const resolved = prev.map(record => {
        const next = resolvePrediction(record, candles, latestCandle);
        if (next) changed = true;
        return next || record;
      });
      if (changed) persistRecords(resolved);
      return changed ? resolved : prev;
    });
  }, [candles, latestCandle, persistRecords]);

  useEffect(() => {
    if (!latestCandle) return;
    if (lastSavedCandleRef.current === latestCandle.time) return;

    lastSavedCandleRef.current = latestCandle.time;
    setRecords(prev => {
      const id = `${latestCandle.time}-${strategy.prediction.direction}-${strategy.readiness.score}`;
      if (prev.some(record => record.id === id)) return prev;

      const record: PredictionRecord = {
        id,
        direction: strategy.prediction.direction,
        probability: strategy.prediction.probability,
        buyProbability: strategy.prediction.buyProbability,
        sellProbability: strategy.prediction.sellProbability,
        holdProbability: strategy.prediction.holdProbability,
        readinessGrade: strategy.readiness.grade,
        readinessScore: strategy.readiness.score,
        allowTrade: strategy.readiness.allowTrade,
        entry: strategy.analysis.bestEntry,
        stopLoss: strategy.analysis.stopLoss,
        takeProfit: strategy.analysis.takeProfit,
        openedAt: Date.now(),
        openedCandleTime: latestCandle.time,
        horizonMinutes: strategy.prediction.horizonMinutes,
        expectedMove: strategy.prediction.expectedMove,
        status: 'PENDING',
        resultR: 0,
        reasons: strategy.analysis.reasons.slice(0, 4),
        blockers: strategy.readiness.blockers.slice(0, 4),
      };

      const next = [record, ...prev].slice(0, 500);
      persistRecords(next);
      return next;
    });
  }, [latestCandle, persistRecords, strategy]);

  const stats = useMemo(() => {
    const judged = records.filter(r => r.status === 'CORRECT' || r.status === 'WRONG');
    const correct = judged.filter(r => r.status === 'CORRECT').length;
    const wrong = judged.filter(r => r.status === 'WRONG').length;
    const pending = records.filter(r => r.status === 'PENDING').length;
    const accuracy = judged.length > 0 ? Math.round((correct / judged.length) * 100) : 0;
    const tradeReady = records.filter(r => r.allowTrade).length;
    return { total: records.length, judged: judged.length, correct, wrong, pending, accuracy, tradeReady };
  }, [records]);

  const clearArchive = () => {
    setRecords([]);
    savePredictions([]);
    void backendDelete('/api/predictions');
  };

  const exportArchive = () => {
    const headers = 'Opened,Direction,Probability,Readiness,AllowTrade,Entry,StopLoss,TakeProfit,Status,ResultR,ResolvedPrice\n';
    const rows = records.map(record => [
      new Date(record.openedAt).toISOString(),
      record.direction,
      record.probability,
      record.readinessScore,
      record.allowTrade,
      record.entry.toFixed(2),
      record.stopLoss.toFixed(2),
      record.takeProfit.toFixed(2),
      record.status,
      record.resultR.toFixed(2),
      record.resolvedPrice?.toFixed(2) || '',
    ].join(',')).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XAUUSD_prediction_archive_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusStyle = (status: PredictionStatus) => {
    if (status === 'CORRECT') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (status === 'WRONG') return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (status === 'PENDING') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Prediction Archive
        </h3>
        <div className="flex items-center gap-2">
          <span className={`hidden sm:flex items-center gap-1 text-xs font-bold ${storeStatus === 'SYNCED' ? 'text-emerald-400' : 'text-amber-400'}`}>
            <Database className="w-3.5 h-3.5" />
            {storeStatus === 'SYNCED' ? 'Backend saved' : 'Local fallback'}
          </span>
          {records.length > 0 && (
            <button onClick={exportArchive} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-colors" title="Export predictions">
              <Download className="w-4 h-4" />
            </button>
          )}
          {records.length > 0 && (
            <button onClick={clearArchive} className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" title="Clear predictions">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        <Metric label="Accuracy" value={`${stats.accuracy}%`} tone={stats.accuracy >= 55 ? 'emerald' : 'amber'} />
        <Metric label="Correct" value={`${stats.correct}`} tone="emerald" />
        <Metric label="Wrong" value={`${stats.wrong}`} tone="red" />
        <Metric label="Pending" value={`${stats.pending}`} tone="blue" />
        <Metric label="Saved" value={`${stats.total}`} tone="cyan" />
        <Metric label="Trade Ready" value={`${stats.tradeReady}`} tone="purple" />
      </div>

      <p className="text-xs text-slate-500 mb-2">
        Saves every model forecast, then grades BUY/SELL by TP vs SL and HOLD by whether price stayed quiet during the prediction window.
      </p>

      <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar">
        {records.length === 0 ? (
          <div className="text-center py-8">
            <Gauge className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No predictions saved yet</p>
          </div>
        ) : (
          records.slice(0, 35).map(record => (
            <div key={record.id} className={`p-3 rounded-xl border ${statusStyle(record.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {record.status === 'CORRECT' ? <CheckCircle2 className="w-4 h-4" /> : record.status === 'WRONG' ? <XCircle className="w-4 h-4" /> : <Gauge className="w-4 h-4" />}
                    <span className="text-sm font-black">{record.direction}</span>
                    <span className="text-xs text-slate-400">{record.probability}% | {record.readinessGrade}</span>
                    {record.allowTrade && <span className="text-[10px] uppercase font-black text-emerald-400">trade-ready</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Entry {record.entry.toFixed(2)} | SL {record.stopLoss.toFixed(2)} | TP {record.takeProfit.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(record.openedAt).toLocaleTimeString()} | B {record.buyProbability}% / S {record.sellProbability}% / H {record.holdProbability}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{record.status}</p>
                  <p className={`text-xs font-mono ${record.resultR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {record.resultR >= 0 ? '+' : ''}{record.resultR.toFixed(2)}R
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

const Metric = ({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'red' | 'amber' | 'blue' | 'cyan' | 'purple' }) => {
  const classes = {
    emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    red: 'text-red-400 border-red-500/20 bg-red-500/10',
    amber: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    cyan: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
  };

  return (
    <div className={`rounded-xl p-3 text-center border ${classes[tone]}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
};
