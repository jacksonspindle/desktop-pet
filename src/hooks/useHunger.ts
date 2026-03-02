import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "pet-hunger";
const DECAY_PER_MS = 100 / (30 * 60 * 1000); // full-to-empty in 30 min
const TICK_MS = 1000;

export type HungerLevel = "full" | "peckish" | "hungry" | "starving";

interface HungerSave {
  hunger: number;
  lastUpdate: number;
}

interface UseHungerOptions {
  onLevelChange?: (level: HungerLevel, prevLevel: HungerLevel) => void;
}

function getLevel(hunger: number): HungerLevel {
  if (hunger > 60) return "full";
  if (hunger > 30) return "peckish";
  if (hunger > 15) return "hungry";
  return "starving";
}

export function useHunger({ onLevelChange }: UseHungerOptions = {}) {
  const onLevelChangeRef = useRef(onLevelChange);
  onLevelChangeRef.current = onLevelChange;

  const [hunger, setHunger] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 100;
      const saved: HungerSave = JSON.parse(raw);
      const elapsed = Date.now() - saved.lastUpdate;
      return Math.max(0, saved.hunger - elapsed * DECAY_PER_MS);
    } catch {
      return 100;
    }
  });

  const levelRef = useRef(getLevel(hunger));

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hunger, lastUpdate: Date.now() }),
    );
  }, [hunger]);

  // Decay tick
  useEffect(() => {
    const id = setInterval(() => {
      setHunger((prev) => {
        const next = Math.max(0, prev - DECAY_PER_MS * TICK_MS);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Level change detection
  const hungerLevel = getLevel(hunger);
  useEffect(() => {
    const prev = levelRef.current;
    if (hungerLevel !== prev) {
      levelRef.current = hungerLevel;
      onLevelChangeRef.current?.(hungerLevel, prev);
    }
  }, [hungerLevel]);

  const feed = useCallback((amount: number) => {
    setHunger((prev) => Math.min(100, prev + amount));
  }, []);

  return { hunger, hungerLevel, feed };
}
