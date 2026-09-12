import { describe, it, expect, beforeEach } from 'vitest';
import { recordBurst, getDailyStats, getTodayKey, clearMemoryStore } from '../src/shared/storage';
import { TypingBurstPayload } from '../src/shared/types';

describe('Storage & Burst Rollup', () => {
  beforeEach(() => {
    clearMemoryStore();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('records a typing burst and calculates cumulative metrics', async () => {
    const burst1: TypingBurstPayload = {
      startTime: 1000,
      endTime: 13000,
      durationMs: 12000, // 0.2 minutes
      charCount: 80,     // 16 words -> 80 WPM
      backspaceCount: 2,
      grossWpm: 80,
      netWpm: 78,
      accuracy: 98,
      bigrams: {
        th: { count: 3, totalLatencyMs: 270 },
      },
      keyMistakes: {
        o: { hits: 8, backspaces: 1 },
      },
      domain: 'github.com',
    };

    const stats = await recordBurst(burst1);
    expect(stats.burstsCount).toBe(1);
    expect(stats.totalChars).toBe(80);
    expect(stats.totalBackspaces).toBe(2);
    expect(stats.peakWpm).toBe(80);
    expect(stats.averageGrossWpm).toBe(80);
    expect(stats.overallAccuracy).toBe(98);
    expect(stats.domainStats?.['github.com']?.chars).toBe(80);

    const fetched = await getDailyStats(getTodayKey());
    expect(fetched.totalChars).toBe(80);
  });

  it('ignores micro-bursts with less than 3 characters', async () => {
    const microBurst: TypingBurstPayload = {
      startTime: 1000,
      endTime: 1500,
      durationMs: 500,
      charCount: 2,
      backspaceCount: 0,
      grossWpm: 48,
      netWpm: 48,
      accuracy: 100,
      bigrams: {},
      keyMistakes: {},
    };

    const stats = await recordBurst(microBurst);
    expect(stats.burstsCount).toBe(0);
  });
});
