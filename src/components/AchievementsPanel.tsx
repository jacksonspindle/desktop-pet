import { useEffect } from "react";
import { AchievementDef, UnlockedMap } from "../hooks/useAchievements";
import { EventData } from "../hooks/useEventTracker";
import "../styles/achievements.css";

interface AchievementsPanelProps {
  achievements: AchievementDef[];
  unlocked: UnlockedMap;
  eventData: EventData;
  onOpen: () => void;
  onClose: () => void;
}

const TIER_LABELS: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
};

const TIER_ORDER = ["bronze", "silver", "gold"];

function metricForAchievement(id: string, data: EventData): number {
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

export default function AchievementsPanel({
  achievements,
  unlocked,
  eventData,
  onOpen,
  onClose,
}: AchievementsPanelProps) {
  useEffect(() => {
    onOpen();
  }, []);

  const unlockedCount = Object.keys(unlocked).length;

  return (
    <div className="achievements-overlay" onClick={onClose}>
      <div className="achievements-panel" onClick={(e) => e.stopPropagation()}>
        <div className="achievements-header">
          <span className="achievements-title">Trophies</span>
          <span className="achievements-count">{unlockedCount} / {achievements.length}</span>
          <button className="achievements-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="achievements-grid">
          {achievements.map((def) => {
            const isUnlocked = !!unlocked[def.id];
            const isHidden = def.type === "hidden" && !isUnlocked;

            return (
              <div
                key={def.id}
                className={`achievement-card ${isUnlocked ? "unlocked" : "locked"}`}
              >
                <div className="achievement-icon">
                  {isHidden ? "❓" : def.icon}
                </div>
                <div className="achievement-info">
                  <div className="achievement-name">
                    {isHidden ? "???" : def.name}
                  </div>
                  <div className="achievement-desc">
                    {isHidden ? "Keep exploring..." : def.description}
                  </div>

                  {def.type === "tiered" && def.tiers && (
                    <>
                      <div className="achievement-tiers">
                        {def.tiers.map((t) => {
                          const entry = unlocked[def.id];
                          const tierIdx = TIER_ORDER.indexOf(t.tier);
                          const unlockedIdx = entry ? TIER_ORDER.indexOf(entry.tier || "") : -1;
                          const isTierUnlocked = unlockedIdx >= tierIdx;
                          return (
                            <span
                              key={t.tier}
                              className={`tier-badge ${isTierUnlocked ? "tier-unlocked" : "tier-locked"}`}
                              title={`${t.tier}: ${t.threshold}`}
                            >
                              {TIER_LABELS[t.tier]}
                            </span>
                          );
                        })}
                      </div>
                      <div className="achievement-progress">
                        <div
                          className="achievement-progress-bar"
                          style={{
                            width: `${Math.min(100, (metricForAchievement(def.id, eventData) / def.tiers[def.tiers.length - 1].threshold) * 100)}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
