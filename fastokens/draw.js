// Shared drawing vocabulary: palette, motion curves, text helpers, layout.
//
// Two rules the whole visual obeys:
//   * nothing carries meaning by hue alone, so every colour cue is also a
//     height, a position or a label;
//   * measured numbers are drawn where they were measured, and never eased
//     into a prettier shape -- only opacity and scale are animated.

export const C = {
  bg: "#0F1011", panel: "#1B1D1E", hairline: "#34373A",
  //: The house accent. Used sparingly, so it means work.
  compute: "#CEEB13",
  cache: "#4CC9F0",
  //: Warnings sit next to the accent, so they are pushed well round the wheel
  //: from it -- a lime accent and an amber warning are too close to tell apart
  //: from the back of a room. Still never red: a ceiling is not an error.
  zone: "#FF8A1F",
  //: The Python-side share of the harness bar: neutral, not alarming.
  harness: "#A3A3A3",
  text: "#FFFFFF", dim: "#8A8A8A",
};

// The logical stage is a fixed *height* and a width that follows the screen's
// aspect ratio, so the page fills the display instead of being letterboxed
// into 16:9. Vertical positions are therefore constant and only the horizontal
// allocation moves: the readout column keeps the width its numerals were
// designed for, and whatever is left over goes to the charts, which are the
// thing a visitor is actually reading.
export const H = 1080;
export let W = 1920;

const MARGIN = 64, GAP = 32;
const READOUT_W = 468;

export const LAYOUT = {
  header: { x: 0,  y: 0,    w: W,   h: 76 },
  //: time per request against document size -- the argument, and the only
  //: chart. Runs to the bottom margin now that the footnote below it is gone.
  time:   { x: 64, y: 116,  w: 980, h: 900 },
  //: the current measurement, in words and one large numeral
  readout:{ x: 0,  y: 116,  w: READOUT_W, h: 900 },
};

/** Re-flow for a logical width. Mutates LAYOUT in place so live imports of it
 *  keep working. */
export function relayout(logicalW) {
  W = Math.round(logicalW);
  const chartW = Math.max(620, W - 2 * MARGIN - READOUT_W - GAP);

  LAYOUT.header.w = W;
  LAYOUT.time.x = MARGIN;
  LAYOUT.time.w = chartW;
  LAYOUT.readout.x = MARGIN + chartW + GAP;
  LAYOUT.readout.w = Math.max(360, W - MARGIN - (MARGIN + chartW + GAP));
}

export let projector = false;
export function setProjector(on) { projector = on; }

/** Minimum alpha rises in projector mode: washed-out rooms eat low alphas. */
export function a(alpha) {
  return projector ? Math.max(0.25, alpha) : alpha;
}
export function hair() { return projector ? 2 : 1; }
export function bgColor() { return projector ? "#0A0F14" : C.bg; }

export function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a(alpha)})`;
}

// --- motion ---------------------------------------------------------------
// State snaps linear over 60ms: machines do not ease in. Fills are linear
// because the fill *is* the data. Only decay is eased.
export const lerp = (v0, v1, t) => v0 + (v1 - v0) * Math.min(1, Math.max(0, t));
export const decay = (t) => {           // cubic-bezier(.16,1,.3,1), approximated
  const u = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - u, 3);
};
/** Exponential moving average with a real time constant, frame-rate safe. */
export function ema(prev, next, dt, tau) {
  if (!Number.isFinite(prev)) return next;
  const k = 1 - Math.exp(-dt / tau);
  return prev + (next - prev) * k;
}

// --- text -----------------------------------------------------------------
export function label(ctx, text, x, y, {
  size = 16, color = C.dim, mono = false, align = "left", track = 0.14,
  weight = 500, baseline = "alphabetic",
} = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${mono ? '"Mono", ui-monospace, monospace'
                                        : '"Grotesk", system-ui, sans-serif'}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (track && !mono) {
    // Canvas has no letter-spacing in every engine; draw per glyph when tracking.
    ctx.letterSpacing = `${(size * track).toFixed(2)}px`;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Largest size <= maxSize at which `text` fits `maxWidth`. The hero numeral
 *  grows by a digit when throughput crosses a power of ten, and must never
 *  spill into the intake lane. */
export function fitSize(ctx, text, maxWidth, maxSize, { weight = 700,
    family = '"Grotesk", system-ui, sans-serif' } = {}) {
  let size = maxSize;
  ctx.save();
  for (; size > 9; size -= 1) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  ctx.restore();
  return size;
}

export function panel(ctx, r, { title = "", note = "" } = {}) {
  ctx.fillStyle = projector ? "#0C1319" : C.panel;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = rgba(C.hairline, 1);
  ctx.lineWidth = hair();
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  if (title) label(ctx, title, r.x + 16, r.y + 26, { size: 13, color: C.dim });
  if (note) label(ctx, note, r.x + r.w - 16, r.y + 26,
                  { size: 12, color: C.dim, mono: true, align: "right", track: 0 });
}

// --- numbers --------------------------------------------------------------
export function group(n) {
  return Math.round(n).toLocaleString("en-US");
}
export function si(n, digits = 2) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + "K";
  return n.toFixed(0);
}
export function ms(v) {
  return v >= 100 ? v.toFixed(0) + "ms" : v.toFixed(1) + "ms";
}
export function bytesLabel(b) {
  if (b >= 1 << 20) return (b / (1 << 20)).toFixed(b >= 10 << 20 ? 0 : 1) + " MiB";
  if (b >= 1 << 10) return (b / (1 << 10)).toFixed(0) + " KiB";
  return b + " B";
}
