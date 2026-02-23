import { useState } from "react";
import { StickyNote } from "../hooks/useNotes";
import "../styles/notes.css";

interface NotesPanelProps {
  notes: StickyNote[];
  notesVisible: boolean;
  onAdd: (text: string) => boolean;
  onDelete: (id: string) => void;
  onToggleVisible: () => void;
  onClose: () => void;
}

export default function NotesPanel({
  notes,
  notesVisible,
  onAdd,
  onDelete,
  onToggleVisible,
  onClose,
}: NotesPanelProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    const ok = onAdd(text);
    if (ok) {
      setInput("");
      setError("");
    } else {
      setError("Max 10 notes — delete one first!");
    }
  };

  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="notes-overlay" onClick={onClose}>
      <div className="notes-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notes-header">
          <span className="notes-title">Sticky Notes</span>
          <button className="notes-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="notes-input-row">
          <input
            className="notes-input"
            type="text"
            placeholder="Write a note..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            maxLength={200}
          />
          <button className="notes-add-btn" onClick={handleAdd}>
            Add
          </button>
        </div>
        {error && <div className="notes-error">{error}</div>}

        <button className="notes-toggle-btn" onClick={onToggleVisible}>
          {notesVisible ? "Hide All Notes" : "Show All Notes"}
        </button>

        <div className="notes-list">
          {sorted.map((note) => (
            <div key={note.id} className="notes-item">
              <span className="notes-item-text">{note.text}</span>
              <button
                className="notes-item-delete"
                onClick={() => onDelete(note.id)}
              >
                x
              </button>
            </div>
          ))}

          {notes.length === 0 && (
            <div className="notes-empty">
              No notes yet — tell your cat to remember something!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
