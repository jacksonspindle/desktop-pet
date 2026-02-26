import "../styles/timer.css";

interface TimerBubbleProps {
  x: number;
  y: number;
  remaining: number;
  label: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimerBubble({ x, y, remaining, label: _label }: TimerBubbleProps) {
  const pulsing = remaining <= 10;

  return (
    <div
      className={`timer-bubble${pulsing ? " pulsing" : ""}`}
      style={{
        left: x - 50,
        top: y - 60,
      }}
    >
      <span className="timer-bubble-time">{formatTime(remaining)}</span>
    </div>
  );
}
