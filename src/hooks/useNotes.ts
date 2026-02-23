import { useState, useCallback } from "react";

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  createdAt: number;
}

const STORAGE_KEY = "pet-notes";
const MAX_NOTES = 10;

function loadNotes(): StickyNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: StickyNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<StickyNote[]>(loadNotes);
  const [notesVisible, setNotesVisible] = useState(true);

  const addNote = useCallback((text: string, x?: number, y?: number): boolean => {
    const current = loadNotes();
    if (current.length >= MAX_NOTES) return false;

    const note: StickyNote = {
      id: crypto.randomUUID(),
      text,
      x: x ?? 200 + Math.random() * 200,
      y: y ?? 200 + Math.random() * 200,
      createdAt: Date.now(),
    };
    const updated = [...current, note];
    saveNotes(updated);
    setNotes(updated);
    return true;
  }, []);

  const deleteNote = useCallback((id: string) => {
    const updated = loadNotes().filter((n) => n.id !== id);
    saveNotes(updated);
    setNotes(updated);
  }, []);

  const updateNotePosition = useCallback((id: string, x: number, y: number) => {
    const updated = loadNotes().map((n) =>
      n.id === id ? { ...n, x, y } : n,
    );
    saveNotes(updated);
    setNotes(updated);
  }, []);

  const toggleNotesVisible = useCallback(() => {
    setNotesVisible((prev) => !prev);
  }, []);

  return { notes, notesVisible, addNote, deleteNote, updateNotePosition, toggleNotesVisible };
}
