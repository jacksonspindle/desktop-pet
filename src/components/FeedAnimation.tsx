import { useState, useEffect, useRef } from "react";
import type { Snack } from "./SnackPanel";
import "../styles/feed.css";

type Phase = "fly" | "chomp" | "effects" | "done";

interface FeedAnimationProps {
  snack: Snack;
  startX: number;
  startY: number;
  petX: number;
  petY: number;
  skipFly?: boolean;
  onPetStyle: (style: React.CSSProperties) => void;
  onComplete: (snackName: string) => void;
}

const CHOMP_STYLE: React.CSSProperties = {
  animation: "feed-chomp 1s ease-in-out",
  transition: "none",
};

const HAPPY_STYLE: React.CSSProperties = {
  animation: "feed-happy-bounce 800ms ease-in-out 2",
  transition: "none",
};

const CLEAR_STYLE: React.CSSProperties = {};

const PARTICLES = ["\u2764\uFE0F", "\u2B50", "\u2728", "\uD83D\uDC9B", "\uD83C\uDF1F", "\uD83D\uDC96", "\u2728", "\u2B50"];

export default function FeedAnimation({
  snack,
  startX,
  startY,
  petX,
  petY,
  skipFly,
  onPetStyle,
  onComplete,
}: FeedAnimationProps) {
  const [phase, setPhase] = useState<Phase>(skipFly ? "chomp" : "fly");
  const onPetStyleRef = useRef(onPetStyle);
  const onCompleteRef = useRef(onComplete);
  onPetStyleRef.current = onPetStyle;
  onCompleteRef.current = onComplete;

  const snackNameRef = useRef(snack.name);
  snackNameRef.current = snack.name;

  const skipFlyRef = useRef(skipFly);
  skipFlyRef.current = skipFly;

  useEffect(() => {
    const skip = skipFlyRef.current;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (skip) {
      // Skip fly phase — chomp immediately
      onPetStyleRef.current(CHOMP_STYLE);

      timers.push(setTimeout(() => {
        setPhase("effects");
        onPetStyleRef.current(HAPPY_STYLE);
      }, 1000));

      timers.push(setTimeout(() => {
        setPhase("done");
        onPetStyleRef.current(CLEAR_STYLE);
        onCompleteRef.current(snackNameRef.current);
      }, 2500));
    } else {
      timers.push(setTimeout(() => {
        setPhase("chomp");
        onPetStyleRef.current(CHOMP_STYLE);
      }, 800));

      timers.push(setTimeout(() => {
        setPhase("effects");
        onPetStyleRef.current(HAPPY_STYLE);
      }, 1800));

      timers.push(setTimeout(() => {
        setPhase("done");
        onPetStyleRef.current(CLEAR_STYLE);
        onCompleteRef.current(snackNameRef.current);
      }, 3300));
    }

    return () => timers.forEach(clearTimeout);
  }, []); // stable: no deps, uses refs for callbacks

  if (phase === "done") return null;

  return (
    <>
      {phase === "fly" && (
        <div
          className="feed-flying-snack"
          style={{
            "--start-x": `${startX - 24}px`,
            "--start-y": `${startY - 24}px`,
            "--end-x": `${petX - 24}px`,
            "--end-y": `${petY - 24}px`,
          } as React.CSSProperties}
        >
          {snack.emoji}
        </div>
      )}

      {phase === "chomp" && (
        <>
          {["nom", "NOM", "nom!"].map((text, i) => (
            <div
              key={i}
              className="feed-nom-text"
              style={{
                left: petX - 30 + i * 25,
                top: petY - 50 - i * 10,
                "--delay": `${i * 150}ms`,
              } as React.CSSProperties}
            >
              {text}
            </div>
          ))}
        </>
      )}

      {phase === "effects" && (
        <>
          {PARTICLES.map((p, i) => (
            <div
              key={i}
              className="feed-particle"
              style={{
                left: petX - 20 + (i % 4) * 15 - 10,
                top: petY - 20 - (i % 3) * 5,
                "--delay": `${i * 100}ms`,
                "--drift": `${(i % 2 === 0 ? 1 : -1) * (8 + i * 4)}px`,
              } as React.CSSProperties}
            >
              {p}
            </div>
          ))}
        </>
      )}
    </>
  );
}
