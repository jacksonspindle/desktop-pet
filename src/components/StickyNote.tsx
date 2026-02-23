import { useRef, useCallback, useMemo } from "react";
import { StickyNote as StickyNoteType } from "../hooks/useNotes";
import "../styles/notes.css";

interface StickyNoteProps {
  note: StickyNoteType;
  onDelete: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onPositionReport?: (id: string, x: number, y: number) => void;
}

export default function StickyNote({ note, onDelete, onMove, onPositionReport }: StickyNoteProps) {
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const startPos = useRef({ mx: 0, my: 0, nx: 0, ny: 0 });
  const currentPos = useRef({ x: note.x, y: note.y });

  const rotation = useMemo(() => {
    // Deterministic rotation from note id
    let hash = 0;
    for (let i = 0; i < note.id.length; i++) {
      hash = ((hash << 5) - hash + note.id.charCodeAt(i)) | 0;
    }
    return -2 + (Math.abs(hash) % 5); // -2 to 2 degrees
  }, [note.id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".sticky-note-close")) return;
    e.preventDefault();
    isDragging.current = true;
    didDrag.current = false;
    startPos.current = { mx: e.clientX, my: e.clientY, nx: note.x, ny: note.y };

    const el = (e.currentTarget as HTMLElement).closest(".sticky-note") as HTMLElement | null;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.mx;
      const dy = ev.clientY - startPos.current.my;
      if (!didDrag.current && Math.abs(dx) + Math.abs(dy) > 5) {
        didDrag.current = true;
        if (el) el.classList.add("dragging");
      }
      if (didDrag.current) {
        const newX = startPos.current.nx + dx;
        const newY = startPos.current.ny + dy;
        currentPos.current = { x: newX, y: newY };
        if (el) {
          el.style.left = `${newX}px`;
          el.style.top = `${newY}px`;
        }
        onPositionReport?.(note.id, newX, newY);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (didDrag.current) {
        if (el) el.classList.remove("dragging");
        onMove(note.id, currentPos.current.x, currentPos.current.y);
      }
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [note.id, note.x, note.y, onMove, onPositionReport]);

  return (
    <div
      className="sticky-note"
      style={{
        left: note.x,
        top: note.y,
        transform: `rotate(${rotation}deg)`,
      }}
      onMouseDown={handleMouseDown}
    >
      <button
        className="sticky-note-close"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        x
      </button>
      <div className="sticky-note-text">{note.text}</div>
    </div>
  );
}
