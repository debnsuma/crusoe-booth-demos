// The demo registry. To add a demo: drop its folder next to this file (with
// an index.html inside), then add one entry here. No build step.
//
//   id        folder name, also used for ?demo=<id> deep links
//   product   the Crusoe product it shows off (card eyebrow)
//   title     one line, title case, what a visitor will see
//   blurb     one or two sentences for the card
//   tags      a few short chips
//   tone      card colour: accent (yellow) | slate | gold | green
//   isDefault exactly one demo; it is listed first and marked Default
//
// Order here is the order on screen, except that the default always leads.
window.DEMOS = [
  {
    id: "managed-rl-wordle",
    product: "Crusoe Managed RL",
    title: "Watch A Model Learn Wordle With RL And GRPO",
    blurb: "Three Wordle boards race: the base model, after SFT, and after RL on Crusoe Managed RL. The training run replays underneath.",
    tags: ["Managed RL", "GRPO", "Qwen3"],
    tone: "accent",
    isDefault: true,
  },
  {
    id: "fastokens",
    product: "Crusoe fastokens",
    title: "fastokens vs HuggingFace Tokenizers",
    blurb: "How long one prompt takes to tokenize in each engine as the prompt gets longer, across five model tokenizers. A recorded sweep, never re-run.",
    tags: ["Tokenization", "Rust", "Up To 85× Faster"],
    tone: "slate",
  },
  {
    id: "slurm-topology",
    product: "Crusoe Managed Slurm",
    title: "Topology-Aware Scheduling On A Live GPU Fleet",
    blurb: "A simulated 640-GPU hall running Slurm's real topology/tree plugin. Add racks and watch topology.conf regenerate itself.",
    tags: ["Managed Slurm", "Topology Discovery", "3D"],
    tone: "gold",
  },
];

// Launcher behaviour. Edit and reload.
window.HUB_CONFIG = {
  // After this many seconds with no touch, open the default demo on its own.
  // 0 turns it off. Useful for an unattended screen; off while staffed.
  idleOpenDefaultSeconds: 0,
};
