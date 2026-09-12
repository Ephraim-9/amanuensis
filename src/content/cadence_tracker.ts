import { PrivacyGuard } from './privacy_guard';
import { TypingBurstPayload, UserSettings } from '../shared/types';
import { CONTENT_DEFAULT_SETTINGS } from './constants';

export class CadenceTracker {
  private privacyGuard: PrivacyGuard;
  private settings: UserSettings = CONTENT_DEFAULT_SETTINGS;

  private currentBurstStart: number = 0;
  private lastKeystrokeTime: number = 0;
  private charCount: number = 0;
  private backspaceCount: number = 0;
  private prevKey: string | null = null;

  private bigrams: Record<string, { count: number; totalLatencyMs: number }> = {};
  private keyMistakes: Record<string, { hits: number; backspaces: number }> = {};

  private idleTimer: any = null;
  private isTrackingActive: boolean = true;

  constructor() {
    this.privacyGuard = new PrivacyGuard();
    this.initSettings();
    this.attachListeners();
    console.log('[Amanuensis] Ambient typing scribe active on', window?.location?.hostname || 'tab');
  }

  private initSettings(): void {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['settings'], (res) => {
        if (res && res.settings) {
          this.settings = { ...CONTENT_DEFAULT_SETTINGS, ...res.settings };
          this.privacyGuard.setIgnoredDomains(this.settings.ignoredDomains || []);
          this.isTrackingActive = this.settings.isTrackingEnabled;
        }
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.settings) {
          this.settings = { ...CONTENT_DEFAULT_SETTINGS, ...changes.settings.newValue };
          this.privacyGuard.setIgnoredDomains(this.settings.ignoredDomains || []);
          this.isTrackingActive = this.settings.isTrackingEnabled;
        }
      });
    }
  }

  private attachListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushBurst();
      }
    });
    window.addEventListener('beforeunload', () => {
      this.flushBurst();
    });
  }

  public handleKeyDown(e: KeyboardEvent): void {
    if (!this.isTrackingActive) return;

    // 1. Strict Privacy Check
    if (this.privacyGuard.isHostIgnored() || this.privacyGuard.isElementSensitive(e.target)) {
      // Abort and do not track
      this.resetBurst();
      return;
    }

    const now = Date.now();
    const key = e.key;

    // Ignore modifier combinations (Ctrl+C, Cmd+V, Alt+Tab, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    // Handle Backspace / Delete
    if (key === 'Backspace' || key === 'Delete') {
      this.backspaceCount += 1;

      // Attribute typo to the previous key typed if it occurred within 1.2s
      if (this.prevKey && (now - this.lastKeystrokeTime) < 1200) {
        const normKey = this.prevKey.toLowerCase();
        if (!this.keyMistakes[normKey]) {
          this.keyMistakes[normKey] = { hits: 0, backspaces: 0 };
        }
        this.keyMistakes[normKey].backspaces += 1;
      }

      this.lastKeystrokeTime = now;
      this.resetIdleTimer();
      return;
    }

    // Ignore functional non-character keys
    if (
      key.startsWith('Arrow') ||
      key === 'Shift' ||
      key === 'Control' ||
      key === 'Alt' ||
      key === 'Meta' ||
      key === 'CapsLock' ||
      key === 'Escape' ||
      key === 'Tab' ||
      key === 'Enter'
    ) {
      if (key === 'Enter') {
        // Enter often marks the end of a thought/line
        this.resetIdleTimer();
      }
      return;
    }

    // Only monitor printable single characters
    if (key.length !== 1) {
      return;
    }

    // Burst cadence detection
    const idleTimeout = this.settings.burstIdleTimeoutMs || 1500;
    const timeDelta = this.lastKeystrokeTime > 0 ? now - this.lastKeystrokeTime : 0;

    if (this.currentBurstStart === 0 || timeDelta >= idleTimeout) {
      // Previous burst concluded
      if (this.charCount >= 3) {
        this.flushBurst();
      } else {
        this.resetBurst();
      }
      this.currentBurstStart = now;
    }

    // Register character count
    this.charCount += 1;

    const normKey = key.toLowerCase();
    if (!this.keyMistakes[normKey]) {
      this.keyMistakes[normKey] = { hits: 0, backspaces: 0 };
    }
    this.keyMistakes[normKey].hits += 1;

    // Calculate Bigram latency if previous key was typed recently
    if (this.prevKey && timeDelta > 15 && timeDelta < idleTimeout) {
      // Bigram transition: only track lowercase alphanumeric pairs
      if (/^[a-z0-9]$/i.test(this.prevKey) && /^[a-z0-9]$/i.test(key)) {
        const bigram = (this.prevKey + key).toLowerCase();
        if (!this.bigrams[bigram]) {
          this.bigrams[bigram] = { count: 0, totalLatencyMs: 0 };
        }
        this.bigrams[bigram].count += 1;
        this.bigrams[bigram].totalLatencyMs += timeDelta;
      }
    }

    this.prevKey = key;
    this.lastKeystrokeTime = now;
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    const timeout = this.settings.burstIdleTimeoutMs || 1500;
    this.idleTimer = setTimeout(() => {
      this.flushBurst();
    }, timeout);
  }

  public flushBurst(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Only record meaningful bursts (at least 2 characters)
    if (this.charCount < 2 || this.currentBurstStart === 0) {
      this.resetBurst();
      return;
    }

    const endTime = this.lastKeystrokeTime;
    const rawDurationMs = endTime - this.currentBurstStart;
    // Add nominal latency for the first character and enforce realistic min duration
    const durationMs = Math.max(rawDurationMs + 200, this.charCount * 80, 400);
    const durationMinutes = durationMs / 60000;

    // Standard WPM = (chars / 5) / minutes
    let grossWpm = Math.round((this.charCount / 5) / durationMinutes);
    const netChars = Math.max(0, this.charCount - this.backspaceCount);
    let netWpm = Math.round((netChars / 5) / durationMinutes);

    // Cap unrealistic burst spikes (e.g. held down key) instead of dropping
    if (grossWpm > 250) grossWpm = 250;
    if (netWpm > 250) netWpm = 250;

    const totalAttempts = this.charCount + this.backspaceCount;
    const accuracy = totalAttempts > 0
      ? Math.round((this.charCount / totalAttempts) * 100)
      : 100;

    const payload: TypingBurstPayload = {
      startTime: this.currentBurstStart,
      endTime,
      durationMs,
      charCount: this.charCount,
      backspaceCount: this.backspaceCount,
      grossWpm,
      netWpm,
      accuracy,
      bigrams: { ...this.bigrams },
      keyMistakes: { ...this.keyMistakes },
      domain: this.settings.trackDomainStats && window?.location?.hostname ? window.location.hostname : undefined,
    };

    this.sendBurstToBackground(payload);
    this.resetBurst();
  }

  private sendBurstToBackground(payload: TypingBurstPayload): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage(
          {
            type: 'RECORD_BURST',
            payload,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[Amanuensis] Error delivering burst:', chrome.runtime.lastError.message);
            } else {
              console.log('[Amanuensis] Burst recorded:', payload.charCount, 'chars |', payload.grossWpm, 'WPM | accuracy:', payload.accuracy + '%');
            }
          }
        );
      } catch (err) {
        console.warn('[Amanuensis] Context error:', err);
      }
    }
  }

  private resetBurst(): void {
    this.currentBurstStart = 0;
    this.lastKeystrokeTime = 0;
    this.charCount = 0;
    this.backspaceCount = 0;
    this.prevKey = null;
    this.bigrams = {};
    this.keyMistakes = {};
  }
}

// Instantiate when running in browser content script
if (typeof window !== 'undefined') {
  new CadenceTracker();
}
