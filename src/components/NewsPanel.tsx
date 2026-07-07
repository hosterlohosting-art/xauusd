import { useState, useEffect } from 'react';
import { Newspaper, Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  impact: 'high' | 'medium' | 'low';
}

const generateMockNews = (): NewsItem[] => {
  const newsTemplates: Omit<NewsItem, 'id' | 'time'>[] = [
    { title: 'Fed Chair signals potential rate pause in upcoming meeting', source: 'Reuters', sentiment: 'positive', category: 'Fed Policy', impact: 'high' },
    { title: 'US Dollar Index retreats from 20-year highs', source: 'Bloomberg', sentiment: 'positive', category: 'USD', impact: 'high' },
    { title: 'Gold demand surges in India and China ahead of festival season', source: 'CNBC', sentiment: 'positive', category: 'Demand', impact: 'medium' },
    { title: 'Geopolitical tensions rise in Middle East, safe-haven flows increase', source: 'FT', sentiment: 'positive', category: 'Geopolitics', impact: 'high' },
    { title: 'US Treasury yields climb as inflation data beats expectations', source: 'WSJ', sentiment: 'negative', category: 'Yields', impact: 'high' },
    { title: 'Central banks add 1,000 tonnes of gold to reserves in 2024', source: 'WGC', sentiment: 'positive', category: 'CB Buying', impact: 'medium' },
    { title: 'Mining output disruptions reported in South Africa', source: 'Mining.com', sentiment: 'positive', category: 'Supply', impact: 'medium' },
    { title: 'Strong US jobs data dampens rate cut expectations', source: 'ForexLive', sentiment: 'negative', category: 'Economic Data', impact: 'high' },
    { title: 'ETF gold holdings see largest weekly outflow this year', source: 'Bloomberg', sentiment: 'negative', category: 'ETF Flows', impact: 'medium' },
    { title: 'Technical analysis suggests key support level at $2,640', source: 'Kitco', sentiment: 'neutral', category: 'Technical', impact: 'low' },
    { title: 'Real yields turn negative, supporting gold prices', source: 'ZeroHedge', sentiment: 'positive', category: 'Real Yields', impact: 'high' },
    { title: 'China economic stimulus measures boost commodity outlook', source: 'SCMP', sentiment: 'positive', category: 'China', impact: 'medium' },
  ];

  return newsTemplates.map((news, index) => ({
    ...news,
    id: `news-${index}-${Date.now()}`,
    time: `${Math.floor(Math.random() * 4) + 1}h ago`
  }));
};

export const NewsPanel = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');

  useEffect(() => {
    setNews(generateMockNews());
    
    const interval = setInterval(() => {
      setNews(generateMockNews());
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const filteredNews = filter === 'all' ? news : news.filter(n => n.sentiment === filter);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'negative': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-3 h-3" />;
      case 'negative': return <TrendingDown className="w-3 h-3" />;
      default: return <span className="text-xs">−</span>;
    }
  };

  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-pink-400" />
          Market News
        </h3>
        <div className="flex items-center gap-1">
          {(['all', 'positive', 'negative'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                filter === f 
                  ? f === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                    f === 'negative' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* News Count */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-400">{news.filter(n => n.sentiment === 'positive').length} Bullish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400">{news.filter(n => n.sentiment === 'negative').length} Bearish</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-amber-400" />
          <span className="text-slate-400">{news.filter(n => n.impact === 'high').length} High Impact</span>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {filteredNews.map((item) => (
          <div 
            key={item.id} 
            className={`p-3 rounded-xl border ${getSentimentColor(item.sentiment)} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">{item.source}</span>
                  <span className="text-slate-600">|</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                  <span className={`text-xs font-medium ${getImpactColor(item.impact)}`}>
                    {item.impact.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {getSentimentIcon(item.sentiment)}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {item.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
