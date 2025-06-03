import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { DiffViewer } from './DiffViewer';

interface TransformationEntry {
  tone_name: string;
  original_text: string;
  transformed_text: string;
  timestamp: string;
  word_count: number;
  sentence_count: number;
  added_count: number;
  removed_count: number;
}

export function History() {
  const [entries, setEntries] = useState<TransformationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [diffViewerEntry, setDiffViewerEntry] = useState<number | null>(null);

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      
      const entriesData = await invoke<TransformationEntry[]>('get_transformation_history', { limit: 50 });
      setEntries(entriesData);
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (index: number) => {
    const userConfirmed = await ask('Are you sure you want to delete this transformation?', {
      title: 'Delete Entry',
      kind: 'warning'
    });
    
    if (userConfirmed) {
      try {
        await invoke('delete_transformation_entry', { index });
        await loadHistoryData(); // Refresh the data
        await message('Entry deleted successfully!', { title: 'Success', kind: 'info' });
      } catch (error) {
        console.error('Failed to delete entry:', error);
        await message(`Failed to delete entry: ${error}`, { title: 'Error', kind: 'error' });
      }
    }
  };

  const clearHistory = async () => {
    console.log('Clear history button clicked!');
    const userConfirmed = await ask('Are you sure you want to clear all transformation history? This action cannot be undone.', {
      title: 'Clear History',
      kind: 'warning'
    });
    console.log('User confirmation result:', userConfirmed);
    
    if (userConfirmed) {
      try {
        console.log('Attempting to clear history...');
        const result = await invoke('clear_transformation_history');
        console.log('Clear history result:', result);
        console.log('History cleared successfully, reloading data...');
        await loadHistoryData();
        console.log('Data reloaded successfully');
        
        // Show success feedback
        await message('History cleared successfully!', { title: 'Success', kind: 'info' });
      } catch (error) {
        console.error('Failed to clear history:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        await message(`Failed to clear history: ${error}. Please try again.`, { title: 'Error', kind: 'error' });
      }
    } else {
      console.log('User cancelled history clearing');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transformation History</h1>
          <p className="text-slate-600 mt-1">View your past text transformations</p>
        </div>
        <button
          onClick={() => {
            clearHistory();
          }}
          className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
        >
          Clear History
        </button>
      </div>

      {/* Recent Transformations */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Recent Transformations</h2>
        </div>
        
        {entries.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {entries.map((entry, index) => (
              <div 
                key={index} 
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setDiffViewerEntry(index)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {entry.tone_name}
                    </span>
                    {(entry.added_count > 0 || entry.removed_count > 0) && (
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        <span className="text-green-600">+{entry.added_count}</span>
                        {' '}
                        <span className="text-red-600">-{entry.removed_count}</span>
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {entry.sentence_count} sentences
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {formatDate(entry.timestamp)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEntry(index);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      title="Delete entry"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="text-sm text-slate-600 truncate">
                  <span className="font-medium">Original:</span> {entry.original_text}
                </div>
                <div className="text-sm text-slate-800 truncate mt-1">
                  <span className="font-medium">Transformed:</span> {entry.transformed_text}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-500">No transformation history yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Start transforming text to see your history here
            </p>
          </div>
        )}
      </div>
      
      {/* Diff Viewer Modal */}
      {diffViewerEntry !== null && entries[diffViewerEntry] && (
        <DiffViewer
          entryIndex={diffViewerEntry}
          originalText={entries[diffViewerEntry].original_text}
          transformedText={entries[diffViewerEntry].transformed_text}
          onClose={() => setDiffViewerEntry(null)}
        />
      )}
    </div>
  );
} 