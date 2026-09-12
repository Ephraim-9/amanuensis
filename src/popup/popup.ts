import { getDailyStats, getSettings, updateSettings, recordBurst } from '../shared/storage';
import { getTheme, applyTheme } from '../shared/themes';
import { analyzeWeaknesses, getMonkeytypeCustomUrl } from '../shared/monkeytype_bridge';
import { DailyStats } from '../shared/types';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();
  const theme = getTheme(settings.theme || 'serika-dark');
  applyTheme(theme);

  const trackingDot = document.getElementById('tracking-status-dot');
  const toggleBtn = document.getElementById('toggle-tracking-btn');
  const todayWpmEl = document.getElementById('today-wpm');
  const netWpmSubEl = document.getElementById('net-wpm-sub');
  const accuracyEl = document.getElementById('today-accuracy');
  const backspacesEl = document.getElementById('backspaces-count');
  const totalKeysEl = document.getElementById('total-keys');
  const typingTimeEl = document.getElementById('typing-time');
  const peakWpmEl = document.getElementById('peak-wpm');
  const weakKeysContainer = document.getElementById('weak-keys-list');
  const quickTestInput = document.getElementById('quick-test-input') as HTMLInputElement | null;

  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  const viewDashboardBtn = document.getElementById('view-dashboard-btn');
  const practiceBtn = document.getElementById('practice-bridge-btn');

  const updateTrackingStatus = (active: boolean) => {
    if (trackingDot) {
      if (active) {
        trackingDot.classList.add('active');
        trackingDot.setAttribute('title', 'Tracking active (click to pause)');
      } else {
        trackingDot.classList.remove('active');
        trackingDot.setAttribute('title', 'Tracking paused (click to resume)');
      }
    }
  };

  updateTrackingStatus(settings.isTrackingEnabled);

  toggleBtn?.addEventListener('click', async () => {
    const current = await getSettings();
    const updated = await updateSettings({ isTrackingEnabled: !current.isTrackingEnabled });
    updateTrackingStatus(updated.isTrackingEnabled);
  });

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('dashboard.html', '_blank');
    }
  };

  openDashboardBtn?.addEventListener('click', openDashboard);
  viewDashboardBtn?.addEventListener('click', openDashboard);

  // Function to render current daily stats
  const renderStats = async () => {
    const stats: DailyStats = await getDailyStats();

    if (todayWpmEl) todayWpmEl.textContent = `${stats.averageGrossWpm || 0}`;
    if (netWpmSubEl) netWpmSubEl.textContent = `net: ${stats.averageNetWpm || 0} wpm`;
    if (accuracyEl) accuracyEl.innerHTML = `${stats.overallAccuracy || 100}<span class="unit">%</span>`;
    if (backspacesEl) backspacesEl.textContent = `${stats.totalBackspaces || 0} backspaces`;
    if (totalKeysEl) totalKeysEl.textContent = `${stats.totalChars.toLocaleString()}`;

    const minutesActive = Math.round(stats.totalTypingTimeMs / 60000);
    if (typingTimeEl) typingTimeEl.textContent = `${minutesActive}m active`;
    if (peakWpmEl) peakWpmEl.textContent = `${stats.peakWpm || 0}`;

    // Analyze weaknesses
    const analysis = analyzeWeaknesses(stats);
    if (weakKeysContainer) {
      if (analysis.topMistakeKeys.length > 0) {
        weakKeysContainer.innerHTML = '';
        analysis.topMistakeKeys.slice(0, 4).forEach((m) => {
          const chip = document.createElement('div');
          chip.className = 'key-chip';
          chip.innerHTML = `<span>[${m.key.toUpperCase()}]</span><span class="chip-sub">${m.errorRate}% err</span>`;
          weakKeysContainer.appendChild(chip);
        });
      } else {
        weakKeysContainer.innerHTML = '<span class="empty-hint">Clean typing! No major key error clusters yet.</span>';
      }
    }
  };

  await renderStats();

  // Listen for background updates
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        renderStats();
      }
    });
  }

  // Quick live test sandbox logic
  if (quickTestInput) {
    let testStartTime = 0;
    let testChars = 0;
    let testBackspaces = 0;
    let testTimer: any = null;

    quickTestInput.addEventListener('keydown', (e) => {
      const now = Date.now();
      if (testStartTime === 0) testStartTime = now;

      if (e.key === 'Backspace') {
        testBackspaces += 1;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        testChars += 1;
      }

      if (testTimer) clearTimeout(testTimer);
      testTimer = setTimeout(async () => {
        if (testChars >= 2 && testStartTime > 0) {
          const durationMs = Math.max(now - testStartTime + 200, testChars * 80, 400);
          const durationMinutes = durationMs / 60000;
          let grossWpm = Math.round((testChars / 5) / durationMinutes);
          let netWpm = Math.round((Math.max(0, testChars - testBackspaces) / 5) / durationMinutes);
          if (grossWpm > 250) grossWpm = 250;
          if (netWpm > 250) netWpm = 250;

          await recordBurst({
            startTime: testStartTime,
            endTime: now,
            durationMs,
            charCount: testChars,
            backspaceCount: testBackspaces,
            grossWpm,
            netWpm,
            accuracy: Math.round((testChars / (testChars + testBackspaces)) * 100),
            bigrams: {},
            keyMistakes: {},
            domain: 'popup-test',
          });

          testStartTime = 0;
          testChars = 0;
          testBackspaces = 0;
          await renderStats();
        }
      }, 1000);
    });
  }

  // Handle Practice on Monkeytype
  practiceBtn?.addEventListener('click', async () => {
    const stats = await getDailyStats();
    const analysis = analyzeWeaknesses(stats);
    const url = getMonkeytypeCustomUrl(analysis.generatedPracticeText);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  });
});
