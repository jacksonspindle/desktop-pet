import { useRef, useCallback } from "react";
import { PetState } from "../hooks/usePetMovement";
import { SpriteTheme } from "../hooks/useTheme";
import "../styles/pet.css";

interface PetProps {
  x: number;
  y: number;
  state: PetState;
  facingLeft: boolean;
  theme: SpriteTheme;
  onClick: () => void;
  onDragStart: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
}

function getSpriteUrl(state: PetState, theme: SpriteTheme): string {
  switch (state) {
    case "walking":
      return theme.walk;
    case "napping":
    case "home":
      return theme.sleep;
    default:
      return theme.idle;
  }
}

function getAnimClass(state: PetState): string {
  switch (state) {
    case "walking":
      return "walk";
    case "napping":
    case "home":
      return "nap";
    default:
      return "idle";
  }
}

export default function Pet({
  x, y, state, facingLeft, theme,
  onClick, onDragStart, onDrag, onDragEnd,
}: PetProps) {
  const animClass = getAnimClass(state);
  const spriteUrl = getSpriteUrl(state, theme);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const startPos = useRef({ mx: 0, my: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    didDrag.current = false;
    startPos.current = { mx: e.clientX, my: e.clientY };

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.mx;
      const dy = ev.clientY - startPos.current.my;
      if (!didDrag.current && Math.abs(dx) + Math.abs(dy) > 5) {
        didDrag.current = true;
        onDragStart();
      }
      if (didDrag.current) {
        onDrag(ev.clientX, ev.clientY);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (didDrag.current) {
        onDragEnd();
      } else {
        onClick();
      }
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [onClick, onDragStart, onDrag, onDragEnd]);

  return (
    <div
      className={`pet-container ${isDragging.current ? "dragging" : ""}`}
      style={{ left: x - 32, top: y - 32 }}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`pet-sprite ${animClass} ${facingLeft ? "flip" : ""}`}
        style={{ backgroundImage: `url(${spriteUrl})` }}
      />
      {(state === "napping" || state === "home") && (
        <div className="nap-zzz">z z z</div>
      )}
    </div>
  );
}
