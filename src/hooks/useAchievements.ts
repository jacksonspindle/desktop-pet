import { useState, useEffect, useCallback, useRef } from "react";
import { EventData } from "./useEventTracker";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "tiered" | "oneTime" | "hidden";
  tiers?: { tier: string; threshold: number }[];
  check?: (data: EventData) => boolean;
}

export interface AchievementUnlock {
  id: string;
  name: string;
  icon: string;
  tier?: string;
}

type UnlockedEntry = { tier?: string; unlockedAt: number };
export type UnlockedMap = Record<string, UnlockedEntry>;

const STORAGE_KEY = "pet-achievements";

const TIERED: AchievementDef[] = [
  { id: "chatterbox", name: "Chatterbox", description: "Send chats", icon: "💬", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 10 }, { tier: "silver", threshold: 50 }, { tier: "gold", threshold: 200 }] },
  { id: "fortune_seeker", name: "Fortune Seeker", description: "Get fortunes told", icon: "🔮", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 5 }, { tier: "silver", threshold: 25 }, { tier: "gold", threshold: 100 }] },
  { id: "dj_kitty", name: "DJ Kitty", description: "Toggle music", icon: "🎧", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 5 }, { tier: "silver", threshold: 25 }, { tier: "gold", threshold: 100 }] },
  { id: "search_scholar", name: "Search Scholar", description: "Perform searches", icon: "📚", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 5 }, { tier: "silver", threshold: 25 }, { tier: "gold", threshold: 100 }] },
  { id: "pet_lover", name: "Pet Lover", description: "Click the pet", icon: "❤️", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 25 }, { tier: "silver", threshold: 100 }, { tier: "gold", threshold: 500 }] },
  { id: "frequent_flyer", name: "Frequent Flyer", description: "Drag the pet around", icon: "✈️", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 10 }, { tier: "silver", threshold: 50 }, { tier: "gold", threshold: 200 }] },
  { id: "sleepy_head", name: "Sleepy Head", description: "Put the pet to nap", icon: "😴", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 5 }, { tier: "silver", threshold: 25 }, { tier: "gold", threshold: 100 }] },
  { id: "homebody", name: "Homebody", description: "Send the pet home", icon: "🏠", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 5 }, { tier: "silver", threshold: 25 }, { tier: "gold", threshold: 100 }] },
  { id: "regular", name: "Regular", description: "Be active on different days", icon: "📅", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 3 }, { tier: "silver", threshold: 14 }, { tier: "gold", threshold: 60 }] },
  { id: "streak_master", name: "Streak Master", description: "Maintain a daily streak", icon: "🔥", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 3 }, { tier: "silver", threshold: 7 }, { tier: "gold", threshold: 30 }] },
  { id: "alarm_clock", name: "Alarm Clock", description: "Wake the pet from nap", icon: "⏰", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 5 }, { tier: "silver", threshold: 25 }, { tier: "gold", threshold: 100 }] },
  { id: "style_icon", name: "Style Icon", description: "Import custom themes", icon: "🎨", type: "tiered",
    tiers: [{ tier: "bronze", threshold: 1 }, { tier: "silver", threshold: 3 }, { tier: "gold", threshold: 10 }] },
];

function metricForTiered(id: string, data: EventData): number {
  switch (id) {
    case "chatterbox": return data.chats;
    case "fortune_seeker": return data.fortunes;
    case "dj_kitty": return data.musicToggles;
    case "search_scholar": return data.searches;
    case "pet_lover": return data.petClicks;
    case "frequent_flyer": return data.petDrags;
    case "sleepy_head": return data.naps;
    case "homebody": return data.homes;
    case "regular": return data.activeDays.length;
    case "streak_master": return data.currentStreak;
    case "alarm_clock": return data.wakes;
    case "style_icon": return data.themeImports;
    default: return 0;
  }
}

