#!/usr/bin/env python3
"""Render BOOTH_GUIDE.md to guide.html, so the Markdown is the only copy.

    python3 tools/build_guide.py

No dependencies. Handles the subset of Markdown the guide uses: #/## headings,
paragraphs, - bullets, 1. numbered lists, ---, **bold**, `code`, [text](url)
and bare https:// links. Anything else passes through as text.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "BOOTH_GUIDE.md"
OUT = ROOT / "guide.html"

CODE = re.compile(r"`([^`]+)`")
BOLD = re.compile(r"\*\*(.+?)\*\*")
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
URL = re.compile(r"(?<![\"'>])(https?://[^\s<)*]+)")


def inline(text: str) -> str:
    """Inline markup, on already-escaped text; code spans are protected first."""
    spans: list[str] = []

    def keep(m: re.Match) -> str:
        spans.append(f"<code>{m.group(1)}</code>")
        return f"\0{len(spans) - 1}\0"

    t = CODE.sub(keep, html.escape(text, quote=False))
    t = BOLD.sub(r"<b>\1</b>", t)          # before links, so a bold URL stays well-formed
    t = LINK.sub(lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', t)
    t = URL.sub(lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', t)
    return re.sub(r"\0(\d+)\0", lambda m: spans[int(m.group(1))], t)


def render(md: str) -> str:
    out: list[str] = []
    para: list[str] = []
    lst: str | None = None          # "ul" | "ol" while inside a list

    def flush_para() -> None:
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    def close_list() -> None:
        nonlocal lst
        if lst:
            out.append(f"</{lst}>")
            lst = None

    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush_para(); close_list(); continue
        if line.startswith("# "):
            flush_para(); close_list(); out.append(f"<h1>{inline(line[2:])}</h1>"); continue
        if line.startswith("## "):
            flush_para(); close_list(); out.append(f"<h2>{inline(line[3:])}</h2>"); continue
        if line.startswith("### "):
            flush_para(); close_list(); out.append(f"<h3>{inline(line[4:])}</h3>"); continue
        if line.strip() == "---":
            flush_para(); close_list(); out.append("<hr>"); continue
        m = re.match(r"^(-|\d+\.)\s+(.*)$", line)
        if m:
            flush_para()
            kind = "ul" if m.group(1) == "-" else "ol"
            if lst != kind:
                close_list(); out.append(f"<{kind}>"); lst = kind
            out.append(f"<li>{inline(m.group(2))}</li>")
            continue
        close_list()
        para.append(line.strip())
    flush_para(); close_list()
    return "\n".join(out)


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Booth Guide</title>
<link rel="icon" href="assets/logos/crusoe-burst-white.png">
<style>
/* Generated from BOOTH_GUIDE.md by tools/build_guide.py. Edit the Markdown, not this file. */
@font-face { font-family: "Diatype Mono"; src: url("assets/fonts/ABCDiatypeMono-Regular.woff2") format("woff2"); font-weight: 400; }
@font-face { font-family: "Diatype Mono"; src: url("assets/fonts/ABCDiatypeMono-Bold.woff2") format("woff2"); font-weight: 700; }
@font-face { font-family: "Suisse Intl"; src: url("assets/fonts/SuisseIntl-Regular.otf") format("opentype"); font-weight: 400; }
@font-face { font-family: "Suisse Intl"; src: url("assets/fonts/SuisseIntl-Medium.otf") format("opentype"); font-weight: 500; }
@font-face { font-family: "Suisse Intl"; src: url("assets/fonts/SuisseIntl-Bold.otf") format("opentype"); font-weight: 700; }
:root { color-scheme: dark; --bg: #0F1011; --panel: #1B1D1E; --line: #34373A; --ink: #FFFFFF; --muted: #BDBDBD; --dim: #8A8A8A; --accent: #CEEB13; --accent-ink: #3E4A00; --slate: #7799B6;
  --font-display: "Diatype Mono", "Roboto Mono", ui-monospace, monospace; --font-body: "Suisse Intl", "Inter Tight", system-ui, sans-serif; }
* { box-sizing: border-box; }
html { background: var(--bg); }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 18px; line-height: 1.55; -webkit-font-smoothing: antialiased; }
a { color: var(--accent); text-decoration: none; } a:hover { text-decoration: underline; }
.top { display: flex; align-items: center; gap: 24px; padding: 18px clamp(16px, 3vw, 56px); background: var(--panel); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 2; }
.top img { height: 36px; display: block; }
.top .product { font-family: var(--font-display); font-size: 22px; font-weight: 700; letter-spacing: .02em; padding-left: 24px; border-left: 1px solid var(--line); line-height: 1; display: flex; align-items: center; gap: 16px; }
.chip { font-family: var(--font-display); font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-ink); background: var(--accent); padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
.top .hub { margin-left: auto; font-family: var(--font-display); font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: var(--dim); border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; white-space: nowrap; }
.top .hub:hover { color: var(--accent); border-color: var(--accent); text-decoration: none; }
main { max-width: 780px; margin: 0 auto; padding: clamp(28px, 5vh, 56px) 20px 72px; }
.eyebrow { font-family: var(--font-display); font-size: 14px; letter-spacing: .12em; text-transform: uppercase; color: var(--slate); margin-bottom: 10px; }
h1, h2, h3 { font-family: var(--font-display); font-weight: 400; margin: 0; text-wrap: balance; line-height: 1.15; }
h1 { font-size: clamp(34px, 4vw, 46px); margin: 0 0 14px; }
h2 { font-size: 27px; margin: 36px 0 14px; padding-top: 28px; border-top: 1px solid var(--line); }
h2:first-of-type { border-top: 0; padding-top: 0; }
h3 { font-size: 15px; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); margin: 24px 0 8px; }
p { margin: 0 0 14px; }
p > b:first-child { color: var(--accent); }
h1 + p { color: var(--muted); font-size: 20px; }
ul, ol { margin: 0 0 14px; padding-left: 24px; }
li { margin: 6px 0; padding-left: 4px; }
li::marker { color: var(--dim); font-family: var(--font-display); }
b { font-weight: 700; }
code { font-family: var(--font-display); font-size: .9em; color: var(--muted); background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; }
hr { border: 0; height: 0; margin: 0; }
@media (max-width: 600px) { .top { gap: 14px; } .top .product { font-size: 18px; padding-left: 14px; } .top .product .chip { display: none; } body { font-size: 17px; } h2 { font-size: 23px; } }
</style>
</head>
<body>
<header class="top">
  <img src="assets/logos/crusoe-lockup-white.svg" alt="Crusoe">
  <div class="product">Booth Guide <span class="chip">Staff</span></div>
  <a class="hub" href="./">All Demos</a>
</header>
<main>
<div class="eyebrow">Crusoe Developer Relations Engineering</div>
__BODY__
</main>
</body>
</html>
"""


def main() -> None:
    body = render(SRC.read_text(encoding="utf-8"))
    OUT.write_text(TEMPLATE.replace("__BODY__", body), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} from {SRC.name}")


if __name__ == "__main__":
    main()
