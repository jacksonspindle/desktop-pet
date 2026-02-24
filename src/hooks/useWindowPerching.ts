import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface VisibleWindow {
  app_name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowPerching {
  requestPerch: () => Promise<{ x: number; y: number } | null>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  cancelPerch: () => void;
  windowGone: boolean;
}

export function useWindowPerching(): WindowPerching {
  const [windowGone, setWindowGone] = useState(false);
  const perchedWindowRef = useRef<VisibleWindow | null>(null);
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const requestPerch = useCallback(
    async (): Promise<{ x: number; y: number } | null> => {
      try {
        const windows =
          await invoke<VisibleWindow[]>("get_visible_windows");
        if (windows.length === 0) return null;

        const win = windows[Math.floor(Math.random() * windows.length)];
        perchedWindowRef.current = win;
        setWindowGone(false);

        // Position: random spot along top edge, sprite bottom aligns with window top
        const x = win.x + (0.2 + Math.random() * 0.6) * win.width;
        const y = win.y - 32;

        return { x, y };
      } catch {
        return null;
      }
    },
    [],
  );

  const stopMonitoring = useCallback(() => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = undefined;
    }
  }, []);

  const startMonitoring = useCallback(() => {
    stopMonitoring();

    monitorIntervalRef.current = setInterval(async () => {
      const savedWin = perchedWindowRef.current;
      if (!savedWin) return;

      try {
        const windows =
          await invoke<VisibleWindow[]>("get_visible_windows");
        const match = windows.find(
          (w) =>
            w.app_name === savedWin.app_name &&
            Math.abs(w.x - savedWin.x) < 50 &&
            Math.abs(w.y - savedWin.y) < 50 &&
            Math.abs(w.width - savedWin.width) < 50 &&
            Math.abs(w.height - savedWin.height) < 50,
        );

        if (!match) {
          setWindowGone(true);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
  }, [stopMonitoring]);

  const cancelPerch = useCallback(() => {
    stopMonitoring();
    perchedWindowRef.current = null;
    setWindowGone(false);
  }, [stopMonitoring]);

  return { requestPerch, startMonitoring, stopMonitoring, cancelPerch, windowGone };
}
