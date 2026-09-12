import { Chart, registerables } from 'chart.js';
import { getDailyStats, getAllHistoricalStats, getSettings, updateSettings } from '../shared/storage';
import { THEMES, getTheme, applyTheme } from '../shared/themes';
import { analyzeWeaknesses, getMonkeytypeCustomUrl } from '../shared/monkeytype_bridge';
import { DailyStats, UserSettings } from '../shared/types';

Chart.register(...registerables);

let currentChart: Chart | null = null;
let currentStats: DailyStats | null = null;
let currentSettings: UserSettings | null = null;
let activeRange: 'today' | '7d' = 'today';

// Drill state
let drillText = '';
let drillIndex = 0;
let drillErrors = 0;
let drillStartTime = 0;
let drillInterval: any = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentSettings = await getSettings();
  initThemeSelector();
  initSettingsToggles();
  initTimeRangeNav();
  await loadAndRenderDashboard();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        loadAndRenderDashboard();
      }
    });
  }
});

function initThemeSelector(): void {
  const select = document.getElementById('theme-select') as HTMLSelectElement;
  if (!select || !currentSettings) return;

  select.innerHTML = '';
  THEMES.forEach((theme) => {
    const opt = document.createElement('option');
    opt.value = theme.id;
    opt.textContent = theme.name;
    if (theme.id === currentSettings?.theme) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  const activeTheme = getTheme(currentSettings.theme || 'serika-dark');
  applyTheme(activeTheme);

  select.addEventListener('change', async (e) => {
    const target = e.target as HTMLSelectElement;
    const selected = getTheme(target.value);
    applyTheme(selected);
    currentSettings = await updateSettings({ theme: selected.id });
    if (currentChart) {
      updateChartTheme(selected.mainColor);
    }
  });
}

function initSettingsToggles(): void {
  const trackingToggle = document.getElementById('setting-toggle-tracking') as HTMLInputElement;
  const badgeToggle = document.getElementById('setting-toggle-badge') as HTMLInputElement;

  if (trackingToggle && currentSettings) {
    trackingToggle.checked = currentSettings.isTrackingEnabled;
    trackingToggle.addEventListener('change', async () => {
      currentSettings = await updateSettings({ isTrackingEnabled: trackingToggle.checked });
    });
  }

  if (badgeToggle && currentSettings) {
    badgeToggle.checked = currentSettings.showBadgeWpm;
    badgeToggle.addEventListener('change', async () => {
      currentSettings = await updateSettings({ showBadgeWpm: badgeToggle.checked });
    });
  }
}

function initTimeRangeNav(): void {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeRange = (tab.getAttribute('data-range') as 'today' | '7d') || 'today';
      await loadAndRenderDashboard();
    });
  });
}

async function loadAndRenderDashboard(): Promise<void> {
  if (activeRange === 'today') {
    currentStats = await getDailyStats();
  } else {
    const history = await getAllHistoricalStats(7);
    currentStats = aggregateHistory(history);
  }

  renderMetrics(currentStats);
  renderChart(currentStats);
  renderKeyboardHeatmap(currentStats);
  renderSlowestBigrams(currentStats);
  setupMonkeytypeBridge(currentStats);
}

function aggregateHistory(history: DailyStats[]): DailyStats {
  const aggregated: DailyStats = {
    date: 'Last 7 Days',
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
  };

  for (const s of history) {
    aggregated.totalChars += s.totalChars;
    aggregated.totalBackspaces += s.totalBackspaces;
    aggregated.totalTypingTimeMs += s.totalTypingTimeMs;
    aggregated.burstsCount += s.burstsCount;
    if (s.peakWpm > aggregated.peakWpm) aggregated.peakWpm = s.peakWpm;

    for (const [pair, b] of Object.entries(s.bigrams || {})) {
      if (!aggregated.bigrams[pair]) aggregated.bigrams[pair] = { count: 0, totalLatencyMs: 0 };
      aggregated.bigrams[pair].count += b.count;
      aggregated.bigrams[pair].totalLatencyMs += b.totalLatencyMs;
    }

    for (const [k, m] of Object.entries(s.keyMistakes || {})) {
      if (!aggregated.keyMistakes[k]) aggregated.keyMistakes[k] = { hits: 0, backspaces: 0 };
      aggregated.keyMistakes[k].hits += m.hits;
      aggregated.keyMistakes[k].backspaces += m.backspaces;
    }
  }

  const minutes = aggregated.totalTypingTimeMs / 60000;
  if (minutes > 0) {
    aggregated.averageGrossWpm = Math.round((aggregated.totalChars / 5) / minutes);
    const netChars = Math.max(0, aggregated.totalChars - aggregated.totalBackspaces);
    aggregated.averageNetWpm = Math.round((netChars / 5) / minutes);
  }

  const attempts = aggregated.totalChars + aggregated.totalBackspaces;
  aggregated.overallAccuracy = attempts > 0
    ? Math.round((aggregated.totalChars / attempts) * 100)
    : 100;

  return aggregated;
}

