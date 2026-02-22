import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const FALLBACK_MESSAGES = [
  "Mrrrow... *stretches*",
  "*purrs softly*",
  "Nap time soon...",
  "*bats at invisible dust*",
  "*yawns* So cozy here...",
  "Did something move? *ears perk up*",
  "*kneads the screen*",
  "I see you working hard!",
];

interface DialogueState {
  text: string;
  visible: boolean;
  hiding: boolean;
  loading: boolean;
  muted: boolean;
  generate: (mode: string, trigger: string, userInput?: string) => void;
  dismiss: () => void;
}

export function useDialogue(
  appName: string,
  windowTitle: string,
  appChanged: boolean,
): DialogueState {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const spontaneousTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const busyRef = useRef(false);

  useEffect(() => {
    const unlisten = listen("toggle-mute", () => {
      setMuted((prev) => !prev);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const dismiss = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setHiding(true);
    setTimeout(() => {
      setVisible(false);
      setHiding(false);
      setText("");
    }, 400);
  }, []);

  const showDialogue = useCallback(
    (message: string, duration?: number) => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setHiding(false);
      setText(message);
      setVisible(true);
      setLoading(false);

      const displayTime = duration ?? 5000 + Math.random() * 3000;
      hideTimerRef.current = setTimeout(() => {
        dismiss();
      }, displayTime);
    },
    [dismiss],
  );

  const generate = useCallback(
    async (mode: string, trigger: string, userInput?: string) => {
      if (busyRef.current || muted) return;
      busyRef.current = true;
      setLoading(true);
      setVisible(true);
      setHiding(false);
      setText("...");

      try {
        const response = await invoke<string>("generate_pet_dialogue", {
          appName,
          windowTitle,
          trigger,
          mode,
          userInput: userInput ?? "",
        });
        // Scale duration by message length: ~80ms per character, clamped to 3-20s
        const duration = Math.min(20000, Math.max(3000, response.length * 80));
        showDialogue(response, duration);
      } catch {
        const fallback =
          FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
        showDialogue(fallback);
      } finally {
        busyRef.current = false;
      }
    },
    [appName, windowTitle, muted, showDialogue],
  );

  // Spontaneous dialogue - much less frequent
  useEffect(() => {
    const scheduleSpontaneous = () => {
      const delay = 120000 + Math.random() * 300000; // 2-7 minutes
      spontaneousTimerRef.current = setTimeout(() => {
        if (!visible && !muted) {
          generate("spontaneous", "the cat wants to say something on its own");
        }
        scheduleSpontaneous();
      }, delay);
    };

    scheduleSpontaneous();
    return () => {
      if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
    };
  }, [visible, muted, generate]);

  // React to app changes (less frequent - 20% chance)
  useEffect(() => {
    if (appChanged && !visible && !muted && Math.random() < 0.2) {
      generate("react", `user switched to ${appName}`);
    }
  }, [appChanged, appName, visible, muted, generate]);

  return { text, visible, hiding, loading, muted, generate, dismiss };
}
