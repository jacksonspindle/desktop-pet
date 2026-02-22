import { useState, useEffect, useRef } from "react";
import "../styles/menu.css";

interface ChatInputProps {
  x: number;
  y: number;
  mode: "chat" | "search";
  onSubmit: (text: string) => void;
  onClose: () => void;
}

export default function ChatInput({ x, y, mode, onSubmit, onClose }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input on mount
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setText("");
    }
  };

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
        className="chat-input-container"
        style={{
          left: x - 120,
          top: y - 80,
        }}
      >
        <div className="chat-input-box" onClick={(e) => e.stopPropagation()}>
          <span className="chat-input-label">
            {mode === "chat" ? "Say:" : "Ask:"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={text}
            placeholder={mode === "chat" ? "Talk to your cat..." : "Search for anything..."}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}
