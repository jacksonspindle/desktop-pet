import { useState, useCallback, useEffect, useRef } from "react";

export interface EventData {
  chats: number;
  searches: number;
  fortunes: number;
  musicToggles: number;
  petClicks: number;
  petDrags: number;
  naps: number;
  homes: number;
  wakes: number;
  themeImports: number;
  activeDays: string[];
  currentStreak: number;
  lastActiveDate: string;
  sessionStart: number;
  menuActionsUsed: string[];
  uniqueSearches: string[];
  recentActions: { action: string; time: number }[];
  musicStartTime: number | null;
  lastNapStart: number | null;
  quickWakes: number;
  sessionChats: number;
  dailyInteractions: number;
  dailyChats: number;
  lastInteractionDate: string;
  lastInteractionTime: number;
}

const STORAGE_KEY = "pet-events";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeStreak(activeDays: string[], todayStr: string): number {
  const sorted = [...new Set(activeDays)].sort().reverse();
  if (sorted.length === 0) return 0;
  if (sorted[0] !== todayStr) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function defaultData(): EventData {
  return {
    chats: 0,
    searches: 0,
    fortunes: 0,
    musicToggles: 0,
    petClicks: 0,
    petDrags: 0,
    naps: 0,
    homes: 0,
    wakes: 0,
    themeImports: 0,
    activeDays: [],
    currentStreak: 0,
    lastActiveDate: "",
    sessionStart: Date.now(),
    menuActionsUsed: [],
    uniqueSearches: [],
    recentActions: [],
    musicStartTime: null,
    lastNapStart: null,
    quickWakes: 0,
    sessionChats: 0,
    dailyInteractions: 0,
    dailyChats: 0,
    lastInteractionDate: "",
    lastInteractionTime: 0,
  };
}

function loadData(): EventData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EventData;
      // Reset session-specific fields
      parsed.sessionStart = Date.now();
      parsed.sessionChats = 0;
      return parsed;
    }
  } catch { /* ignore */ }
  return defaultData();
}

function persist(data: EventData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useEventTracker() {
  const [data, setData] = useState<EventData>(() => {
    const loaded = loadData();
    const todayStr = today();
    if (!loaded.activeDays.includes(todayStr)) {
      loaded.activeDays.push(todayStr);
    }
    loaded.currentStreak = computeStreak(loaded.activeDays, todayStr);
    loaded.lastActiveDate = todayStr;
    // Reset daily counters if new day
    if (loaded.lastInteractionDate !== todayStr) {
      loaded.dailyInteractions = 0;
      loaded.dailyChats = 0;
      loaded.lastInteractionDate = todayStr;
    }
    persist(loaded);
    return loaded;
  });

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const trackEvent = useCallback((type: string, meta?: string) => {
    setData((prev) => {
      const next = { ...prev };
      const now = Date.now();
      const todayStr = today();

      // Update daily interactions
      if (next.lastInteractionDate !== todayStr) {
        next.dailyInteractions = 0;
        next.dailyChats = 0;
        next.lastInteractionDate = todayStr;
      }
      next.dailyInteractions++;
      next.lastInteractionTime = now;

      // Update recent actions (keep last 10)
      next.recentActions = [
        ...prev.recentActions.slice(-9),
        { action: type, time: now },
      ];

      // Update active days
      if (!next.activeDays.includes(todayStr)) {
        next.activeDays = [...prev.activeDays, todayStr];
      }
      next.currentStreak = computeStreak(next.activeDays, todayStr);
      next.lastActiveDate = todayStr;

      // Trim to last 90 days of active days
      if (next.activeDays.length > 90) {
        next.activeDays = next.activeDays.slice(-90);
      }

      // Track menu actions used
      const menuActions = ["chat", "search", "music", "nap", "home", "settings", "journal", "achievements"];
      if (menuActions.includes(type) && !next.menuActionsUsed.includes(type)) {
        next.menuActionsUsed = [...prev.menuActionsUsed, type];
      }
      // Also track via menuOpen events (for chat/search which open input first)
      if (type === "menuOpen" && meta && menuActions.includes(meta) && !next.menuActionsUsed.includes(meta)) {
        next.menuActionsUsed = [...prev.menuActionsUsed, meta];
      }

      switch (type) {
        case "chat":
          next.chats++;
          next.sessionChats++;
          next.dailyChats++;
          break;
        case "search":
          next.searches++;
          if (meta && !next.uniqueSearches.includes(meta)) {
            next.uniqueSearches = [...prev.uniqueSearches, meta];
          }
          break;
        case "fortune":
          next.fortunes++;
          break;
        case "music":
          next.musicToggles++;
          if (meta === "start") {
            next.musicStartTime = now;
          } else {
            next.musicStartTime = null;
          }
          break;
        case "petClick":
          next.petClicks++;
          break;
        case "petDrag":
          next.petDrags++;
          break;
        case "nap":
          next.naps++;
          next.lastNapStart = now;
          break;
        case "home":
          next.homes++;
          break;
        case "wake":
          next.wakes++;
          if (prev.lastNapStart && now - prev.lastNapStart < 10000) {
            next.quickWakes++;
          }
          break;
        case "themeImport":
          next.themeImports++;
          break;
      }

      persist(next);
      return next;
    });
  }, []);

  return { data, trackEvent };
}
