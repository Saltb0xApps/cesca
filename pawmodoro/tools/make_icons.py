#!/usr/bin/env python3
"""Generate Pawmodoro PNG icons with no image-library dependencies.

Renders a flat dachshund silhouette with signed-distance functions and writes
PNGs by hand (zlib + struct). Run from anywhere:

    python3 tools/make_icons.py
"""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"

CREAM = (0xFB, 0xF1, 0xE1)
BROWN = (0x8E, 0x4E, 0x22)
EAR = (0x6B, 0x39, 0x15)
DARK = (0x3A, 0x25, 0x17)
TERRA = (0xC9, 0x6F, 0x3B)


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


def sd_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r


def sd_seg(px, py, ax, ay, bx, by, r):
    vx, vy = bx - ax, by - ay
    t = clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0.0, 1.0)
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy)) - r


def sd_rrect(px, py, x0, y0, x1, y1, r):
    cx = clamp(px, x0 + r, x1 - r)
    cy = clamp(py, y0 + r, y1 - r)
    return math.hypot(px - cx, py - cy) - r


def dog_sdf(x, y):
    """Dachshund silhouette in unit coords (y down). Negative = inside."""
    d = sd_rrect(x, y, 0.09, 0.545, 0.71, 0.72, 0.088)         # loooong low body
    d = min(d, sd_seg(x, y, 0.64, 0.60, 0.705, 0.475, 0.078))  # neck
    d = min(d, sd_circle(x, y, 0.725, 0.425, 0.095))           # head
    d = min(d, sd_seg(x, y, 0.78, 0.445, 0.885, 0.455, 0.048)) # snout
    for lx in (0.165, 0.255, 0.545, 0.635):                    # stubby legs
        d = min(d, sd_seg(x, y, lx, 0.68, lx, 0.805, 0.033))
    d = min(d, sd_seg(x, y, 0.105, 0.575, 0.035, 0.455, 0.021))  # tail
    return d


def ear_sdf(x, y):
    """Floppy ear, drawn darker over the head."""
    return sd_seg(x, y, 0.695, 0.39, 0.662, 0.535, 0.043)


def bone_sdf(x, y, cx, cy, s):
    """Little bone accent centred at (cx, cy), scale s."""
    d = sd_seg(x, y, cx - 0.06 * s, cy, cx + 0.06 * s, cy, 0.020 * s)
    for ex in (cx - 0.06 * s, cx + 0.06 * s):
        for ey in (cy - 0.020 * s, cy + 0.020 * s):
            d = min(d, sd_circle(x, y, ex, ey, 0.026 * s))
    return d


def blend(base, top, a):
    return tuple(int(round(b + (t - b) * a)) for b, t in zip(base, top))


def coverage(d_unit, size):
    # ~1px anti-aliased edge
    return clamp(0.5 - d_unit * size, 0.0, 1.0)


def render(size, scale=1.0):
    """Render the icon; scale < 1 shrinks art toward centre (maskable safe zone)."""
    rows = []
    inv = 1.0 / size
    for j in range(size):
        row = bytearray()
        for i in range(size):
            # map pixel to unit coords, applying safe-zone scale about centre
            x = ((i + 0.5) * inv - 0.5) / scale + 0.5
            y = ((j + 0.5) * inv - 0.5) / scale + 0.5
            px = CREAM
            px = blend(px, BROWN, coverage(dog_sdf(x, y), size * scale))
            px = blend(px, EAR, coverage(ear_sdf(x, y), size * scale))                            # ear
            px = blend(px, CREAM, coverage(sd_circle(x, y, 0.752, 0.398, 0.016), size * scale))  # eye
            px = blend(px, DARK, coverage(sd_circle(x, y, 0.893, 0.455, 0.027), size * scale))   # nose
            px = blend(px, TERRA, coverage(bone_sdf(x, y, 0.29, 0.315, 1.0), size * scale))      # bone
            row += bytes(px)
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