const ONE_TIME: AchievementDef[] = [
  { id: "first_steps", name: "First Steps", description: "Your first interaction", icon: "👣", type: "oneTime",
    check: (d) => d.recentActions.length > 0 },
  { id: "early_bird", name: "Early Bird", description: "Use before 7 AM", icon: "🌅", type: "hidden",
    check: () => new Date().getHours() < 7 },
  { id: "night_owl", name: "Night Owl", description: "Use after midnight", icon: "🦉", type: "hidden",
    check: () => new Date().getHours() === 0 || new Date().getHours() >= 23 },
  { id: "night_shift", name: "Night Shift", description: "Use between 2-4 AM", icon: "🌙", type: "hidden",
    check: () => { const h = new Date().getHours(); return h >= 2 && h < 4; } },
  { id: "explorer", name: "Explorer", description: "Use every menu action at least once", icon: "🧭", type: "oneTime",
    check: (d) => {
      const required = ["chat", "search", "music", "nap", "home", "settings", "journal", "achievements"];
      return required.every((a) => d.menuActionsUsed.includes(a));
    } },
  { id: "speed_chatter", name: "Speed Chatter", description: "5 chats within 2 minutes", icon: "⚡", type: "hidden",
    check: (d) => {
      const chatActions = d.recentActions.filter((a) => a.action === "chat");
      if (chatActions.length < 5) return false;
      const last5 = chatActions.slice(-5);
      return last5[4].time - last5[0].time < 120000;
    } },
  { id: "fortune_binge", name: "Fortune Binge", description: "3 fortunes in a row", icon: "🎰", type: "hidden",
    check: (d) => {
      const menuOnly = d.recentActions.filter((a) =>
        ["chat", "search", "fortune", "music", "nap", "home", "settings", "journal", "achievements"].includes(a.action)
      );
      if (menuOnly.length < 3) return false;
      const last3 = menuOnly.slice(-3);
      return last3.every((a) => a.action === "fortune");
    } },
  { id: "music_marathon", name: "Music Marathon", description: "Music playing 30+ min straight", icon: "🎵", type: "hidden",
    check: (d) => d.musicStartTime !== null && Date.now() - d.musicStartTime >= 30 * 60 * 1000 },
  { id: "restless_spirit", name: "Restless Spirit", description: "Wake pet within 10s of nap, 3 times", icon: "👻", type: "hidden",
    check: (d) => d.quickWakes >= 3 },
  { id: "marathon_session", name: "Marathon Session", description: "2+ hour session", icon: "🏃", type: "hidden",
    check: (d) => Date.now() - d.sessionStart >= 2 * 60 * 60 * 1000 },
  { id: "zen_master", name: "Zen Master", description: "10 min with no interaction", icon: "🧘", type: "hidden",
    check: (d) => d.lastInteractionTime > 0 && Date.now() - d.lastInteractionTime >= 10 * 60 * 1000 },
  { id: "social_butterfly", name: "Social Butterfly", description: "20 chats in one session", icon: "🦋", type: "hidden",
    check: (d) => d.sessionChats >= 20 },
  { id: "globe_trotter", name: "Globe Trotter", description: "20 unique search queries", icon: "🌍", type: "oneTime",
    check: (d) => d.uniqueSearches.length >= 20 },
  { id: "pet_whisperer", name: "Pet Whisperer", description: "50 interactions in one day", icon: "🐾", type: "hidden",
    check: (d) => d.dailyInteractions >= 50 },
  { id: "the_collector", name: "The Collector", description: "Unlock 15 achievements", icon: "🗃️", type: "oneTime" },
  { id: "diary_reader", name: "Diary Reader", description: "Open the journal", icon: "📖", type: "oneTime" },
  { id: "trophy_hunter", name: "Trophy Hunter", description: "Open the achievements panel", icon: "🏆", type: "oneTime" },
  { id: "completionist", name: "Completionist", description: "Unlock all 31 other achievements", icon: "👑", type: "hidden" },
  { id: "lullaby", name: "Lullaby", description: "Start music while pet is napping", icon: "🎶", type: "hidden" },
  { id: "chatterbox_deluxe", name: "Chatty Cathy", description: "Send 50 chats in one day", icon: "🗣️", type: "hidden",
    check: (d) => d.dailyChats >= 50 },
];

