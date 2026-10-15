# Booth Guide

For anyone staffing the Crusoe booth. Five minutes to read. The same guide is on the launcher itself, under **Booth Guide** at the bottom.

## The launcher

- Live: **https://debnsuma.github.io/crusoe-booth-demos/**
- Keys **1**, **2**, **3** open a demo. **Enter** opens the first one. Every demo has an **All Demos** button at the top right to come back.
- Full screen the browser before visitors arrive (F11, or Ctrl+Cmd+F on a Mac).
- Nothing needs the network once a page has loaded. If the venue Wi-Fi dies mid-demo, keep going.
- No network at all? Clone the repo and run `./run.sh`. It serves locally and opens Chrome in kiosk mode.

---

## 1. Managed RL: a model learns Wordle

**What it is.** A 27B Qwen model learns to play Wordle with reinforcement learning (GRPO) on Crusoe Managed RL. Managed RL is in private preview.

**What's on screen.** Three Wordle boards race on the same secret word: **Base Model**, **After SFT**, **After RL**. The RL board wins most of the time. Underneath, the training run replays: the SFT loss curve, then the win rate climbing across 60 GRPO steps. Tiles on the left summarise it: base 2%, after SFT 22%, after RL 58%.

**Say this.**
- "The base model guesses almost at random. Supervised fine-tuning teaches it the format. RL is what teaches it to actually win: it plays thousands of games, gets a reward for winning, and GRPO turns that reward into better guesses."
- "You write the game and the reward in Python. Crusoe runs the GPUs, the rollouts and the training, and hands you back a checkpoint you own."
- "Wordle is the toy. The same loop trains agents, tool use, coding, anything you can score."

**The tabs.** **1 Watch** is the attract loop. **2 How To Train** shows what you write versus what Crusoe runs. **3 GRPO Under The Hood** walks one training step in six stations. **4 Get Started** has the QR codes: the developer hub on GitHub, the console, and Discord.

**Controls.** Space pauses, R resets, Esc goes back to Watch, F is full screen. Left alone for three minutes it returns to Watch on its own.

**If asked.** The boards replay real games from the real models. The win-rate curve is illustrative, shaped on the real run's evaluations. The SFT loss curve is the real run.

---

## 2. fastokens vs HuggingFace tokenizers

**What it is.** fastokens is a tokenizer that drops in for HuggingFace `tokenizers` and is several times to about 85 times faster on a single prompt. The gap grows as prompts get longer.

**What's on screen.** One chart. Grey line: HuggingFace. Yellow line: fastokens. The shaded band between them is the difference, and it opens up left to right as documents get bigger. The big number on the right is the speedup on the document that just landed. It cycles through five model tokenizers (gpt-oss-120b, DeepSeek-V3.2, MiniMax-M2.1, Mistral-Nemo, NVIDIA Nemotron-3-Nano) on two datasets, twenty documents per pass, about twenty seconds each.

**Say this.**
- "Tokenizing is the first thing an inference server does on every request, and it sits in front of the GPU."
- "HuggingFace tokenizes one piece at a time, so twice the text is twice the wait. fastokens splits a long prompt across cores. Same documents, same machine, one at a time."
- "Long context is where it bites: a million-token prompt is hundreds of milliseconds before the GPU even starts."

**Controls.** Space, or the Pause button, holds the current pass so you can talk over it. That is the only control.

**If asked.** The numbers come from one recorded sweep, measured once and replayed here. Nothing is measured on the booth machine, so it cannot drift.

---

## 3. Managed Slurm: topology-aware scheduling

**What it is.** Crusoe Managed Slurm discovers the network topology automatically and keeps `topology.conf` up to date. The GPU fleet on screen is simulated; the scheduler is Slurm's real `topology/tree` plugin, unmodified.

**What's on screen.** A hall of 10 racks, 8 nodes each, 8 GPUs per node. 512 GPUs are in service; the two dark racks at the end are installed but not yet switched on. Each rack has a leaf switch above it, with two spine switches above those. Job colours are the whole story: **yellow** sits on one leaf switch (fastest), **amber** spans leaves under one spine, **red** spans both spine planes (slowest). On the right: the `topology.conf` panel, the queue, and the scheduler log. Bottom left: the same job, 6.9 hours well placed versus 12 hours badly placed.

**Say this.**
- "Slurm can only place a job well if it knows the wiring. On most clouds you cannot see the wiring, so `topology.conf` is a hand-written guess that goes stale."
- "Crusoe generates it from the real fabric, and regenerates it whenever the fleet changes."
- Press **+ Add capacity**: "Two racks come online. `topology.conf` regenerates by itself, the queued jobs start on the new racks, and the hand-written config is now blind to 128 GPUs."

**Controls.** **Launch a job**: pick a GPU count, press sbatch, watch where it lands. **Pause** and **Resume**. **+ Add capacity**, once per run. **Restart**. **Autoplay** runs the whole story on a loop every 18 seconds, which is the mode for an unattended screen. Drag or scroll to move the camera; it drifts back on its own.

**If asked.** The placement decisions are real Slurm logic. The hardware, the jobs and the clock are simulated.

---

## Before the doors open

1. Open the launcher, full screen the browser, open each demo once so fonts and data are cached.
2. Leave the screen on Managed RL (Watch tab), or on Slurm with Autoplay on.
3. Keep this guide open on your phone.
