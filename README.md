# 📜 Amanuensis

> */əˌmæn.juˈɛn.sɪs/* — Latin *āmanuēnsis*, from *servus ā manū* ("one who writes by hand; a private scribe").  
> **An ambient, privacy-first typing scribe with Monkeytype aesthetics and a targeted training bridge.**

---

### The Premise

You can hit **130 WPM on Monkeytype**, but when writing essays, architecture docs, code, or letters, your real-world rhythm stumbles into pauses, corrections, and cadence friction.

**Amanuensis** is your silent, private digital scribe. It sits quietly in the background of your browser, observing your authentic motor cadence across your natural writing—burst velocity, backspace clusters, error ratios, and inter-key hesitation—**without ever logging your private words or sentences**.

It then translates your real-world typing habits back into **Monkeytype**, synthesizing custom drills that target your exact weak keys and troubled bigrams.

---

## ✨ Features

- **Ambient Cadence Tracking**:
  - Silently groups natural writing into continuous bursts.
  - Computes Gross WPM, Net WPM, accuracy, and latency intervals between consecutive keys ($M[k_1][k_2]$).
- **Zero-Trust Local Privacy**:
  - Automatically suppresses all password inputs (`type="password"`), credit cards, CVVs, secret keys, and auth tokens.
  - Automatically disables tracking across banking, payment, and sensitive login domains.
  - **Zero Keystroke Logging**: Raw text and sentences are never buffered, captured, or saved. Only anonymous differential metrics (burst duration, counts, bigram milliseconds) exist in memory.
  - **100% On-Device**: No telemetry, no remote servers, no cloud storage. All data resides in local browser storage.
- **Monkeytype Visuals & Themes**:
  - 8 authentic themes: **Serika Dark**, **Carbon**, **Dracula**, **Nord**, **Olivia**, **Botanical**, **Cyberpunk**, and **Matrix**.
  - Monospace typography and smooth velocity curves via Chart.js.
- **Interactive Keyboard Heatmap**:
  - Complete mechanical QWERTY layout shaded dynamically from cool slate to hot crimson based on error rate.
  - Inspect any key to reveal exact hits, backspaces, and real-world error percentages.
- **The Monkeytype Bridge**:
  - **Dynamic Weakness Synthesis**: Analyzes your highest-error keys and slowest bigrams from real-life browsing.
  - **1-Click Export to Monkeytype.com**: Launches a custom test on Monkeytype loaded with your weak-key wordlist.
  - **Instant In-Dashboard Drill**: Embedded interactive typing box right inside the dashboard with real-time caret, color feedback, and live WPM.
- **Live Toolbar Badge**: Optional daily average WPM indicator right on your browser toolbar.

---

## 🛠️ Repository Structure

```
amanuensis/
├── manifest.json                  # Manifest V3 extension configuration
├── scripts/
│   ├── build.js                   # Standalone rollup bundler
│   └── generate_icons.py          # Icon rasterization
├── src/
│   ├── background/
│   │   └── service_worker.ts      # Daily rollup engine & live badge updater
│   ├── content/
│   │   ├── cadence_tracker.ts     # Ambient keystroke listener & burst detector
│   │   ├── privacy_guard.ts       # Zero-trust DOM input & domain filtering
│   │   └── constants.ts
│   ├── popup/                     # Compact popup with live testing sandbox
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts
│   ├── dashboard/                 # Full analytics hub & heatmaps
│   │   ├── dashboard.html
│   │   ├── dashboard.css
│   │   └── dashboard.ts
│   ├── shared/
│   │   ├── types.ts               # Shared telemetry schemas
│   │   ├── themes.ts              # 8 authentic Monkeytype palettes
│   │   ├── storage.ts             # Local storage & historical rollup abstraction
│   │   └── monkeytype_bridge.ts   # Weakness analyzer & custom drill generator
│   └── icons/                     # Extension icons (16px, 48px, 128px)
└── tests/                         # Vitest unit test suite
    ├── privacy_guard.test.ts
    ├── storage.test.ts
    └── monkeytype_bridge.test.ts
```

---

## 🚀 Installation & Setup

### 1. Build the Extension
```bash
# Install dependencies
pnpm install

# Build standalone production bundle into dist/
pnpm build
```

### 2. Load into Chrome / Chromium
1. Open Google Chrome (or Brave, Edge, Chromium).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked**.
5. Select the `dist/` directory inside this repository:
   ```
   amanuensis/dist
   ```
6. The **Amanuensis** icon will appear on your browser toolbar.

---

## 🔒 Privacy Architecture

1. **No Keylogger**: Amanuensis never stores what you write. When you type `hello`, it records that 5 keys were pressed over a span of 700ms, measures the timing between transitions, and immediately discards the keystroke buffer.
2. **Immediate Field Bypassing**: Any element matching passwords, CVVs, credit cards, or sensitive data tokens is immediately skipped and resets any active timing window.
3. **No Network Telemetry**: Zero network requests leave your machine.

---

## 📜 License

MIT License © [Ephraim-9](https://github.com/Ephraim-9).
Built with admiration for the open-source [Monkeytype](https://monkeytype.com) project.
