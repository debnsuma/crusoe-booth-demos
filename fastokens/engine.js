// The looping head-to-head, in the browser.
//
// A port of server/duel.py and server/ablation.py from the booth repo. Nothing
// is measured here. combined.csv -- the per-document sweep of five model
// tokenizers across two datasets -- is fetched once, parsed, and walked across
// the screen one document at a time, forever. The snapshot shape is the one
// the Python server sent over its WebSocket, so chart.js and readout.js are
// unchanged.
//
// Only the sequential rows are used: one document at a time, the per-request
// regime an inference server actually sees, and the only batch setting
// measured per document rather than per batch.

const SEQUENTIAL = "seq";
export const STEP_S = 1.0;      // dwell per document  (config.DUEL_STEP_S)
export const HOLD_S = 3.0;      // dwell on the last   (config.DUEL_HOLD_S)

const short = (name) => name.split("/").pop();

/** Every sequential measurement, one per document. */
export function parse(text, batch = SEQUENTIAL) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(",");
  const col = (name) => head.indexOf(name);
  const I = {
    model: col("model"), dataset: col("dataset"), batch: col("batch_size"),
    index: col("input_index"), chars: col("input_char_len"),
    tokens: col("output_token_len"), hf: col("hf_duration_ms"),
    ft: col("fastokens_duration_ms"),
  };
  const rows = [];
  for (const line of lines) {
    const f = line.split(",");
    if (f[I.batch] !== batch) continue;
    const tokens = parseInt(f[I.tokens], 10), chars = parseInt(f[I.chars], 10);
    const hf_ms = parseFloat(f[I.hf]), ft_ms = parseFloat(f[I.ft]);
    if (![tokens, chars, hf_ms, ft_ms].every(Number.isFinite)) continue;
    if (tokens <= 0 || ft_ms <= 0) continue;       // a zero would make the ratio meaningless
    rows.push({
      model: short(f[I.model]), dataset: short(f[I.dataset]), batch,
      index: parseInt(f[I.index], 10), tokens, chars, hf_ms, ft_ms,
      speedup: hf_ms / ft_ms,                       // the one derived value
    });
  }
  return rows;
}

/** One group per (model, dataset), each sorted by context length. */
export function group(rows) {
  const out = [], index = new Map();
  for (const r of rows) {
    const key = `${r.model}\u0000${r.dataset}`;
    let g = index.get(key);
    if (!g) { g = { model: r.model, dataset: r.dataset, rows: [] }; index.set(key, g); out.push(g); }
    g.rows.push(r);
  }
  for (const g of out) g.rows.sort((a, b) => a.tokens - b.tokens);
  return out;
}

const point = (r) => ({
  model: r.model, dataset: r.dataset, batch: r.batch, tokens: r.tokens,
  chars: r.chars, hf_ms: r.hf_ms, ft_ms: r.ft_ms, ratio: r.speedup,
});

/** Walks the sweep across the screen, forever. */
export class Duel {
  constructor(rows, { source = "combined.csv", measuredAt = null } = {}) {
    this.rows = rows;
    this.groups = group(rows);
    if (!this.groups.length) throw new Error(`no usable rows in ${source}`);
    this.source = source;
    this.measuredAt = measuredAt;
    this.models = [...new Set(this.groups.map((g) => g.model))];
    this.datasets = [...new Set(this.groups.map((g) => g.dataset))];
    this.batch = SEQUENTIAL;

    this.passIdx = 0;
    this.groupIdx = 0;
    this.phase = "showing";
    this.step = 0;
    this.points = [];
    this.paused = false;
    this._timer = null;
    this._due = 0;            // when the current dwell ends (performance.now ms)
    this._left = 0;           // dwell remaining while paused
    this._beginPass();
  }

  get group() { return this.groups[this.groupIdx]; }

  _beginPass() {
    const g = this.group;
    // The y axis is fixed per pass from that pass's own tallest HuggingFace
    // time, and the x range from its own documents: LongBench is ~3 500 ms /
    // 1.2M tokens and ShareGPT ~40 ms / 18K, so one shared axis would flatten
    // every ShareGPT pass onto the floor.
    this.scaleMs = Math.max(1, ...g.rows.map((r) => r.hf_ms));
    const toks = g.rows.map((r) => r.tokens);
    this.minTokens = Math.min(...toks); this.maxTokens = Math.max(...toks);
    this.points = [];
    this.step = 0;
    this.phase = "showing";
  }

  /** Land the next document, then schedule the one after it. */
  _advance() {
    const g = this.group;
    const i = this.points.length;
    if (i >= g.rows.length) {
      this.groupIdx = (this.groupIdx + 1) % this.groups.length;
      this.passIdx += 1;
      this._beginPass();
      return this._advance();
    }
    const last = i === g.rows.length - 1;
    this.step = i;
    // `complete` the moment the final document lands, so the chart is labelled
    // finished for the whole of its longer dwell rather than only after it.
    this.phase = last ? "complete" : "showing";
    this.points.push(point(g.rows[i]));
    this._schedule((last ? HOLD_S : STEP_S) * 1000);
  }

  _schedule(ms) {
    clearTimeout(this._timer);
    this._due = performance.now() + ms;
    this._timer = setTimeout(() => this._advance(), ms);
  }

  start() { if (!this._timer) this._advance(); }

  setPaused(paused) {
    paused = !!paused;
    if (paused === this.paused) return this.paused;
    this.paused = paused;
    if (paused) {
      clearTimeout(this._timer); this._timer = null;
      this._left = Math.max(0, this._due - performance.now());
    } else {
      this._schedule(this._left);
    }
    return this.paused;
  }

  snapshot() {
    const g = this.group;
    return {
      pass: this.passIdx, phase: this.phase, step: this.step, n_steps: g.rows.length,
      model: g.model, dataset: g.dataset, model_idx: this.models.indexOf(g.model),
      batch: this.batch, min_tokens: this.minTokens, max_tokens: this.maxTokens,
      points: this.points.slice(), scale_ms: this.scaleMs, paused: this.paused,
    };
  }

  meta() {
    return {
      models: this.models, datasets: this.datasets, batch: this.batch,
      n_groups: this.groups.length, n_rows: this.rows.length,
      measured_at: this.measuredAt, source: this.source,
      step_seconds: STEP_S, hold_seconds: HOLD_S,
      method: "HuggingFace tokenizers against fastokens over the same documents, " +
              "one document at a time, one tokenizer at a time; recorded sweep, not re-run here",
    };
  }
}

/** Fetch the sweep that sits next to this page and build the walker. */
export async function load(url = "./combined.csv") {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  const rows = parse(await r.text());
  if (!rows.length) throw new Error(`no sweep results in ${url}`);
  const lm = r.headers.get("Last-Modified");
  return new Duel(rows, { source: url.split("/").pop(),
                          measuredAt: lm ? Date.parse(lm) / 1000 : null });
}
