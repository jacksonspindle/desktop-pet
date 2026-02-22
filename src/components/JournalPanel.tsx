import { useEffect } from "react";
import { JournalEntry } from "../hooks/useJournal";
import "../styles/journal.css";

interface JournalPanelProps {
  entries: JournalEntry[];
  loading: boolean;
  todayGenerated: boolean;
  onGenerateToday: () => void;
  onOpen: () => void;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function JournalPanel({
  entries,
  loading,
  todayGenerated,
  onGenerateToday,
  onOpen,
  onClose,
}: JournalPanelProps) {
  useEffect(() => {
    onOpen();
    if (!todayGenerated) {
      onGenerateToday();
    }
  }, []);

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="journal-overlay" onClick={onClose}>
      <div className="journal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="journal-header">
          <span className="journal-title">My Diary</span>
          <button className="journal-close" onClick={onClose}>
            x
          </button>
        </div>

        {loading && sorted.length === 0 && (
          <div className="journal-loading">Writing today's entry...</div>
        )}

        <div className="journal-entries">
          {sorted.map((entry) => (
            <div key={entry.date} className="journal-entry">
              <div className="journal-date">{formatDate(entry.date)}</div>
              <div className="journal-text">{entry.text}</div>
            </div>
          ))}

          {sorted.length === 0 && !loading && (
            <div className="journal-empty">No entries yet. Check back later!</div>
          )}
        </div>
      </div>
    </div>
  );
}
