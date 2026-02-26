import { useState } from "react";
import "../styles/timer.css";

interface TimerPanelProps {
  running: boolean;
  remaining: number;
  label: string;
  onStart: (seconds: number, label?: string) => void;
  onCancel: () => void;
  onClose: () => void;
}

const PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
  { label: "15m", seconds: 900 },
  { label: "25m", seconds: 1500 },
  { label: "30m", seconds: 1800 },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerPanel({
  running,
  remaining,
  label,
  onStart,
  onCancel,
  onClose,
}: TimerPanelProps) {
  const [customMinutes, setCustomMinutes] = useState("");

  const handleCustomStart = () => {
    const mins = parseFloat(customMinutes);
    if (mins > 0) {
      onStart(Math.round(mins * 60));
      onClose();
    }
  };

  const handlePreset = (seconds: number) => {
    onStart(seconds);
    onClose();
  };

  return (
    <div className="timer-overlay" onClick={onClose}>
      <div className="timer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="timer-header">
          <span className="timer-title">Timer</span>
          <button className="timer-close" onClick={onClose}>
            x
          </button>
        </div>

        {running ? (
          <>
            <div className="timer-running-label">{label}</div>
            <div className="timer-countdown">{formatTime(remaining)}</div>
            <button className="timer-cancel-btn" onClick={onCancel}>
              Cancel Timer
            </button>
          </>
        ) : (
          <>
            <div className="timer-presets">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className="timer-preset-btn"
                  onClick={() => handlePreset(p.seconds)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="timer-custom-row">
              <input
                className="timer-custom-input"
                type="number"
                min="1"
                placeholder="Minutes..."
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomStart()}
              />
              <button className="timer-start-btn" onClick={handleCustomStart}>
                Start
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
