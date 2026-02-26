import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SPRITE_SIZE = 64;
const SCALE = 8;
const DISPLAY_SIZE = SPRITE_SIZE * SCALE;
const IDLE_FRAMES = 8;
const MENU_RADIUS = 320;
const ITEM_SIZE = 90;

const MENU_ITEMS = [
  { emoji: "\u{1F4AC}", label: "Chat" },
  { emoji: "\u{1F50D}", label: "Search" },
  { emoji: "\u{1F3B5}", label: "Music" },
  { emoji: "\u{1F634}", label: "Nap" },
  { emoji: "\u{1F3E0}", label: "Home" },
  { emoji: "\u2699\uFE0F", label: "Style" },
  { emoji: "\u{1F4D6}", label: "Journal" },
  { emoji: "\u{1F3C6}", label: "Trophies" },
  { emoji: "\u{1F43E}", label: "Friends" },
  { emoji: "\u{1F4DD}", label: "Notes" },
];

export const RadialMenuDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Cat centered in frame
  const catCenterX = width / 2;
  const catCenterY = height / 2;
  const catLeft = catCenterX - DISPLAY_SIZE / 2;
  const catTop = catCenterY - DISPLAY_SIZE / 2;

  // Breathing bounce — 3 full sine cycles over 180 frames → seamless
  const breatheT = (frame / durationInFrames) * 3 * Math.PI * 2;
  const bounce = Math.sin(breatheT) * 5;

  // Idle sprite animation (change every 6 video frames, slower than walk)
  const spriteFrame = Math.floor(frame / 6) % IDLE_FRAMES;

  // ── Click indicator (frames 58–70) ──
  const clickOpacity = interpolate(
    frame,
    [58, 60, 64, 70],
    [0, 0.7, 0.4, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const clickScale = interpolate(frame, [58, 60, 70], [0.3, 1, 2.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Cursor dot glides in toward cat (frames 48–68)
  const cursorOpacity = interpolate(
    frame,
    [48, 52, 62, 68],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cursorX = interpolate(
    frame,
    [48, 58],
    [catCenterX + 200, catCenterX + 12],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cursorY = interpolate(
    frame,
    [48, 58],
    [catCenterY + 140, catCenterY + 12],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Radial menu helpers ──
  const getItemScale = (index: number): number => {
    const stagger = index * 2;
    const inStart = 65 + stagger;
    const outStart = 140 + stagger;

    if (frame < inStart) return 0;

    // Pop in: 0 → 1.15 → 1.0
    const popIn = interpolate(
      frame,
      [inStart, inStart + 8, inStart + 14],
      [0, 1.15, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    if (frame < outStart) return popIn;

    // Pop out: 1 → 1.1 → 0
    return interpolate(
      frame,
      [outStart, outStart + 5, outStart + 10],
      [1, 1.1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  };

  // Brief highlight glow on the "Chat" button
  const getHighlight = (index: number): number => {
    if (index !== 0) return 0;
    return interpolate(frame, [105, 110, 120, 125], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <AbsoluteFill style={{ background: "#faf8f5" }}>
      {/* Cat idle sprite */}
      <div
        style={{
          position: "absolute",
          left: catLeft,
          top: catTop + bounce,
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("idle.png")}
          style={{
            position: "absolute",
            top: 0,
            left: -spriteFrame * DISPLAY_SIZE,
            width: SPRITE_SIZE * IDLE_FRAMES * SCALE,
            height: DISPLAY_SIZE,
            imageRendering: "pixelated",
          }}
        />
      </div>

      {/* Cursor dot */}
      {cursorOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: cursorX - 9,
            top: cursorY - 9,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "white",
            border: "2px solid rgba(0, 0, 0, 0.3)",
            opacity: cursorOpacity,
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
          }}
        />
      )}

      {/* Click ring */}
      {clickOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: catCenterX - 40,
            top: catCenterY - 40,
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "3px solid rgba(232, 163, 60, 0.8)",
            background: "rgba(232, 163, 60, 0.12)",
            opacity: clickOpacity,
            transform: `scale(${clickScale})`,
          }}
        />
      )}

      {/* Radial menu items */}
      {MENU_ITEMS.map((item, index) => {
        const angle =
          (index / MENU_ITEMS.length) * Math.PI * 2 - Math.PI / 2;
        const x = catCenterX + Math.cos(angle) * MENU_RADIUS;
        const y = catCenterY + Math.sin(angle) * MENU_RADIUS;
        const scale = getItemScale(index);
        const hl = getHighlight(index);

        if (scale <= 0) return null;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x - ITEM_SIZE / 2,
              top: y - ITEM_SIZE / 2,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              borderRadius: "50%",
              background:
                hl > 0
                  ? `rgb(255, ${248 - Math.round(hl * 20)}, ${240 - Math.round(hl * 40)})`
                  : "#fff8f0",
              border: "3px solid #e8a33c",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${scale})`,
              boxShadow:
                hl > 0
                  ? `0 0 ${Math.round(16 * hl)}px rgba(232, 163, 60, ${(0.4 * hl).toFixed(2)}), 0 2px 8px rgba(0, 0, 0, 0.1)`
                  : "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span style={{ fontSize: 34, lineHeight: 1 }}>{item.emoji}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#8B7355",
                letterSpacing: 0.5,
                marginTop: 1,
                fontFamily: "sans-serif",
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
