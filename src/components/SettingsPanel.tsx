import { useRef, useState } from "react";
import {
  SpriteTheme,
  Breed,
  Color,
  BREEDS,
  COLORS,
  BREED_LABELS,
  COLOR_LABELS,
  getSpritePaths,
} from "../hooks/useTheme";
import "../styles/settings.css";

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+Space";

function formatShortcut(s: string): string {
  return s
    .replace(/CommandOrControl/g, "\u2318")
    .replace(/Control/g, "\u2303")
    .replace(/Shift/g, "\u21E7")
    .replace(/Alt/g, "\u2325")
    .replace(/\+/g, " ")
    .replace(/Space/g, "Space");
}

function codeToTauriKey(code: string): string | null {
  if (code === "Space") return "Space";
  if (code === "Enter" || code === "NumpadEnter") return "Enter";
  if (code === "Tab") return "Tab";
  if (code === "Backspace") return "Backspace";
  if (code === "Delete") return "Delete";
  if (code === "Escape") return null;
  if (code.startsWith("Key")) return code.slice(3);         // KeyA → A
  if (code.startsWith("Digit")) return code.slice(5);       // Digit1 → 1
  if (code.startsWith("Arrow")) return code.slice(5);       // ArrowUp → Up
  if (/^F\d{1,2}$/.test(code)) return code;                 // F1–F24
  if (code === "Minus") return "-";
  if (code === "Equal") return "=";
  if (code === "BracketLeft") return "[";
  if (code === "BracketRight") return "]";
  if (code === "Backslash") return "\\";
  if (code === "Semicolon") return ";";
  if (code === "Quote") return "'";
  if (code === "Comma") return ",";
  if (code === "Period") return ".";
  if (code === "Slash") return "/";
  if (code === "Backquote") return "`";
  return null;
}

function buildShortcutString(e: KeyboardEvent): string | null {
  const modifiers: string[] = [];
  if (e.metaKey) modifiers.push("CommandOrControl");
  if (e.ctrlKey && !e.metaKey) modifiers.push("Control");
  if (e.altKey) modifiers.push("Alt");
  if (e.shiftKey) modifiers.push("Shift");

  if (modifiers.length === 0) return null;

  const key = codeToTauriKey(e.code);
  if (!key) return null;

  return [...modifiers, key].join("+");
}

interface SettingsPanelProps {
  currentBreed: Breed;
  currentColor: Color;
  customThemes: SpriteTheme[];
  shortcut: string;
  onSelectBreed: (breed: Breed) => void;
  onSelectColor: (color: Color) => void;
  onImport: (name: string, idle: string, walk: string, sleep: string) => void;
  onDelete: (id: string) => void;
  onChangeShortcut: (s: string) => void;
  onClose: () => void;
}

export default function SettingsPanel({
  currentBreed,
  currentColor,
  customThemes,
  shortcut,
  onSelectBreed,
  onSelectColor,
  onImport,
  onDelete,
  onChangeShortcut,
  onClose,
}: SettingsPanelProps) {
  const idleInputRef = useRef<HTMLInputElement>(null);
  const walkInputRef = useRef<HTMLInputElement>(null);
  const sleepInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const recorderInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    const idleFile = idleInputRef.current?.files?.[0];
    const walkFile = walkInputRef.current?.files?.[0];
    const sleepFile = sleepInputRef.current?.files?.[0];

    if (!idleFile || !walkFile || !sleepFile) {
      return;
    }

    const readAsDataUrl = (file: File): Promise<string> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

    Promise.all([
      readAsDataUrl(idleFile),
      readAsDataUrl(walkFile),
      readAsDataUrl(sleepFile),
    ]).then(([idle, walk, sleep]) => {
      const name = idleFile.name.replace(/[-_]?idle\.png$/i, "") || "Custom";
      onImport(name || "Custom Sprite", idle, walk, sleep);
    });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Choose Your Cat</span>
          <button className="settings-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="section-label">Breed</div>
        <div className="theme-grid">
          {BREEDS.map((breed) => {
            const paths = getSpritePaths(breed, currentColor);
            return (
              <div
                key={breed}
                className={`theme-card ${breed === currentBreed ? "selected" : ""}`}
                onClick={() => onSelectBreed(breed)}
              >
                <div
                  className="theme-preview"
                  style={{ backgroundImage: `url(${paths.idle})` }}
                />
                <div className="theme-name">{BREED_LABELS[breed]}</div>
              </div>
            );
          })}
        </div>

        <div className="section-label">Color</div>
        <div className="theme-grid">
          {COLORS.map((color) => {
            const paths = getSpritePaths(currentBreed, color);
            return (
              <div
                key={color}
                className={`theme-card ${color === currentColor ? "selected" : ""}`}
                onClick={() => onSelectColor(color)}
              >
                <div
                  className="theme-preview"
                  style={{ backgroundImage: `url(${paths.idle})` }}
                />
                <div className="theme-name">{COLOR_LABELS[color]}</div>
              </div>
            );
          })}
        </div>

        {customThemes.length > 0 && (
          <>
            <div className="section-label">Custom</div>
            <div className="theme-grid">
              {customThemes.map((theme) => (
                <div key={theme.id} className="theme-card">
                  <button
                    className="theme-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(theme.id);
                    }}
                  >
                    x
                  </button>
                  <div
                    className="theme-preview"
                    style={{ backgroundImage: `url(${theme.idle})` }}
                  />
                  <div className="theme-name">{theme.name}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="shortcut-section">
          <div className="section-label">Keyboard Shortcut</div>
          {recording ? (
            <input
              ref={recorderInputRef}
              className="shortcut-recorder recording"
              value="Press keys..."
              readOnly
              onKeyDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === "Escape") {
                  setRecording(false);
                  return;
                }

                const combo = buildShortcutString(e.nativeEvent);
                if (combo) {
                  onChangeShortcut(combo);
                  setRecording(false);
                }
              }}
              onBlur={() => setRecording(false)}
            />
          ) : (
            <div
              className="shortcut-recorder"
              onClick={() => {
                setRecording(true);
                setTimeout(() => recorderInputRef.current?.focus(), 50);
              }}
            >
              {formatShortcut(shortcut)}
            </div>
          )}
          {shortcut !== DEFAULT_SHORTCUT && (
            <button
              className="shortcut-reset"
              onClick={() => onChangeShortcut(DEFAULT_SHORTCUT)}
            >
              Reset to Default
            </button>
          )}
        </div>

        <div className="import-section">
          <div className="import-label">
            Import custom sprites (32x32 per frame, PNG sprite sheets)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: "#666", fontFamily: "Helvetica Neue, sans-serif" }}>
              Idle (8 frames, 256x32):
              <input ref={idleInputRef} type="file" accept=".png" style={{ fontSize: 11, marginLeft: 4 }} />
            </label>
            <label style={{ fontSize: 11, color: "#666", fontFamily: "Helvetica Neue, sans-serif" }}>
              Walk (8 frames, 256x32):
              <input ref={walkInputRef} type="file" accept=".png" style={{ fontSize: 11, marginLeft: 4 }} />
            </label>
            <label style={{ fontSize: 11, color: "#666", fontFamily: "Helvetica Neue, sans-serif" }}>
              Sleep (4 frames, 128x32):
              <input ref={sleepInputRef} type="file" accept=".png" style={{ fontSize: 11, marginLeft: 4 }} />
            </label>
          </div>
          <button className="import-btn" onClick={handleImport}>
            Import Selected Files
          </button>
        </div>
      </div>
    </div>
  );
}
