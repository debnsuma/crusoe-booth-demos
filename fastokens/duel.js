// Wiring: walk the recorded sweep in the browser, render it at 60 fps.
//
// Nothing is measured here. Every number on screen comes out of combined.csv;
// engine.js reads that file and walks it across the screen one document at a
// time. Only two things are animated, and neither one is data: the opacity of
// a point as it lands, and the chart's y scale when the axis has to grow.
//
// This is the static build of the booth demo: no server, no WebSocket. It is
// served as plain files (GitHub Pages, or any local http server).
//
// URL switches, for rehearsal and for the automated visual check:
//   ?bloom=0     drop the bloom layer (software GL cannot blur a full screen
//                at 60 fps, and headless Chrome has no GPU)
//   ?projector=1 start in projector mode
//   ?visible=1   ignore page-visibility (headless Chrome reports every page as
//                hidden, which would otherwise trip the stage freeze)

import { C, H, relayout, setProjector, bgColor, label, ema } from "./draw.js";
import * as draw from "./draw.js";
import { drawTime } from "./chart.js";
import { drawHeader, drawReadout } from "./readout.js";
import { load } from "./engine.js";

const params = new URLSearchParams(location.search);

const main = document.getElementById("main");
const bloomCanvas = document.getElementById("bloom");
const ctx = main.getContext("2d", { alpha: false });
const bloom = bloomCanvas.getContext("2d");

const bloomOff = params.get("bloom") === "0";
if (bloomOff) bloomCanvas.style.display = "none";
if (params.get("projector") === "1") {
  setProjector(true);
  document.body.classList.add("projector");
}
const forceVisible = params.get("visible") === "1";

// The way back to the launcher. Only meaningful when served over http: opened
// as a file, "../" would be a directory listing.
if (location.protocol !== "file:") document.getElementById("hub").hidden = false;

// --- the stage fills the screen ------------------------------------------
// A fixed 16:9 logical canvas scaled to fit leaves black bars on any display
// that is not 16:9. Instead the logical *height* is fixed and the logical
// width follows the window's aspect ratio, so one logical pixel is always
// square and text never stretches -- the panels simply get more or less room.
const MIN_LOGICAL_W = 1440, MAX_LOGICAL_W = 2600;

function fit() {
  const vw = Math.max(window.innerWidth, 320);
  const vh = Math.max(window.innerHeight, 240);
  relayout(Math.min(MAX_LOGICAL_W,
                    Math.max(MIN_LOGICAL_W, Math.round(H * (vw / vh)))));
  const W = draw.W;

  const scale = Math.min(vw / W, vh / H);
  const stage = document.getElementById("stage");
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  stage.style.transform = `translate(-50%,-50%) scale(${scale})`;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  main.width = Math.round(W * dpr * scale);
  main.height = Math.round(H * dpr * scale);
  main.style.width = `${W}px`;
  main.style.height = `${H}px`;
  bloomCanvas.width = Math.round((W / 2) * dpr * scale);
  bloomCanvas.height = Math.round((H / 2) * dpr * scale);
  bloomCanvas.style.width = `${W}px`;
  bloomCanvas.style.height = `${H}px`;

  ctx.setTransform(main.width / W, 0, 0, main.height / H, 0, 0);
  bloom.setTransform(bloomCanvas.width / (W / 2), 0, 0,
                     bloomCanvas.height / (H / 2), 0, 0);
}
window.addEventListener("resize", fit);

// --- state ----------------------------------------------------------------
const app = {
  engine: null,
  state: null,
  meta: null,
  error: null,
  renderErrors: 0,
};
window.app = app;        // every probe reads this; do not clobber it

const anim = {
  scaleMs: 1,            // eased y-axis ceiling
  landT: 1,              // 0..1 since the newest point landed
  seen: 0,               // points in the pass we have already animated
  pass: -1,
};

async function boot() {
  try {
    app.engine = await load("./combined.csv");
    app.meta = app.engine.meta();
    app.engine.start();
  } catch (err) {
    app.error = String(err?.message ?? err);
    console.error(err);
  }
}

// --- the pause control ----------------------------------------------------
// The duel had no controls at all, deliberately -- it is a loop, not a
// presentation. This is the one exception: someone standing at the booth
// needs to be able to stop the chart on a finished pass and talk over it.
const pauseBtn = document.getElementById("pause");

function setPaused(paused) {
  if (!app.engine) return;
  app.engine.setPaused(paused === undefined ? !app.engine.paused : paused);
}

pauseBtn.addEventListener("click", () => setPaused());
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space" && e.key !== " ") return;
  e.preventDefault();          // space would otherwise scroll, and re-click
  setPaused();
});

function drawPauseButton(s) {
  const paused = !!s?.paused;
  const text = paused ? "RESUME" : "PAUSE";
  pauseBtn.dataset.paused = String(paused);
  pauseBtn.setAttribute("aria-pressed", String(paused));
  if (pauseBtn.querySelector(".text").textContent !== text) {
    pauseBtn.querySelector(".text").textContent = text;
  }
}

// --- render ---------------------------------------------------------------
let prev = performance.now();

function render(now) {
  const dt = Math.min(0.1, (now - prev) / 1000);
  prev = now;

  const s = app.engine ? app.engine.snapshot() : null;
  app.state = s;

  // A new point: restart the landing pulse. A new pass: reset the counter, so
  // the pulse fires once per measurement and not once per frame.
  if (s) {
    if (s.pass !== anim.pass) { anim.pass = s.pass; anim.seen = 0; }
    if (s.points.length > anim.seen) { anim.seen = s.points.length; anim.landT = 0; }
    anim.landT = Math.min(1, anim.landT + dt / 0.7);
    // The axis ceiling eases rather than snapping: a step change would make
    // every already-landed point jump, which reads as the measurements
    // changing when only the scale did.
    anim.scaleMs = ema(anim.scaleMs, Math.max(s.scale_ms,
                       ...s.points.map((p) => p.hf_ms), 1), dt, 0.35);
  }

  ctx.fillStyle = bgColor();
  ctx.fillRect(0, 0, draw.W, H);
  bloom.clearRect(0, 0, draw.W, H);

  // The deliberate stage freeze: a hidden tab stops being sent frames, and a
  // panel that silently holds a stale number is worse than one that says so.
  if (document.hidden && !forceVisible) {
    label(ctx, "PAUSED", draw.W / 2, H / 2,
          { size: 34, color: C.dim, align: "center" });
    return;
  }

  drawPauseButton(s);
  drawHeader(ctx, s, app.meta);
  drawTime(ctx, bloomOff ? null : bloom, s, app.meta, anim);
  drawReadout(ctx, bloomOff ? null : bloom, s, app.meta, anim);

  if (app.error) {
    label(ctx, `could not load the sweep: ${app.error}`, draw.W / 2, H / 2,
          { size: 18, color: C.zone, align: "center", mono: true, track: 0 });
  }
}

function frame(now) {
  // Error boundary. Without it any throw in a draw call skips the
  // requestAnimationFrame at the bottom and freezes the whole screen --
  // silent, and the worst failure on a stage.
  try {
    render(now);
  } catch (err) {
    app.renderErrors++;
    if (app.renderErrors < 5) console.error(err);
  }
  requestAnimationFrame(frame);
}

fit();
boot();
requestAnimationFrame(frame);
