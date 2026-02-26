import "../styles/feed.css";

export interface Snack {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const SNACKS: Snack[] = [
  { id: "fish", name: "Fish", emoji: "\uD83D\uDC1F", description: "A fresh catch!" },
  { id: "cookie", name: "Cookie", emoji: "\uD83C\uDF6A", description: "Warm & crunchy" },
  { id: "sushi", name: "Sushi", emoji: "\uD83C\uDF63", description: "Fancy feast" },
  { id: "pizza", name: "Pizza", emoji: "\uD83C\uDF55", description: "Cheesy goodness" },
  { id: "icecream", name: "Ice Cream", emoji: "\uD83C\uDF66", description: "Brain freeze!" },
  { id: "milk", name: "Milk", emoji: "\uD83E\uDD5B", description: "Classic choice" },
];

interface SnackPanelProps {
  onGrab: (snack: Snack, e: React.MouseEvent) => void;
  onClose: () => void;
}

export default function SnackPanel({ onGrab, onClose }: SnackPanelProps) {
  return (
    <div className="feed-overlay" onClick={onClose}>
      <div className="feed-panel" onClick={(e) => e.stopPropagation()}>
        <div className="feed-header">
          <span className="feed-title">Feed Your Pet</span>
          <button className="feed-close" onClick={onClose}>
            x
          </button>
        </div>
        <div className="feed-grid">
          {SNACKS.map((snack) => (
            <div
              key={snack.id}
              className="feed-snack-card"
              onMouseDown={(e) => { e.preventDefault(); onGrab(snack, e); }}
            >
              <span className="feed-snack-emoji">{snack.emoji}</span>
              <div className="feed-snack-name">{snack.name}</div>
              <div className="feed-snack-desc">{snack.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
