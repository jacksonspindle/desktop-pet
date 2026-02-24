import { useState, useEffect, useRef, useMemo } from "react";
import type { MenuAction } from "./RadialMenu";
import { commands, Command } from "../lib/commands";
import { fuzzyMatch } from "../lib/fuzzyMatch";
import "../styles/menu.css";

interface CommandPaletteProps {
  x: number;
  y: number;
  musicPlaying: boolean;
  onExecute: (action: MenuAction) => void;
  onChat: (text: string) => void;
  onSearch: (query: string) => void;
  onClose: () => void;
}

export default function CommandPalette({
  x, y, musicPlaying, onExecute, onChat, onSearch, onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Dynamic label for music command
  const activeCommands = useMemo(() =>
    commands.map((cmd) =>
      cmd.id === "music"
        ? { ...cmd, label: musicPlaying ? "Mute Music" : "Play Music" }
        : cmd
    ),
    [musicPlaying],
  );

  // Detect if user typed an argument command (e.g. "chat hello there")
  const argumentMatch = useMemo(() => {
    const trimmed = query.trimStart();
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx === -1) return null;
    const firstWord = trimmed.slice(0, spaceIdx).toLowerCase();
    const rest = trimmed.slice(spaceIdx + 1);
    const cmd = activeCommands.find(
      (c) => c.takesArgument && c.label.toLowerCase() === firstWord,
    );
    if (cmd) return { command: cmd, argument: rest };
    // Also match by id
    const cmdById = activeCommands.find(
      (c) => c.takesArgument && c.id === firstWord,
    );
    if (cmdById) return { command: cmdById, argument: rest };
    return null;
  }, [query, activeCommands]);

  // Filter & score commands
  const results: Command[] = useMemo(() => {
    if (argumentMatch) return [argumentMatch.command];
    const trimmed = query.trim();
    if (!trimmed) return activeCommands;
    const scored = activeCommands
      .map((cmd) => ({ cmd, score: fuzzyMatch(trimmed, cmd.label, cmd.keywords) }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((s) => s.cmd);
  }, [query, activeCommands, argumentMatch]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[selectedIndex]) {
      (items[selectedIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const execute = (cmd: Command) => {
    if (cmd.takesArgument && argumentMatch) {
      const arg = argumentMatch.argument.trim();
      if (arg) {
        if (cmd.id === "chat") onChat(arg);
        else if (cmd.id === "search") onSearch(arg);
        return;
      }
    }
    if (cmd.takesArgument) {
      // If selected but no argument, just insert the command name
      setQuery(cmd.label.toLowerCase() + " ");
      return;
    }
    onExecute(cmd.id as MenuAction);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % results.length);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        }
        break;
      case "Tab":
        e.preventDefault();
        if (results.length > 0) {
          const cmd = results[selectedIndex];
          setQuery(cmd.label.toLowerCase() + (cmd.takesArgument ? " " : ""));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (results.length > 0) {
          execute(results[selectedIndex]);
        } else {
          // Fallback: send as chat
          const trimmed = query.trim();
          if (trimmed) onChat(trimmed);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const showFallback = results.length === 0 && query.trim().length > 0;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "auto",
          zIndex: 1002,
        }}
        onClick={onClose}
      />
      <div
        className="command-palette-container"
        style={{
          left: Math.max(10, x - 150),
          top: Math.max(10, y - 100),
        }}
      >
        <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
          <div className="command-palette-input-row">
            <span className="command-palette-prompt">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Type a command..."
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="command-palette-results" ref={listRef}>
            {results.map((cmd, i) => (
              <div
                key={cmd.id}
                className={`command-palette-item${i === selectedIndex ? " selected" : ""}`}
                onMouseEnter={() => setSelectedIndex(i)}
                onClick={() => execute(cmd)}
              >
                <span className="command-palette-item-icon">{cmd.icon}</span>
                <span className="command-palette-item-label">{cmd.label}</span>
                {cmd.hint && !argumentMatch && (
                  <span className="command-palette-item-hint">{cmd.hint}</span>
                )}
                {argumentMatch && cmd.takesArgument && (
                  <span className="command-palette-item-hint">{argumentMatch.argument || "..."}</span>
                )}
              </div>
            ))}
            {showFallback && (
              <div className="command-palette-fallback">
                Press Enter to chat
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
