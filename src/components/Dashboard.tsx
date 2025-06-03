import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DayStats {
  date: string;
  transformation_count: number;
  word_count: number;
  sentence_count: number;
}

interface UsageStats {
  total_transformations: number;
  total_words_transformed: number;
  total_sentences_transformed: number;
  history_count: number;
}

export function Dashboard() {
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsData, usageData] = await Promise.all([
        invoke<DayStats[]>('get_daily_stats', { days: selectedPeriod }),
        invoke<UsageStats>('get_usage_stats')
      ]);

      setDailyStats(statsData);
      setUsageStats(usageData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxCount = () => {
    return Math.max(...dailyStats.map(d => d.transformation_count), 1);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl text-slate-800">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your transformation activity</p>
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="bg-white p-6 rounded-lg border border-slate-200 relative group cursor-pointer transition-all hover:shadow-md"
            title="Total number of text transformations performed"
          >
            <div className="flex flex-col h-full">
              <div className="text-3xl text-blue-600 mb-1">{usageStats.total_transformations}</div>
              <div className="text-sm text-slate-500 mt-auto text-right">Transformations</div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Total transformations performed
              </div>
            </div>
          </div>
          
          <div 
            className="bg-white p-6 rounded-lg border border-slate-200 relative group cursor-pointer transition-all hover:shadow-md"
            title="Total number of words that were changed during transformations"
          >
            <div className="flex flex-col h-full">
              <div className="text-3xl text-green-600 mb-1">{usageStats.total_words_transformed}</div>
              <div className="text-sm text-slate-500 mt-auto text-right">Words</div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Total words changed (added + removed)
              </div>
            </div>
          </div>
          
          <div 
            className="bg-white p-6 rounded-lg border border-slate-200 relative group cursor-pointer transition-all hover:shadow-md"
            title="Total number of sentences that were transformed"
          >
            <div className="flex flex-col h-full">
              <div className="text-3xl text-purple-600 mb-1">{usageStats.total_sentences_transformed}</div>
              <div className="text-sm text-slate-500 mt-auto text-right">Sentences</div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Total sentences processed
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Activity Chart */}
      <div className="bg-white p-6 rounded-lg border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg text-slate-800">Daily Activity</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod(7)}
              className={`px-3 py-1 text-sm rounded ${
                selectedPeriod === 7
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setSelectedPeriod(30)}
              className={`px-3 py-1 text-sm rounded ${
                selectedPeriod === 30
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
        
        {dailyStats.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div 
              className="flex items-end gap-1 h-32 min-w-full"
              style={{ 
                minWidth: selectedPeriod === 30 ? '600px' : 'auto'
              }}
            >
              {dailyStats.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className="w-full bg-blue-500 rounded-t max-w-8"
                    style={{
                      height: `${(day.transformation_count / getMaxCount()) * 100}%`,
                      minHeight: day.transformation_count > 0 ? '4px' : '0px'
                    }}
                    title={`${day.transformation_count} transformations, ${day.word_count} words`}
                  ></div>
                  <div className="text-xs text-slate-500 text-center truncate w-full">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      month: selectedPeriod === 30 ? 'numeric' : 'short',
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-center py-8">No activity data available</div>
        )}
      </div>
    </div>
  );
} 