# Crusoe Developer Demos

One page that opens every booth demo. Static files only, so it runs from GitHub Pages, from a laptop, or from a USB stick, and every demo takes over the screen once opened.

```
index.html             the launcher: one card per demo, keys 1-9 open them
BOOTH_GUIDE.md         the booth guide for staff; guide.html is generated from it
tools/build_guide.py   python3 tools/build_guide.py after editing BOOTH_GUIDE.md
demos.js               the registry: add a demo here
assets/                shared brand fonts and logos
managed-rl-wordle/     Crusoe Managed RL, Wordle (the default demo)
fastokens/             fastokens vs HuggingFace tokenizers
slurm-topology/        Managed Slurm, topology-aware scheduling
serve.sh               local server for testing
run.sh                 booth mode: serve, then Chrome full screen (macOS)
```

## Staffing the booth

Read [BOOTH_GUIDE.md](BOOTH_GUIDE.md): what each demo shows, what to say, which buttons to press. The same guide is on the launcher at [guide.html](https://debnsuma.github.io/crusoe-booth-demos/guide.html). Edit the Markdown, then run `python3 tools/build_guide.py` to regenerate the page.

## Run it locally

```sh
./serve.sh            # http://127.0.0.1:8080  (PORT=8081 ./serve.sh for another port)
./run.sh              # same, then opens it in Chrome kiosk mode; Cmd+Q quits
```

Any static server works. The demos use ES modules and `fetch`, so they need `http://`, not `file://`.

## Deploy

The repo is the site. GitHub Pages serves `main` from the root (`.nojekyll` keeps Jekyll out of the way). Push, and it is live a minute later:

```sh
git push origin main
```

## Add a demo

1. Put the demo in its own folder with an `index.html` inside. It must be static: HTML, JS, CSS, data files, fonts. No server, no build step at runtime. Asset paths should be relative (`./fonts/x.woff2`, not `/fonts/x.woff2`) so the folder works under any path.
2. Add one entry to `demos.js`: id (the folder name), product, title, blurb, tags, tone.
3. A small "All Demos" pill in its top bar linking to `../`, shown only when `location.protocol` is not `file:`. Copy the one in `managed-rl-wordle/index.html` (the `.top .hub` rule) so it matches.

That is the whole process. The launcher reads the registry at load time and lays out the cards itself.

## The demos, and what changed to bring them here

Each demo keeps its own look inside; they share the top bar, the type, and the palette: near-black ground, charcoal panels, white lockup, Hi-Vis Yellow (`#CEEB13`) as the one accent, Diatype Mono for display, Suisse Intl for text.

**managed-rl-wordle** is a copy of [debnsuma/managed-rl-wordle-demo](https://github.com/debnsuma/managed-rl-wordle-demo) with one addition: the "All Demos" pill in the top bar. Nothing else changed; `run.sh` and `live_server.py` still work from inside the folder. It is the default demo: listed first and opened by Enter.

**fastokens** is a static build of the `fastokens-conf-demo` booth repo. Upstream, a FastAPI server walked `combined.csv` and pushed snapshots over a WebSocket. Here `engine.js` is a line-for-line port of `server/duel.py` and `server/ablation.py` into the browser: same parse, same grouping, same per-pass axis, same 1 s step and 3 s hold, same snapshot shape, so `chart.js` and `readout.js` are untouched. `combined.csv` is still the only source of numbers; replace it and reload. The page swapped Inter and JetBrains Mono for the brand fonts, moved to the shared palette, and gained the shared top bar. The Rust crate, the measurement tools and the Python server stay upstream.

**slurm-topology** is `topology-demo.html` from the `slurm-conf-demo` repo, built with `npm run single` after a small header change: the product name and chip next to the logo, and an "All demos" link. The diff is in `slurm-topology/upstream.patch`. To rebuild after a change upstream, apply the patch, run `npm run single`, and copy `topology-demo.html` here as `index.html`.

## Launcher settings

In `demos.js`, `HUB_CONFIG.idleOpenDefaultSeconds` opens the default demo on its own after that many seconds without a touch. It is off (`0`) by default. Also `?demo=<id>` on the launcher URL opens a demo directly, for a bookmark or a QR code.

Coming back from a demo: every screen has an "All Demos" pill at the right end of its top bar. Alt+Left (Cmd+[ on macOS) works too.
