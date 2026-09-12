export interface KeyStrokeEvent {
  key: string;
  code: string;
  timestamp: number;
  isBackspace: boolean;
}

export interface BigramStat {
  pair: string; // e.g., "th", "in", "er"
  count: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
}

export interface KeyMistakeStat {
  key: string; // e.g. "a", "s", "Backspace"
  hits: number;
  backspaces: number;
  errorRate: number; // backspaces / (hits + backspaces)
}

export interface TypingBurstPayload {
  startTime: number;
  endTime: number;
  durationMs: number;
  charCount: number;
  backspaceCount: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  bigrams: Record<string, { count: number; totalLatencyMs: number }>;
  keyMistakes: Record<string, { hits: number; backspaces: number }>;
  domain?: string;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalChars: number;
  totalBackspaces: number;
  totalTypingTimeMs: number;
  averageGrossWpm: number;
  averageNetWpm: number;
  peakWpm: number;
  overallAccuracy: number;
  burstsCount: number;
  hourlyWpm: Record<number, { wpmSum: number; count: number; chars: number }>;
  bigrams: Record<string, { count: number; totalLatencyMs: number }>;
  keyMistakes: Record<string, { hits: number; backspaces: number }>;
  domainStats?: Record<string, { chars: number; bursts: number; avgWpm: number }>;
}

export interface UserSettings {
  isTrackingEnabled: boolean;
  theme: string;
  burstIdleTimeoutMs: number; // default 1500ms
  showBadgeWpm: boolean;
  ignoredDomains: string[];
  trackDomainStats: boolean;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  bgColor: string;
  mainColor: string;
  subColor: string;
  textColor: string;
  caretColor: string;
  errorColor: string;
}
