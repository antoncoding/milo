import { useState, useEffect } from 'react';

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

interface DiffViewerProps {
  entryIndex: number;
  originalText: string;
  transformedText: string;
  onClose: () => void;
}

// Frontend word diff calculation
function tokenizeText(text: string): string[] {
  // Simple tokenization by whitespace - could be enhanced for Chinese text
  return text.split(/\s+/).filter(word => word.length > 0);
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  
  // Create DP table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find LCS
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
  
  // Build diff for original text (mark deletions)
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
  
  // Build diff for transformed text (mark additions)
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
  
  // Count additions and removals
  const addedCount = transformedDiff.filter(d => d.change_type === 'added').length;
  const removedCount = originalDiff.filter(d => d.change_type === 'removed').length;
  
  return {
    original_diff: originalDiff,
    transformed_diff: transformedDiff,
    added_count: addedCount,
    removed_count: removedCount,
  };
}

export function DiffViewer({ entryIndex, originalText, transformedText, onClose }: DiffViewerProps) {
  const [diff, setDiff] = useState<TextDiff | null>(null);

  useEffect(() => {
    // Calculate diff directly on the frontend
    const calculatedDiff = computeWordDiff(originalText, transformedText);
    setDiff(calculatedDiff);
  }, [originalText, transformedText]);

  if (!diff) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
          <div className="p-6">
            <div className="animate-pulse">Loading diff...</div>
          </div>
        </div>
      </div>
    );
  }

  const renderDiffText = (words: WordDiff[], isTransformed: boolean) => {
    return (
      <div className="font-mono text-sm leading-relaxed">
        {words.map((wordDiff, index) => {
          let className = '';
          let prefix = '';
          
          if (wordDiff.change_type === 'removed' && !isTransformed) {
            className = 'bg-red-100 text-red-800 px-1 rounded';
            prefix = '';
          } else if (wordDiff.change_type === 'added' && isTransformed) {
            className = 'bg-green-100 text-green-800 px-1 rounded';
            prefix = '';
          } else if (wordDiff.change_type === 'unchanged') {
            className = 'text-slate-700';
          }
          
          return (
            <span key={index} className={className}>
              {prefix}{wordDiff.word}
              {index < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Text Transformation Diff</h2>
            {diff && (
              <p className="text-sm text-slate-600 mt-1">
                <span className="text-green-600 font-medium">+{diff.added_count}</span>
                {' '}
                <span className="text-red-600 font-medium">-{diff.removed_count}</span>
                {' '}words changed
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto p-6">
          {diff ? (
            <div className="space-y-6">
              {/* Original with deletions highlighted */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-slate-700">Original</span>
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    -{diff.removed_count} words
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  {renderDiffText(diff.original_diff, false)}
                </div>
              </div>

              {/* Transformed with additions highlighted */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-slate-700">Transformed</span>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    +{diff.added_count} words
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  {renderDiffText(diff.transformed_diff, true)}
                </div>
              </div>

              {/* Legend */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Legend:</p>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">removed</span>
                    <span className="text-slate-600">deleted words</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">added</span>
                    <span className="text-slate-600">added words</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">Failed to load diff</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 