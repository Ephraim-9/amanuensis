import { DailyStats, TypingBurstPayload, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  isTrackingEnabled: true,
  theme: 'serika-dark',
  burstIdleTimeoutMs: 1500,
  showBadgeWpm: true,
  ignoredDomains: ['bank', 'chase.com', 'wellsfargo.com', 'paypal.com', 'login.', 'accounts.'],
  trackDomainStats: true,
};

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const memoryStore = new Map<string, any>();

export async function getStoredItem<T>(key: string, defaultValue: T): Promise<T> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (res) => {
        if (res && res[key] !== undefined) {
          resolve(res[key]);
        } else {
          resolve(defaultValue);
        }
      });
    });
  }

  if (memoryStore.has(key)) {
    return memoryStore.get(key) as T;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Ignore and fallback
    }
  }

  return defaultValue;
}

export async function setStoredItem<T>(key: string, value: T): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }

  memoryStore.set(key, value);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore
    }
  }
}

export function clearMemoryStore(): void {
  memoryStore.clear();
}

export async function getSettings(): Promise<UserSettings> {
  return getStoredItem<UserSettings>('settings', DEFAULT_SETTINGS);
}

export async function updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await setStoredItem('settings', updated);
  return updated;
}

export async function getDailyStats(dateKey: string = getTodayKey()): Promise<DailyStats> {
  const defaultDaily: DailyStats = {
    date: dateKey,
    totalChars: 0,
    totalBackspaces: 0,
    totalTypingTimeMs: 0,
    averageGrossWpm: 0,
    averageNetWpm: 0,
    peakWpm: 0,
    overallAccuracy: 100,
    burstsCount: 0,
    hourlyWpm: {},
    bigrams: {},
    keyMistakes: {},
    domainStats: {},
  };
  return getStoredItem<DailyStats>(`stats_${dateKey}`, defaultDaily);
}

export async function recordBurst(burst: TypingBurstPayload): Promise<DailyStats> {
  const today = getTodayKey();
  const stats = await getDailyStats(today);

  // Avoid recording micro-bursts with < 3 chars to prevent noise
  if (burst.charCount < 3) {
    return stats;
  }

  stats.burstsCount += 1;
  stats.totalChars += burst.charCount;
  stats.totalBackspaces += burst.backspaceCount;
  stats.totalTypingTimeMs += burst.durationMs;

  if (burst.grossWpm > stats.peakWpm) {
    stats.peakWpm = Math.round(burst.grossWpm);
  }

  // Calculate cumulative average WPM: (totalChars / 5) / (totalTypingTimeMs / 60000)
  const totalMinutes = stats.totalTypingTimeMs / 60000;
  if (totalMinutes > 0) {
    stats.averageGrossWpm = Math.round((stats.totalChars / 5) / totalMinutes);
    const uncorrectedChars = Math.max(0, stats.totalChars - stats.totalBackspaces);
    stats.averageNetWpm = Math.round((uncorrectedChars / 5) / totalMinutes);
  }

  // Accuracy calculation
  const totalAttempted = stats.totalChars + stats.totalBackspaces;
  stats.overallAccuracy = totalAttempted > 0
    ? Math.round(((stats.totalChars) / totalAttempted) * 100)
    : 100;

  // Hourly WPM bin
  const hour = new Date(burst.startTime).getHours();
  if (!stats.hourlyWpm[hour]) {
    stats.hourlyWpm[hour] = { wpmSum: 0, count: 0, chars: 0 };
  }
  stats.hourlyWpm[hour].wpmSum += burst.grossWpm;
  stats.hourlyWpm[hour].count += 1;
  stats.hourlyWpm[hour].chars += burst.charCount;

  // Bigram latency rollup
  for (const [pair, bData] of Object.entries(burst.bigrams)) {
    if (!stats.bigrams[pair]) {
      stats.bigrams[pair] = { count: 0, totalLatencyMs: 0 };
    }
    stats.bigrams[pair].count += bData.count;
    stats.bigrams[pair].totalLatencyMs += bData.totalLatencyMs;
  }

  // Key mistake and hit rollup
  for (const [key, km] of Object.entries(burst.keyMistakes)) {
    if (!stats.keyMistakes[key]) {
      stats.keyMistakes[key] = { hits: 0, backspaces: 0 };
    }
    stats.keyMistakes[key].hits += km.hits;
    stats.keyMistakes[key].backspaces += km.backspaces;
  }

  // Domain stats
  if (burst.domain) {
    if (!stats.domainStats) stats.domainStats = {};
    if (!stats.domainStats[burst.domain]) {
      stats.domainStats[burst.domain] = { chars: 0, bursts: 0, avgWpm: 0 };
    }
    const dom = stats.domainStats[burst.domain];
    dom.chars += burst.charCount;
    dom.bursts += 1;
    dom.avgWpm = Math.round((dom.avgWpm * (dom.bursts - 1) + burst.grossWpm) / dom.bursts);
  }

  await setStoredItem(`stats_${today}`, stats);

  // Maintain list of recorded date keys for multi-day history
  const allDateKeys = await getStoredItem<string[]>('all_date_keys', []);
  if (!allDateKeys.includes(today)) {
    allDateKeys.push(today);
    await setStoredItem('all_date_keys', allDateKeys);
  }

  return stats;
}

export async function getAllHistoricalStats(days: number = 7): Promise<DailyStats[]> {
  const allDateKeys = await getStoredItem<string[]>('all_date_keys', [getTodayKey()]);
  const recentKeys = allDateKeys.slice(-days);
  const results: DailyStats[] = [];

  for (const k of recentKeys) {
    const s = await getDailyStats(k);
    if (s.burstsCount > 0 || k === getTodayKey()) {
      results.push(s);
    }
  }
  return results;
}
