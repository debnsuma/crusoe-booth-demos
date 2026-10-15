// The header, the readout column and the footnote.
//
// The readout answers, at a glance and from the back of a room, two questions
// in the order a sceptic asks them: how much faster, and on what. Nothing here
// is measured in the browser or in the server -- every figure is read out of
// `combined.csv`.
//
// The provenance footnote that used to run along the bottom of the screen was
// removed at the user's direction. What it said -- same documents, one at a
// time, one tokenizer at a time, recorded not re-run -- is still served at
// `/api/meta` for anyone who asks, and `tools/verify_duel_matches_bench.py`
// still proves the screen is the file.

import { C, LAYOUT, rgba, label, panel, fitSize, group, ms }
  from "./draw.js";

export function drawHeader(ctx, state, meta) {
  const r = LAYOUT.header;
  // The bar itself: charcoal on near-black with a hairline under it, the same
  // top bar as the other booth demos. The lockup, product name and chip are
  // DOM elements layered over this (see #top in index.html).
  ctx.fillStyle = rgba(C.panel, 1);
  ctx.fillRect(0, 0, r.w, r.h);
  ctx.fillStyle = rgba(C.hairline, 1);
  ctx.fillRect(0, r.h - 1, r.w, 1);

  // The model is the headline fact of each pass, so it sits centre and in
  // the text colour rather than dimmed: the sweep cycles through five of them
  // and "which one is this?" must never need looking for.
  if (state?.model) {
    label(ctx, state.model, r.w / 2, r.h / 2 + 5,
          { size: 15, color: C.text, align: "center", mono: true, track: 0,
            weight: 700 });
  }

  const right = [];
  if (state?.dataset) right.push(state.dataset);
  if (meta?.n_groups) {
    right.push(`${(state.pass % meta.n_groups) + 1} of ${meta.n_groups}`);
  }
  label(ctx, right.join("   ·   "), r.w - 56, r.h / 2 + 5,
        { size: 13, color: C.dim, align: "right", mono: true, track: 0 });
}

export function drawReadout(ctx, bloom, state, meta, anim) {
  const r = LAYOUT.readout;
  panel(ctx, r, { title: "BENCHMARK RESULT" });

  const pts = state?.points ?? [];
  const last = pts[pts.length - 1];
  const complete = state?.phase === "complete";
  // The newest point either way. On a completed pass that is the largest
  // document of the ladder, which is the number worth leaving on screen
  // between visitors.
  const show = last;

  let y = r.y + 76;

  if (!show) {
    // Only ever seen for the instant before the first frame arrives: the
    // server puts the first prompt size up the moment a pass begins.
    label(ctx, "loading…", r.x + 20, y + 40, { size: 22, color: C.dim });
    return;
  }

  // --- the headline -------------------------------------------------------
  const ratio = `${show.ratio.toFixed(0)}×`;
  const size = fitSize(ctx, ratio, r.w - 40, 148);
  label(ctx, ratio, r.x + 20, y + size * 0.78,
        { size, color: C.compute, weight: 700, track: 0.01 });
  if (bloom) {
    bloom.save(); bloom.scale(0.5, 0.5);
    label(bloom, ratio, r.x + 20, y + size * 0.78,
          { size, color: rgba(C.compute, 0.75), weight: 700, track: 0.01 });
    bloom.restore();
  }
  y += size * 0.86;
  label(ctx, "FASTER ON THIS PROMPT", r.x + 22, y + 12,
        { size: 13, color: C.text, weight: 600 });
  y += 44;

  // --- what is being shown, and the two times it came from ----------------
  // Model, dataset and batch are on the panel as well as in the header. That
  // is deliberate duplication: the sweep cycles through ten combinations, and
  // a number with no label beside it is the thing a visitor misreads.
  const rows = [
    ["model", show.model, C.text],
    ["dataset", show.dataset, C.text],
    ["context", `${group(show.tokens)} tokens`, C.text],
    ["huggingface", ms(show.hf_ms), C.harness],
    ["fastokens", ms(show.ft_ms), C.compute],
  ];
  for (const [k, v, col] of rows) {
    label(ctx, k, r.x + 22, y, { size: 12, color: C.dim });
    // Model names run to 35 characters, which overruns the column at the row
    // size. Measured and shrunk rather than clipped: the name is the point.
    const vSize = fitSize(ctx, v, r.w - 150, 15, { weight: 600 });
    label(ctx, v, r.x + r.w - 22, y,
          { size: vSize, color: col, align: "right", mono: true, track: 0,
            weight: 600 });
    y += 32;
  }

  y += 10;
  // --- sweep progress -----------------------------------------------------
  const n = state?.n_steps ?? 20;
  label(ctx, complete ? "complete — next model"
                      : `document ${pts.length} of ${n}, each one larger`,
        r.x + 22, y + 6, { size: 12, color: C.dim });
  y += 20;
  const bw = (r.w - 40) / n;
  for (let i = 0; i < n; i++) {
    const done = i < pts.length;
    ctx.fillStyle = rgba(done ? C.compute : C.hairline, done ? 0.85 : 1);
    ctx.fillRect(r.x + 20 + i * bw + 1, y, bw - 2, 6);
  }
  y += 34;

  drawModels(ctx, r, y, state, meta);
}

// --- where this pass sits in the cycle ------------------------------------
// The sweep is five models across two datasets, and the screen shows one
// combination at a time. Without this panel a visitor sees a number for a
// model they cannot name and has no idea more are coming.
function drawModels(ctx, r, y, state, meta) {
  const models = meta?.models ?? [];
  // Clear of the pause button, which sits 110px up from the stage bottom.
  // The panel grew when the footnote went, so this gap grew with it.
  const bottom = r.y + r.h - 108;
  if (!models.length || y > bottom - 30) return;

  label(ctx, "MODELS IN THIS SWEEP", r.x + 22, y, { size: 12, color: C.dim });
  label(ctx, state?.dataset ?? "", r.x + r.w - 22, y,
        { size: 11, color: rgba(C.dim, 0.9), align: "right", mono: true,
          track: 0 });
  y += 14;

  const lh = 26;
  const box = { x: r.x + 20, y, w: r.w - 40, h: Math.min(bottom - y, models.length * lh + 14) };
  ctx.fillStyle = rgba(C.hairline, 0.3);
  ctx.fillRect(box.x, box.y, box.w, box.h);

  models.forEach((m, i) => {
    const yy = box.y + 10 + i * lh + 12;
    if (yy > box.y + box.h) return;
    const on = m === state?.model;
    if (on) {
      ctx.fillStyle = rgba(C.compute, 0.14);
      ctx.fillRect(box.x, yy - 14, box.w, lh - 2);
      ctx.fillStyle = rgba(C.compute, 1);
      ctx.fillRect(box.x, yy - 14, 3, lh - 2);
    }
    const size = fitSize(ctx, m, box.w - 40, 13, { weight: on ? 700 : 500 });
    label(ctx, m, box.x + 14, yy + 2,
          { size, color: on ? C.text : rgba(C.dim, 0.85),
            weight: on ? 700 : 500, mono: true, track: 0 });
  });

}
