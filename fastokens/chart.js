// The chart, and why it is shaped the way it is.
//
// TIME PER REQUEST is the argument: how long one document takes to tokenize,
// against how big it is. HuggingFace `tokenizers` climbs a straight line
// because it is serial -- twice the document, twice the time. fastokens stays
// flat along the bottom. The shaded band between them *is* the delta, and it
// opens up left to right as the documents grow. That band is the whole demo.
//
// The y axis is linear and starts at zero, on purpose. A log axis would turn
// the climb into a gentle slope and flatten exactly the thing being shown, and
// a non-zero floor would exaggerate it. Neither is necessary: the honest shape
// is already dramatic.
//
// The x axis is context length, logarithmic, because the documents span four
// orders of magnitude -- 137 tokens to 1.2 million -- and a linear axis would
// pile every short one against the left edge. Its range is set per pass from
// that pass's own documents.

import { C, LAYOUT, rgba, hair, label, panel } from "./draw.js";

const PAD = { l: 76, r: 28, t: 56, b: 46 };

/** Log-x mapping from context length to screen, over this pass's range. */
function xMapper(plot, lo, hi) {
  const a = Math.log(Math.max(1, lo) * 0.8);
  const b = Math.log(Math.max(2, hi) * 1.25);
  return (tok) => plot.x + plot.w *
    (Math.log(Math.min(Math.max(tok, Math.exp(a)), Math.exp(b))) - a) / (b - a);
}

/** Round decade and half-decade ticks inside a range. */
function ticksFor(lo, hi) {
  const out = [];
  for (let e = 2; e <= 7; e++) {
    for (const m of [1, 3]) {
      const v = m * Math.pow(10, e);
      if (v >= lo * 0.8 && v <= hi * 1.25) out.push(v);
    }
  }
  return out;
}

function tokLabel(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return `${v}`;
}

function plotRect(r) {
  return { x: r.x + PAD.l, y: r.y + PAD.t,
           w: r.w - PAD.l - PAD.r, h: r.h - PAD.t - PAD.b };
}

function axes(ctx, plot) {
  ctx.strokeStyle = rgba(C.hairline, 1);
  ctx.lineWidth = hair();
  ctx.beginPath();
  ctx.moveTo(plot.x, plot.y);
  ctx.lineTo(plot.x, plot.y + plot.h);
  ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
  ctx.stroke();
}

function contextAxis(ctx, plot, xOf, lo, hi) {
  for (const v of ticksFor(lo, hi)) {
    const x = xOf(v);
    ctx.strokeStyle = rgba(C.hairline, 0.55);
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, tokLabel(v), x, plot.y + plot.h + 20,
          { size: 12, color: C.dim, align: "center", mono: true, track: 0 });
  }
}

