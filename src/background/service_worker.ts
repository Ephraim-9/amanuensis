import { recordBurst, getDailyStats, getSettings, DEFAULT_SETTINGS } from '../shared/storage';
import { TypingBurstPayload } from '../shared/types';
import { getTheme } from '../shared/themes';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Amanuensis] Extension installed/reloaded.');
  const settings = await getSettings();
  if (!settings) {
    chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // Programmatically inject content script into all open tabs so the user doesn't have to manually refresh!
  try {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ['content_script.js'],
          })
          .catch(() => {});
      }
    }
    console.log(`[Amanuensis] Auto-injected tracker into ${tabs.length} existing tabs.`);
  } catch (err) {
    console.warn('[Amanuensis] Auto-inject tab error:', err);
  }

  updateBadge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'RECORD_BURST') {
    handleRecordBurst(message.payload)
      .then((updatedStats) => {
        sendResponse({ success: true, stats: updatedStats });
      })
      .catch((err) => {
        console.error('[Amanuensis] Record burst error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  } else if (message.type === 'GET_TODAY_STATS') {
    getDailyStats().then((stats) => {
      sendResponse({ stats });
    });
    return true;
  }
});

async function handleRecordBurst(burst: TypingBurstPayload) {
  const updated = await recordBurst(burst);
  try {
    await updateBadge(updated.averageGrossWpm);
  } catch (err) {
    console.warn('[Amanuensis] Badge update error:', err);
  }
  return updated;
}

async function updateBadge(wpm?: number) {
  try {
    const settings = await getSettings();
    if (!settings.showBadgeWpm) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    let displayWpm = wpm;
    if (displayWpm === undefined) {
      const today = await getDailyStats();
      displayWpm = today.averageGrossWpm;
    }

    const theme = getTheme(settings.theme || 'serika-dark');

    if (displayWpm > 0) {
      chrome.action.setBadgeText({ text: `${displayWpm}` });
      chrome.action.setBadgeBackgroundColor({ color: theme.mainColor });
      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#1c1c1c' });
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    // Ignore badge errors
  }
}
