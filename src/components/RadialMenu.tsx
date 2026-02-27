import "../styles/menu.css";

export type MenuAction = "chat" | "search" | "music" | "nap" | "home" | "settings" | "journal" | "achievements" | "friends" | "notes" | "feed" | "timer";

interface MenuItem {
  action: MenuAction | "more";
  icon: string;
  label: string;
}

interface RadialMenuProps {
  x: number;
  y: number;
  musicPlaying?: boolean;
  onSelect: (action: MenuAction) => void;
  onMore: () => void;
  onClose: () => void;
}

const RADIAL_ITEMS: MenuItem[] = [
  { action: "chat", icon: "\uD83D\uDCAC", label: "Chat" },
  { action: "search", icon: "\uD83D\uDD0D", label: "Search" },
  { action: "feed", icon: "\uD83C\uDF63", label: "Feed" },
  { action: "nap", icon: "\uD83D\uDE34", label: "Nap" },
  { action: "home", icon: "\uD83C\uDFE0", label: "Home" },
  { action: "more", icon: "\u2022\u2022\u2022", label: "More" },
];

const BUTTON_SIZE = 56;
const RADIUS = 90;

export default function RadialMenu({ x, y, musicPlaying, onSelect, onMore, onClose }: RadialMenuProps) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "auto",
          zIndex: 1001,
        }}
        onClick={onClose}
      />
      <div
        className="radial-menu"
        style={{
          left: x,
          top: y,
        }}
      >
        {RADIAL_ITEMS.map((item, i) => {
          const angle = (i / RADIAL_ITEMS.length) * 2 * Math.PI - Math.PI / 2;
          const ix = Math.cos(angle) * RADIUS - BUTTON_SIZE / 2;
          const iy = Math.sin(angle) * RADIUS - BUTTON_SIZE / 2;

          const icon = item.action === "music" && musicPlaying ? "\uD83D\uDD07" : item.icon;
          const label = item.action === "music" && musicPlaying ? "Mute" : item.label;

          return (
            <div
              key={item.action}
              className={`radial-menu-item${item.action === "more" ? " radial-more-btn" : ""}`}
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                left: ix,
                top: iy,
                '--i': i,
              } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                if (item.action === "more") {
                  onMore();
                } else {
                  onSelect(item.action as MenuAction);
                }
              }}
            >
              <span className="menu-icon">{icon}</span>
              <span className="menu-label">{label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
