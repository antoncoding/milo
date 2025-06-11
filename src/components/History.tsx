import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ask, message } from '@tauri-apps/plugin-dialog';
import moment from 'moment';

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

interface WordDiff {
  word: string;
  change_type: 'added' | 'removed' | 'unchanged';
  position: number;
}

interface TextDiff {
  original_diff: WordDiff[];
  transformed_diff: WordDiff[];
  added_count: number;
  removed_count: number;
}

// Frontend word diff calculation
function tokenizeText(text: string): string[] {
  return text.split(/\s+/).filter(word => word.length > 0);
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const lcs: string[] = [];
  let i = m;
  let j = n;
  
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

function computeWordDiff(originalText: string, transformedText: string): TextDiff {
  const originalWords = tokenizeText(originalText);
  const transformedWords = tokenizeText(transformedText);
  
  const lcs = computeLCS(originalWords, transformedWords);
  
  const originalDiff: WordDiff[] = [];
  let lcsIndex = 0;
  
  for (let pos = 0; pos < originalWords.length; pos++) {
    const word = originalWords[pos];
    if (lcsIndex < lcs.length && word === lcs[lcsIndex]) {
      originalDiff.push({
        word,
        change_type: 'unchanged',
        position: pos,
      });
      lcsIndex++;
    } else {
      originalDiff.push({
        word,
        change_type: 'removed',
        position: pos,
      });
    }
  }
  
  const transformedDiff: WordDiff[] = [];
  lcsIndex = 0;
  
  for (let pos = 0; pos < transformedWords.length; pos++) {
    const word = transformedWords[pos];
    if (lcsIndex < lcs.length && word === lcs[lcsIndex]) {
      transformedDiff.push({
        word,
        change_type: 'unchanged',
        position: pos,
      });
      lcsIndex++;
    } else {
      transformedDiff.push({
        word,
        change_type: 'added',
        position: pos,
      });
    }
  }
  
  const addedCount = transformedDiff.filter(d => d.change_type === 'added').length;
  const removedCount = originalDiff.filter(d => d.change_type === 'removed').length;
  
  return {
    original_diff: originalDiff,
    transformed_diff: transformedDiff,
    added_count: addedCount,
    removed_count: removedCount,
  };
}

export function History() {
  const [entries, setEntries] = useState<TransformationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [diffData, setDiffData] = useState<{[key: number]: TextDiff}>({});
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});

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
        await loadHistoryData();
        await message('Entry deleted successfully!', { title: 'Success', kind: 'info' });
      } catch (error) {
        console.error('Failed to delete entry:', error);
        await message(`Failed to delete entry: ${error}`, { title: 'Error', kind: 'error' });
      }
    }
  };

  const copyToClipboard = async (text: string, type: 'original' | 'transformed', entryIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `${entryIndex}-${type}`;
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      await message('Failed to copy text to clipboard', { title: 'Error', kind: 'error' });
    }
  };

  const CopyButton = ({ 
    text, 
    type, 
    entryIndex 
  }: { 
    text: string; 
    type: 'original' | 'transformed'; 
    entryIndex: number; 
  }) => {
    const key = `${entryIndex}-${type}`;
    const isCopied = copiedStates[key];

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(text, type, entryIndex);
        }}
        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-background-tertiary"
        title={`Copy ${type} text`}
      >
        {isCopied ? (
          <>
            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy</span>
          </>
        )}
      </button>
    );
  };

  const toggleDiffView = (index: number) => {
    if (expandedEntry === index) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(index);
      // Calculate diff if not already cached
      if (!diffData[index]) {
        const entry = entries[index];
        const diff = computeWordDiff(entry.original_text, entry.transformed_text);
        setDiffData(prev => ({ ...prev, [index]: diff }));
      }
    }
  };

  const renderDiffText = (words: WordDiff[], isTransformed: boolean) => {
    return (
      <div className="font-mono text-sm leading-relaxed">
        {words.map((wordDiff, index) => {
          let className = '';
          
          if (wordDiff.change_type === 'removed' && !isTransformed) {
            className = 'bg-red-100 text-red-800 px-1 rounded';
          } else if (wordDiff.change_type === 'added' && isTransformed) {
            className = 'bg-green-100 text-green-800 px-1 rounded';
          } else if (wordDiff.change_type === 'unchanged') {
            className = 'text-text-primary';
          }
          
          return (
            <span key={index} className={className}>
              {wordDiff.word}
              {index < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    return moment(dateString).fromNow();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-border-primary rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-border-primary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl text-text-primary">Transformation History</h1>
            <p className="text-text-secondary mt-1">View your past text transformations</p>
          </div>
        </div>

        {/* Recent Transformations */}
        <div className="bg-background-secondary rounded-lg border border-border-primary">
          <div className="p-6 border-b border-border-primary">
            <h2 className="text-lg text-text-primary">Recent Transformations</h2>
          </div>
          
          {entries.length > 0 ? (
            <div className="divide-y divide-border-primary">
              {entries.map((entry, index) => (
                <div key={index} className="p-4 cursor-pointer hover:bg-background-tertiary transition-colors" onClick={() => toggleDiffView(index)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-accent-primary/10 text-accent-primary rounded">
                        {entry.tone_name}
                      </span>
                      {(entry.added_count > 0 || entry.removed_count > 0) && (
                        <span className="text-xs text-text-secondary bg-background-tertiary px-2 py-1 rounded">
                          <span className="text-green-600">+{entry.added_count}</span>
                          {' '}
                          <span className="text-red-600">-{entry.removed_count}</span>
                        </span>
                      )}
                      <span className="text-xs text-text-tertiary">
                        {entry.sentence_count} sentences
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">
                        {formatTimeAgo(entry.timestamp)}
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
                  
                  <div 
                    className="text-sm text-text-primary overflow-x-auto whitespace-nowrap scrollbar-hide py-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <span className="inline-block">{entry.transformed_text}</span>
                  </div>
                  
                  {expandedEntry === index && diffData[index] && (
                    <div className="mt-4 space-y-4 border-t border-border-primary pt-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-primary">Original</span>
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                              -{diffData[index].removed_count} words
                            </span>
                          </div>
                          <CopyButton 
                            text={entry.original_text} 
                            type="original" 
                            entryIndex={index} 
                          />
                        </div>
                        <div className="border border-border-primary rounded-lg p-3 bg-background-tertiary">
                          {renderDiffText(diffData[index].original_diff, false)}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-primary">Transformed</span>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              +{diffData[index].added_count} words
                            </span>
                          </div>
                          <CopyButton 
                            text={entry.transformed_text} 
                            type="transformed" 
                            entryIndex={index} 
                          />
                        </div>
                        <div className="border border-border-primary rounded-lg p-3 bg-background-tertiary">
                          {renderDiffText(diffData[index].transformed_diff, true)}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border-primary">
                        <p className="text-xs text-text-tertiary mb-2">Legend:</p>
                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">removed</span>
                            <span className="text-text-secondary">deleted words</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">added</span>
                            <span className="text-text-secondary">added words</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-text-tertiary mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-text-tertiary">No transformation history yet</p>
              <p className="text-sm text-text-tertiary mt-1">
                Start transforming text to see your history here
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 