const ALL_ACHIEVEMENTS: AchievementDef[] = [...TIERED, ...ONE_TIME];

function loadUnlocked(): UnlockedMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persistUnlocked(map: UnlockedMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// Count total unlocked (tiered gold counts as 1, any tier counts as 1)
function countUnlocked(map: UnlockedMap): number {
  return Object.keys(map).length;
}

export function useAchievements(eventData: EventData) {
  const [unlocked, setUnlocked] = useState<UnlockedMap>(loadUnlocked);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementUnlock[]>([]);
  const unlockedRef = useRef(unlocked);
  useEffect(() => { unlockedRef.current = unlocked; }, [unlocked]);

  // Track special one-off flags for lullaby and chatterbox_deluxe via manual triggers
  const manualUnlock = useCallback((id: string) => {
    setUnlocked((prev) => {
      if (prev[id]) return prev;
      const def = ALL_ACHIEVEMENTS.find((a) => a.id === id);
      if (!def) return prev;
      const next = { ...prev, [id]: { unlockedAt: Date.now() } };
      persistUnlocked(next);
      setNewlyUnlocked((q) => [...q, { id, name: def.name, icon: def.icon }]);
      return next;
    });
  }, []);

  useEffect(() => {
    const current = unlockedRef.current;
    const newUnlocks: AchievementUnlock[] = [];
    const updates: UnlockedMap = {};

    // Check tiered achievements
    for (const def of TIERED) {
      const metric = metricForTiered(def.id, eventData);
      const tiers = def.tiers!;
      let highestTier: string | undefined;
      for (const t of tiers) {
        if (metric >= t.threshold) highestTier = t.tier;
      }
      if (highestTier) {
        const existing = current[def.id];
        if (!existing || existing.tier !== highestTier) {
          updates[def.id] = { tier: highestTier, unlockedAt: Date.now() };
          newUnlocks.push({ id: def.id, name: def.name, icon: def.icon, tier: highestTier });
        }
      }
    }

    // Check one-time / hidden achievements
    for (const def of ONE_TIME) {
      if (current[def.id]) continue;

      // Special cases without a simple check function
      if (def.id === "the_collector") {
        if (countUnlocked({ ...current, ...updates }) >= 15) {
          updates[def.id] = { unlockedAt: Date.now() };
          newUnlocks.push({ id: def.id, name: def.name, icon: def.icon });
        }
        continue;
      }
      if (def.id === "completionist") {
        const total = countUnlocked({ ...current, ...updates });
        if (total >= 31) {
          updates[def.id] = { unlockedAt: Date.now() };
          newUnlocks.push({ id: def.id, name: def.name, icon: def.icon });
        }
        continue;
      }
      if (def.id === "lullaby" || def.id === "chatterbox_deluxe") {
        // These are triggered via manualUnlock
        continue;
      }
      if (def.id === "diary_reader" || def.id === "trophy_hunter") {
        // These are triggered via manualUnlock
        continue;
      }

      if (def.check && def.check(eventData)) {
        updates[def.id] = { unlockedAt: Date.now() };
        newUnlocks.push({ id: def.id, name: def.name, icon: def.icon });
      }
    }

    if (Object.keys(updates).length > 0) {
      setUnlocked((prev) => {
        const next = { ...prev, ...updates };
        persistUnlocked(next);
        return next;
      });
      setNewlyUnlocked((q) => [...q, ...newUnlocks]);
    }
  }, [eventData]);

  const dismissToast = useCallback(() => {
    setNewlyUnlocked((q) => q.slice(1));
  }, []);

  return {
    achievements: ALL_ACHIEVEMENTS,
    unlocked,
    newlyUnlocked,
    dismissToast,
    manualUnlock,
  };
}
