import { useRef, useEffect, useState } from "react";
import "../styles/bubble.css";

interface SpeechBubbleProps {
  text: string;
  x: number;
  y: number;
  hiding: boolean;
}

export default function SpeechBubble({ text, x, y, hiding }: SpeechBubbleProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(40);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.offsetHeight);
    }
  }, [text]);

  // Position bubble so the tail points at the cat, bubble goes upward
  const bubbleTop = y - 32 - height - 20; // 32 = half pet, 20 = tail + gap
  // If it would go off the top of the screen, put it below instead
  const aboveScreen = bubbleTop < 10;
  const finalTop = aboveScreen ? y + 40 : bubbleTop;

  return (
    <div
      className={`speech-bubble ${hiding ? "hiding" : ""} ${aboveScreen ? "below" : ""}`}
      style={{
        left: x,
        top: finalTop,
        transform: "translateX(-50%)",
      }}
    >
      {!aboveScreen && <div className="bubble-tail-top" />}
      <div ref={contentRef} className="bubble-content">
        {text}
      </div>
      {aboveScreen && <div className="bubble-tail-bottom" />}
    </div>
  );
}
