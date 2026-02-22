import { useState, useEffect, useRef, useCallback } from "react";

export type PetState = "idle" | "walking" | "talking" | "napping" | "home";

interface Position {
  x: number;
  y: number;
}

interface PetMovement {
  position: Position;
  state: PetState;
  facingLeft: boolean;
  dragging: boolean;
  setState: (state: PetState) => void;
  setPosition: (pos: Position) => void;
  setDragging: (d: boolean) => void;
  goHome: () => void;
  leaveHome: () => void;
  nap: () => void;
  wake: () => void;
}

function clampPosition(pos: Position): Position {
  const margin = 40;
  return {
    x: Math.max(margin, Math.min(window.innerWidth - margin, pos.x)),
    y: Math.max(margin, Math.min(window.innerHeight - margin, pos.y)),
  };
}

const HOME_POSITION = () => ({
  x: window.innerWidth - 60,
  y: 60,
});

export function usePetMovement(): PetMovement {
  const [position, setPositionRaw] = useState<Position>(() => {
    const saved = localStorage.getItem("pet-position");
    if (saved) {
      try {
        return clampPosition(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
    return {
      x: Math.floor(window.innerWidth / 2),
      y: window.innerHeight - 100,
    };
  });
  const [state, setStateInternal] = useState<PetState>("idle");
  const [facingLeft, setFacingLeft] = useState(false);
  const [dragging, setDragging] = useState(false);
  const targetRef = useRef<Position | null>(null);
  const animFrameRef = useRef<number>(0);
  const walkTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prevStateRef = useRef<PetState>("idle");

  const setState = useCallback((newState: PetState) => {
    setStateInternal(newState);
  }, []);

  const setPosition = useCallback((pos: Position) => {
    setPositionRaw(clampPosition(pos));
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem("pet-position", JSON.stringify(position));
  }, [position]);

  // Walking animation loop
  useEffect(() => {
    if (state !== "walking") return;
    if (!targetRef.current) {
      setStateInternal(prevStateRef.current === "home" ? "home" : "idle");
      return;
    }

    const speed = 2;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      const target = targetRef.current;
      if (!target) {
        setStateInternal(prevStateRef.current === "home" ? "home" : "idle");
        return;
      }

      setPositionRaw((prev) => {
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed) {
          targetRef.current = null;
          setStateInternal(prevStateRef.current === "home" ? "home" : "idle");
          return clampPosition(target);
        }

        return {
          x: prev.x + (dx / dist) * speed,
          y: prev.y + (dy / dist) * speed,
        };
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  const goHome = useCallback(() => {
    const home = HOME_POSITION();
    targetRef.current = home;
    prevStateRef.current = "home";
    setPositionRaw((prev) => {
      setFacingLeft(home.x < prev.x);
      return prev;
    });
    setStateInternal("walking");
  }, []);

  const leaveHome = useCallback(() => {
    prevStateRef.current = "idle";
    const targetX = 100 + Math.random() * (window.innerWidth - 200);
    const targetY = window.innerHeight * 0.7 + Math.random() * (window.innerHeight * 0.15);
    targetRef.current = clampPosition({ x: targetX, y: targetY });
    setPositionRaw((prev) => {
      setFacingLeft(targetX < prev.x);
      return prev;
    });
    setStateInternal("walking");
  }, []);

  const nap = useCallback(() => {
    setStateInternal("napping");
  }, []);

  const wake = useCallback(() => {
    setStateInternal("idle");
  }, []);

  // Random walk scheduler
  useEffect(() => {
    const scheduleWalk = () => {
      const delay = 30000 + Math.random() * 60000;
      walkTimeoutRef.current = setTimeout(() => {
        setStateInternal((currentState) => {
          if (currentState !== "idle") {
            scheduleWalk();
            return currentState;
          }

          const margin = 80;
          const maxX = window.innerWidth - margin;
          const targetX = margin + Math.random() * (maxX - margin);
          const targetY =
            window.innerHeight * 0.65 +
            Math.random() * (window.innerHeight * 0.25);

          const clamped = clampPosition({ x: targetX, y: targetY });
          targetRef.current = clamped;
          prevStateRef.current = "idle";

          setPositionRaw((prev) => {
            setFacingLeft(clamped.x < prev.x);
            return prev;
          });

          scheduleWalk();
          return "walking";
        });
      }, delay);
    };

    scheduleWalk();
    return () => {
      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    };
  }, []);

  return {
    position, state, facingLeft, dragging,
    setState, setPosition, setDragging,
    goHome, leaveHome, nap, wake,
  };
}
