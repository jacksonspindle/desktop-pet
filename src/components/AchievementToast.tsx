import { useEffect, useState } from "react";
import { AchievementUnlock } from "../hooks/useAchievements";
import "../styles/achievements.css";

interface AchievementToastProps {
  unlock: AchievementUnlock;
  petX: number;
  petY: number;
  onDismiss: () => void;
}

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
};

export default function AchievementToast({ unlock, petX, petY, onDismiss }: AchievementToastProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 3500);
    const dismissTimer = setTimeout(onDismiss, 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`achievement-toast ${fading ? "toast-fade-out" : ""}`}
      style={{
        position: "fixed",
        left: petX,
        top: petY - 80,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 3000,
      }}
    >
      <span className="toast-icon">{unlock.icon}</span>
      <div className="toast-info">
        <div className="toast-title">{unlock.name}</div>
        {unlock.tier && (
          <div className="toast-tier">{TIER_LABELS[unlock.tier] || unlock.tier}</div>
        )}
      </div>
    </div>
  );
}
