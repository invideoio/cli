#!/usr/bin/env python3
"""Draws what a bare `invideo` shows on a terminal into assets/home.svg: the
logo animating beside its header, then the help, as the server answers a CLI
in iTerm2. The dots sit where iTerm2 draws them (Apple Braille on JetBrains
Mono, 15 px), so the logo keeps its shape. Logo animation by da9ish.

Needs the installed `invideo` (for its version). INVIDEO_HOST names another
server. Run by scripts/commands.sh."""

import json
import os
import subprocess
import urllib.request
from html import escape
from pathlib import Path

HOST = os.environ.get("INVIDEO_HOST") or "https://mcp.invideo.io"
OUT = Path(__file__).resolve().parent.parent / "assets" / "home.svg"

# iTerm2's cell and braille dots, in px (scripts in the logo's source measured them).
CELL_W, CELL_H, BASELINE = 9.0, 19.8, 15.3
DOT_X = (456 / 2048 * 15, 944 / 2048 * 15)
DOT_Y = tuple(BASELINE - y / 2048 * 15 for y in (1230, 740, 250, -240))
DOT_R = 248 / 2048 * 15 / 2
BITS = ((0x01, 0x08), (0x02, 0x10), (0x04, 0x20), (0x40, 0x80))
PAD = 24
# How long the logo rests before it plays again.
HOLD_MS = 3000

version = subprocess.run(["invideo", "version"], capture_output=True, text=True, check=True).stdout.split()[-1]
request = urllib.request.Request(
    f"{HOST}/cli/v1/run",
    data=json.dumps({"argv": [], "terminal": "iterm", "version": version, "protocol": 2}).encode(),
    headers={"content-type": "application/json", "x-invideo-cli-version": version},
)
with urllib.request.urlopen(request) as response:
    frames = json.load(response)["frames"]
home = next(frame for frame in frames if frame["t"] == "home")
page = "".join(frame["text"] for frame in frames if frame["t"] == "out").rstrip("\n").split("\n")

shots = home["frames"]
rows = max(len(shot["lines"]) for shot in shots)
cols = max(len(line) for shot in shots for line in shot["lines"])
total = shots[-1]["ms"] + HOLD_MS
top = next(row for row, line in enumerate(shots[-1]["lines"]) if line.strip())
side = home["header"] + ["~/my-video", home["account"]]
# Screen rows: the prompt, the logo's canvas, a blank, the help.
screen_rows = 1 + rows + 1 + len(page)
width_cols = max([cols + 4 + max(len(line) for line in side)] + [len(line) for line in page] + [10])
width = round(PAD * 2 + width_cols * CELL_W)
height = round(PAD * 2 + screen_rows * CELL_H)


def at(col, row):
    return PAD + col * CELL_W, PAD + row * CELL_H


def text(col, row, words, fill="#E8E8E8", weight=400):
    x, y = at(col, row)
    return f'<text x="{x:.1f}" y="{y + BASELINE:.1f}" fill="{fill}" font-weight="{weight}">{escape(words)}</text>'


def path(lines):
    """A frame's dots, in tenths of a px, each a move from the one before."""
    dots = []
    for row, line in enumerate(lines):
        for col, char in enumerate(line):
            value = ord(char) - 0x2800
            if not 0 < value <= 0xFF:
                continue
            for y in range(4):
                for x in range(2):
                    if value & BITS[y][x]:
                        px, py = at(col, 1 + row)
                        dots.append((round((py + DOT_Y[y]) * 10), round((px + DOT_X[x]) * 10)))
    d, last = [], None
    for y, x in sorted(dots):
        d.append(f"m{x - last[1]} 0h0" if last and last[0] == y else f"M{x} {y}h0")
        last = (y, x)
    return "".join(d)


logo = []
for k, shot in enumerate(shots):
    if not any(line.strip() for line in shot["lines"]):
        continue
    start = shot["ms"] / total
    if k == len(shots) - 1:
        animate = f'values="0;1" keyTimes="0;{start:.4f}"'
    else:
        animate = f'values="0;1;0" keyTimes="0;{start:.4f};{shots[k + 1]["ms"] / total:.4f}"'
    logo.append(
        f'<path opacity="{1 if k == len(shots) - 1 else 0}" d="{path(shot["lines"])}">'
        f'<animate attributeName="opacity" {animate} calcMode="discrete" dur="{total}ms" repeatCount="indefinite"/></path>'
    )

header = [
    text(cols + 4, 1 + top + i, line, *(("#FFFFFF", 700) if i == 0 else ("#8A8A8A", 400)))
    for i, line in enumerate(side)
]
help_lines = [text(0, 1 + rows + 1 + i, line) for i, line in enumerate(page) if line]

OUT.write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
    'font-family="JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="15" xml:space="preserve">\n'
    '<rect width="100%" height="100%" rx="10" fill="#161616"/>\n'
    + text(0, 0, "❯ invideo")
    + "\n"
    + "\n".join(header + help_lines)
    + f'\n<g transform="scale(0.1)" stroke="#FFFFFF" stroke-width="{DOT_R * 20:.1f}" stroke-linecap="round" fill="none">\n'
    + "\n".join(logo)
    + "\n</g>\n</svg>\n"
)
print(OUT)
