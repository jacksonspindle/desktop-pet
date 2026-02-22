import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface PassthroughConfig {
  petX: number;
  petY: number;
  overlayOpen: boolean; // true when menu, input, or speech bubble is showing
}

export function useCursorPassthrough({ petX, petY, overlayOpen }: PassthroughConfig) {
  const ignoring = useRef(true);
  const configRef = useRef({ petX, petY, overlayOpen });
  configRef.current = { petX, petY, overlayOpen };

  useEffect(() => {
    let running = true;

    const poll = async () => {
      while (running) {
        try {
          const { petX: px, petY: py, overlayOpen: open } = configRef.current;

          if (open) {
            // When any overlay is open, always accept clicks
            if (ignoring.current) {
              ignoring.current = false;
              await invoke("set_ignore_cursor_events", { ignore: false });
            }
          } else {
            // Check if mouse is near the pet
            const mouse = await invoke<{ x: number; y: number }>("get_mouse_position");
            const hitSize = 48;
            const near =
              mouse.x >= px - hitSize &&
              mouse.x <= px + hitSize &&
              mouse.y >= py - hitSize &&
              mouse.y <= py + hitSize;

            if (near && ignoring.current) {
              ignoring.current = false;
              await invoke("set_ignore_cursor_events", { ignore: false });
            } else if (!near && !ignoring.current) {
              ignoring.current = true;
              await invoke("set_ignore_cursor_events", { ignore: true });
            }
          }
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    };

    poll();
    return () => { running = false; };
  }, []);
}