function renderMetrics(stats: DailyStats): void {
  const valGrossWpm = document.getElementById('val-gross-wpm');
  const valNetWpm = document.getElementById('val-net-wpm');
  const valAccuracy = document.getElementById('val-accuracy');
  const valBackspaces = document.getElementById('val-backspaces');
  const valKeys = document.getElementById('val-keys');
  const valActiveTime = document.getElementById('val-active-time');
  const valPeakWpm = document.getElementById('val-peak-wpm');
  const valBurstCount = document.getElementById('val-burst-count');

  if (valGrossWpm) valGrossWpm.textContent = `${stats.averageGrossWpm || 0}`;
  if (valNetWpm) valNetWpm.textContent = `net: ${stats.averageNetWpm || 0} wpm`;
  if (valAccuracy) valAccuracy.innerHTML = `${stats.overallAccuracy || 100}<span class="unit">%</span>`;
  if (valBackspaces) valBackspaces.textContent = `${(stats.totalBackspaces || 0).toLocaleString()} backspaces`;
  if (valKeys) valKeys.textContent = (stats.totalChars || 0).toLocaleString();

  const minutes = Math.round((stats.totalTypingTimeMs || 0) / 60000);
  if (valActiveTime) valActiveTime.textContent = `${minutes}m active typing`;
  if (valPeakWpm) valPeakWpm.innerHTML = `${stats.peakWpm || 0} <span class="unit">wpm</span>`;
  if (valBurstCount) valBurstCount.textContent = `${stats.burstsCount || 0} bursts recorded`;
}

function renderChart(stats: DailyStats): void {
  const ctx = document.getElementById('wpm-chart') as HTMLCanvasElement;
  if (!ctx) return;

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const theme = getTheme(currentSettings?.theme || 'serika-dark');

  // Build labels and points
  let labels: string[] = [];
  let dataPoints: number[] = [];

  if (activeRange === 'today') {
    // 24 hours
    labels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
    dataPoints = Array.from({ length: 24 }, (_, h) => {
      const entry = stats.hourlyWpm ? stats.hourlyWpm[h] : null;
      if (!entry || entry.count === 0) return 0;
      return Math.round(entry.wpmSum / entry.count);
    });
  } else {
    // Past days placeholder / history
    labels = ['Day -6', 'Day -5', 'Day -4', 'Day -3', 'Day -2', 'Yesterday', 'Today'];
    dataPoints = [0, 0, 0, 0, 0, 0, stats.averageGrossWpm];
  }

  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'WPM',
          data: dataPoints,
          borderColor: theme.mainColor,
          backgroundColor: `${theme.mainColor}18`,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: theme.mainColor,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2022',
          titleColor: theme.mainColor,
          bodyColor: '#d1d0c5',
          borderColor: theme.subColor,
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: theme.subColor, maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: theme.subColor },
        },
      },
    },
  });
}

function updateChartTheme(mainColor: string): void {
  if (!currentChart) return;
  currentChart.data.datasets[0].borderColor = mainColor;
  currentChart.data.datasets[0].backgroundColor = `${mainColor}18`;
  currentChart.data.datasets[0].pointBackgroundColor = mainColor;
  currentChart.update();
}

