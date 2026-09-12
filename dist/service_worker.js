const g = {
  isTrackingEnabled: !0,
  theme: "serika-dark",
  burstIdleTimeoutMs: 1500,
  showBadgeWpm: !0,
  ignoredDomains: ["bank", "chase.com", "wellsfargo.com", "paypal.com", "login.", "accounts."],
  trackDomainStats: !0
};
function h() {
  const o = /* @__PURE__ */ new Date();
  return `${o.getFullYear()}-${String(o.getMonth() + 1).padStart(2, "0")}-${String(o.getDate()).padStart(2, "0")}`;
}
const l = /* @__PURE__ */ new Map();
async function m(o, a) {
  if (typeof chrome < "u" && chrome.storage && chrome.storage.local)
    return new Promise((t) => {
      chrome.storage.local.get([o], (r) => {
        r && r[o] !== void 0 ? t(r[o]) : t(a);
      });
    });
  if (l.has(o))
    return l.get(o);
  if (typeof localStorage < "u")
    try {
      const t = localStorage.getItem(o);
      if (t !== null)
        return JSON.parse(t);
    } catch {
    }
  return a;
}
async function u(o, a) {
  if (typeof chrome < "u" && chrome.storage && chrome.storage.local)
    return new Promise((t) => {
      chrome.storage.local.set({ [o]: a }, () => t());
    });
  if (l.set(o, a), typeof localStorage < "u")
    try {
      localStorage.setItem(o, JSON.stringify(a));
    } catch {
    }
}
async function C() {
  return m("settings", g);
}
async function d(o = h()) {
  const a = {
    date: o,
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
    domainStats: {}
  };
  return m(`stats_${o}`, a);
}
async function y(o) {
  const a = h(), t = await d(a);
  if (o.charCount < 3)
    return t;
  t.burstsCount += 1, t.totalChars += o.charCount, t.totalBackspaces += o.backspaceCount, t.totalTypingTimeMs += o.durationMs, o.grossWpm > t.peakWpm && (t.peakWpm = Math.round(o.grossWpm));
  const r = t.totalTypingTimeMs / 6e4;
  if (r > 0) {
    t.averageGrossWpm = Math.round(t.totalChars / 5 / r);
    const e = Math.max(0, t.totalChars - t.totalBackspaces);
    t.averageNetWpm = Math.round(e / 5 / r);
  }
  const c = t.totalChars + t.totalBackspaces;
  t.overallAccuracy = c > 0 ? Math.round(t.totalChars / c * 100) : 100;
  const s = new Date(o.startTime).getHours();
  t.hourlyWpm[s] || (t.hourlyWpm[s] = { wpmSum: 0, count: 0, chars: 0 }), t.hourlyWpm[s].wpmSum += o.grossWpm, t.hourlyWpm[s].count += 1, t.hourlyWpm[s].chars += o.charCount;
  for (const [e, n] of Object.entries(o.bigrams))
    t.bigrams[e] || (t.bigrams[e] = { count: 0, totalLatencyMs: 0 }), t.bigrams[e].count += n.count, t.bigrams[e].totalLatencyMs += n.totalLatencyMs;
  for (const [e, n] of Object.entries(o.keyMistakes))
    t.keyMistakes[e] || (t.keyMistakes[e] = { hits: 0, backspaces: 0 }), t.keyMistakes[e].hits += n.hits, t.keyMistakes[e].backspaces += n.backspaces;
  if (o.domain) {
    t.domainStats || (t.domainStats = {}), t.domainStats[o.domain] || (t.domainStats[o.domain] = { chars: 0, bursts: 0, avgWpm: 0 });
    const e = t.domainStats[o.domain];
    e.chars += o.charCount, e.bursts += 1, e.avgWpm = Math.round((e.avgWpm * (e.bursts - 1) + o.grossWpm) / e.bursts);
  }
  await u(`stats_${a}`, t);
  const i = await m("all_date_keys", []);
  return i.includes(a) || (i.push(a), await u("all_date_keys", i)), t;
}
const f = [
  {
    id: "serika-dark",
    name: "Serika Dark",
    bgColor: "#323437",
    mainColor: "#e2b714",
    subColor: "#646669",
    textColor: "#d1d0c5",
    caretColor: "#e2b714",
    errorColor: "#ca4754"
  },
  {
    id: "carbon",
    name: "Carbon",
    bgColor: "#313131",
    mainColor: "#f66e0d",
    subColor: "#616161",
    textColor: "#f5e6c8",
    caretColor: "#f66e0d",
    errorColor: "#e45c5c"
  },
  {
    id: "dracula",
    name: "Dracula",
    bgColor: "#282a36",
    mainColor: "#bd93f9",
    subColor: "#6272a4",
    textColor: "#f8f8f2",
    caretColor: "#50fa7b",
    errorColor: "#ff5555"
  },
  {
    id: "nord",
    name: "Nord",
    bgColor: "#2e3440",
    mainColor: "#88c0d0",
    subColor: "#4c566a",
    textColor: "#eceff4",
    caretColor: "#81a1c1",
    errorColor: "#bf616a"
  },
  {
    id: "olivia",
    name: "Olivia",
    bgColor: "#1c1b1d",
    mainColor: "#deaf9d",
    subColor: "#4a464c",
    textColor: "#f2efed",
    caretColor: "#deaf9d",
    errorColor: "#e05555"
  },
  {
    id: "botanical",
    name: "Botanical",
    bgColor: "#1e2827",
    mainColor: "#7b9c98",
    subColor: "#3c4c4a",
    textColor: "#eaf1f1",
    caretColor: "#7b9c98",
    errorColor: "#d66853"
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    bgColor: "#000b1e",
    mainColor: "#00ffc2",
    subColor: "#583279",
    textColor: "#ffea00",
    caretColor: "#00ffc2",
    errorColor: "#ff0055"
  },
  {
    id: "matrix",
    name: "Matrix",
    bgColor: "#000000",
    mainColor: "#15ff00",
    subColor: "#005500",
    textColor: "#00ff41",
    caretColor: "#15ff00",
    errorColor: "#ff2222"
  }
];
function b(o) {
  return f.find((a) => a.id === o) || f[0];
}
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Amanuensis] Extension installed/reloaded."), await C() || chrome.storage.local.set({ settings: g });
  try {
    const a = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const t of a)
      t.id && chrome.scripting.executeScript({
        target: { tabId: t.id },
        files: ["content_script.js"]
      }).catch(() => {
      });
    console.log(`[Amanuensis] Auto-injected tracker into ${a.length} existing tabs.`);
  } catch (a) {
    console.warn("[Amanuensis] Auto-inject tab error:", a);
  }
  p();
});
chrome.runtime.onMessage.addListener((o, a, t) => {
  if (o.type === "RECORD_BURST")
    return k(o.payload).then((r) => {
      t({ success: !0, stats: r });
    }).catch((r) => {
      console.error("[Amanuensis] Record burst error:", r), t({ success: !1, error: r.message });
    }), !0;
  if (o.type === "GET_TODAY_STATS")
    return d().then((r) => {
      t({ stats: r });
    }), !0;
});
async function k(o) {
  const a = await y(o);
  try {
    await p(a.averageGrossWpm);
  } catch (t) {
    console.warn("[Amanuensis] Badge update error:", t);
  }
  return a;
}
async function p(o) {
  try {
    const a = await C();
    if (!a.showBadgeWpm) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }
    let t = o;
    t === void 0 && (t = (await d()).averageGrossWpm);
    const r = b(a.theme || "serika-dark");
    t > 0 ? (chrome.action.setBadgeText({ text: `${t}` }), chrome.action.setBadgeBackgroundColor({ color: r.mainColor }), chrome.action.setBadgeTextColor && chrome.action.setBadgeTextColor({ color: "#1c1c1c" })) : chrome.action.setBadgeText({ text: "" });
  } catch {
  }
}
