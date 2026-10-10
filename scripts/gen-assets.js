// Generates placeholder assets so a development build compiles.
// - PNG icons (a simple device mark on deep blue) written from scratch.
// - WAV chimes (calm, musical - never buzzers) written from scratch.
// Replace the PNGs with real artwork and the voice_*.wav with real recordings later.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
const SOUNDS = path.join(OUT, 'sounds');
fs.mkdirSync(SOUNDS, { recursive: true });

// ---------- PNG ----------
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
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(file, w, h, draw) {
  const px = Buffer.alloc(w * h * 4, 255);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };
  const ctx = {
    rect: (x0, y0, rw, rh, r, g, b, a) => {
      for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) set(x, y, r, g, b, a);
    },
    rrect: (x0, y0, rw, rh, rad, r, g, b, a) => {
      for (let y = y0; y < y0 + rh; y++) {
        for (let x = x0; x < x0 + rw; x++) {
          const dx = Math.min(x - x0, x0 + rw - 1 - x);
          const dy = Math.min(y - y0, y0 + rh - 1 - y);
          if (dx < rad && dy < rad) {
            const d = Math.hypot(rad - dx, rad - dy);
            if (d > rad) continue;
          }
          set(x, y, r, g, b, a);
        }
      }
    },
    circle: (cx, cy, rad, r, g, b, a) => {
      for (let y = cy - rad; y <= cy + rad; y++)
        for (let x = cx - rad; x <= cx + rad; x++)
          if (Math.hypot(x - cx, y - cy) <= rad) set(x, y, r, g, b, a);
    },
  };
  draw(ctx, w, h);

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
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  console.log('png', path.basename(file), w + 'x' + h);
}

const BLUE = [11, 60, 116];
const WHITE = [255, 255, 255];

function drawMark(ctx, w, h, scale = 1) {
  ctx.rect(0, 0, w, h, ...BLUE, 255);
  const cx = w / 2;
  const cy = h / 2;
  const s = (w * 0.5 * scale) / 100;
  // monitor body
  ctx.rrect(cx - 44 * s, cy - 34 * s, 88 * s, 58 * s, 8 * s, ...WHITE, 255);
  // screen
  ctx.rrect(cx - 36 * s, cy - 26 * s, 72 * s, 42 * s, 4 * s, ...BLUE, 255);
  // stand
  ctx.rect(cx - 6 * s, cy + 24 * s, 12 * s, 12 * s, ...WHITE, 255);
  ctx.rrect(cx - 22 * s, cy + 36 * s, 44 * s, 7 * s, 3 * s, ...WHITE, 255);
}

writePng(path.join(OUT, 'icon.png'), 1024, 1024, (ctx, w, h) => drawMark(ctx, w, h, 0.8));
writePng(path.join(OUT, 'adaptive-icon.png'), 1024, 1024, (ctx, w, h) => drawMark(ctx, w, h, 0.6));
writePng(path.join(OUT, 'splash.png'), 1024, 1024, (ctx, w, h) => drawMark(ctx, w, h, 0.7));
writePng(path.join(OUT, 'notification-icon.png'), 96, 96, (ctx, w, h) => {
  ctx.rect(0, 0, w, h, 0, 0, 0, 0);
  const cx = w / 2;
  const cy = h / 2;
  ctx.rrect(cx - 26, cy - 20, 52, 34, 4, 255, 255, 255, 255);
  ctx.rect(cx - 4, cy + 14, 8, 8, 255, 255, 255, 255);
  ctx.rrect(cx - 14, cy + 22, 28, 5, 2, 255, 255, 255, 255);
});

// ---------- WAV ----------
function writeWav(file, samples, sr = 22050) {
  const n = samples.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sr, 24);
  header.writeUInt32LE(sr * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
  console.log('wav', path.basename(file), (n / sr).toFixed(2) + 's');
}

// notes: name -> Hz
const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5, D3: 146.83, F3: 174.61 };

function tone(freq, dur, amp = 0.3, sr = 22050, decay = 0.35) {
  const n = Math.floor(dur * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, i / (0.01 * sr)) * Math.exp(-t / decay); // soft attack, gentle decay
    out[i] = Math.sin(2 * Math.PI * freq * t) * amp * env;
  }
  return out;
}

function silence(dur, sr = 22050) {
  return new Float32Array(Math.floor(dur * sr));
}

function seq(...parts) {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// Calm, musical chimes (never buzzers).
writeWav(path.join(SOUNDS, 'device_late.wav'), seq(tone(N.E5, 0.35, 0.28), tone(N.G5, 0.5, 0.28)));
writeWav(path.join(SOUNDS, 'critical_waiting.wav'), seq(tone(N.C5, 0.28, 0.3), tone(N.E5, 0.28, 0.3), tone(N.G5, 0.55, 0.3)));
writeWav(path.join(SOUNDS, 'due_tomorrow.wav'), tone(N.A4, 0.6, 0.25));
writeWav(path.join(SOUNDS, 'contract_ending.wav'), tone(N.F3, 0.9, 0.25, 22050, 0.5));
writeWav(path.join(SOUNDS, 'done.wav'), seq(tone(N.C6, 0.12, 0.3, 22050, 0.12), tone(N.E5, 0.18, 0.18)));
writeWav(path.join(SOUNDS, 'morning.wav'), seq(tone(N.C5, 0.25, 0.22), tone(N.D5, 0.25, 0.22), tone(N.E5, 0.25, 0.22), tone(N.G5, 0.5, 0.22)));
writeWav(path.join(SOUNDS, 'sync_problem.wav'), tone(N.D3, 0.7, 0.22, 22050, 0.45));
writeWav(path.join(SOUNDS, 'success.wav'), seq(tone(N.E5, 0.12, 0.28), tone(N.G5, 0.22, 0.28)));
writeWav(path.join(SOUNDS, 'error.wav'), seq(tone(N.F4, 0.9, 0.25, 22050, 0.4)));

// Spoken-line placeholders. Replace voice_*.wav with real 2-4s recordings.
const voiceFiles = [
  'voice_fr_device_late', 'voice_fr_critical',
  'voice_ar_device_late', 'voice_ar_critical',
  'voice_en_device_late', 'voice_en_critical',
];
voiceFiles.forEach((f) => writeWav(path.join(SOUNDS, f + '.wav'), seq(silence(0.15), tone(N.A4, 0.4, 0.15))));

console.log('Assets generated.');