const KEYBOARD_ROWS = [
  [
    { key: '`', label: '`' }, { key: '1', label: '1' }, { key: '2', label: '2' },
    { key: '3', label: '3' }, { key: '4', label: '4' }, { key: '5', label: '5' },
    { key: '6', label: '6' }, { key: '7', label: '7' }, { key: '8', label: '8' },
    { key: '9', label: '9' }, { key: '0', label: '0' }, { key: '-', label: '-' },
    { key: '=', label: '=' }, { key: 'backspace', label: '⌫', wide: 'wide-2' }
  ],
  [
    { key: 'tab', label: 'tab', wide: 'wide-1' },
    { key: 'q', label: 'Q' }, { key: 'w', label: 'W' }, { key: 'e', label: 'E' },
    { key: 'r', label: 'R' }, { key: 't', label: 'T' }, { key: 'y', label: 'Y' },
    { key: 'u', label: 'U' }, { key: 'i', label: 'I' }, { key: 'o', label: 'O' },
    { key: 'p', label: 'P' }, { key: '[', label: '[' }, { key: ']', label: ']' },
    { key: '\\', label: '\\' }
  ],
  [
    { key: 'caps', label: 'caps', wide: 'wide-2' },
    { key: 'a', label: 'A' }, { key: 's', label: 'S' }, { key: 'd', label: 'D' },
    { key: 'f', label: 'F' }, { key: 'g', label: 'G' }, { key: 'h', label: 'H' },
    { key: 'j', label: 'J' }, { key: 'k', label: 'K' }, { key: 'l', label: 'L' },
    { key: ';', label: ';' }, { key: "'", label: "'" },
    { key: 'enter', label: 'return', wide: 'wide-2' }
  ],
  [
    { key: 'shift', label: 'shift', wide: 'wide-3' },
    { key: 'z', label: 'Z' }, { key: 'x', label: 'X' }, { key: 'c', label: 'C' },
    { key: 'v', label: 'V' }, { key: 'b', label: 'B' }, { key: 'n', label: 'N' },
    { key: 'm', label: 'M' }, { key: ',', label: ',' }, { key: '.', label: '.' },
    { key: '/', label: '/' }, { key: 'shift', label: 'shift', wide: 'wide-3' }
  ],
  [
    { key: 'space', label: 'space', spacebar: true }
  ]
];

function renderKeyboardHeatmap(stats: DailyStats): void {
  const container = document.getElementById('keyboard-heatmap');
  const inspectEl = document.getElementById('key-inspect-info');
  if (!container) return;

  container.innerHTML = '';

  const mistakes = stats.keyMistakes || {};

  // Find maximum error count to normalize heatmap
  let maxErrors = 1;
  Object.values(mistakes).forEach((m) => {
    if (m.backspaces > maxErrors) maxErrors = m.backspaces;
  });

  KEYBOARD_ROWS.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';

    row.forEach((k) => {
      const keyEl = document.createElement('div');
      keyEl.className = 'kb-key';
      if (k.wide) keyEl.classList.add(k.wide);
      if (k.spacebar) keyEl.classList.add('spacebar');
      keyEl.textContent = k.label;

      const normKey = k.key.toLowerCase();
      const mData = mistakes[normKey] || { hits: 0, backspaces: 0 };

      // Apply heat shading if backspaces exist
      if (mData.backspaces > 0) {
        const ratio = Math.min(1, mData.backspaces / maxErrors);
        const alpha = (0.2 + ratio * 0.6).toFixed(2);
        keyEl.style.backgroundColor = `rgba(202, 71, 84, ${alpha})`;
        keyEl.style.borderColor = `rgba(202, 71, 84, 0.7)`;
        keyEl.style.color = '#fff';
      }

      // Interaction
      keyEl.addEventListener('mouseenter', () => {
        if (!inspectEl) return;
        const total = mData.hits + mData.backspaces;
        const errRate = total > 0 ? Math.round((mData.backspaces / total) * 100) : 0;
        inspectEl.innerHTML = `Key <strong>[${k.label.toUpperCase()}]</strong>: ${mData.hits} hits, ${mData.backspaces} backspaces (${errRate}% error rate)`;
      });

      rowEl.appendChild(keyEl);
    });

    container.appendChild(rowEl);
  });
}

