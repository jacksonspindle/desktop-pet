import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SPRITE_SIZE = 64;
const SCALE = 4;
const DISPLAY_SIZE = SPRITE_SIZE * SCALE; // 256
const WALK_FRAMES = 8;
const GROUND_HEIGHT = 130;

const Cloud: React.FC<{
  x: number;
  y: number;
  width: number;
  opacity: number;
  /** How far the cloud drifts (in px) over one full loop */
  range: number;
  /** Phase offset so clouds don't all move in sync (0–1) */
  phase?: number;
}> = ({ x, y, width, opacity, range, phase = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Sine wave that completes exactly one cycle per video duration → seamless
  const t = (frame / durationInFrames + phase) * Math.PI * 2;
  const drift = Math.sin(t) * range;
  return (
    <div
      style={{
        position: "absolute",
        left: x + drift,
        top: y,
        width,
        height: width * 0.4,
        borderRadius: width * 0.3,
        background: `rgba(255, 255, 255, ${opacity})`,
      }}
    />
  );
};

export const CatWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  // Cat walks from off-screen left to off-screen right
  const catX = interpolate(
    frame,
    [0, durationInFrames],
    [-DISPLAY_SIZE, width],
    {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    },
  );

  // Subtle bounce — complete whole cycles over the duration so it loops
  // 240 frames / (2π / 0.6) ≈ 22.9 cycles → use exactly 23 cycles
  const bounceT = (frame / durationInFrames) * 23 * Math.PI * 2;
  const bounce = Math.sin(bounceT) * 2;

  // Cycle through 8 walk frames, changing every 4 video frames
  // 240 / 4 = 60 steps, 60 % 8 = 4 → not aligned. Use 60 steps mod 8 wraps cleanly
  // since the cat is off-screen at start and end, sprite frame discontinuity is invisible
  const spriteFrame = Math.floor(frame / 4) % WALK_FRAMES;

  return (
    <AbsoluteFill>
      {/* Sky gradient */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #B8A9D4 0%, #DEC8E8 20%, #F2DDD0 45%, #FDEBD3 65%, #DCE8DC 100%)",
        }}
      />

      {/* Clouds — sine drift with different phases for natural movement */}
      <Cloud x={80} y={70} width={220} opacity={0.6} range={40} phase={0} />
      <Cloud x={550} y={160} width={170} opacity={0.4} range={30} phase={0.2} />
      <Cloud x={1100} y={50} width={260} opacity={0.5} range={50} phase={0.5} />
      <Cloud x={1550} y={190} width={150} opacity={0.35} range={25} phase={0.7} />
      <Cloud x={350} y={280} width={190} opacity={0.3} range={35} phase={0.4} />

      {/* Ground */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: GROUND_HEIGHT,
          background:
            "linear-gradient(180deg, #8BC88B 0%, #6AB06A 50%, #5A9F5A 100%)",
        }}
      />

      {/* Ground top edge highlight */}
      <div
        style={{
          position: "absolute",
          bottom: GROUND_HEIGHT,
          left: 0,
          right: 0,
          height: 4,
          background: "#9ED89E",
        }}
      />

      {/* Cat shadow */}
      <div
        style={{
          position: "absolute",
          left: catX + DISPLAY_SIZE * 0.15,
          bottom: GROUND_HEIGHT - 10,
          width: DISPLAY_SIZE * 0.7,
          height: 18,
          borderRadius: "50%",
          background: "rgba(0, 0, 0, 0.1)",
        }}
      />

      {/* Cat sprite */}
      <div
        style={{
          position: "absolute",
          left: catX,
          bottom: GROUND_HEIGHT - 10 + bounce,
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile("walk.png")}
          style={{
            position: "absolute",
            top: 0,
            left: -spriteFrame * DISPLAY_SIZE,
            width: SPRITE_SIZE * WALK_FRAMES * SCALE,
            height: DISPLAY_SIZE,
            imageRendering: "pixelated",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
