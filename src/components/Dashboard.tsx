import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CONFIG } from '../config';

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

  const openWebsite = async () => {
    try {
      await open(CONFIG.website_url);
    } catch (error) {
      console.error('Failed to open website:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-border-primary rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-border-primary rounded"></div>
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
        <h1 className="text-2xl text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Overview of your transformation activity</p>
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-background-secondary p-6 rounded-lg border border-border-primary relative flex flex-col h-32">
              <div className="text-3xl text-accent-primary mb-1">{usageStats.total_transformations}</div>
              <div className="text-sm text-text-tertiary mt-auto mb-2">Transformations</div>
            </div>

            <div className="bg-background-secondary p-6 rounded-lg border border-border-primary relative flex flex-col h-32">
              <div className="text-3xl text-text-secondary mb-1">{usageStats.total_words_transformed}</div>
              <div className="text-sm text-text-tertiary mt-auto mb-2">Words</div>
            </div>

            <div className="bg-background-secondary p-6 rounded-lg border border-border-primary relative flex flex-col h-32">
              <div className="text-3xl text-text-secondary mb-1">{usageStats.total_sentences_transformed}</div>
              <div className="text-sm text-text-tertiary mt-auto mb-2">Sentences</div>
            </div>
          </div>

          {/* Usage and Credit Balance Hint */}
          <div className="bg-background-tertiary p-4 rounded-lg border border-border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  To see your usage details and credit balance, visit our website
                </p>
              </div>
              <button
                onClick={openWebsite}
                className="inline-flex items-center px-3 py-2 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Website
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Activity Chart */}
      <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg text-text-primary">Daily Activity</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod(7)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedPeriod === 7
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-background-tertiary'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setSelectedPeriod(30)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedPeriod === 30
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-background-tertiary'
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
                  tick={{ fill: 'var(--text-secondary)' }}
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
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="transformation_count" 
                  fill="var(--accent-primary)" 
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-text-tertiary text-center py-8">No activity data available</div>
        )}
      </div>
    </div>
  );
} 