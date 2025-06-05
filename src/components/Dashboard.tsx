import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
          <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col h-32">
            <div className="text-3xl text-blue-600 mb-1">{usageStats.total_transformations}</div>
            <div className="text-sm text-slate-500 mt-auto mb-2">Transformations</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col h-32">
            <div className="text-3xl text-green-600 mb-1">{usageStats.total_words_transformed}</div>
            <div className="text-sm text-slate-500 mt-auto mb-2">Words</div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-slate-200 relative flex flex-col h-32">
            <div className="text-3xl text-purple-600 mb-1">{usageStats.total_sentences_transformed}</div>
            <div className="text-sm text-slate-500 mt-auto mb-2">Sentences</div>
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyStats.map(day => ({
                  ...day,
                  displayDate: new Date(day.date).toLocaleDateString('en-US', { 
                    month: selectedPeriod === 30 ? 'numeric' : 'short',
                    day: 'numeric' 
                  })
                }))}
                margin={{
                  top: 5,
                  right: 20,
                  left: 20,
                  bottom: 5,
                }}
              >
                <XAxis 
                  dataKey="displayDate"
                  fontSize={12}
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tick={false}
                  domain={[0, 'dataMax + 1']}
                  axisLine={false}
                  tickLine={false}
                  width={0}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    switch (name) {
                      case 'transformation_count':
                        return [value, 'Transformations'];
                      case 'word_count':
                        return [value, 'Words'];
                      case 'sentence_count':
                        return [value, 'Sentences'];
                      default:
                        return [value, name];
                    }
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="transformation_count" 
                  fill="#3b82f6" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-slate-500 text-center py-8">No activity data available</div>
        )}
      </div>
    </div>
  );
} 