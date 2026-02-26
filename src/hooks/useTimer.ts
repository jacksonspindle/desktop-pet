import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "pet-timer";

interface TimerState {
  endTime: number;
  label: string;
}

interface UseTimerOptions {
  onComplete?: (label: string) => void;
}

export function useTimer({ onComplete }: UseTimerOptions = {}) {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [remaining, setRemaining] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: TimerState = JSON.parse(raw);
      if (saved.endTime > Date.now()) {
        setEndTime(saved.endTime);
        setLabel(saved.label);
        setRemaining(Math.ceil((saved.endTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Tick interval
  useEffect(() => {
    if (endTime === null) return;

    const tick = () => {
      const left = Math.ceil((endTime - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setEndTime(null);
        localStorage.removeItem(STORAGE_KEY);
        onCompleteRef.current?.(label);
        setLabel("");
      } else {
        setRemaining(left);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime, label]);

  const start = useCallback((seconds: number, timerLabel?: string) => {
    const end = Date.now() + seconds * 1000;
    const lbl = timerLabel || `${Math.round(seconds / 60)}m timer`;
    setEndTime(end);
    setLabel(lbl);
    setRemaining(seconds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime: end, label: lbl }));
  }, []);

  const cancel = useCallback(() => {
    setEndTime(null);
    setLabel("");
    setRemaining(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    running: endTime !== null,
    remaining,
    label,
    start,
    cancel,
  };
}
