import "../styles/hunger.css";

interface HungerBarProps {
  x: number;
  y: number;
  hunger: number;
}

function getColor(hunger: number): string {
  if (hunger > 60) return "#4caf50";
  if (hunger > 30) return "#ffc107";
  if (hunger > 15) return "#ff9800";
  return "#f44336";
}

export default function HungerBar({ x, y, hunger }: HungerBarProps) {
  return (
    <div
      className={`hunger-bar-container${hunger <= 15 ? " starving" : ""}`}
      style={{
        left: x,
        top: y + 36,
      }}
    >
      <div className="hunger-bar-track">
        <div
          className="hunger-bar-fill"
          style={{
            width: `${hunger}%`,
            backgroundColor: getColor(hunger),
          }}
        />
      </div>
    </div>
  );
}