function renderSlowestBigrams(stats: DailyStats): void {
  const listEl = document.getElementById('bigrams-list');
  if (!listEl) return;

  const analysis = analyzeWeaknesses(stats);
  listEl.innerHTML = '';

  if (analysis.slowestBigrams.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--sub-color); font-size: 13px;">
        Cadence data is compiling. Start typing in your browser to detect slowest key transitions.
      </div>
    `;
    return;
  }

  analysis.slowestBigrams.forEach((b) => {
    const row = document.createElement('div');
    row.className = 'bigram-row';
    const first = b.pair[0].toUpperCase();
    const second = b.pair[1].toUpperCase();

    row.innerHTML = `
      <div class="bigram-pair">
        <span>${first}</span>
        <span class="arrow">→</span>
        <span>${second}</span>
        <span class="bigram-count">(${b.count}x)</span>
      </div>
      <div class="bigram-latency">
        ${b.avgLatencyMs} ms
      </div>
    `;
    listEl.appendChild(row);
  });
}

function setupMonkeytypeBridge(stats: DailyStats): void {
  const analysis = analyzeWeaknesses(stats);
  drillText = analysis.generatedPracticeText;

  const exportBtn = document.getElementById('export-monkeytype-btn');
  const copyBtn = document.getElementById('copy-words-btn');

  if (exportBtn) {
    exportBtn.onclick = () => {
      const url = getMonkeytypeCustomUrl(drillText);
      window.open(url, '_blank');
    };
  }

  if (copyBtn) {
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(drillText);
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = `<span>Copied to Clipboard!</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    };
  }

  initDrill(drillText);
}

// In-Dashboard Interactive Drill (Monkeytype feel)
function initDrill(text: string): void {
  const box = document.getElementById('drill-words-box');
  const restartBtn = document.getElementById('drill-restart-btn');
  const wpmEl = document.getElementById('drill-wpm');
  const accEl = document.getElementById('drill-acc');

  if (!box) return;

  drillIndex = 0;
  drillErrors = 0;
  drillStartTime = 0;
  if (drillInterval) clearInterval(drillInterval);

  if (wpmEl) wpmEl.textContent = 'wpm: 0';
  if (accEl) accEl.textContent = 'acc: 100%';

  // Render character spans
  box.innerHTML = '';
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = text[i];
    if (i === 0) span.classList.add('current');
    box.appendChild(span);
  }

  box.onkeydown = (e: KeyboardEvent) => {
    if (drillIndex >= text.length) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      initDrill(text);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (drillIndex > 0) {
        const letters = box.querySelectorAll('.letter');
        letters[drillIndex].classList.remove('current');
        drillIndex -= 1;
        letters[drillIndex].className = 'letter current';
      }
      return;
    }

    if (e.key.length !== 1) return;
    e.preventDefault();

    if (drillStartTime === 0) {
      drillStartTime = Date.now();
      drillInterval = setInterval(updateDrillStats, 500);
    }

    const letters = box.querySelectorAll('.letter');
    const expected = text[drillIndex];
    const currentSpan = letters[drillIndex];

    currentSpan.classList.remove('current');

    if (e.key === expected) {
      currentSpan.classList.add('correct');
    } else {
      currentSpan.classList.add('incorrect');
      drillErrors += 1;
    }

    drillIndex += 1;

    if (drillIndex < text.length) {
      letters[drillIndex].classList.add('current');
    } else {
      // Finished drill!
      if (drillInterval) clearInterval(drillInterval);
      updateDrillStats();
    }
  };

  restartBtn?.addEventListener('click', () => {
    initDrill(text);
    box.focus();
  });
}

function updateDrillStats(): void {
  const wpmEl = document.getElementById('drill-wpm');
  const accEl = document.getElementById('drill-acc');

  if (drillStartTime === 0 || drillIndex === 0) return;

  const durationMin = (Date.now() - drillStartTime) / 60000;
  if (durationMin <= 0) return;

  const wpm = Math.round((drillIndex / 5) / durationMin);
  const acc = Math.max(0, Math.round(((drillIndex - drillErrors) / drillIndex) * 100));

  if (wpmEl) wpmEl.textContent = `wpm: ${wpm}`;
  if (accEl) accEl.textContent = `acc: ${acc}%`;
}
