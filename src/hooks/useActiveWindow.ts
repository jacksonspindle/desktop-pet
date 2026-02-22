import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface WindowInfo {
  app_name: string;
  window_title: string;
}

interface ActiveWindowState {
  appName: string;
  windowTitle: string;
  appChanged: boolean;
}

export function useActiveWindow(): ActiveWindowState {
  const [appName, setAppName] = useState("Unknown");
  const [windowTitle, setWindowTitle] = useState("");
  const [appChanged, setAppChanged] = useState(false);
  const prevAppRef = useRef("Unknown");

  useEffect(() => {
    const poll = async () => {
      try {
        const info = await invoke<WindowInfo>("get_active_window_info");
        setAppName(info.app_name);
        setWindowTitle(info.window_title);

        if (info.app_name !== prevAppRef.current) {
          setAppChanged(true);
          prevAppRef.current = info.app_name;
          // Reset the flag after a short delay
          setTimeout(() => setAppChanged(false), 1000);
        }
      } catch {
        // Silently handle errors (permission denied, etc.)
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  return { appName, windowTitle, appChanged };
}
