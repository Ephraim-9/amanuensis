import { describe, it, expect } from 'vitest';
import { analyzeWeaknesses, getMonkeytypeCustomUrl } from '../src/shared/monkeytype_bridge';
import { DailyStats } from '../src/shared/types';

describe('Monkeytype Bridge', () => {
  const mockStats: DailyStats = {
    date: '2026-09-13',
    totalChars: 1500,
    totalBackspaces: 60,
    totalTypingTimeMs: 180000,
    averageGrossWpm: 82,
    averageNetWpm: 78,
    peakWpm: 104,
    overallAccuracy: 96,
    burstsCount: 12,
    hourlyWpm: {},
    bigrams: {
      th: { count: 15, totalLatencyMs: 1200 }, // 80ms avg
      qu: { count: 4, totalLatencyMs: 960 },   // 240ms avg (slow!)
      br: { count: 6, totalLatencyMs: 1320 },  // 220ms avg (slow!)
    },
    keyMistakes: {
      p: { hits: 40, backspaces: 8 },  // 17% error rate
      x: { hits: 10, backspaces: 3 },  // 23% error rate
      e: { hits: 180, backspaces: 2 }, // ~1% error rate
    },
  };

  it('identifies top mistake keys and slowest bigrams', () => {
    const analysis = analyzeWeaknesses(mockStats);

    expect(analysis.topMistakeKeys.length).toBeGreaterThan(0);
    // x or p should be top error rate
    const topKeys = analysis.topMistakeKeys.map((k) => k.key);
    expect(topKeys).toContain('x');
    expect(topKeys).toContain('p');

    // Slowest bigrams should prioritize 'qu' and 'br'
    expect(analysis.slowestBigrams.length).toBe(3);
    expect(analysis.slowestBigrams[0].pair).toBe('qu');
    expect(analysis.slowestBigrams[0].avgLatencyMs).toBe(240);
  });

  it('generates practice text targeting weak keys', () => {
    const analysis = analyzeWeaknesses(mockStats);
    expect(analysis.generatedPracticeText.length).toBeGreaterThan(20);

    // Check URL generation
    const url = getMonkeytypeCustomUrl(analysis.generatedPracticeText);
    expect(url).toContain('https://monkeytype.com?customText=');
  });
});
