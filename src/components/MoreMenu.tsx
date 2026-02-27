import type { MenuAction } from "./RadialMenu";
import "../styles/menu.css";

interface MoreMenuItem {
  action: MenuAction;
  icon: string;
  label: string;
}

interface Category {
  name: string;
  items: MoreMenuItem[];
}

const CATEGORIES: Category[] = [
  {
    name: "Actions",
    items: [
      { action: "chat", icon: "\uD83D\uDCAC", label: "Chat" },
      { action: "search", icon: "\uD83D\uDD0D", label: "Search" },
      { action: "music", icon: "\uD83C\uDFB5", label: "Music" },
      { action: "timer", icon: "\u23F1\uFE0F", label: "Timer" },
    ],
  },
  {
    name: "Care",
    items: [
      { action: "feed", icon: "\uD83C\uDF63", label: "Feed" },
      { action: "nap", icon: "\uD83D\uDE34", label: "Nap" },
      { action: "home", icon: "\uD83C\uDFE0", label: "Home" },
    ],
  },
  {
    name: "Explore",
    items: [
      { action: "journal", icon: "\uD83D\uDCD6", label: "Journal" },
      { action: "achievements", icon: "\uD83C\uDFC6", label: "Trophies" },
      { action: "notes", icon: "\uD83D\uDCDD", label: "Notes" },
    ],
  },
  {
    name: "Social",
    items: [
      { action: "friends", icon: "\uD83D\uDC3E", label: "Friends" },
      { action: "settings", icon: "\u2699\uFE0F", label: "Style" },
    ],
  },
];

interface MoreMenuProps {
  musicPlaying?: boolean;
  onSelect: (action: MenuAction) => void;
  onClose: () => void;
}

export default function MoreMenu({ musicPlaying, onSelect, onClose }: MoreMenuProps) {
  return (
    <div className="more-menu-overlay" onClick={onClose}>
      <div className="more-menu-panel" onClick={(e) => e.stopPropagation()}>
        <div className="more-menu-header">
          <span className="more-menu-title">All Actions</span>
          <button className="more-menu-close" onClick={onClose}>x</button>
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="more-menu-category">
            <div className="more-menu-category-label">{cat.name}</div>
            <div className="more-menu-grid">
              {cat.items.map((item) => {
                const icon = item.action === "music" && musicPlaying ? "\uD83D\uDD07" : item.icon;
                const label = item.action === "music" && musicPlaying ? "Mute" : item.label;
                return (
                  <div
                    key={item.action}
                    className="more-menu-item"
                    onClick={() => onSelect(item.action)}
                  >
                    <span className="more-menu-item-icon">{icon}</span>
                    <span className="more-menu-item-label">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