function series(ctx, pts, xOf, yOf, valueOf, color, { width = 2.5, alpha = 1,
                                                      dots = true, grow = 1 } = {}) {
  if (!pts.length) return;
  const n = Math.max(1, Math.ceil(pts.length * grow));
  const use = pts.slice(0, n);
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.beginPath();
  use.forEach((p, i) => {
    const x = xOf(p.tokens), y = yOf(valueOf(p));
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  if (dots) {
    for (const p of use) {
      ctx.fillStyle = rgba(color, alpha);
      ctx.beginPath();
      ctx.arc(xOf(p.tokens), yOf(valueOf(p)), width + 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// --- the argument ---------------------------------------------------------
export function drawTime(ctx, bloom, state, meta, anim) {
  const r = LAYOUT.time;
  const phase = state?.phase ?? "idle";
  panel(ctx, r, {
    title: "TIME TO TOKENIZE ONE PROMPT",
    note: phase === "complete" ? "PASS COMPLETE" : "",
  });
  const plot = plotRect(r);
  const lo = state?.min_tokens ?? 1000, hi = state?.max_tokens ?? 1e6;
  const xOf = xMapper(plot, lo, hi);

  const pts = state?.points ?? [];

  // The y axis is set from the tallest HuggingFace time seen in any completed
  // pass, not from the points currently on screen, so a point lands where it
  // belongs instead of rescaling the chart underneath itself as it arrives.
  const yMax = Math.max(anim.scaleMs * 1.1, 1);
  const yOf = (v) => plot.y + plot.h * (1 - Math.min(Math.max(v, 0), yMax) / yMax);

  axes(ctx, plot);
  for (let g = 0; g <= 4; g++) {
    const v = (yMax / 4) * g, y = yOf(v);
    ctx.strokeStyle = rgba(C.hairline, g === 0 ? 1 : 0.4);
    ctx.lineWidth = hair();
    ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
    label(ctx, v >= 10 ? v.toFixed(0) : v.toFixed(1), plot.x - 10, y + 4,
          { size: 12, color: C.dim, mono: true, align: "right", track: 0 });
  }
  label(ctx, "ms", plot.x - 10, plot.y - 14,
        { size: 11, color: C.dim, mono: true, align: "right", track: 0 });
  contextAxis(ctx, plot, xOf, lo, hi);
  label(ctx, "CONTEXT LENGTH  (tokens)", plot.x + plot.w / 2,
        plot.y + plot.h + 40, { size: 11, color: C.dim, align: "center" });

  // No ghost of the previous pass is drawn. It used to be, and it spanned the
  // whole axis from the first frame, so a full HuggingFace curve was on screen
  // for settings this pass had not reached yet. Only measured points.

  // --- the delta, as a band ----------------------------------------------
  if (pts.length > 1) {
    const g = ctx.createLinearGradient(plot.x, 0, plot.x + plot.w, 0);
    g.addColorStop(0, rgba(C.compute, 0.05));
    g.addColorStop(1, rgba(C.compute, 0.19));
    ctx.fillStyle = g;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = xOf(p.tokens), y = yOf(p.hf_ms);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      ctx.lineTo(xOf(pts[i].tokens), yOf(pts[i].ft_ms));
    }
    ctx.closePath();
    ctx.fill();
  }

  series(ctx, pts, xOf, yOf, (p) => p.hf_ms, C.harness, { width: 2.6 });
  series(ctx, pts, xOf, yOf, (p) => p.ft_ms, C.compute, { width: 2.6 });

  // Ratio labels ride on the band, at its own midpoint, so the number and the
  // gap it describes are the same object.
  // Only where the band is tall enough to hold a number -- otherwise the
  // labels pile onto the x axis and read as clutter rather than measurement.
  // Drawn from the newest point backwards, so the one a visitor is watching
  // land always gets its label and the older ones yield to it. Twenty
  // documents in a pass put the points a few pixels apart in places, and
  // labelling every qualifying one produced "27x27x45x29x" smeared along the
  // curve -- unreadable, and it looked like a rendering fault rather than
  // like measurements.
  ctx.save();
  let lastX = Infinity;
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    const last = i === pts.length - 1;
    // Only where the band is tall enough to hold a number, and only where
    // there is horizontal room since the previous label.
    const gap = yOf(p.ft_ms) - yOf(p.hf_ms);
    if (gap < 26) continue;
    const x = xOf(p.tokens);
    if (!last && lastX - x < 54) continue;
    lastX = x;
    const y = (yOf(p.hf_ms) + yOf(p.ft_ms)) / 2;
    label(ctx, `${p.ratio.toFixed(0)}×`, x, y + 5, {
      size: last ? 20 : 14, align: "center", mono: true, track: 0,
      weight: last ? 700 : 500,
      color: rgba(C.text, last ? 0.98 : 0.55),
    });
  }
  ctx.restore();

  // the newest point, pulsed once as it lands
  const last = pts[pts.length - 1];
  if (last && anim.landT < 1) {
    const t = anim.landT;
    for (const [v, col] of [[last.hf_ms, C.harness], [last.ft_ms, C.compute]]) {
      ctx.strokeStyle = rgba(col, (1 - t) * 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(xOf(last.tokens), yOf(v), 6 + t * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Series names sit on the lines themselves rather than in a corner key:
  // nothing here should need a legend lookup from the back of a room.
  if (pts.length) {
    const p = pts[pts.length - 1];
    // These trail to the left of the newest point, which runs them off the
    // panel while that point is still the 2K one at the far left. Flip to the
    // right of the point when there is not room on the left.
    const edgeLabel = (text, y, opts) => {
      ctx.save();
      ctx.font = `${opts.weight} ${opts.size}px "Grotesk", system-ui, sans-serif`;
      const w = ctx.measureText(text).width;
      ctx.restore();
      const x = xOf(p.tokens);
      const fits = x - 14 - w >= plot.x;
      label(ctx, text, x + (fits ? -14 : 14), y,
            { ...opts, align: fits ? "right" : "left" });
    };
    edgeLabel("huggingface tokenizers", yOf(p.hf_ms) - 16,
              { size: 14, color: rgba(C.harness, 1), weight: 600 });
    edgeLabel("fastokens", yOf(p.ft_ms) - 14,
              { size: 15, color: rgba(C.compute, 1), weight: 700 });
  }

  // bloom carries only the accent series
  if (bloom) {
    bloom.save();
    bloom.scale(0.5, 0.5);
    series(bloom, pts, xOf, yOf, (p) => p.ft_ms, C.compute, { width: 3, alpha: 0.7 });
    bloom.restore();
  }
}
