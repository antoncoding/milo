use anyhow::Result;
use dirs::config_dir;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf};
use chrono::{DateTime, Utc, NaiveDate};
use jieba_rs::Jieba;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransformationEntry {
    pub tone_name: String,
    pub original_text: String,
    pub transformed_text: String,
    pub timestamp: DateTime<Utc>,
    pub word_count: usize,
    pub sentence_count: usize,
    pub added_count: usize,
    pub removed_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordDiff {
    pub word: String,
    pub change_type: String, // "added", "removed", or "unchanged"
    pub position: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TextDiff {
    pub original_diff: Vec<WordDiff>,
    pub transformed_diff: Vec<WordDiff>,
    pub added_count: usize,
    pub removed_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct DayStats {
    pub date: NaiveDate,
    pub transformation_count: usize,
    pub word_count: usize,
    pub sentence_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransformationHistory {
    pub entries: Vec<TransformationEntry>,
    pub daily_stats: HashMap<String, DayStats>, // key: "YYYY-MM-DD"
    pub max_entries: Option<usize>,
}

impl Default for TransformationHistory {
    fn default() -> Self {
        Self {
            entries: Vec::new(),
            daily_stats: HashMap::new(),
            max_entries: Some(1000),
        }
    }
}

impl TransformationHistory {
    pub fn load() -> Self {
        fs::read_to_string(history_file_path())
            .ok()
            .and_then(|contents| serde_json::from_str(&contents).ok())
            .unwrap_or_default()
    }

    pub fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(history_file_path(), json).map_err(|e| e.to_string())
    }

    pub fn add_entry(&mut self, entry: TransformationEntry) {
        // Add to entries (most recent first)
        self.entries.insert(0, entry.clone());
        
        // Enforce max entries limit
        if let Some(max) = self.max_entries {
            if self.entries.len() > max {
                self.entries.truncate(max);
            }
        }

        // Update daily stats
        let date = entry.timestamp.date_naive();
        let date_key = date.format("%Y-%m-%d").to_string();
        
        let day_stats = self.daily_stats.entry(date_key).or_insert(DayStats {
            date,
            transformation_count: 0,
            word_count: 0,
            sentence_count: 0,
        });
        
        day_stats.transformation_count += 1;
        day_stats.word_count += entry.word_count;
        day_stats.sentence_count += entry.sentence_count;
    }

    pub fn get_recent_entries(&self, limit: usize) -> &[TransformationEntry] {
        let end = self.entries.len().min(limit);
        &self.entries[0..end]
    }

    pub fn get_total_transformations(&self) -> usize {
        self.entries.len()
    }

    pub fn get_total_words_transformed(&self) -> usize {
        self.entries.iter().map(|e| e.word_count).sum()
    }

    pub fn get_total_sentences_transformed(&self) -> usize {
        self.entries.iter().map(|e| e.sentence_count).sum()
    }

    pub fn clear_history(&mut self) {
        self.entries.clear();
        self.daily_stats.clear();
    }
}

pub fn history_file_path() -> PathBuf {
    let mut path = config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("milo");
    fs::create_dir_all(&path).unwrap();
    path.push("transformation_history.json");
    path
}

// Function to compute word-level diff between two texts
pub fn compute_word_diff(original: &str, transformed: &str) -> TextDiff {
    // Helper function to tokenize text into words
    let tokenize = |text: &str| -> Vec<String> {
        let jieba = Jieba::new();
        let has_chinese = text.chars().any(|c| {
            matches!(c, '\u{4e00}'..='\u{9fff}')
        });
        
        if has_chinese {
            jieba.cut(text, false).into_iter().map(|s| s.to_string()).collect()
        } else {
            text.split_whitespace().map(|s| s.to_string()).collect()
        }
    };
    
    let original_words = tokenize(original);
    let transformed_words = tokenize(transformed);
    
    // Compute LCS (Longest Common Subsequence) using dynamic programming
    let lcs = compute_lcs(&original_words, &transformed_words);
    
    // Build diff for original text (mark deletions)
    let mut original_diff = Vec::new();
    let mut lcs_index = 0;
    
    for (pos, word) in original_words.iter().enumerate() {
        if lcs_index < lcs.len() && *word == lcs[lcs_index] {
            // Word is unchanged
            original_diff.push(WordDiff {
                word: word.clone(),
                change_type: "unchanged".to_string(),
                position: pos,
            });
            lcs_index += 1;
        } else {
            // Word was removed
            original_diff.push(WordDiff {
                word: word.clone(),
                change_type: "removed".to_string(),
                position: pos,
            });
        }
    }
    
    // Build diff for transformed text (mark additions)
    let mut transformed_diff = Vec::new();
    let mut lcs_index = 0;
    
    for (pos, word) in transformed_words.iter().enumerate() {
        if lcs_index < lcs.len() && *word == lcs[lcs_index] {
            // Word is unchanged
            transformed_diff.push(WordDiff {
                word: word.clone(),
                change_type: "unchanged".to_string(),
                position: pos,
            });
            lcs_index += 1;
        } else {
            // Word was added
            transformed_diff.push(WordDiff {
                word: word.clone(),
                change_type: "added".to_string(),
                position: pos,
            });
        }
    }
    
    // Count additions and removals
    let added_count = transformed_diff.iter().filter(|d| d.change_type == "added").count();
    let removed_count = original_diff.iter().filter(|d| d.change_type == "removed").count();
    
    TextDiff {
        original_diff,
        transformed_diff,
        added_count,
        removed_count,
    }
}

// Helper function to compute Longest Common Subsequence
fn compute_lcs(a: &[String], b: &[String]) -> Vec<String> {
    let m = a.len();
    let n = b.len();
    
    // Create DP table
    let mut dp = vec![vec![0; n + 1]; m + 1];
    
    // Fill DP table
    for i in 1..=m {
        for j in 1..=n {
            if a[i-1] == b[j-1] {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = dp[i-1][j].max(dp[i][j-1]);
            }
        }
    }
    
    // Backtrack to find LCS
    let mut lcs = Vec::new();
    let mut i = m;
    let mut j = n;
    
    while i > 0 && j > 0 {
        if a[i-1] == b[j-1] {
            lcs.push(a[i-1].clone());
            i -= 1;
            j -= 1;
        } else if dp[i-1][j] > dp[i][j-1] {
            i -= 1;
        } else {
            j -= 1;
        }
    }
    
    lcs.reverse();
    lcs
}

// Function to count sentences in text, supporting multiple languages and punctuation types
pub fn count_sentences(text: &str) -> usize {
    if text.trim().is_empty() {
        return 0;
    }
    
    // Define sentence-ending punctuation for different languages
    // Including both half-width and full-width (Chinese/Japanese) punctuation
    let sentence_endings = [
        '.', '!', '?',          // English half-width
        '。', '！', '？',        // Chinese/Japanese full-width
        '…', '⋯',               // Ellipsis
        '‼', '⁇', '⁈', '⁉',    // Special punctuation
    ];
    
    let mut sentence_count = 0;
    let chars: Vec<char> = text.chars().collect();
    
    for (i, &ch) in chars.iter().enumerate() {
        if sentence_endings.contains(&ch) {
            sentence_count += 1;
            
            // Handle multiple consecutive punctuation (like "..." or "!!!")
            // Skip the rest of consecutive similar punctuation
            let mut j = i + 1;
            while j < chars.len() && (
                chars[j] == ch || 
                chars[j].is_whitespace() ||
                sentence_endings.contains(&chars[j])
            ) {
                j += 1;
            }
        }
    }
    
    // If no sentence-ending punctuation found but text exists, count as 1 sentence
    if sentence_count == 0 && !text.trim().is_empty() {
        sentence_count = 1;
    }
    
    sentence_count
}

// Tauri Commands
#[tauri::command]
pub fn add_transformation_to_history(
    tone_name: String,
    original: String,
    transformed: String,
) -> Result<(), String> {
    let mut history = TransformationHistory::load();
    
    // Calculate diff data immediately
    let diff = compute_word_diff(&original, &transformed);
    let word_count = diff.added_count + diff.removed_count;
    let sentence_count = count_sentences(&transformed);
    
    let entry = TransformationEntry {
        tone_name,
        original_text: original,
        transformed_text: transformed,
        timestamp: Utc::now(),
        word_count,
        sentence_count,
        added_count: diff.added_count,
        removed_count: diff.removed_count,
    };
    
    history.add_entry(entry);
    history.save()?;
    
    Ok(())
}

#[tauri::command]
pub fn get_transformation_history(limit: Option<usize>) -> Result<Vec<TransformationEntry>, String> {
    let history = TransformationHistory::load();
    let limit = limit.unwrap_or(50);
    Ok(history.get_recent_entries(limit).to_vec())
}

#[tauri::command]
pub fn clear_transformation_history() -> Result<(), String> {
    let mut history = TransformationHistory::load();
    history.clear_history();
    history.save()
}

#[tauri::command]
pub fn get_usage_stats() -> Result<serde_json::Value, String> {
    let history = TransformationHistory::load();
    
    Ok(serde_json::json!({
        "total_transformations": history.get_total_transformations(),
        "total_words_transformed": history.get_total_words_transformed(),
        "total_sentences_transformed": history.get_total_sentences_transformed(),
        "history_count": history.entries.len()
    }))
}

#[tauri::command]
pub fn get_daily_stats(days: Option<usize>) -> Result<Vec<DayStats>, String> {
    let history = TransformationHistory::load();
    let days = days.unwrap_or(7); // Default to 7 days
    
    let today = Utc::now().date_naive();
    let mut stats = Vec::new();
    
    // Generate stats for the last N days
    for i in 0..days {
        let date = today - chrono::Duration::days(i as i64);
        let date_key = date.format("%Y-%m-%d").to_string();
        
        let day_stats = history.daily_stats.get(&date_key)
            .cloned()
            .unwrap_or(DayStats {
                date,
                transformation_count: 0,
                word_count: 0,
                sentence_count: 0,
            });
        
        stats.push(day_stats);
    }
    
    // Reverse to get chronological order (oldest first)
    stats.reverse();
    Ok(stats)
}

#[tauri::command]
pub fn get_transformation_diff(entry_index: usize) -> Result<TextDiff, String> {
    let history = TransformationHistory::load();
    
    if entry_index >= history.entries.len() {
        return Err("Entry index out of bounds".to_string());
    }
    
    let entry = &history.entries[entry_index];
    Ok(compute_word_diff(&entry.original_text, &entry.transformed_text))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};
    use std::fs;

    fn cleanup_test_files() {
        let _ = fs::remove_file(history_file_path());
    }

    #[test]
    fn test_transformation_entry_creation() {
        let entry = TransformationEntry {
            tone_name: "Improve Writing".to_string(),
            original_text: "test text".to_string(),
            transformed_text: "improved test text".to_string(),
            timestamp: Utc::now(),
            word_count: 3,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        
        assert_eq!(entry.tone_name, "Improve Writing");
        assert_eq!(entry.word_count, 3);
    }

    #[test]
    fn test_history_add_entry() {
        cleanup_test_files();
        
        let mut history = TransformationHistory::default();
        
        let entry = TransformationEntry {
            tone_name: "Test Tone".to_string(),
            original_text: "original".to_string(),
            transformed_text: "transformed".to_string(),
            timestamp: Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap(),
            word_count: 1,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        
        history.add_entry(entry);
        
        assert_eq!(history.entries.len(), 1);
        assert_eq!(history.get_total_transformations(), 1);
        assert_eq!(history.get_total_words_transformed(), 1);
        
        // Check daily stats
        let date_key = "2024-01-15";
        assert!(history.daily_stats.contains_key(date_key));
        let day_stats = &history.daily_stats[date_key];
        assert_eq!(day_stats.transformation_count, 1);
        assert_eq!(day_stats.word_count, 1);
        
        cleanup_test_files();
    }

    #[test]
    fn test_history_multiple_entries_same_day() {
        cleanup_test_files();
        
        let mut history = TransformationHistory::default();
        let test_date = Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap();
        
        // Add first entry
        let entry1 = TransformationEntry {
            tone_name: "Tone 1".to_string(),
            original_text: "text 1".to_string(),
            transformed_text: "transformed text 1".to_string(),
            timestamp: test_date,
            word_count: 3,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        history.add_entry(entry1);
        
        // Add second entry same day
        let entry2 = TransformationEntry {
            tone_name: "Tone 2".to_string(),
            original_text: "text 2".to_string(),
            transformed_text: "transformed text 2".to_string(),
            timestamp: test_date,
            word_count: 2,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        history.add_entry(entry2);
        
        assert_eq!(history.entries.len(), 2);
        assert_eq!(history.get_total_transformations(), 2);
        assert_eq!(history.get_total_words_transformed(), 5);
        
        // Check daily stats aggregation
        let date_key = "2024-01-15";
        let day_stats = &history.daily_stats[date_key];
        assert_eq!(day_stats.transformation_count, 2);
        assert_eq!(day_stats.word_count, 5);
        
        cleanup_test_files();
    }

    #[test]
    fn test_history_max_entries_limit() {
        cleanup_test_files();
        
        let mut history = TransformationHistory::default();
        history.max_entries = Some(3);
        
        // Add 5 entries
        for i in 0..5 {
            let entry = TransformationEntry {
                tone_name: format!("Tone {}", i),
                original_text: format!("original {}", i),
                transformed_text: format!("transformed {}", i),
                timestamp: Utc::now(),
                word_count: 1,
                sentence_count: 1,
                added_count: 0,
                removed_count: 0,
            };
            history.add_entry(entry);
        }
        
        // Should only keep 3 entries (most recent)
        assert_eq!(history.entries.len(), 3);
        
        // Check that most recent entries are kept
        assert_eq!(history.entries[0].tone_name, "Tone 4");
        assert_eq!(history.entries[1].tone_name, "Tone 3");
        assert_eq!(history.entries[2].tone_name, "Tone 2");
        
        cleanup_test_files();
    }

    #[test]
    fn test_get_recent_entries() {
        cleanup_test_files();
        
        let mut history = TransformationHistory::default();
        
        // Add some entries
        for i in 0..5 {
            let entry = TransformationEntry {
                tone_name: format!("Tone {}", i),
                original_text: format!("original {}", i),
                transformed_text: format!("transformed {}", i),
                timestamp: Utc::now(),
                word_count: 1,
                sentence_count: 1,
                added_count: 0,
                removed_count: 0,
            };
            history.add_entry(entry);
        }
        
        let recent = history.get_recent_entries(3);
        assert_eq!(recent.len(), 3);
        assert_eq!(recent[0].tone_name, "Tone 4"); // Most recent first
        
        cleanup_test_files();
    }

    #[test]
    fn test_clear_history() {
        cleanup_test_files();
        
        let mut history = TransformationHistory::default();
        
        // Add an entry
        let entry = TransformationEntry {
            tone_name: "Test".to_string(),
            original_text: "test".to_string(),
            transformed_text: "transformed".to_string(),
            timestamp: Utc::now(),
            word_count: 1,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        history.add_entry(entry);
        
        assert_eq!(history.entries.len(), 1);
        assert_eq!(history.daily_stats.len(), 1);
        
        history.clear_history();
        
        assert_eq!(history.entries.len(), 0);
        assert_eq!(history.daily_stats.len(), 0);
        assert_eq!(history.get_total_transformations(), 0);
        assert_eq!(history.get_total_words_transformed(), 0);
        
        cleanup_test_files();
    }

    #[test]
    fn test_daily_stats_generation() {
        cleanup_test_files();
        
        let mut history = TransformationHistory::default();
        
        // Add entries on different days
        let day1 = Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap();
        let day2 = Utc.with_ymd_and_hms(2024, 1, 16, 12, 0, 0).unwrap();
        
        let entry1 = TransformationEntry {
            tone_name: "Day 1".to_string(),
            original_text: "text".to_string(),
            transformed_text: "day one text".to_string(),
            timestamp: day1,
            word_count: 3,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        history.add_entry(entry1);
        
        let entry2 = TransformationEntry {
            tone_name: "Day 2".to_string(),
            original_text: "text".to_string(),
            transformed_text: "day two text".to_string(),
            timestamp: day2,
            word_count: 2,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        history.add_entry(entry2);
        
        assert_eq!(history.daily_stats.len(), 2);
        
        let day1_stats = &history.daily_stats["2024-01-15"];
        assert_eq!(day1_stats.transformation_count, 1);
        assert_eq!(day1_stats.word_count, 3);
        
        let day2_stats = &history.daily_stats["2024-01-16"];
        assert_eq!(day2_stats.transformation_count, 1);
        assert_eq!(day2_stats.word_count, 2);
        
        cleanup_test_files();
    }

    #[test]
    fn test_save_and_load() {
        cleanup_test_files();
        
        // Create and save history
        let mut history = TransformationHistory::default();
        let entry = TransformationEntry {
            tone_name: "Test Save".to_string(),
            original_text: "original".to_string(),
            transformed_text: "transformed".to_string(),
            timestamp: Utc.with_ymd_and_hms(2024, 1, 15, 12, 0, 0).unwrap(),
            word_count: 1,
            sentence_count: 1,
            added_count: 0,
            removed_count: 0,
        };
        history.add_entry(entry);
        
        // Save to file
        history.save().expect("Failed to save history");
        
        // Load from file
        let loaded_history = TransformationHistory::load();
        
        assert_eq!(loaded_history.entries.len(), 1);
        assert_eq!(loaded_history.entries[0].tone_name, "Test Save");
        assert_eq!(loaded_history.daily_stats.len(), 1);
        
        cleanup_test_files();
    }

    #[test]
    fn test_compute_word_diff_simple() {
        // Test the example from user: "I am a very tall guy." -> "I'm very tall."
        let original = "I am a very tall guy.";
        let transformed = "I'm very tall.";
        let diff = compute_word_diff(original, transformed);
        
        println!("Diff result: added={}, removed={}", diff.added_count, diff.removed_count);
        
        // Should have: removed "am", "a", "guy." and added "I'm"
        assert_eq!(diff.added_count, 1); // "I'm"
        assert_eq!(diff.removed_count, 4); // "I", "am", "a", "guy."
        
        // Check that "I'm" is marked as added
        let added_words: Vec<&str> = diff.transformed_diff
            .iter()
            .filter(|w| w.change_type == "added")
            .map(|w| w.word.as_str())
            .collect();
        assert!(added_words.contains(&"I'm"));
        
        // Check that removed words are marked correctly
        let removed_words: Vec<&str> = diff.original_diff
            .iter()
            .filter(|w| w.change_type == "removed")
            .map(|w| w.word.as_str())
            .collect();
        assert!(removed_words.contains(&"I"));
        assert!(removed_words.contains(&"am"));
        assert!(removed_words.contains(&"a"));
        assert!(removed_words.contains(&"guy."));
    }

    #[test]
    fn test_compute_word_diff_additions_only() {
        let original = "Hello world";
        let transformed = "Hello beautiful wonderful world";
        let diff = compute_word_diff(original, transformed);
        
        assert_eq!(diff.added_count, 2); // "beautiful", "wonderful"
        assert_eq!(diff.removed_count, 0);
    }

    #[test]
    fn test_compute_word_diff_removals_only() {
        let original = "Hello beautiful wonderful world";
        let transformed = "Hello world";
        let diff = compute_word_diff(original, transformed);
        
        assert_eq!(diff.added_count, 0);
        assert_eq!(diff.removed_count, 2); // "beautiful", "wonderful"
    }

    #[test]
    fn test_compute_word_diff_identical() {
        let original = "Hello world";
        let transformed = "Hello world";
        let diff = compute_word_diff(original, transformed);
        
        assert_eq!(diff.added_count, 0);
        assert_eq!(diff.removed_count, 0);
    }

    #[test]
    fn test_compute_word_diff_chinese() {
        let original = "我是一个学生";
        let transformed = "我是一个好学生";
        let diff = compute_word_diff(original, transformed);
        
        println!("Chinese diff: added={}, removed={}", diff.added_count, diff.removed_count);
        assert_eq!(diff.added_count, 1); // "好"
        assert_eq!(diff.removed_count, 0);
    }

    #[test]
    fn test_count_sentences_english() {
        // Basic sentence counting
        assert_eq!(count_sentences("Hello world."), 1);
        assert_eq!(count_sentences("Hello world. How are you?"), 2);
        assert_eq!(count_sentences("Hello world! How are you? Fine."), 3);
        
        // Multiple punctuation
        assert_eq!(count_sentences("Hello world!!! How are you???"), 2);
        assert_eq!(count_sentences("Hello world... How are you."), 2);
        
        // No punctuation (should count as 1)
        assert_eq!(count_sentences("Hello world"), 1);
        
        // Empty string
        assert_eq!(count_sentences(""), 0);
        assert_eq!(count_sentences("   "), 0);
    }

    #[test]
    fn test_count_sentences_chinese() {
        // Chinese punctuation (full-width)
        assert_eq!(count_sentences("你好世界。"), 1);
        assert_eq!(count_sentences("你好世界。你好吗？"), 2);
        assert_eq!(count_sentences("你好世界！你好吗？很好。"), 3);
        
        // Mixed punctuation
        assert_eq!(count_sentences("Hello世界。你好吗?"), 2);
        
        // No punctuation (should count as 1)
        assert_eq!(count_sentences("你好世界"), 1);
    }

    #[test]
    fn test_count_sentences_mixed() {
        // Mixed English and Chinese with various punctuation
        assert_eq!(count_sentences("Hello 世界! 你好嗎？"), 2);
        assert_eq!(count_sentences("Testing... 測試。"), 2);
        assert_eq!(count_sentences("Hello! 你好！ How are you? 你好嗎？"), 4);
    }

    #[test]
    fn test_count_sentences_special_punctuation() {
        // Ellipsis and special punctuation
        assert_eq!(count_sentences("Hello… World."), 2);
        assert_eq!(count_sentences("Really⁉ Yes‼"), 2);
        assert_eq!(count_sentences("Hello⋯ World？"), 2);
    }
} 