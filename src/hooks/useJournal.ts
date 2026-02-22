import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EventData } from "./useEventTracker";

export interface JournalEntry {
  date: string;
  text: string;
  generatedAt: number;
}

const STORAGE_KEY = "pet-journal";
const MAX_ENTRIES = 30;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function persistEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function useJournal(eventData: EventData) {
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries);
  const [loading, setLoading] = useState(false);
  const generating = useRef(false);

  const todayGenerated = entries.some((e) => e.date === today());

  const generateToday = useCallback(async () => {
    if (generating.current) return;
    if (entries.some((e) => e.date === today())) return;

    generating.current = true;
    setLoading(true);

    try {
      const summary = {
        date: today(),
        chats: eventData.chats,
        searches: eventData.searches,
        fortunes: eventData.fortunes,
        naps: eventData.naps,
        musicToggles: eventData.musicToggles,
        petClicks: eventData.petClicks,
        streak: eventData.currentStreak,
        activeDays: eventData.activeDays.length,
      };

      const text = await invoke<string>("generate_pet_dialogue", {
        appName: "",
        windowTitle: "",
        trigger: JSON.stringify(summary),
        mode: "journal",
        userInput: "",
      });

      const entry: JournalEntry = {
        date: today(),
        text,
        generatedAt: Date.now(),
      };

      setEntries((prev) => {
        const next = [...prev.filter((e) => e.date !== today()), entry].slice(-MAX_ENTRIES);
        persistEntries(next);
        return next;
      });
    } catch (err) {
      console.error("Failed to generate journal entry:", err);
    } finally {
      setLoading(false);
      generating.current = false;
    }
  }, [entries, eventData]);

  return { entries, generateToday, todayGenerated, loading };
}
