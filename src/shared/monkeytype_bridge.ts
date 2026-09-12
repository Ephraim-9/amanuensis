import { DailyStats } from './types';

// Standard 200 common English words for drill generation
const CORE_WORD_POOL = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it', 'that', 'for',
  'they', 'with', 'as', 'not', 'on', 'she', 'at', 'by', 'this', 'we', 'you', 'do',
  'but', 'his', 'from', 'they', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some',
  'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'great', 'between', 'need', 'large', 'big', 'small',
  'point', 'hand', 'place', 'water', 'different', 'light', 'off', 'world', 'turn',
  'system', 'program', 'problem', 'quick', 'brown', 'fox', 'jumps', 'lazy', 'dog',
  'extra', 'exact', 'except', 'pixel', 'typing', 'speed', 'accuracy', 'focus',
  'cadence', 'rhythm', 'streak', 'smooth', 'practice', 'mechanical', 'keyboard'
];

export interface WeaknessAnalysis {
  topMistakeKeys: Array<{ key: string; backspaces: number; errorRate: number }>;
  slowestBigrams: Array<{ pair: string; avgLatencyMs: number; count: number }>;
  generatedPracticeText: string;
}

export function analyzeWeaknesses(stats: DailyStats): WeaknessAnalysis {
  // 1. Sort mistake keys by error rate & backspaces
  const mistakeEntries = Object.entries(stats.keyMistakes || {})
    .filter(([key, data]) => key.length === 1 && data.hits + data.backspaces >= 3 && data.backspaces > 0)
    .map(([key, data]) => ({
      key,
      backspaces: data.backspaces,
      errorRate: Math.round((data.backspaces / (data.hits + data.backspaces)) * 100),
    }))
    .sort((a, b) => b.errorRate - a.errorRate || b.backspaces - a.backspaces)
    .slice(0, 5);

  // 2. Sort slowest bigrams (minimum 2 occurrences)
  const bigramEntries = Object.entries(stats.bigrams || {})
    .filter(([_, data]) => data.count >= 2)
    .map(([pair, data]) => ({
      pair,
      count: data.count,
      avgLatencyMs: Math.round(data.totalLatencyMs / data.count),
    }))
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
    .slice(0, 6);

  // 3. Generate targeted practice word list
  const weakChars = new Set(mistakeEntries.map((m) => m.key.toLowerCase()));
  const weakBigramPairs = bigramEntries.map((b) => b.pair.toLowerCase());

  // Score words in pool based on how many weak characters and weak bigrams they hit
  const scoredWords = CORE_WORD_POOL.map((word) => {
    let score = 0;
    const lower = word.toLowerCase();

    for (const char of weakChars) {
      if (lower.includes(char)) score += 3;
    }
    for (const bigram of weakBigramPairs) {
      if (lower.includes(bigram)) score += 5;
    }
    return { word, score };
  });

  scoredWords.sort((a, b) => b.score - a.score);

  // Pick top 25-30 words, shuffled slightly
  const selected = scoredWords.slice(0, 30).map((w) => w.word);
  if (selected.length < 15) {
    selected.push(...CORE_WORD_POOL.slice(0, 20));
  }

  // Shuffle selected
  const shuffled = [...selected].sort(() => Math.random() - 0.5);
  const generatedPracticeText = shuffled.join(' ');

  return {
    topMistakeKeys: mistakeEntries,
    slowestBigrams: bigramEntries,
    generatedPracticeText,
  };
}

/**
 * Creates a custom Monkeytype practice URL or import bundle.
 */
export function getMonkeytypeCustomUrl(practiceText: string): string {
  // Monkeytype custom text is encoded or can be pasted,
  // monkeytype.com supports custom text or users can copy with one click.
  const encoded = encodeURIComponent(practiceText);
  return `https://monkeytype.com?customText=${encoded}`;
}
