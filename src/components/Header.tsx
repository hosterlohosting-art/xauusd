import { Activity, Wifi, WifiOff, BarChart3 } from 'lucide-react';

interface HeaderProps {
  isLive: boolean;
  onToggleLive: () => void;
}

export const Header = ({ isLive, onToggleLive }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Gold Signals <span className="text-yellow-400">Pro</span>
              </h1>
              <p className="text-xs text-slate-400 -mt-0.5">AI-Powered XAU/USD Analysis</p>
            </div>
          </div>

          {/* Center Status */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                {isLive ? 'LIVE' : 'PAUSED'}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Real-time Data</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-sm">XAU/USD</span>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={onToggleLive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isLive 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            {isLive ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {isLive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>
    </header>
  );
};
