#!/usr/bin/env python3
"""Generate Pawmodoro pixel-art PNG icons with no image-library dependencies.

Rasterises a hand-drawn sprite grid with nearest-neighbour scaling and writes
PNGs by hand (zlib + struct). Run from anywhere:

    python3 tools/make_icons.py
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"

PALETTE = {
    ".": (0xFB, 0xF1, 0xE1),  # cream background
    "B": (0x8E, 0x4E, 0x22),  # body brown
    "D": (0x6B, 0x39, 0x15),  # dark brown (ear, tail, far legs)
    "N": (0x3A, 0x25, 0x17),  # nose / eye
    "T": (0xD8, 0xA0, 0x5E),  # tan paws
    "C": (0xC9, 0x6F, 0x3B),  # terracotta (bone, collar)
    "G": (0xE8, 0xB0, 0x4B),  # gold tag
    "W": (0xFF, 0xF8, 0xEC),  # eye glint
}

# 26x26 sprite: compact pixel Noodle + a bone to dream about.
SPRITE = [
    "..........................",  # 0
    "..........................",  # 1
    "...CC....CC...............",  # 2
    "...CCCCCCCC...............",  # 3
    "...CCCCCCCC...............",  # 4
    "...CC....CC...............",  # 5
    "..........................",  # 6
    "..........................",  # 7
    "..............BBBBBBBB....",  # 8
    ".............DDDBBBBBB....",  # 9
    ".............DDDBBBBBB....",  # 10
    ".............DDDBBNWBB....",  # 11
    ".............DDDBBNNBBBBNN",  # 12
    ".............DDDBBBBBBBBNN",  # 13
    "DD...........DDDBBBBBB....",  # 14
    ".DD...........BBBBBB......",  # 15
    "..DD........CCCCCCCC......",  # 16
    "..BBBBBBBBBBBBBBGBBB......",  # 17
    "..BBBBBBBBBBBBBBBBBB......",  # 18
    "..BBBBBBBBBBBBBBBBBB......",  # 19
    "..BBBBBBBBBBBBBBBBBB......",  # 20
    "...BBBBBBBBBBBBBBBB.......",  # 21
    "....BBB.DDD..BBB..DDD.....",  # 22
    "....BBB.DDD..BBB..DDD.....",  # 23
    "....BBB.DDD..BBB..DDD.....",  # 24
    "....TTTT.DDD.TTTT.DDD.....",  # 25
]
GRID = len(SPRITE)


def sample(u, v, scale):
    """Nearest-neighbour sample of the sprite in unit coords, scaled about centre."""
    x = (u - 0.5) / scale + 0.5
    y = (v - 0.5) / scale + 0.5
    i = int(x * GRID)
    j = int(y * GRID)
    if 0 <= i < GRID and 0 <= j < GRID:
        return PALETTE[SPRITE[j][i]]
    return PALETTE["."]


def render(size, scale=1.0):
    rows = []
    for py in range(size):
        row = bytearray()
        v = (py + 0.5) / size
        for px in range(size):
            u = (px + 0.5) / size
            row += bytes(sample(u, v, scale))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    path.write_bytes(png)
    print(f"wrote {path} ({len(png)} bytes)")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size, scale in [
        ("icon-512.png", 512, 1.0),
        ("icon-192.png", 192, 1.0),
        ("maskable-512.png", 512, 0.72),
        ("apple-touch-icon.png", 180, 1.0),
    ]:
        write_png(OUT / name, size, render(size, scale))


if __name__ == "__main__":
    main()
