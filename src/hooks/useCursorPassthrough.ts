import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface HitZone {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

interface PassthroughConfig {
  petX: number;
  petY: number;
  overlayOpen: boolean; // true when menu, input, or speech bubble is showing
  extraHitZones?: HitZone[];
}

export function useCursorPassthrough({ petX, petY, overlayOpen, extraHitZones }: PassthroughConfig) {
  const ignoring = useRef(true);
  const configRef = useRef({ petX, petY, overlayOpen, extraHitZones });
  configRef.current = { petX, petY, overlayOpen, extraHitZones };

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
            // Check if mouse is near the pet or any extra hit zones
            const mouse = await invoke<{ x: number; y: number }>("get_mouse_position");
            const hitSize = 48;
            const nearPet =
              mouse.x >= px - hitSize &&
              mouse.x <= px + hitSize &&
              mouse.y >= py - hitSize &&
              mouse.y <= py + hitSize;
            const nearExtra = (configRef.current.extraHitZones || []).some((zone) => {
              const hw = (zone.w ?? hitSize * 2) / 2;
              const hh = (zone.h ?? hitSize * 2) / 2;
              return (
                mouse.x >= zone.x - hw &&
                mouse.x <= zone.x + hw &&
                mouse.y >= zone.y - hh &&
                mouse.y <= zone.y + hh
              );
            });
            const near = nearPet || nearExtra;

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
