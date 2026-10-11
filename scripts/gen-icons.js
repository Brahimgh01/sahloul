// Draws the S-IT Hub brand mark as PNGs, from scratch (no image libraries).
//
// The mark is a "hub": one central node connected to three nodes, all white,
// sitting on a diagonal indigo -> cyan gradient. Each outer node carries a
// small status-coloured dot (green / amber / coral) which echoes the app's
// done / due / late colours.
//
//   assets/icon.png           1024x1024  full-bleed square (iOS + Android legacy)
//   assets/adaptive-icon.png  1024x1024  transparent, mark in the safe zone
//   assets/notification-icon.png 96x96   white-only, transparent
//   assets/splash.png         1284x1284  transparent mark for the splash
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

// ---------- tiny PNG writer ----------
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(file, w, h, draw) {
  const px = Buffer.alloc(w * h * 4, 0);
  draw((x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    // simple source-over composite
    const sa = a / 255;
    const da = px[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) {
      px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0;
      return;
    }
    px[i] = Math.round((r * sa + px[i] * da * (1 - sa)) / outA);
    px[i + 1] = Math.round((g * sa + px[i + 1] * da * (1 - sa)) / outA);
    px[i + 2] = Math.round((b * sa + px[i + 2] * da * (1 - sa)) / outA);
    px[i + 3] = Math.round(outA * 255);
  });

  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

// ---------- shapes (signed distance, 2px anti-alias) ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function cov(d) {
  return clamp(0.5 - d / 2, 0, 1);
}
function sdCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}
function sdSegment(x, y, ax, ay, bx, by, w) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = x - ax;
  const wy = y - ay;
  const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
  return Math.hypot(x - (ax + vx * t), y - (ay + vy * t)) - w / 2;
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const INDIGO = [79, 70, 229];
const CYAN = [6, 182, 212];
const VIOLET = [124, 58, 237];

// The hub mark in normalised 0..1 space. `scale` shrinks it around the centre.
function drawMark(put, size, scale, opts = {}) {
  const mono = !!opts.mono;
  const cx = size / 2;
  const cy = size / 2;
  const S = size * scale;
  const stroke = S * 0.085;
  const nodeR = S * 0.135;
  const centerR = S * 0.2;
  const dist = S * 0.3;

  const nodes = [
    { a: -Math.PI / 2, color: [255, 255, 255], dot: [14, 138, 74] },
    { a: -Math.PI / 2 + (2 * Math.PI) / 3, color: [255, 255, 255], dot: [232, 137, 12] },
    { a: -Math.PI / 2 + (4 * Math.PI) / 3, color: [255, 255, 255], dot: [211, 47, 47] },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // spokes
      let d = Infinity;
      for (const n of nodes) {
        const nx = cx + Math.cos(n.a) * dist;
        const ny = cy + Math.sin(n.a) * dist;
        d = Math.min(d, sdSegment(x, y, cx, cy, nx, ny, stroke));
      }
      // nodes + centre
      for (const n of nodes) {
        const nx = cx + Math.cos(n.a) * dist;
        const ny = cy + Math.sin(n.a) * dist;
        d = Math.min(d, sdCircle(x, y, nx, ny, nodeR));
      }
      d = Math.min(d, sdCircle(x, y, cx, cy, centerR));
      const a = cov(d);
      if (a > 0) put(x, y, 255, 255, 255, Math.round(a * 255));
    }
  }

  if (mono) {
    // knock a check out of the centre so the mono icon still reads.
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let d = Infinity;
        d = Math.min(d, sdSegment(x, y, cx - S * 0.085, cy + S * 0.005, cx - S * 0.02, cy + S * 0.07, stroke * 0.9));
        d = Math.min(d, sdSegment(x, y, cx - S * 0.02, cy + S * 0.07, cx + S * 0.095, cy - S * 0.075, stroke * 0.9));
        const a = cov(d);
        if (a > 0) put(x, y, 0, 0, 0, Math.round(a * 255));
      }
    }
    return;
  }

  // coloured status dots on each node
  for (const n of nodes) {
    const nx = cx + Math.cos(n.a) * dist;
    const ny = cy + Math.sin(n.a) * dist;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const a = cov(sdCircle(x, y, nx, ny, nodeR * 0.42));
        if (a > 0) put(x, y, n.dot[0], n.dot[1], n.dot[2], Math.round(a * 255));
      }
    }
  }

  // dark check in the centre
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let d = Infinity;
      d = Math.min(d, sdSegment(x, y, cx - S * 0.085, cy + S * 0.005, cx - S * 0.02, cy + S * 0.07, stroke * 1.05));
      d = Math.min(d, sdSegment(x, y, cx - S * 0.02, cy + S * 0.07, cx + S * 0.095, cy - S * 0.075, stroke * 1.05));
      const a = cov(d);
      if (a > 0) put(x, y, 30, 41, 90, Math.round(a * 255));
    }
  }
}

function gradientSquare(put, size) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = clamp((x * 0.35 + y * 0.65) / size, 0, 1);
      let c = t < 0.55 ? mix(INDIGO, VIOLET, t / 0.55) : mix(VIOLET, CYAN, (t - 0.55) / 0.45);
      // soft top-left highlight
      const g = Math.max(0, 1 - Math.hypot(x - size * 0.28, y - size * 0.22) / (size * 0.7));
      c = mix(c, [255, 255, 255], g * 0.18);
      put(x, y, Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255);
    }
  }
}

function encode(file, size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

// ---------- build ----------
function make(file, size, draw, ss = 2) {
  // supersample by drawing into a `ss`x buffer, then box-downsample.
  const big = size * ss;
  const buf = new Float64Array(big * big * 4);
  const put = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= big || y >= big) return;
    const i = ((y | 0) * big + (x | 0)) * 4;
    const sa = a / 255;
    const da = buf[i + 3] / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) return;
    buf[i] = (r * sa + buf[i] * da * (1 - sa)) / outA;
    buf[i + 1] = (g * sa + buf[i + 1] * da * (1 - sa)) / outA;
    buf[i + 2] = (b * sa + buf[i + 2] * da * (1 - sa)) / outA;
    buf[i + 3] = outA * 255;
  };
  draw(put, big, ss);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = ((y * ss + dy) * big + (x * ss + dx)) * 4;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
          a += buf[i + 3];
        }
      }
      const n = ss * ss;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return encode(file, size, out);
}

const b1 = make(path.join(OUT, 'icon.png'), 1024, (put, size, ss) => {
  gradientSquare((x, y, r, g, b, a) => put(x, y, r, g, b, a), size);
  drawMark(put, size, 0.62);
}, 2);

const b2 = make(path.join(OUT, 'adaptive-icon.png'), 1024, (put, size) => {
  drawMark(put, size, 0.5);
}, 2);

const b3 = make(path.join(OUT, 'notification-icon.png'), 96, (put, size) => {
  drawMark(put, size, 0.9, { mono: true });
}, 4);

const b4 = make(path.join(OUT, 'splash.png'), 1284, (put, size) => {
  drawMark(put, size, 0.42);
}, 2);

console.log('icon.png', b1, 'bytes');
console.log('adaptive-icon.png', b2, 'bytes');
console.log('notification-icon.png', b3, 'bytes');
console.log('splash.png', b4, 'bytes');
