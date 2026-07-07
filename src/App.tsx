import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRealGoldData } from '@/hooks/useRealGoldData';
import { useAdvancedStrategy } from '@/hooks/useAdvancedStrategy';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Header } from '@/components/Header';
import { PriceDisplay } from '@/components/PriceDisplay';
import { EnhancedSignalCard } from '@/components/EnhancedSignalCard';
import { RealCandleChart } from '@/components/RealCandleChart';
import { PatternRecognition } from '@/components/PatternRecognition';
import { FVGDetector } from '@/components/FVGDetector';
import { MultiTimeframeAnalysis } from '@/components/MultiTimeframeAnalysis';
import { IndicatorsPanel } from '@/components/IndicatorsPanel';
import { MarketSentiment } from '@/components/MarketSentiment';
import { TrendAnalysis } from '@/components/TrendAnalysis';
import { SignalHistory } from '@/components/SignalHistory';
import { TradeJournal } from '@/components/TradeJournal';
import { PredictionArchive } from '@/components/PredictionArchive';
import { RealNewsPanel } from '@/components/RealNewsPanel';
import { QuickStats } from '@/components/QuickStats';
import { Timer } from '@/components/Timer';
import { Wifi, AlertTriangle, Loader2, Bell, BellRing, Moon, Sun, TrendingUp, TrendingDown, Shield, BookOpen, Zap } from 'lucide-react';
import './App.css';
import { toast } from 'sonner';

// Price Alert type
interface PriceAlert {
  id: string;
  price: number;
  type: 'above' | 'below';
  triggered: boolean;
}

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const canUseNotifications = () => typeof window !== 'undefined' && 'Notification' in window;

