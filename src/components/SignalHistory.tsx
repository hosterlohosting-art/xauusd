import { useState, useEffect, useRef } from 'react';
import type { SignalResult } from '@/types/trading';
import { History, ArrowUp, ArrowDown, Minus, Clock, Trash2 } from 'lucide-react';
import { loadSignalHistory, saveSignalHistory } from '@/hooks/useRealGoldData';

interface HistoryEntry {
  id: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: number;
  stableFor: number;
}

interface SignalHistoryProps {
  currentSignal: SignalResult | null;
}

export const SignalHistory = ({ currentSignal }: SignalHistoryProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>(loadSignalHistory);
  const lastTypeRef = useRef<string | null>(null);

  // Add new signal to history when type changes
  useEffect(() => {
    if (!currentSignal || !currentSignal.type) return;
    
    // Only add when signal type actually changes
    if (lastTypeRef.current !== currentSignal.type) {
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: currentSignal.type,
        confidence: currentSignal.confidence,
        price: currentSignal.price,
        timestamp: Date.now(),
        stableFor: 0,
      };
      
      setHistory(prev => {
        const newHistory = [entry, ...prev].slice(0, 100);
        saveSignalHistory(newHistory);
        return newHistory;
      });
      
      lastTypeRef.current = currentSignal.type;
    }
  }, [currentSignal]);

  const clearHistory = () => {
    setHistory([]);
    saveSignalHistory([]);
  };

  // This is a confidence average, not realized win rate. Real outcomes live in Trade Journal.
  const tradeSignals = history.filter(s => s.type !== 'HOLD');
  const avgConfidence = tradeSignals.length > 0
    ? Math.round(tradeSignals.reduce((sum, s) => sum + s.confidence, 0) / tradeSignals.length * 0.75)
    : 0;

  const getSignalIcon = (type: string) => {
    if (type === 'BUY') return <ArrowUp className="w-4 h-4 text-emerald-400" />;
    if (type === 'SELL') return <ArrowDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-amber-400" />;
  };

  const getSignalColor = (type: string) => {
    if (type === 'BUY') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (type === 'SELL') return 'bg-red-500/10 text-red-400 border-red-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-teal-400" />
          Signal History
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Avg Edge</p>
            <p className={`text-sm font-bold ${avgConfidence > 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {avgConfidence}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Signals</p>
            <p className="text-sm font-bold text-white">{history.length}</p>
          </div>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
          <p className="text-xs text-emerald-400 mb-1">BUY</p>
          <p className="text-lg font-bold text-emerald-400">{history.filter(s => s.type === 'BUY').length}</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
          <p className="text-xs text-red-400 mb-1">SELL</p>
          <p className="text-lg font-bold text-red-400">{history.filter(s => s.type === 'SELL').length}</p>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
          <p className="text-xs text-amber-400 mb-1">HOLD</p>
          <p className="text-lg font-bold text-amber-400">{history.filter(s => s.type === 'HOLD').length}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-2">Saved in your browser - persists across sessions</p>

      {/* History List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Waiting for signals...</p>
          </div>
        ) : (
          history.slice(0, 20).map((signal) => (
            <div 
              key={signal.id} 
              className={`flex items-center justify-between p-3 rounded-xl border ${getSignalColor(signal.type)}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  signal.type === 'BUY' ? 'bg-emerald-500/20' : 
                  signal.type === 'SELL' ? 'bg-red-500/20' : 'bg-amber-500/20'
                }`}>
                  {getSignalIcon(signal.type)}
                </div>
                <div>
                  <p className="text-sm font-bold">{signal.type}</p>
                  <p className="text-xs text-slate-400">{signal.price.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  signal.confidence > 70 ? 'text-emerald-400' : 
                  signal.confidence > 40 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {signal.confidence}%
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(signal.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
