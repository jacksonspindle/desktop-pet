import "../styles/menu.css";

export type MenuAction = "chat" | "search" | "music" | "nap" | "home" | "settings" | "journal" | "achievements" | "friends" | "notes";

interface MenuItem {
  action: MenuAction;
  icon: string;
  label: string;
}

interface RadialMenuProps {
  x: number;
  y: number;
  musicPlaying?: boolean;
  onSelect: (action: MenuAction) => void;
  onClose: () => void;
}

const MENU_ITEMS: MenuItem[] = [
  { action: "chat", icon: "\uD83D\uDCAC", label: "Chat" },
  { action: "search", icon: "\uD83D\uDD0D", label: "Search" },
  { action: "music", icon: "\uD83C\uDFB5", label: "Music" },
  { action: "nap", icon: "\uD83D\uDE34", label: "Nap" },
  { action: "home", icon: "\uD83C\uDFE0", label: "Home" },
  { action: "settings", icon: "\u2699\uFE0F", label: "Style" },
  { action: "journal", icon: "\uD83D\uDCD6", label: "Journal" },
  { action: "achievements", icon: "\uD83C\uDFC6", label: "Trophies" },
  { action: "friends", icon: "\uD83D\uDC3E", label: "Friends" },
  { action: "notes", icon: "\uD83D\uDCDD", label: "Notes" },
];

const BUTTON_SIZE = 56;
const RADIUS = 105;

export default function RadialMenu({ x, y, musicPlaying, onSelect, onClose }: RadialMenuProps) {
  const items = MENU_ITEMS.map((item) =>
    item.action === "music" && musicPlaying
      ? { ...item, icon: "\uD83D\uDD07", label: "Mute" }
      : item,
  );

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
        {items.map((item, i) => {
          const angle = (i / MENU_ITEMS.length) * 2 * Math.PI - Math.PI / 2;
          const ix = Math.cos(angle) * RADIUS - BUTTON_SIZE / 2;
          const iy = Math.sin(angle) * RADIUS - BUTTON_SIZE / 2;

          return (
            <div
              key={item.action}
              className="radial-menu-item"
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                left: ix,
                top: iy,
                '--i': i,
              } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.action);
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