function AppContent() {
  const { candles, priceData, isLive, toggleLive, isLoading, error, realPrice, dataQuality } = useRealGoldData();
  
  // Advanced strategy engine
  const strategy = useAdvancedStrategy(candles, dataQuality);
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('gold_dashboard_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  
  // Price alerts
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      if (!canUseStorage()) return [];
      const parsed = JSON.parse(localStorage.getItem('gold_price_alerts') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [alertInput, setAlertInput] = useState('');
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  
  // Strategy info panel
  const [showStrategyInfo, setShowStrategyInfo] = useState(false);
  
  // Save alerts
  useEffect(() => {
    if (!canUseStorage()) return;
    localStorage.setItem('gold_price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem('gold_dashboard_theme', theme);
    } catch {
      // ignore storage failures
    }
  }, [theme]);
  
  // Check price alerts
  useEffect(() => {
    if (!realPrice) return;
    alerts.forEach(alert => {
      if (alert.triggered) return;
      if ((alert.type === 'above' && realPrice >= alert.price) ||
          (alert.type === 'below' && realPrice <= alert.price)) {
        toast.success(`Price Alert! Gold is ${alert.type} $${alert.price.toFixed(2)}`, {
          duration: 10000,
          icon: <BellRing className="w-5 h-5 text-yellow-400" />,
        });
        // Browser notification
        if (canUseNotifications() && window.Notification.permission === 'granted') {
          new window.Notification('Gold Price Alert', {
            body: `XAU/USD is now ${alert.type} $${alert.price.toFixed(2)} (Current: $${realPrice.toFixed(2)})`,
            icon: '/favicon.ico',
          });
        }
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, triggered: true } : a));
      }
    });
  }, [realPrice, alerts]);
  
  // Request notification permission
  useEffect(() => {
    if (canUseNotifications() && window.Notification.permission === 'default') {
      window.Notification.requestPermission().catch(() => undefined);
    }
  }, []);
  
  const addAlert = useCallback((type: 'above' | 'below') => {
    const price = parseFloat(alertInput);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    const newAlert: PriceAlert = {
      id: Date.now().toString(),
      price,
      type,
      triggered: false,
    };
    setAlerts(prev => [...prev, newAlert]);
    setAlertInput('');
    toast.success(`Alert set: ${type.toUpperCase()} $${price.toFixed(2)}`);
  }, [alertInput]);
  
  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);
  
  // Export candle data to CSV
  const exportCSV = useCallback(() => {
    if (candles.length === 0) return;
    const headers = 'Time,Open,High,Low,Close,Volume\n';
    const rows = candles.map(c => 
      `${new Date(c.time * 1000).toISOString()},${c.open.toFixed(2)},${c.high.toFixed(2)},${c.low.toFixed(2)},${c.close.toFixed(2)},${c.volume || 0}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XAUUSD_candles_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Candle data exported to CSV!');
  }, [candles]);
  
  // Build base signal from advanced strategy
  const baseSignal = useMemo(() => strategy ? {
    id: `${strategy.timestamp}-${strategy.type}`,
    type: strategy.type,
    confidence: strategy.confidence,
    price: strategy.analysis.bestEntry,
    timestamp: strategy.timestamp,
    indicators: {
      rsi: 50,
      macd: strategy.scores.momentum > 60 ? 'bullish' as const : strategy.scores.momentum < 40 ? 'bearish' as const : 'neutral' as const,
      ma: strategy.scores.trendFollowing > 60 ? 'bullish' as const : strategy.scores.trendFollowing < 40 ? 'bearish' as const : 'neutral' as const,
      bollinger: strategy.scores.meanReversion > 60 ? 'lower' as const : strategy.scores.meanReversion < 40 ? 'upper' as const : 'middle' as const,
      stochastic: strategy.scores.momentum > 70 ? 'overbought' as const : strategy.scores.momentum < 30 ? 'oversold' as const : 'neutral' as const,
    },
    reason: strategy.analysis.reasons,
    entryPrice: strategy.analysis.bestEntry,
    stopLoss: strategy.analysis.stopLoss,
    takeProfit: strategy.analysis.takeProfit,
  } : null, [strategy]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold">Loading Gold Signals Pro...</p>
          <p className="text-sm text-slate-400 mt-2">Connecting to gold-api.com for real-time data</p>
          <div className="mt-4 flex items-center gap-2 justify-center text-xs text-slate-500">
            <Shield className="w-3 h-3" />
            <span>Professional Multi-Strategy Engine Loading</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`gold-app ${theme} min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white`}>
      <Header isLive={isLive} onToggleLive={toggleLive} />
      
      {/* Top Control Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/30">
        <div className="max-w-[1600px] mx-auto px-4 py-1.5 flex items-center justify-between">
          {/* Left: Live indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400">LIVE</span>
              <span className="text-xs text-slate-500">{dataQuality.priceSource}</span>
            </div>
            <span className={`text-xs font-bold ${dataQuality.score >= 65 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Data {dataQuality.score}%
            </span>
            {realPrice && (
              <span className="text-xs font-mono text-yellow-400 font-bold">${realPrice.toFixed(2)}</span>
            )}
            {error && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs">{error}</span>
              </div>
            )}
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-1.5">
            {/* Strategy Info Button */}
            <button
              onClick={() => setShowStrategyInfo(!showStrategyInfo)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showStrategyInfo ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Strategies
            </button>
            
            {/* Price Alerts Button */}
            <button
              onClick={() => setShowAlertPanel(!showAlertPanel)}
              className={`relative flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showAlertPanel ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Alerts
              {alerts.filter(a => !a.triggered).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                  {alerts.filter(a => !a.triggered).length}
                </span>
              )}
            </button>
            
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Strategy Info Panel */}
      {showStrategyInfo && (
        <div className="fixed top-[100px] right-4 z-50 w-[380px] max-h-[70vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Trading Strategies Used
              </h3>
              <button onClick={() => setShowStrategyInfo(false)} className="text-slate-400 hover:text-white text-xs">Close</button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <h4 className="font-bold text-purple-400 mb-1">Smart Money Concepts (SMC)</h4>
                <p className="text-slate-400">Detects Order Blocks, Breaker Blocks, Liquidity Sweeps, and Fair Value Gaps used by institutional traders.</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-bold text-blue-400 mb-1">Trend Following</h4>
                <p className="text-slate-400">Uses SMA 20/50 crossovers, EMA 12/26, and ADX trend strength for directional bias.</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <h4 className="font-bold text-emerald-400 mb-1">Momentum Analysis</h4>
                <p className="text-slate-400">RSI 14, MACD histogram, and Stochastic %K for overbought/oversold detection.</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h4 className="font-bold text-amber-400 mb-1">Mean Reversion</h4>
                <p className="text-slate-400">Bollinger Bands, VWAP deviation, and Fibonacci retracement levels (38.2%, 50%, 61.8%).</p>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <h4 className="font-bold text-cyan-400 mb-1">Volume Analysis</h4>
                <p className="text-slate-400">Volume spikes, buying/selling pressure ratio, and volume-trend divergence.</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <h4 className="font-bold text-rose-400 mb-1">Multi-Timeframe</h4>
                <p className="text-slate-400">Checks 5M and 15M timeframe alignment to confirm or reject the 1M signal.</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
                <h4 className="font-bold text-slate-300 mb-1">How Scoring Works</h4>
                <p className="text-slate-400">Each strategy contributes a weighted score. All 6 strategies must align for a 90%+ confidence signal. 3+ confluences required for any trade recommendation.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Price Alert Panel */}
      {showAlertPanel && (
        <div className="fixed top-[100px] right-4 z-50 w-[320px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-400" />
                Price Alerts
              </h3>
              <button onClick={() => setShowAlertPanel(false)} className="text-slate-400 hover:text-white text-xs">Close</button>
            </div>
            
            {/* Add alert */}
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={alertInput}
                onChange={e => setAlertInput(e.target.value)}
                placeholder={`Current: $${realPrice?.toFixed(2) || '---'}`}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => addAlert('above')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-all"
              >
                <TrendingUp className="w-3 h-3" />
                Above
              </button>
              <button
                onClick={() => addAlert('below')}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-all"
              >
                <TrendingDown className="w-3 h-3" />
                Below
              </button>
            </div>
            
            {/* Alert list */}
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {alerts.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">No alerts set</p>
              )}
              {alerts.map(alert => (
                <div key={alert.id} className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                  alert.triggered ? 'bg-slate-800/50 opacity-50' : 'bg-slate-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={alert.type === 'above' ? 'text-emerald-400' : 'text-red-400'}>
                      {alert.type === 'above' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    </span>
                    <span className="font-mono">${alert.price.toFixed(2)}</span>
                    {alert.triggered && <span className="text-slate-500">(triggered)</span>}
                  </div>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <main className="pt-28 pb-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* Price + Signal Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <PriceDisplay priceData={priceData} />
          <EnhancedSignalCard strategy={strategy} />
        </div>

        {/* Quick Stats */}
        <div className="mb-4">
          <QuickStats candles={candles} priceData={priceData} />
        </div>

        {/* Timer */}
        <div className="mb-4">
          <Timer signal={baseSignal} />
        </div>

        {/* Live Candlestick Chart with S/R lines */}
        <div className="mb-4">
          <RealCandleChart 
            candles={candles} 
            supportLevels={strategy.levels.support}
            resistanceLevels={strategy.levels.resistance}
            pivotLevel={strategy.levels.pivot}
            vwapLevel={strategy.levels.vwap}
            fibLevels={{ fib382: strategy.levels.fib382, fib500: strategy.levels.fib500, fib618: strategy.levels.fib618 }}
            signalType={strategy.type} 
            onExport={exportCSV}
          />
        </div>

        {/* Pattern + FVG Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <PatternRecognition candles={candles} />
          <FVGDetector candles={candles} />
        </div>

        {/* Multi-Timeframe + Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <MultiTimeframeAnalysis candles={candles} />
          <IndicatorsPanel candles={candles} />
        </div>

        {/* Sentiment + Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <MarketSentiment candles={candles} />
          <TrendAnalysis candles={candles} />
        </div>

        {/* Signal History + News */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SignalHistory currentSignal={baseSignal} />
          <RealNewsPanel />
        </div>

        {/* Real Outcome Tracking */}
        <div className="mt-4">
          <TradeJournal candles={candles} strategy={strategy} />
        </div>

        <div className="mt-4">
          <PredictionArchive candles={candles} strategy={strategy} />
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center py-6 border-t border-slate-800">
          <p className="text-sm text-slate-500 font-bold">Gold Signals Pro - Professional Trading System</p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="text-emerald-400">gold-api.com</span> real-time data | 
            <span className="text-blue-400"> 6 professional strategies</span> | 
            <span className="text-purple-400"> Multi-confluence engine</span>
          </p>
          <p className="text-xs text-slate-600 mt-2 max-w-2xl mx-auto">
            Disclaimer: For educational purposes only. Trading involves significant risk. 
            Past performance does not guarantee future results. Always use proper risk management.
          </p>
          <p className="text-xs text-yellow-500/60 mt-2 font-mono">
            Strategies: Smart Money Concepts | Trend Following | Momentum | Mean Reversion | Volume | Multi-Timeframe
          </p>
        </footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
