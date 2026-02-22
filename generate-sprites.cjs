/**
 * generate-sprites.cjs
 *
 * Generates pixel-art sprite sheets for the desktop pet.
 * Uses only Node.js built-ins (zlib + fs) — no external dependencies.
 *
 * Outputs:
 *   src/assets/sprites/idle.png   — 8 frames, 256x32  (orange, backwards compat)
 *   src/assets/sprites/walk.png   — 8 frames, 256x32  (orange, backwards compat)
 *   src/assets/sprites/sleep.png  — 4 frames, 128x32  (orange, backwards compat)
 *
 *   src/assets/sprites/<variant>/idle.png   — per-variant
 *   src/assets/sprites/<variant>/walk.png
 *   src/assets/sprites/<variant>/sleep.png
 *
 *   Variants: orange, gray, black, white, tux
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---------------------------------------------------------------------------
// Minimal PNG encoder (RGBA, non-interlaced)
// ---------------------------------------------------------------------------

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBytes, data]);
  const crcVal = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, body, crcBuf]);
}

function encodePNG(width, height, rgba) {
  // Build raw scanlines with filter byte 0 (None) per row
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + width * 4);
    raw[rowOff] = 0; // filter: None
    rgba.copy(raw, rowOff + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", iend),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.buf = Buffer.alloc(w * h * 4, 0);
  }

  setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.buf[i] = r;
    this.buf[i + 1] = g;
    this.buf[i + 2] = b;
    this.buf[i + 3] = a;
  }

  fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, r, g, b, a);
      }
    }
  }

  toPNG() {
    return encodePNG(this.w, this.h, this.buf);
  }
}

// ---------------------------------------------------------------------------
// Color palette definitions
// ---------------------------------------------------------------------------

// Shared colors used by all variants
const BLACK = [0x00, 0x00, 0x00];
const PINK = [0xff, 0xaa, 0xaa];

// Helper: parse hex color string "#RRGGBB" into [r, g, b]
function hex(s) {
  const r = parseInt(s.slice(1, 3), 16);
  const g = parseInt(s.slice(3, 5), 16);
  const b = parseInt(s.slice(5, 7), 16);
  return [r, g, b];
}

// Color config for each variant:
//   body     — main body/head/leg/tail fill
//   outline  — outlines, mouth lines
//   belly    — belly highlight area
//   earInner — inner-ear fill pixels
const COLOR_VARIANTS = {
  orange: {
    body: [0xe8, 0xa3, 0x3c],
    outline: [0x8b, 0x5e, 0x1c],
    belly: [0xf0, 0xbd, 0x6e],
    earInner: [0xe8, 0xa3, 0x3c], // same as body in original
  },
  gray: {
    body: hex("#A0A0A0"),
    outline: hex("#555555"),
    belly: hex("#C8C8C8"),
    earInner: hex("#D4A0A0"),
  },
  black: {
    body: hex("#3A3A3A"),
    outline: hex("#1A1A1A"),
    belly: hex("#555555"),
    earInner: hex("#8B5555"),
  },
  white: {
    body: hex("#F0F0F0"),
    outline: hex("#AAAAAA"),
    belly: hex("#FFFFFF"),
    earInner: hex("#FFB0B0"),
  },
  tux: {
    body: hex("#2A2A2A"),
    outline: hex("#111111"),
    belly: hex("#F0F0F0"),
    earInner: hex("#D4A0A0"),
  },
};

// ---------------------------------------------------------------------------
// Idle sprite — 8 frames, standing cat with subtle breathing
// ---------------------------------------------------------------------------

function drawIdleCat(c, ox, oy, frame, colors) {
  const { body, outline, belly, earInner } = colors;

  // Breathing offset: frames 0-3 rise, 4-7 fall
  const breathOffset = [0, 0, -1, -1, -1, -1, 0, 0][frame];
  const by = oy + breathOffset;

  // Ears (triangles) — dark outline with inner fill
  c.setPixel(ox + 9, by + 5, ...outline);
  c.setPixel(ox + 8, by + 6, ...outline);
  c.setPixel(ox + 9, by + 6, ...earInner);
  c.setPixel(ox + 10, by + 6, ...outline);
  c.setPixel(ox + 8, by + 7, ...outline);
  c.setPixel(ox + 9, by + 7, ...earInner);
  c.setPixel(ox + 10, by + 7, ...outline);

  c.setPixel(ox + 21, by + 5, ...outline);
  c.setPixel(ox + 20, by + 6, ...outline);
  c.setPixel(ox + 21, by + 6, ...earInner);
  c.setPixel(ox + 22, by + 6, ...outline);
  c.setPixel(ox + 20, by + 7, ...outline);
  c.setPixel(ox + 21, by + 7, ...earInner);
  c.setPixel(ox + 22, by + 7, ...outline);

  // Head outline (top)
  for (let x = 10; x <= 20; x++) c.setPixel(ox + x, by + 7, ...outline);
  // Head sides
  for (let y = 8; y <= 13; y++) {
    c.setPixel(ox + 8, by + y, ...outline);
    c.setPixel(ox + 22, by + y, ...outline);
  }
  // Head bottom
  for (let x = 9; x <= 21; x++) c.setPixel(ox + x, by + 14, ...outline);
  // Head fill
  for (let y = 8; y <= 13; y++) {
    for (let x = 9; x <= 21; x++) {
      c.setPixel(ox + x, by + y, ...body);
    }
  }

  // Eyes
  const eyeY = by + 10;
  const blinkFrame = frame === 3 || frame === 7;
  if (blinkFrame) {
    // Blink — horizontal line
    c.setPixel(ox + 11, eyeY, ...outline);
    c.setPixel(ox + 12, eyeY, ...outline);
    c.setPixel(ox + 19, eyeY, ...outline);
    c.setPixel(ox + 18, eyeY, ...outline);
  } else {
    c.setPixel(ox + 11, eyeY, ...BLACK);
    c.setPixel(ox + 12, eyeY, ...BLACK);
    c.setPixel(ox + 11, eyeY + 1, ...BLACK);
    c.setPixel(ox + 12, eyeY + 1, ...BLACK);
    c.setPixel(ox + 19, eyeY, ...BLACK);
    c.setPixel(ox + 18, eyeY, ...BLACK);
    c.setPixel(ox + 19, eyeY + 1, ...BLACK);
    c.setPixel(ox + 18, eyeY + 1, ...BLACK);
  }

  // Nose / mouth
  c.setPixel(ox + 15, by + 12, ...PINK);
  c.setPixel(ox + 14, by + 13, ...outline);
  c.setPixel(ox + 15, by + 13, ...outline);
  c.setPixel(ox + 16, by + 13, ...outline);

  // Body outline
  for (let x = 10; x <= 20; x++) c.setPixel(ox + x, by + 15, ...outline);
  for (let y = 15; y <= 24; y++) {
    c.setPixel(ox + 9, by + y, ...outline);
    c.setPixel(ox + 21, by + y, ...outline);
  }
  for (let x = 10; x <= 20; x++) c.setPixel(ox + x, by + 25, ...outline);
  // Body fill
  for (let y = 15; y <= 24; y++) {
    for (let x = 10; x <= 20; x++) {
      c.setPixel(ox + x, by + y, ...body);
    }
  }

  // Belly highlight
  for (let y = 18; y <= 22; y++) {
    for (let x = 13; x <= 17; x++) {
      c.setPixel(ox + x, by + y, ...belly);
    }
  }

  // Legs
  // Front left
  c.fillRect(ox + 10, by + 25, 3, 3, ...body);
  c.setPixel(ox + 9, by + 25, ...outline);
  c.setPixel(ox + 9, by + 26, ...outline);
  c.setPixel(ox + 9, by + 27, ...outline);
  c.setPixel(ox + 13, by + 25, ...outline);
  c.setPixel(ox + 13, by + 26, ...outline);
  c.setPixel(ox + 13, by + 27, ...outline);
  for (let x = 9; x <= 13; x++) c.setPixel(ox + x, by + 28, ...outline);

  // Front right
  c.fillRect(ox + 18, by + 25, 3, 3, ...body);
  c.setPixel(ox + 17, by + 25, ...outline);
  c.setPixel(ox + 17, by + 26, ...outline);
  c.setPixel(ox + 17, by + 27, ...outline);
  c.setPixel(ox + 21, by + 25, ...outline);
  c.setPixel(ox + 21, by + 26, ...outline);
  c.setPixel(ox + 21, by + 27, ...outline);
  for (let x = 17; x <= 21; x++) c.setPixel(ox + x, by + 28, ...outline);

  // Tail — slight wave based on frame
  const tailWave = [0, 0, -1, -1, 0, 0, 1, 1][frame];
  c.setPixel(ox + 22, by + 22 + tailWave, ...outline);
  c.setPixel(ox + 23, by + 21 + tailWave, ...outline);
  c.setPixel(ox + 24, by + 20 + tailWave, ...outline);
  c.setPixel(ox + 25, by + 19 + tailWave, ...outline);
  c.setPixel(ox + 25, by + 18 + tailWave, ...outline);
}

function generateIdle(colors) {
  const c = new Canvas(256, 32);
  for (let f = 0; f < 8; f++) {
    drawIdleCat(c, f * 32, 0, f, colors);
  }
  return c.toPNG();
}

// ---------------------------------------------------------------------------
// Walk sprite — 8 frames, walking cat with leg movement
// ---------------------------------------------------------------------------

function drawWalkCat(c, ox, oy, frame, colors) {
  const { body, outline, belly, earInner } = colors;

  const by = oy;

  // Leg animation offsets — simulate walking
  const legPhase = frame % 4;
  const frontLeftOff = [0, -2, 0, 2][legPhase];
  const frontRightOff = [2, 0, -2, 0][legPhase];
  const bodyBob = [0, -1, 0, -1][legPhase];
  const bby = by + bodyBob;

  // Ears
  c.setPixel(ox + 9, bby + 7, ...outline);
  c.setPixel(ox + 8, bby + 8, ...outline);
  c.setPixel(ox + 9, bby + 8, ...earInner);
  c.setPixel(ox + 10, bby + 8, ...outline);
  c.setPixel(ox + 8, bby + 9, ...outline);
  c.setPixel(ox + 9, bby + 9, ...earInner);
  c.setPixel(ox + 10, bby + 9, ...outline);

  c.setPixel(ox + 21, bby + 7, ...outline);
  c.setPixel(ox + 20, bby + 8, ...outline);
  c.setPixel(ox + 21, bby + 8, ...earInner);
  c.setPixel(ox + 22, bby + 8, ...outline);
  c.setPixel(ox + 20, bby + 9, ...outline);
  c.setPixel(ox + 21, bby + 9, ...earInner);
  c.setPixel(ox + 22, bby + 9, ...outline);

  // Head
  for (let x = 10; x <= 20; x++) c.setPixel(ox + x, bby + 9, ...outline);
  for (let y = 10; y <= 15; y++) {
    c.setPixel(ox + 8, bby + y, ...outline);
    c.setPixel(ox + 22, bby + y, ...outline);
  }
  for (let x = 9; x <= 21; x++) c.setPixel(ox + x, bby + 16, ...outline);
  for (let y = 10; y <= 15; y++) {
    for (let x = 9; x <= 21; x++) {
      c.setPixel(ox + x, bby + y, ...body);
    }
  }

  // Eyes (open, focused forward)
  c.setPixel(ox + 11, bby + 12, ...BLACK);
  c.setPixel(ox + 12, bby + 12, ...BLACK);
  c.setPixel(ox + 11, bby + 13, ...BLACK);
  c.setPixel(ox + 12, bby + 13, ...BLACK);
  c.setPixel(ox + 19, bby + 12, ...BLACK);
  c.setPixel(ox + 18, bby + 12, ...BLACK);
  c.setPixel(ox + 19, bby + 13, ...BLACK);
  c.setPixel(ox + 18, bby + 13, ...BLACK);

  // Nose
  c.setPixel(ox + 15, bby + 14, ...PINK);
  c.setPixel(ox + 14, bby + 15, ...outline);
  c.setPixel(ox + 15, bby + 15, ...outline);
  c.setPixel(ox + 16, bby + 15, ...outline);

  // Body — slightly stretched horizontal for walking pose
  for (let x = 8; x <= 22; x++) c.setPixel(ox + x, bby + 17, ...outline);
  for (let y = 17; y <= 23; y++) {
    c.setPixel(ox + 7, bby + y, ...outline);
    c.setPixel(ox + 23, bby + y, ...outline);
  }
  for (let x = 8; x <= 22; x++) c.setPixel(ox + x, bby + 24, ...outline);
  for (let y = 17; y <= 23; y++) {
    for (let x = 8; x <= 22; x++) {
      c.setPixel(ox + x, bby + y, ...body);
    }
  }

  // Belly highlight
  for (let y = 19; y <= 22; y++) {
    for (let x = 12; x <= 18; x++) {
      c.setPixel(ox + x, bby + y, ...belly);
    }
  }

  // Legs with walking animation
  // Front-left leg
  const fl = bby + 24 + frontLeftOff;
  c.fillRect(ox + 9, Math.min(bby + 24, fl), 3, Math.abs(frontLeftOff) + 3, ...body);
  c.setPixel(ox + 8, bby + 24, ...outline);
  for (let dy = 0; dy < Math.abs(frontLeftOff) + 3; dy++) {
    c.setPixel(ox + 8, Math.min(bby + 24, fl) + dy, ...outline);
    c.setPixel(ox + 12, Math.min(bby + 24, fl) + dy, ...outline);
  }
  const flBottom = Math.max(bby + 26, fl + 2);
  for (let x = 8; x <= 12; x++) c.setPixel(ox + x, flBottom + 1, ...outline);

  // Front-right leg
  const fr = bby + 24 + frontRightOff;
  c.fillRect(ox + 19, Math.min(bby + 24, fr), 3, Math.abs(frontRightOff) + 3, ...body);
  for (let dy = 0; dy < Math.abs(frontRightOff) + 3; dy++) {
    c.setPixel(ox + 18, Math.min(bby + 24, fr) + dy, ...outline);
    c.setPixel(ox + 22, Math.min(bby + 24, fr) + dy, ...outline);
  }
  const frBottom = Math.max(bby + 26, fr + 2);
  for (let x = 18; x <= 22; x++) c.setPixel(ox + x, frBottom + 1, ...outline);

  // Tail
  const tailWave = [0, -1, -1, 0, 0, 1, 1, 0][frame];
  c.setPixel(ox + 24, bby + 20 + tailWave, ...outline);
  c.setPixel(ox + 25, bby + 19 + tailWave, ...outline);
  c.setPixel(ox + 26, bby + 18 + tailWave, ...outline);
  c.setPixel(ox + 27, bby + 17 + tailWave, ...outline);
}

function generateWalk(colors) {
  const c = new Canvas(256, 32);
  for (let f = 0; f < 8; f++) {
    drawWalkCat(c, f * 32, 0, f, colors);
  }
  return c.toPNG();
}

// ---------------------------------------------------------------------------
// Sleep sprite — 4 frames, curled-up cat with breathing animation
// ---------------------------------------------------------------------------

function drawSleepCat(c, ox, oy, frame, colors) {
  const { body, outline, belly, earInner } = colors;

  // Breathing animation: subtle vertical shift of the body
  // Frame 0: neutral, 1: slightly risen, 2: risen, 3: slightly risen (back down)
  const breathY = [0, -1, -1, 0][frame];
  const by = oy + breathY;

  // The cat is curled up in a ball, low to the ground.
  // Body is an oval shape centered around (ox+15, by+22), roughly 18 wide x 10 tall.
  // The tail wraps around the front.

  // --- Main body oval (dark outline) ---
  // Top edge of oval
  for (let x = 10; x <= 22; x++) c.setPixel(ox + x, by + 17, ...outline);
  // Slightly wider at middle
  for (let x = 8; x <= 24; x++) c.setPixel(ox + x, by + 18, ...outline);
  c.setPixel(ox + 7, by + 19, ...outline);
  c.setPixel(ox + 25, by + 19, ...outline);
  c.setPixel(ox + 7, by + 20, ...outline);
  c.setPixel(ox + 25, by + 20, ...outline);
  c.setPixel(ox + 7, by + 21, ...outline);
  c.setPixel(ox + 25, by + 21, ...outline);
  c.setPixel(ox + 7, by + 22, ...outline);
  c.setPixel(ox + 25, by + 22, ...outline);
  c.setPixel(ox + 7, by + 23, ...outline);
  c.setPixel(ox + 25, by + 23, ...outline);
  c.setPixel(ox + 8, by + 24, ...outline);
  c.setPixel(ox + 24, by + 24, ...outline);
  // Bottom edge
  for (let x = 9; x <= 23; x++) c.setPixel(ox + x, by + 25, ...outline);
  // Ground line
  for (let x = 7; x <= 25; x++) c.setPixel(ox + x, by + 26, ...outline);

  // --- Body fill ---
  for (let x = 10; x <= 22; x++) c.setPixel(ox + x, by + 18, ...body);
  for (let y = 19; y <= 23; y++) {
    for (let x = 8; x <= 24; x++) {
      c.setPixel(ox + x, by + y, ...body);
    }
  }
  for (let x = 9; x <= 23; x++) c.setPixel(ox + x, by + 24, ...body);

  // Belly / lighter patch in center
  for (let y = 20; y <= 23; y++) {
    for (let x = 12; x <= 20; x++) {
      c.setPixel(ox + x, by + y, ...belly);
    }
  }

  // --- Head (tucked into body, on the left side) ---
  // Small round head resting on top-left of body
  // Head outline
  for (let x = 8; x <= 14; x++) c.setPixel(ox + x, by + 14, ...outline);
  c.setPixel(ox + 7, by + 15, ...outline);
  c.setPixel(ox + 15, by + 15, ...outline);
  c.setPixel(ox + 7, by + 16, ...outline);
  c.setPixel(ox + 15, by + 16, ...outline);
  c.setPixel(ox + 7, by + 17, ...outline);
  c.setPixel(ox + 15, by + 17, ...outline);
  // Head fill
  for (let y = 15; y <= 17; y++) {
    for (let x = 8; x <= 14; x++) {
      c.setPixel(ox + x, by + y, ...body);
    }
  }
  for (let x = 8; x <= 14; x++) c.setPixel(ox + x, by + 14, ...outline);

  // --- Ears (small, on top of head) ---
  // Left ear
  c.setPixel(ox + 8, by + 13, ...outline);
  c.setPixel(ox + 7, by + 14, ...outline);
  c.setPixel(ox + 9, by + 13, ...outline);
  // Right ear
  c.setPixel(ox + 13, by + 13, ...outline);
  c.setPixel(ox + 14, by + 13, ...outline);
  c.setPixel(ox + 15, by + 14, ...outline);

  // --- Eyes closed (just a line) ---
  c.setPixel(ox + 9, by + 16, ...outline);
  c.setPixel(ox + 10, by + 16, ...outline);
  c.setPixel(ox + 12, by + 16, ...outline);
  c.setPixel(ox + 13, by + 16, ...outline);

  // --- Nose ---
  c.setPixel(ox + 11, by + 17, ...PINK);

  // --- Tail wrapping around the front/right side of body ---
  // Tail comes from the back-right, curls around to the front
  // Subtle wave per frame
  const tailWave = [0, 0, 1, 1][frame];
  c.setPixel(ox + 25, by + 21 + tailWave, ...outline);
  c.setPixel(ox + 26, by + 21 + tailWave, ...outline);
  c.setPixel(ox + 27, by + 22 + tailWave, ...outline);
  c.setPixel(ox + 27, by + 23 + tailWave, ...outline);
  c.setPixel(ox + 26, by + 24 + tailWave, ...outline);
  c.setPixel(ox + 25, by + 25, ...outline);
  c.setPixel(ox + 24, by + 25, ...outline);
  // Tail curls in front at the bottom
  c.setPixel(ox + 23, by + 25, ...outline);
  c.setPixel(ox + 22, by + 26, ...outline);
  c.setPixel(ox + 21, by + 26, ...outline);
  c.setPixel(ox + 20, by + 26, ...outline);

  // Tail inner color (fill the inside of the tail curve a bit)
  c.setPixel(ox + 26, by + 22 + tailWave, ...body);
  c.setPixel(ox + 26, by + 23 + tailWave, ...body);

  // --- Subtle breathing detail: slight body highlight shift ---
  // On frames 1-2 (risen), add a small highlight on top to suggest inhale
  if (frame === 1 || frame === 2) {
    for (let x = 14; x <= 19; x++) {
      c.setPixel(ox + x, by + 18, ...belly);
    }
  }

  // --- Paw tucked under head ---
  c.setPixel(ox + 9, by + 18, ...outline);
  c.setPixel(ox + 10, by + 18, ...outline);
  c.setPixel(ox + 11, by + 18, ...outline);
}

function generateSleep(colors) {
  const c = new Canvas(128, 32);
  for (let f = 0; f < 4; f++) {
    drawSleepCat(c, f * 32, 0, f, colors);
  }
  return c.toPNG();
}

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------

const outDir = path.join(__dirname, "src", "assets", "sprites");
fs.mkdirSync(outDir, { recursive: true });

// --- Backwards-compatible root-level sprites (orange) ---
const orangeColors = COLOR_VARIANTS.orange;

const idlePath = path.join(outDir, "idle.png");
const walkPath = path.join(outDir, "walk.png");
const sleepPath = path.join(outDir, "sleep.png");

fs.writeFileSync(idlePath, generateIdle(orangeColors));
console.log("wrote", idlePath);

fs.writeFileSync(walkPath, generateWalk(orangeColors));
console.log("wrote", walkPath);

fs.writeFileSync(sleepPath, generateSleep(orangeColors));
console.log("wrote", sleepPath);

// --- Per-variant subfolders ---
for (const [variantName, colors] of Object.entries(COLOR_VARIANTS)) {
  const variantDir = path.join(outDir, variantName);
  fs.mkdirSync(variantDir, { recursive: true });

  const vIdlePath = path.join(variantDir, "idle.png");
  const vWalkPath = path.join(variantDir, "walk.png");
  const vSleepPath = path.join(variantDir, "sleep.png");

  fs.writeFileSync(vIdlePath, generateIdle(colors));
  console.log("wrote", vIdlePath);

  fs.writeFileSync(vWalkPath, generateWalk(colors));
  console.log("wrote", vWalkPath);

  fs.writeFileSync(vSleepPath, generateSleep(colors));
  console.log("wrote", vSleepPath);
}

console.log("\ndone — all sprite sheets generated.");
