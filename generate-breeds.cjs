/**
 * generate-breeds.cjs
 *
 * Generates pixel-art sprite sheets for 5 distinct cat breeds in 5 color variants.
 * Each breed has genuinely different body shapes, proportions, and features.
 * Colors are parameterized from the same COLOR_VARIANTS as generate-sprites.cjs.
 *
 * Outputs into src/assets/sprites/breeds/<breed>/<color>/
 *   idle.png  — 8 frames, 256x32
 *   walk.png  — 8 frames, 256x32
 *   sleep.png — 4 frames, 128x32
 *
 * Breeds: chonky, siamese, persian, kitten, calico
 * Colors: orange, gray, black, white, tux
 * Total: 25 sprite sets
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---------------------------------------------------------------------------
// Minimal PNG encoder (RGBA, non-interlaced) — same as generate-sprites.cjs
// ---------------------------------------------------------------------------

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([t, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const off = y * (1 + w * 4);
    raw[off] = 0;
    rgba.copy(raw, off + 1, y * w * 4, (y + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", compressed), pngChunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.buf = Buffer.alloc(w * h * 4, 0); }
  px(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.buf[i] = r; this.buf[i+1] = g; this.buf[i+2] = b; this.buf[i+3] = a;
  }
  rect(x, y, w, h, r, g, b) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.px(x+dx, y+dy, r, g, b);
  }
  hline(x, y, len, r, g, b) { for (let i = 0; i < len; i++) this.px(x+i, y, r, g, b); }
  vline(x, y, len, r, g, b) { for (let i = 0; i < len; i++) this.px(x, y+i, r, g, b); }
  // Draw outlined filled box
  box(ox, by, l, r, t, b, fill, outl) {
    this.hline(ox+l, by+t, r-l+1, ...outl);
    this.hline(ox+l, by+b, r-l+1, ...outl);
    this.vline(ox+l, by+t+1, b-t-1, ...outl);
    this.vline(ox+r, by+t+1, b-t-1, ...outl);
    for (let y = t+1; y < b; y++) for (let x = l+1; x < r; x++) this.px(ox+x, by+y, ...fill);
  }
  toPNG() { return encodePNG(this.w, this.h, this.buf); }
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const BLK = [0x00, 0x00, 0x00];
const PINK = [0xff, 0xaa, 0xaa];

function hex(s) { return [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)]; }

// ---------------------------------------------------------------------------
// Color variants (same definitions as generate-sprites.cjs)
// ---------------------------------------------------------------------------

const COLOR_VARIANTS = {
  orange: {
    body: [0xe8, 0xa3, 0x3c],
    outline: [0x8b, 0x5e, 0x1c],
    belly: [0xf0, 0xbd, 0x6e],
    earInner: [0xe8, 0xa3, 0x3c],
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
// Color derivation helpers
// ---------------------------------------------------------------------------

function midpoint(a, b) {
  return [Math.round((a[0]+b[0])/2), Math.round((a[1]+b[1])/2), Math.round((a[2]+b[2])/2)];
}

function lighten(c, amt) {
  return c.map(v => Math.min(255, Math.round(v + (255 - v) * amt)));
}

function shiftColor(c, offset) {
  return c.map(v => Math.max(0, Math.min(255, v + offset)));
}

// Breed-specific color derivation from base palette
function deriveChonkyColors(base) {
  return {
    bd: base.body, ol: base.outline, bl: base.belly,
    ei: base.earInner, st: midpoint(base.body, base.outline),
  };
}

function deriveSiameseColors(base) {
  return {
    bd: lighten(base.body, 0.6), ol: base.outline,
    bl: lighten(base.belly, 0.5), pt: base.outline,
    ei: base.outline, ey: [0x44, 0x88, 0xCC],
  };
}

function derivePersianColors(base) {
  return {
    bd: base.body, ol: base.outline, bl: base.belly,
    ei: base.earInner, fl: shiftColor(base.body, -10),
  };
}

function deriveKittenColors(base) {
  return {
    bd: base.body, ol: base.outline, bl: base.belly,
    ei: base.earInner, st: midpoint(base.body, base.outline),
  };
}

function deriveCalicoColors(base) {
  return {
    wh: [0xF0, 0xF0, 0xF0], ol: [0x77, 0x77, 0x77],
    bl: [0xFF, 0xFF, 0xFF], or: base.body,
    bk: base.outline, ei: base.earInner,
  };
}

// ---------------------------------------------------------------------------
// BREED 1: CHONKY — Very fat round cat with tabby stripes
// Body is ~20px wide, tiny head relative to body, stubby legs
// ---------------------------------------------------------------------------

function drawChonky(c, ox, oy, frame, walk, col) {
  const bob = walk !== null ? [0,-1,0,-1][walk] : 0;
  const breath = walk !== null ? 0 : [0,0,-1,-1,-1,-1,0,0][frame];
  const by = oy + breath + bob;
  const blink = frame === 3 || frame === 7;

  // Small ears
  c.px(ox+10, by+4, ...col.ol); c.px(ox+9, by+5, ...col.ol); c.px(ox+10, by+5, ...col.ei); c.px(ox+11, by+5, ...col.ol);
  c.px(ox+20, by+4, ...col.ol); c.px(ox+19, by+5, ...col.ol); c.px(ox+20, by+5, ...col.ei); c.px(ox+21, by+5, ...col.ol);

  // Wide head with cheeks (x=8..22, y=6..12)
  c.box(ox, by, 8, 22, 6, 12, col.bd, col.ol);
  // Chubby cheeks at y=8-10
  c.px(ox+7, by+8, ...col.ol); c.px(ox+7, by+9, ...col.ol); c.px(ox+7, by+10, ...col.ol);
  c.px(ox+23, by+8, ...col.ol); c.px(ox+23, by+9, ...col.ol); c.px(ox+23, by+10, ...col.ol);
  c.px(ox+8, by+8, ...col.bd); c.px(ox+8, by+9, ...col.bd); c.px(ox+8, by+10, ...col.bd);
  c.px(ox+22, by+8, ...col.bd); c.px(ox+22, by+9, ...col.bd); c.px(ox+22, by+10, ...col.bd);

  // Eyes
  if (blink) { c.px(ox+11, by+9, ...col.ol); c.px(ox+12, by+9, ...col.ol); c.px(ox+18, by+9, ...col.ol); c.px(ox+19, by+9, ...col.ol); }
  else { c.rect(ox+11, by+9, 2, 2, ...BLK); c.rect(ox+18, by+9, 2, 2, ...BLK); }

  // Nose
  c.px(ox+15, by+11, ...PINK);
  c.px(ox+14, by+12, ...col.ol); c.px(ox+15, by+12, ...col.ol); c.px(ox+16, by+12, ...col.ol);

  // VERY WIDE body (x=5..25, y=12..24)
  c.box(ox, by, 5, 25, 12, 24, col.bd, col.ol);
  // Extra width at middle
  c.px(ox+4, by+16, ...col.ol); c.px(ox+4, by+17, ...col.ol); c.px(ox+4, by+18, ...col.ol); c.px(ox+4, by+19, ...col.ol);
  c.px(ox+26, by+16, ...col.ol); c.px(ox+26, by+17, ...col.ol); c.px(ox+26, by+18, ...col.ol); c.px(ox+26, by+19, ...col.ol);
  c.px(ox+5, by+16, ...col.bd); c.px(ox+5, by+17, ...col.bd); c.px(ox+5, by+18, ...col.bd); c.px(ox+5, by+19, ...col.bd);
  c.px(ox+25, by+16, ...col.bd); c.px(ox+25, by+17, ...col.bd); c.px(ox+25, by+18, ...col.bd); c.px(ox+25, by+19, ...col.bd);

  // Big belly
  for (let y = 16; y <= 22; y++) for (let x = 10; x <= 20; x++) c.px(ox+x, by+y, ...col.bl);

  // Tabby stripes
  for (let y = 14; y <= 15; y++) { c.px(ox+8, by+y, ...col.st); c.px(ox+9, by+y, ...col.st); c.px(ox+21, by+y, ...col.st); c.px(ox+22, by+y, ...col.st); }
  for (let y = 18; y <= 19; y++) { c.px(ox+7, by+y, ...col.st); c.px(ox+8, by+y, ...col.st); c.px(ox+22, by+y, ...col.st); c.px(ox+23, by+y, ...col.st); }
  // Forehead stripes
  c.px(ox+13, by+7, ...col.st); c.px(ox+15, by+7, ...col.st); c.px(ox+17, by+7, ...col.st);

  // Stubby legs (only 2px tall)
  const lOff = walk !== null ? [0,-1,0,1][walk] : 0;
  const rOff = walk !== null ? [1,0,-1,0][walk] : 0;
  // Left
  c.rect(ox+8, by+24+lOff, 4, 2, ...col.bd);
  c.vline(ox+7, by+24+lOff, 2, ...col.ol); c.vline(ox+12, by+24+lOff, 2, ...col.ol);
  c.hline(ox+7, by+26+lOff, 6, ...col.ol);
  // Right
  c.rect(ox+18, by+24+rOff, 4, 2, ...col.bd);
  c.vline(ox+17, by+24+rOff, 2, ...col.ol); c.vline(ox+22, by+24+rOff, 2, ...col.ol);
  c.hline(ox+17, by+26+rOff, 6, ...col.ol);

  // Short thick tail
  const tw = [0,0,-1,-1,0,0,1,1][frame];
  c.px(ox+25, by+20+tw, ...col.ol); c.px(ox+26, by+19+tw, ...col.ol); c.px(ox+26, by+20+tw, ...col.bd);
  c.px(ox+27, by+19+tw, ...col.ol); c.px(ox+27, by+20+tw, ...col.ol);
}

function drawChonkySleep(c, ox, oy, frame, col) {
  const breath = [0,-1,-1,0][frame];
  const by = oy + breath;

  // Very round fat blob body
  c.hline(ox+8, by+15, 16, ...col.ol);
  for (let x = 6; x <= 25; x++) c.px(ox+x, by+16, ...col.ol);
  for (let y = 17; y <= 24; y++) { c.px(ox+4, by+y, ...col.ol); c.px(ox+27, by+y, ...col.ol); }
  for (let x = 5; x <= 26; x++) c.px(ox+x, by+25, ...col.ol);
  c.hline(ox+4, by+26, 24, ...col.ol);
  // Fill
  for (let x = 8; x <= 23; x++) c.px(ox+x, by+16, ...col.bd);
  for (let y = 17; y <= 24; y++) for (let x = 5; x <= 26; x++) c.px(ox+x, by+y, ...col.bd);
  for (let x = 5; x <= 26; x++) c.px(ox+x, by+25, ...col.bd);
  // Belly
  for (let y = 19; y <= 24; y++) for (let x = 11; x <= 21; x++) c.px(ox+x, by+y, ...col.bl);
  // Stripes
  for (let y = 18; y <= 19; y++) { c.px(ox+7, by+y, ...col.st); c.px(ox+8, by+y, ...col.st); c.px(ox+23, by+y, ...col.st); c.px(ox+24, by+y, ...col.st); }

  // Head tucked on left
  c.hline(ox+5, by+12, 9, ...col.ol);
  c.vline(ox+4, by+13, 3, ...col.ol); c.vline(ox+14, by+13, 3, ...col.ol);
  for (let y = 13; y <= 15; y++) for (let x = 5; x <= 13; x++) c.px(ox+x, by+y, ...col.bd);
  // Ears
  c.px(ox+6, by+11, ...col.ol); c.px(ox+7, by+11, ...col.ol); c.px(ox+12, by+11, ...col.ol); c.px(ox+13, by+11, ...col.ol);
  // Closed eyes
  c.px(ox+7, by+14, ...col.ol); c.px(ox+8, by+14, ...col.ol); c.px(ox+11, by+14, ...col.ol); c.px(ox+12, by+14, ...col.ol);
  c.px(ox+10, by+15, ...PINK);

  // Tail wraps
  const tw = [0,0,1,1][frame];
  c.px(ox+27, by+21+tw, ...col.ol); c.px(ox+28, by+22+tw, ...col.ol);
  c.px(ox+28, by+23+tw, ...col.ol); c.px(ox+27, by+24, ...col.ol);
  c.px(ox+26, by+25, ...col.ol);
}

// ---------------------------------------------------------------------------
// BREED 2: SIAMESE — Slim, elegant, cream body with dark chocolate points
// Large pointed ears, narrow body, long legs, blue eyes
// ---------------------------------------------------------------------------

function drawSiamese(c, ox, oy, frame, walk, col) {
  const bob = walk !== null ? [0,-1,0,-1][walk] : 0;
  const breath = walk !== null ? 0 : [0,0,-1,-1,-1,-1,0,0][frame];
  const by = oy + breath + bob;
  const blink = frame === 3 || frame === 7;

  // Large pointed ears (4 rows tall, dark)
  // Left ear
  c.px(ox+9, by+2, ...col.ol);
  c.px(ox+8, by+3, ...col.ol); c.px(ox+9, by+3, ...col.ei); c.px(ox+10, by+3, ...col.ol);
  c.px(ox+7, by+4, ...col.ol); c.px(ox+8, by+4, ...col.ei); c.px(ox+9, by+4, ...col.ei); c.px(ox+10, by+4, ...col.ei); c.px(ox+11, by+4, ...col.ol);
  c.px(ox+7, by+5, ...col.ol); c.px(ox+8, by+5, ...col.ei); c.px(ox+9, by+5, ...col.ei); c.px(ox+10, by+5, ...col.ei); c.px(ox+11, by+5, ...col.ol);
  // Right ear
  c.px(ox+21, by+2, ...col.ol);
  c.px(ox+20, by+3, ...col.ol); c.px(ox+21, by+3, ...col.ei); c.px(ox+22, by+3, ...col.ol);
  c.px(ox+19, by+4, ...col.ol); c.px(ox+20, by+4, ...col.ei); c.px(ox+21, by+4, ...col.ei); c.px(ox+22, by+4, ...col.ei); c.px(ox+23, by+4, ...col.ol);
  c.px(ox+19, by+5, ...col.ol); c.px(ox+20, by+5, ...col.ei); c.px(ox+21, by+5, ...col.ei); c.px(ox+22, by+5, ...col.ei); c.px(ox+23, by+5, ...col.ol);

  // Wedge-shaped head (x=9..21, y=6..13)
  c.box(ox, by, 9, 21, 6, 13, col.bd, col.ol);

  // Dark face mask around nose/mouth
  for (let x = 12; x <= 18; x++) c.px(ox+x, by+11, ...col.pt);
  for (let x = 13; x <= 17; x++) c.px(ox+x, by+12, ...col.pt);

  // Blue eyes
  if (blink) { c.px(ox+11, by+9, ...col.ol); c.px(ox+12, by+9, ...col.ol); c.px(ox+18, by+9, ...col.ol); c.px(ox+19, by+9, ...col.ol); }
  else { c.rect(ox+11, by+9, 2, 2, ...col.ey); c.rect(ox+18, by+9, 2, 2, ...col.ey); }

  // Nose
  c.px(ox+15, by+11, ...PINK);
  c.px(ox+14, by+12, ...col.ol); c.px(ox+15, by+12, ...col.ol); c.px(ox+16, by+12, ...col.ol);

  // Slim body (x=10..20, y=13..21) — narrower than normal
  c.box(ox, by, 10, 20, 13, 21, col.bd, col.ol);
  // Light belly
  for (let y = 16; y <= 19; y++) for (let x = 13; x <= 17; x++) c.px(ox+x, by+y, ...col.bl);

  // Long thin legs (4px tall, thin)
  const lOff = walk !== null ? [0,-2,0,2][walk] : 0;
  const rOff = walk !== null ? [2,0,-2,0][walk] : 0;

  // Left leg
  for (let dy = 0; dy < 5; dy++) { c.px(ox+11, by+21+lOff+dy, ...col.ol); c.px(ox+14, by+21+lOff+dy, ...col.ol); }
  for (let dy = 0; dy < 5; dy++) { c.px(ox+12, by+21+lOff+dy, ...col.bd); c.px(ox+13, by+21+lOff+dy, ...col.bd); }
  c.hline(ox+11, by+26+lOff, 4, ...col.ol);
  // Dark paw
  c.px(ox+12, by+25+lOff, ...col.pt); c.px(ox+13, by+25+lOff, ...col.pt);

  // Right leg
  for (let dy = 0; dy < 5; dy++) { c.px(ox+17, by+21+rOff+dy, ...col.ol); c.px(ox+20, by+21+rOff+dy, ...col.ol); }
  for (let dy = 0; dy < 5; dy++) { c.px(ox+18, by+21+rOff+dy, ...col.bd); c.px(ox+19, by+21+rOff+dy, ...col.bd); }
  c.hline(ox+17, by+26+rOff, 4, ...col.ol);
  // Dark paw
  c.px(ox+18, by+25+rOff, ...col.pt); c.px(ox+19, by+25+rOff, ...col.pt);

  // Long thin tail with dark tip
  const tw = [0,-1,-1,0,0,1,1,0][frame];
  c.px(ox+21, by+18+tw, ...col.ol); c.px(ox+22, by+17+tw, ...col.ol);
  c.px(ox+23, by+16+tw, ...col.ol); c.px(ox+24, by+15+tw, ...col.ol);
  c.px(ox+25, by+14+tw, ...col.pt); c.px(ox+26, by+13+tw, ...col.pt);
}

function drawSiameseSleep(c, ox, oy, frame, col) {
  const breath = [0,-1,-1,0][frame];
  const by = oy + breath;

  // Elegant long curl — body is oval, narrower than chonky
  c.hline(ox+9, by+16, 14, ...col.ol);
  for (let y = 17; y <= 23; y++) { c.px(ox+7, by+y, ...col.ol); c.px(ox+24, by+y, ...col.ol); }
  c.hline(ox+8, by+24, 16, ...col.ol);
  c.hline(ox+7, by+25, 18, ...col.ol);
  // Fill
  for (let y = 17; y <= 23; y++) for (let x = 8; x <= 23; x++) c.px(ox+x, by+y, ...col.bd);
  for (let x = 8; x <= 23; x++) c.px(ox+x, by+24, ...col.bd);
  // Belly
  for (let y = 19; y <= 23; y++) for (let x = 12; x <= 19; x++) c.px(ox+x, by+y, ...col.bl);

  // Head on left with dark mask
  c.hline(ox+6, by+13, 9, ...col.ol);
  c.vline(ox+5, by+14, 3, ...col.ol); c.vline(ox+15, by+14, 3, ...col.ol);
  for (let y = 14; y <= 16; y++) for (let x = 6; x <= 14; x++) c.px(ox+x, by+y, ...col.bd);
  // Dark mask on face
  for (let x = 8; x <= 12; x++) c.px(ox+x, by+16, ...col.pt);
  // Dark ears
  c.px(ox+6, by+12, ...col.pt); c.px(ox+7, by+12, ...col.pt); c.px(ox+8, by+12, ...col.pt);
  c.px(ox+12, by+12, ...col.pt); c.px(ox+13, by+12, ...col.pt); c.px(ox+14, by+12, ...col.pt);
  // Closed eyes
  c.px(ox+8, by+15, ...col.ol); c.px(ox+9, by+15, ...col.ol); c.px(ox+11, by+15, ...col.ol); c.px(ox+12, by+15, ...col.ol);
  c.px(ox+10, by+16, ...PINK);

  // Long dark-tipped tail curling around
  const tw = [0,0,1,1][frame];
  c.px(ox+24, by+19+tw, ...col.ol); c.px(ox+25, by+19+tw, ...col.ol);
  c.px(ox+26, by+20+tw, ...col.ol); c.px(ox+27, by+21+tw, ...col.pt);
  c.px(ox+27, by+22+tw, ...col.pt); c.px(ox+26, by+23, ...col.pt);
  c.px(ox+25, by+24, ...col.pt);

  // Dark paw visible
  c.px(ox+8, by+17, ...col.pt); c.px(ox+9, by+17, ...col.pt);
}

// ---------------------------------------------------------------------------
// BREED 3: PERSIAN — Fluffy cat, very round, flat face
// Fuzzy outline, small hidden ears, big round eyes
// ---------------------------------------------------------------------------

function drawPersian(c, ox, oy, frame, walk, col) {
  const bob = walk !== null ? [0,-1,0,-1][walk] : 0;
  const breath = walk !== null ? 0 : [0,0,-1,-1,-1,-1,0,0][frame];
  const by = oy + breath + bob;
  const blink = frame === 3 || frame === 7;

  // Tiny ears (barely visible above fluffy head)
  c.px(ox+9, by+4, ...col.ol); c.px(ox+10, by+4, ...col.ol);
  c.px(ox+9, by+5, ...col.ol); c.px(ox+10, by+5, ...col.ei); c.px(ox+11, by+5, ...col.ol);
  c.px(ox+20, by+4, ...col.ol); c.px(ox+21, by+4, ...col.ol);
  c.px(ox+19, by+5, ...col.ol); c.px(ox+20, by+5, ...col.ei); c.px(ox+21, by+5, ...col.ol);

  // Very round fluffy head (x=7..23, y=5..14) — wider and taller
  c.box(ox, by, 7, 23, 5, 14, col.bd, col.ol);
  // Extra fluff pixels around head
  c.px(ox+6, by+7, ...col.fl); c.px(ox+6, by+8, ...col.fl); c.px(ox+6, by+9, ...col.fl);
  c.px(ox+24, by+7, ...col.fl); c.px(ox+24, by+8, ...col.fl); c.px(ox+24, by+9, ...col.fl);
  c.px(ox+8, by+5, ...col.fl); c.px(ox+12, by+5, ...col.fl); c.px(ox+18, by+5, ...col.fl); c.px(ox+22, by+5, ...col.fl);

  // FLAT face — eyes are positioned higher and closer, nose higher
  // Big round eyes (slightly larger than normal)
  if (blink) {
    c.hline(ox+10, by+9, 3, ...col.ol); c.hline(ox+17, by+9, 3, ...col.ol);
  } else {
    c.rect(ox+10, by+8, 3, 3, ...BLK);
    // Eye shine
    c.px(ox+11, by+8, 255, 255, 255);
    c.rect(ox+17, by+8, 3, 3, ...BLK);
    c.px(ox+18, by+8, 255, 255, 255);
  }

  // Small nose right between eyes (flat face = nose higher)
  c.px(ox+14, by+10, ...PINK); c.px(ox+15, by+10, ...PINK); c.px(ox+16, by+10, ...PINK);
  c.px(ox+14, by+11, ...col.ol); c.px(ox+15, by+11, ...col.ol); c.px(ox+16, by+11, ...col.ol);

  // Round fluffy body (x=6..24, y=14..24)
  c.box(ox, by, 6, 24, 14, 24, col.bd, col.ol);
  // Fluff pixels on body edges
  c.px(ox+5, by+16, ...col.fl); c.px(ox+5, by+17, ...col.fl); c.px(ox+5, by+18, ...col.fl); c.px(ox+5, by+19, ...col.fl);
  c.px(ox+25, by+16, ...col.fl); c.px(ox+25, by+17, ...col.fl); c.px(ox+25, by+18, ...col.fl); c.px(ox+25, by+19, ...col.fl);
  c.px(ox+8, by+24, ...col.fl); c.px(ox+12, by+24, ...col.fl); c.px(ox+18, by+24, ...col.fl); c.px(ox+22, by+24, ...col.fl);

  // Belly
  for (let y = 17; y <= 22; y++) for (let x = 11; x <= 19; x++) c.px(ox+x, by+y, ...col.bl);

  // Short legs hidden under fluff
  const lOff = walk !== null ? [0,-1,0,1][walk] : 0;
  const rOff = walk !== null ? [1,0,-1,0][walk] : 0;
  // Left
  c.rect(ox+9, by+24+lOff, 4, 2, ...col.bd);
  c.vline(ox+8, by+24+lOff, 2, ...col.ol); c.vline(ox+13, by+24+lOff, 2, ...col.ol);
  c.hline(ox+8, by+26+lOff, 6, ...col.ol);
  // Right
  c.rect(ox+17, by+24+rOff, 4, 2, ...col.bd);
  c.vline(ox+16, by+24+rOff, 2, ...col.ol); c.vline(ox+21, by+24+rOff, 2, ...col.ol);
  c.hline(ox+16, by+26+rOff, 6, ...col.ol);

  // Big fluffy tail
  const tw = [0,0,-1,-1,0,0,1,1][frame];
  c.px(ox+24, by+18+tw, ...col.ol); c.px(ox+25, by+17+tw, ...col.ol);
  c.px(ox+25, by+18+tw, ...col.bd); c.px(ox+26, by+17+tw, ...col.ol);
  c.px(ox+26, by+16+tw, ...col.ol); c.px(ox+27, by+16+tw, ...col.ol);
  c.px(ox+26, by+18+tw, ...col.fl); // fluff on tail
  c.px(ox+27, by+17+tw, ...col.fl);
}

function drawPersianSleep(c, ox, oy, frame, col) {
  const breath = [0,-1,-1,0][frame];
  const by = oy + breath;

  // Big fluffy ball
  c.hline(ox+8, by+14, 16, ...col.ol);
  for (let x = 6; x <= 25; x++) c.px(ox+x, by+15, ...col.ol);
  for (let y = 16; y <= 23; y++) { c.px(ox+5, by+y, ...col.ol); c.px(ox+26, by+y, ...col.ol); }
  for (let x = 6; x <= 25; x++) c.px(ox+x, by+24, ...col.ol);
  c.hline(ox+5, by+25, 22, ...col.ol);
  // Fill
  for (let x = 8; x <= 23; x++) c.px(ox+x, by+15, ...col.bd);
  for (let y = 16; y <= 23; y++) for (let x = 6; x <= 25; x++) c.px(ox+x, by+y, ...col.bd);
  for (let x = 6; x <= 25; x++) c.px(ox+x, by+24, ...col.bd);
  // Belly
  for (let y = 18; y <= 23; y++) for (let x = 11; x <= 20; x++) c.px(ox+x, by+y, ...col.bl);
  // Fluff detail pixels
  c.px(ox+4, by+17, ...col.fl); c.px(ox+4, by+18, ...col.fl); c.px(ox+4, by+19, ...col.fl);
  c.px(ox+27, by+17, ...col.fl); c.px(ox+27, by+18, ...col.fl); c.px(ox+27, by+19, ...col.fl);
  c.px(ox+7, by+14, ...col.fl); c.px(ox+12, by+14, ...col.fl); c.px(ox+18, by+14, ...col.fl); c.px(ox+24, by+14, ...col.fl);

  // Round head tucked on left
  c.hline(ox+5, by+11, 10, ...col.ol);
  c.vline(ox+4, by+12, 4, ...col.ol); c.vline(ox+15, by+12, 4, ...col.ol);
  for (let y = 12; y <= 15; y++) for (let x = 5; x <= 14; x++) c.px(ox+x, by+y, ...col.bd);
  // Fluff around head
  c.px(ox+3, by+12, ...col.fl); c.px(ox+3, by+13, ...col.fl);
  c.px(ox+6, by+10, ...col.fl); c.px(ox+13, by+10, ...col.fl);
  // Tiny ears
  c.px(ox+6, by+10, ...col.ol); c.px(ox+7, by+10, ...col.ol);
  c.px(ox+13, by+10, ...col.ol); c.px(ox+14, by+10, ...col.ol);
  // Closed eyes (bigger)
  c.hline(ox+7, by+13, 2, ...col.ol); c.hline(ox+11, by+13, 2, ...col.ol);
  c.px(ox+9, by+14, ...PINK); c.px(ox+10, by+14, ...PINK);

  // Fluffy tail
  const tw = [0,0,1,1][frame];
  c.px(ox+26, by+19+tw, ...col.ol); c.px(ox+27, by+20+tw, ...col.ol);
  c.px(ox+27, by+21+tw, ...col.fl); c.px(ox+28, by+20+tw, ...col.fl);
  c.px(ox+28, by+21+tw, ...col.ol); c.px(ox+27, by+22+tw, ...col.ol);
  c.px(ox+26, by+23, ...col.ol); c.px(ox+25, by+24, ...col.ol);
}

// ---------------------------------------------------------------------------
// BREED 4: KITTEN — Tiny cat with huge head and eyes
// Drawn smaller within frame, proportionally huge head
// ---------------------------------------------------------------------------

function drawKitten(c, ox, oy, frame, walk, col) {
  const bob = walk !== null ? [0,-1,0,-1][walk] : 0;
  const breath = walk !== null ? 0 : [0,0,-1,-1,-1,-1,0,0][frame];
  const by = oy + breath + bob;
  const blink = frame === 3 || frame === 7;

  // Large ears (proportionally bigger)
  // Left ear
  c.px(ox+9, by+4, ...col.ol);
  c.px(ox+8, by+5, ...col.ol); c.px(ox+9, by+5, ...col.ei); c.px(ox+10, by+5, ...col.ol);
  c.px(ox+7, by+6, ...col.ol); c.px(ox+8, by+6, ...col.ei); c.px(ox+9, by+6, ...col.ei); c.px(ox+10, by+6, ...col.ei); c.px(ox+11, by+6, ...col.ol);
  // Right ear
  c.px(ox+21, by+4, ...col.ol);
  c.px(ox+20, by+5, ...col.ol); c.px(ox+21, by+5, ...col.ei); c.px(ox+22, by+5, ...col.ol);
  c.px(ox+19, by+6, ...col.ol); c.px(ox+20, by+6, ...col.ei); c.px(ox+21, by+6, ...col.ei); c.px(ox+22, by+6, ...col.ei); c.px(ox+23, by+6, ...col.ol);

  // HUGE head (x=8..22, y=7..16) — takes up much of the frame
  c.box(ox, by, 8, 22, 7, 16, col.bd, col.ol);

  // HUGE eyes (3x3 each!)
  if (blink) {
    c.hline(ox+10, by+11, 3, ...col.ol); c.hline(ox+17, by+11, 3, ...col.ol);
  } else {
    c.rect(ox+10, by+10, 3, 3, ...BLK);
    // Big sparkly eye shine
    c.px(ox+11, by+10, 255, 255, 255);
    c.px(ox+10, by+10, 60, 60, 60); // slight color in eye
    c.rect(ox+17, by+10, 3, 3, ...BLK);
    c.px(ox+18, by+10, 255, 255, 255);
    c.px(ox+17, by+10, 60, 60, 60);
  }

  // Tiny nose
  c.px(ox+15, by+13, ...PINK);
  c.px(ox+14, by+14, ...col.ol); c.px(ox+15, by+14, ...col.ol); c.px(ox+16, by+14, ...col.ol);

  // Tabby markings on forehead
  c.px(ox+13, by+8, ...col.st); c.px(ox+15, by+8, ...col.st); c.px(ox+17, by+8, ...col.st);

  // Small body (x=11..19, y=16..22) — tiny!
  c.box(ox, by, 11, 19, 16, 22, col.bd, col.ol);
  // Belly
  for (let y = 18; y <= 21; y++) for (let x = 13; x <= 17; x++) c.px(ox+x, by+y, ...col.bl);

  // Short thin legs
  const lOff = walk !== null ? [0,-1,0,1][walk] : 0;
  const rOff = walk !== null ? [1,0,-1,0][walk] : 0;
  // Left
  c.rect(ox+12, by+22+lOff, 2, 3, ...col.bd);
  c.vline(ox+11, by+22+lOff, 3, ...col.ol); c.vline(ox+14, by+22+lOff, 3, ...col.ol);
  c.hline(ox+11, by+25+lOff, 4, ...col.ol);
  // Right
  c.rect(ox+17, by+22+rOff, 2, 3, ...col.bd);
  c.vline(ox+16, by+22+rOff, 3, ...col.ol); c.vline(ox+19, by+22+rOff, 3, ...col.ol);
  c.hline(ox+16, by+25+rOff, 4, ...col.ol);

  // Thin tail sticking up playfully
  const tw = [0,-1,-1,0,0,1,1,0][frame];
  c.px(ox+20, by+19+tw, ...col.ol); c.px(ox+21, by+18+tw, ...col.ol);
  c.px(ox+22, by+17+tw, ...col.ol); c.px(ox+23, by+16+tw, ...col.ol);
  c.px(ox+24, by+15+tw, ...col.ol);
}

function drawKittenSleep(c, ox, oy, frame, col) {
  const breath = [0,-1,-1,0][frame];
  const by = oy + breath;

  // Tiny curled ball
  c.hline(ox+10, by+17, 12, ...col.ol);
  for (let y = 18; y <= 23; y++) { c.px(ox+8, by+y, ...col.ol); c.px(ox+23, by+y, ...col.ol); }
  c.hline(ox+9, by+24, 14, ...col.ol);
  c.hline(ox+8, by+25, 16, ...col.ol);
  // Fill
  for (let y = 18; y <= 23; y++) for (let x = 9; x <= 22; x++) c.px(ox+x, by+y, ...col.bd);
  for (let x = 9; x <= 22; x++) c.px(ox+x, by+24, ...col.bd);
  // Belly
  for (let y = 20; y <= 23; y++) for (let x = 13; x <= 18; x++) c.px(ox+x, by+y, ...col.bl);

  // Big head (proportionally huge even when sleeping)
  c.hline(ox+7, by+12, 10, ...col.ol);
  c.vline(ox+6, by+13, 5, ...col.ol); c.vline(ox+17, by+13, 5, ...col.ol);
  for (let y = 13; y <= 17; y++) for (let x = 7; x <= 16; x++) c.px(ox+x, by+y, ...col.bd);
  // Big ears
  c.px(ox+7, by+11, ...col.ol); c.px(ox+8, by+11, ...col.ol); c.px(ox+9, by+11, ...col.ol);
  c.px(ox+14, by+11, ...col.ol); c.px(ox+15, by+11, ...col.ol); c.px(ox+16, by+11, ...col.ol);
  c.px(ox+8, by+12, ...col.ei); c.px(ox+15, by+12, ...col.ei);
  // Closed eyes (still big)
  c.hline(ox+8, by+15, 3, ...col.ol); c.hline(ox+13, by+15, 3, ...col.ol);
  c.px(ox+11, by+16, ...PINK);

  // Tail tucked
  const tw = [0,0,1,1][frame];
  c.px(ox+23, by+20+tw, ...col.ol); c.px(ox+24, by+21+tw, ...col.ol);
  c.px(ox+24, by+22+tw, ...col.ol); c.px(ox+23, by+23, ...col.ol);
}

// ---------------------------------------------------------------------------
// BREED 5: CALICO — White base with colored patches
// Normal proportions but multi-colored
// ---------------------------------------------------------------------------

function drawCalico(c, ox, oy, frame, walk, col) {
  const bob = walk !== null ? [0,-1,0,-1][walk] : 0;
  const breath = walk !== null ? 0 : [0,0,-1,-1,-1,-1,0,0][frame];
  const by = oy + breath + bob;
  const blink = frame === 3 || frame === 7;

  // Ears — left is primary patch color, right is secondary
  c.px(ox+9, by+5, ...col.ol);
  c.px(ox+8, by+6, ...col.ol); c.px(ox+9, by+6, ...col.or); c.px(ox+10, by+6, ...col.ol);
  c.px(ox+8, by+7, ...col.ol); c.px(ox+9, by+7, ...col.or); c.px(ox+10, by+7, ...col.ol);
  c.px(ox+21, by+5, ...col.ol);
  c.px(ox+20, by+6, ...col.ol); c.px(ox+21, by+6, ...col.bk); c.px(ox+22, by+6, ...col.ol);
  c.px(ox+20, by+7, ...col.ol); c.px(ox+21, by+7, ...col.bk); c.px(ox+22, by+7, ...col.ol);

  // Head (x=8..22, y=7..14) — white base
  c.box(ox, by, 8, 22, 7, 14, col.wh, col.ol);

  // Primary patch on left side of head
  for (let y = 8; y <= 10; y++) for (let x = 9; x <= 12; x++) c.px(ox+x, by+y, ...col.or);
  // Secondary patch on right side of head
  for (let y = 8; y <= 10; y++) for (let x = 18; x <= 21; x++) c.px(ox+x, by+y, ...col.bk);

  // Eyes (green-ish — breed characteristic)
  const eyeCol = [0x55, 0xAA, 0x55];
  if (blink) {
    c.px(ox+11, by+10, ...col.ol); c.px(ox+12, by+10, ...col.ol);
    c.px(ox+19, by+10, ...col.ol); c.px(ox+18, by+10, ...col.ol);
  } else {
    c.rect(ox+11, by+10, 2, 2, ...eyeCol);
    c.rect(ox+18, by+10, 2, 2, ...eyeCol);
  }

  // Nose
  c.px(ox+15, by+12, ...PINK);
  c.px(ox+14, by+13, ...col.ol); c.px(ox+15, by+13, ...col.ol); c.px(ox+16, by+13, ...col.ol);

  // Body (x=9..21, y=14..24) — white base
  c.box(ox, by, 9, 21, 14, 24, col.wh, col.ol);
  // White belly
  for (let y = 18; y <= 22; y++) for (let x = 13; x <= 17; x++) c.px(ox+x, by+y, ...col.bl);

  // Primary patches on body left
  for (let y = 15; y <= 18; y++) for (let x = 10; x <= 13; x++) c.px(ox+x, by+y, ...col.or);
  // Secondary patches on body right
  for (let y = 15; y <= 18; y++) for (let x = 18; x <= 20; x++) c.px(ox+x, by+y, ...col.bk);
  // Small primary spot on belly
  c.px(ox+14, by+20, ...col.or); c.px(ox+15, by+20, ...col.or);
  // Small secondary spot
  c.px(ox+16, by+21, ...col.bk); c.px(ox+17, by+21, ...col.bk);

  // Legs
  const lOff = walk !== null ? [0,-1,0,1][walk] : 0;
  const rOff = walk !== null ? [1,0,-1,0][walk] : 0;
  // Left — primary patch paw
  c.rect(ox+10, by+24+lOff, 3, 3, ...col.or);
  c.vline(ox+9, by+24+lOff, 3, ...col.ol); c.vline(ox+13, by+24+lOff, 3, ...col.ol);
  c.hline(ox+9, by+27+lOff, 5, ...col.ol);
  // Right — secondary patch paw
  c.rect(ox+18, by+24+rOff, 3, 3, ...col.bk);
  c.vline(ox+17, by+24+rOff, 3, ...col.ol); c.vline(ox+21, by+24+rOff, 3, ...col.ol);
  c.hline(ox+17, by+27+rOff, 5, ...col.ol);

  // Tail — mixed colors
  const tw = [0,0,-1,-1,0,0,1,1][frame];
  c.px(ox+22, by+21+tw, ...col.ol); c.px(ox+23, by+20+tw, ...col.bk);
  c.px(ox+24, by+19+tw, ...col.or); c.px(ox+25, by+18+tw, ...col.bk);
  c.px(ox+25, by+17+tw, ...col.ol);
}

function drawCalicoSleep(c, ox, oy, frame, col) {
  const breath = [0,-1,-1,0][frame];
  const by = oy + breath;

  // Normal-sized curl body
  c.hline(ox+9, by+17, 14, ...col.ol);
  for (let y = 18; y <= 23; y++) { c.px(ox+7, by+y, ...col.ol); c.px(ox+24, by+y, ...col.ol); }
  c.hline(ox+8, by+24, 16, ...col.ol);
  c.hline(ox+7, by+25, 18, ...col.ol);
  // Fill white
  for (let y = 18; y <= 23; y++) for (let x = 8; x <= 23; x++) c.px(ox+x, by+y, ...col.wh);
  for (let x = 8; x <= 23; x++) c.px(ox+x, by+24, ...col.wh);
  // Belly
  for (let y = 20; y <= 23; y++) for (let x = 13; x <= 19; x++) c.px(ox+x, by+y, ...col.bl);

  // Primary patches on body
  for (let y = 18; y <= 20; y++) for (let x = 9; x <= 12; x++) c.px(ox+x, by+y, ...col.or);
  // Secondary patches
  for (let y = 18; y <= 20; y++) for (let x = 20; x <= 22; x++) c.px(ox+x, by+y, ...col.bk);
  c.px(ox+15, by+22, ...col.bk); c.px(ox+16, by+22, ...col.bk);

  // Head
  c.hline(ox+7, by+14, 8, ...col.ol);
  c.vline(ox+6, by+15, 3, ...col.ol); c.vline(ox+15, by+15, 3, ...col.ol);
  for (let y = 15; y <= 17; y++) for (let x = 7; x <= 14; x++) c.px(ox+x, by+y, ...col.wh);
  // Primary patch on head
  for (let x = 8; x <= 10; x++) c.px(ox+x, by+15, ...col.or);
  c.px(ox+9, by+16, ...col.or);
  // Secondary patch
  for (let x = 12; x <= 14; x++) c.px(ox+x, by+15, ...col.bk);
  // Ears
  c.px(ox+7, by+13, ...col.or); c.px(ox+8, by+13, ...col.or);
  c.px(ox+13, by+13, ...col.bk); c.px(ox+14, by+13, ...col.bk);
  // Closed eyes
  c.px(ox+9, by+16, ...col.ol); c.px(ox+10, by+16, ...col.ol);
  c.px(ox+12, by+16, ...col.ol); c.px(ox+13, by+16, ...col.ol);
  c.px(ox+11, by+17, ...PINK);

  // Mixed tail
  const tw = [0,0,1,1][frame];
  c.px(ox+24, by+20+tw, ...col.bk); c.px(ox+25, by+21+tw, ...col.or);
  c.px(ox+25, by+22+tw, ...col.bk); c.px(ox+24, by+23, ...col.ol);
  c.px(ox+23, by+24, ...col.or);
}

// ---------------------------------------------------------------------------
// Generate all breed × color sprite sets
// ---------------------------------------------------------------------------

const BREEDS = {
  chonky:  { draw: drawChonky,  sleep: drawChonkySleep,  derive: deriveChonkyColors },
  siamese: { draw: drawSiamese, sleep: drawSiameseSleep, derive: deriveSiameseColors },
  persian: { draw: drawPersian, sleep: drawPersianSleep, derive: derivePersianColors },
  kitten:  { draw: drawKitten,  sleep: drawKittenSleep,  derive: deriveKittenColors },
  calico:  { draw: drawCalico,  sleep: drawCalicoSleep,  derive: deriveCalicoColors },
};

const outDir = path.join(__dirname, "src", "assets", "sprites", "breeds");

for (const [breedId, breed] of Object.entries(BREEDS)) {
  for (const [colorId, baseColors] of Object.entries(COLOR_VARIANTS)) {
    const col = breed.derive(baseColors);
    const dir = path.join(outDir, breedId, colorId);
    fs.mkdirSync(dir, { recursive: true });

    // Idle: 8 frames, 256x32 — standing with breathing, no walk
    const idle = new Canvas(256, 32);
    for (let f = 0; f < 8; f++) breed.draw(idle, f * 32, 0, f, null, col);
    fs.writeFileSync(path.join(dir, "idle.png"), idle.toPNG());

    // Walk: 8 frames, 256x32 — standing with walk leg phase
    const walk = new Canvas(256, 32);
    for (let f = 0; f < 8; f++) breed.draw(walk, f * 32, 0, f, f % 4, col);
    fs.writeFileSync(path.join(dir, "walk.png"), walk.toPNG());

    // Sleep: 4 frames, 128x32 — curled up
    const sleep = new Canvas(128, 32);
    for (let f = 0; f < 4; f++) breed.sleep(sleep, f * 32, 0, f, col);
    fs.writeFileSync(path.join(dir, "sleep.png"), sleep.toPNG());

    console.log(`wrote breeds/${breedId}/${colorId}/ (idle, walk, sleep)`);
  }
}

console.log("\ndone — all breed sprites generated (25 sets).");
