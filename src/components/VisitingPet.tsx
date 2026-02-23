import { useState, useEffect, useRef } from "react";
import { getSpritePaths, Breed, Color } from "../hooks/useTheme";
import { IncomingVisit } from "../hooks/useFriends";

interface VisitingPetProps {
  visit: IncomingVisit;
  userPetX: number;
  userPetY: number;
  onComplete: () => void;
  onChat: (message: string) => void;
  onPositionChange?: (pos: { x: number; y: number } | null) => void;
  onOverlayChange?: (open: boolean) => void;
}

type Phase = "enter" | "idle" | "exit" | "done";

export default function VisitingPet({ visit, userPetX, userPetY, onComplete, onChat, onPositionChange, onOverlayChange }: VisitingPetProps) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [facingLeft, setFacingLeft] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const animRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const exitTargetRef = useRef({ x: 0, y: 0 });
  const chatInputRef = useRef<HTMLInputElement>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const onOverlayChangeRef = useRef(onOverlayChange);
  onOverlayChangeRef.current = onOverlayChange;
  // Capture pet position at mount time so random walks don't re-trigger init
  const userPetXRef = useRef(userPetX);
  const userPetYRef = useRef(userPetY);
  useEffect(() => { userPetXRef.current = userPetX; }, [userPetX]);
  useEffect(() => { userPetYRef.current = userPetY; }, [userPetY]);

  // Report position changes to parent and clear on unmount
  useEffect(() => {
    onPositionChangeRef.current?.(pos);
  }, [pos]);
  useEffect(() => {
    return () => { onPositionChangeRef.current?.(null); };
  }, []);

  // Report overlay state (menu/chat open) to parent for cursor passthrough
  useEffect(() => {
    onOverlayChangeRef.current?.(menuOpen || chatOpen);
  }, [menuOpen, chatOpen]);

  const paths = getSpritePaths(visit.breed as Breed, visit.color as Color);

  // Initialize start position and targets (only on new visit)
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const petX = userPetXRef.current;
    const petY = userPetYRef.current;

    // Pick a random edge
    const edges: ("left" | "right" | "top" | "bottom")[] = ["left", "right", "top", "bottom"];
    const edge = edges[Math.floor(Math.random() * edges.length)];

    let startX = 0;
    let startY = 0;
    switch (edge) {
      case "left": startX = -64; startY = h * 0.3 + Math.random() * h * 0.4; break;
      case "right": startX = w + 64; startY = h * 0.3 + Math.random() * h * 0.4; break;
      case "top": startX = w * 0.2 + Math.random() * w * 0.6; startY = -64; break;
      case "bottom": startX = w * 0.2 + Math.random() * w * 0.6; startY = h + 64; break;
    }
    setPos({ x: startX, y: startY });

    // Target: near user's pet (offset by 60-100px)
    const offsetX = (Math.random() > 0.5 ? 1 : -1) * (60 + Math.random() * 40);
    const offsetY = (Math.random() - 0.5) * 40;
    targetRef.current = {
      x: Math.max(40, Math.min(w - 40, petX + offsetX)),
      y: Math.max(40, Math.min(h - 40, petY + offsetY)),
    };

    // Exit target: opposite edge
    const opposites: Record<string, () => { x: number; y: number }> = {
      left: () => ({ x: w + 64, y: h * 0.3 + Math.random() * h * 0.4 }),
      right: () => ({ x: -64, y: h * 0.3 + Math.random() * h * 0.4 }),
      top: () => ({ x: w * 0.2 + Math.random() * w * 0.6, y: h + 64 }),
      bottom: () => ({ x: w * 0.2 + Math.random() * w * 0.6, y: -64 }),
    };
    exitTargetRef.current = opposites[edge]();

    setFacingLeft(targetRef.current.x < startX);
  }, [visit.id]);

  // Enter → idle after 5s
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const enterTimer = setTimeout(() => {
      if (phaseRef.current === "enter") {
        setPhase("idle");
        if (visit.message) {
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 8000);
        }
      }
    }, 5000);
    return () => clearTimeout(enterTimer);
  }, []);

  // Show message bubble when message changes during idle (chat replies)
  const prevMessageRef = useRef(visit.message);
  useEffect(() => {
    if (visit.message && visit.message !== prevMessageRef.current && phaseRef.current === "idle") {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 8000);
      prevMessageRef.current = visit.message;
      return () => clearTimeout(timer);
    }
    prevMessageRef.current = visit.message;
  }, [visit.message]);

  // When exit animation reaches the edge, finish
  const handleExitComplete = () => {
    setPhase("done");
  };

  // Call onComplete when done
  useEffect(() => {
    if (phase === "done") onComplete();
  }, [phase, onComplete]);

  // Send visitor home: start exit walk
  const sendHome = () => {
    setMenuOpen(false);
    setChatOpen(false);
    if (phaseRef.current === "idle") {
      setPhase("exit");
    }
  };

  // Handle sprite click → open menu
  const handleSpriteClick = () => {
    if (phaseRef.current !== "idle") return;
    if (chatOpen) return;
    setMenuOpen((prev) => !prev);
  };

  // Handle chat submit
  const handleChatSubmit = () => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    onChat(trimmed);
    setChatText("");
    setChatOpen(false);
  };

  // Handle chat key events
  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleChatSubmit();
    } else if (e.key === "Escape") {
      setChatOpen(false);
      setChatText("");
    }
  };

  // Auto-focus chat input when opened
  useEffect(() => {
    if (chatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [chatOpen]);

  // Movement animation
  useEffect(() => {
    if (phase !== "enter" && phase !== "exit") {
      cancelAnimationFrame(animRef.current);
      return;
    }

    const speed = 1.5;
    const target = phase === "enter" ? targetRef.current : exitTargetRef.current;

    if (phase === "exit") {
      setFacingLeft(target.x < targetRef.current.x);
    }

    let cancelled = false;
    const animate = () => {
      if (cancelled) return;

      setPos((prev) => {
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < speed) {
          // Reached destination
          if (phase === "exit") {
            handleExitComplete();
          }
          return target;
        }
        return {
          x: prev.x + (dx / dist) * speed,
          y: prev.y + (dy / dist) * speed,
        };
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
    };
  }, [phase]);

  if (phase === "done") return null;

  const spriteClass = phase === "idle" ? "idle" : "walk";

  return (
    <>
      {/* Backdrop overlay to close menu on outside click */}
      {menuOpen && (
        <div
          className="visitor-menu-backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        className="visiting-pet-container"
        style={{ left: pos.x - 32, top: pos.y - 32 }}
      >
        {/* Menu popup */}
        {menuOpen && (
          <div className="visitor-menu">
            <button
              className="visitor-menu-btn"
              onClick={() => {
                setMenuOpen(false);
                setChatOpen(true);
              }}
            >
              💬 Chat
            </button>
            <button
              className="visitor-menu-btn"
              onClick={sendHome}
            >
              👋 Send Home
            </button>
          </div>
        )}

        {/* Chat input */}
        {chatOpen && (
          <div className="visitor-chat-container">
            <input
              ref={chatInputRef}
              className="visitor-chat-input"
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Say something..."
              maxLength={100}
            />
          </div>
        )}

        <div
          className={`visiting-pet-sprite ${spriteClass} ${facingLeft ? "flip" : ""}`}
          style={{
            backgroundImage: `url(${phase === "idle" ? paths.idle : paths.walk})`,
            pointerEvents: phase === "idle" ? "auto" : "none",
            cursor: phase === "idle" ? "pointer" : "default",
          }}
          onClick={handleSpriteClick}
          title="Click to interact"
        />
        <div className="visiting-pet-nametag">{visit.fromName}</div>
        {showMessage && visit.message && (
          <div className="visiting-pet-message">{visit.message}</div>
        )}
      </div>
    </>
  );
}
