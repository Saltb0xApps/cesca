#!/usr/bin/env python3
"""Organize video clips into date + category folders.

Scans a folder for video clips, figures out when each clip was recorded
(video metadata, falling back to file modification time), asks Claude what
the clip contains by looking at a few extracted frames, and files it into:

    <dest>/<YYYYMMDD>/<category>/<filename>

Requirements:
    - ffmpeg + ffprobe on PATH (https://ffmpeg.org)
    - pip install anthropic
    - ANTHROPIC_API_KEY set in the environment (or an `ant auth login` profile)

Usage:
    python organize_clips.py ~/Videos/clips                    # dry run by default? no — moves files
    python organize_clips.py ~/Videos/clips --dry-run          # preview only
    python organize_clips.py ~/Videos/clips --copy             # copy instead of move
    python organize_clips.py ~/Videos/clips --dest ~/Videos/organized
    python organize_clips.py ~/Videos/clips --category-first   # <category>/<YYYYMMDD>/ layout
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import anthropic

VIDEO_EXTENSIONS = {
    ".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm",
    ".3gp", ".mts", ".m2ts", ".wmv", ".flv", ".mpg", ".mpeg",
}

# Suggested categories keep folder names consistent across runs; Claude may
# still coin a new one when nothing fits.
SUGGESTED_CATEGORIES = [
    "family", "friends", "pets", "food", "travel", "nature", "sports",
    "music", "concerts", "parties", "work", "screen-recording", "gaming",
    "vehicles", "home", "kids", "selfie", "misc",
]

CATEGORY_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "description": (
                "A single short folder-friendly category (lowercase, hyphens "
                "instead of spaces) describing the main subject of the video."
            ),
        },
        "description": {
            "type": "string",
            "description": "One short sentence describing what is in the video.",
        },
    },
    "required": ["category", "description"],
    "additionalProperties": False,
}

MODEL = "claude-opus-4-8"


def which_or_die(binary: str) -> None:
    if shutil.which(binary) is None:
        sys.exit(f"error: `{binary}` not found on PATH — install ffmpeg first (https://ffmpeg.org)")


def find_videos(source: Path) -> list[Path]:
    return sorted(
        p for p in source.rglob("*")
        if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS
    )


def ffprobe_json(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", "-show_streams", str(path),
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}


def clip_date(path: Path, probe: dict) -> str:
    """Return the recording date as YYYYMMDD.

    Prefers the container's creation_time tag (what the camera wrote),
    falls back to the file's modification time.
    """
    tags = probe.get("format", {}).get("tags", {})
    creation = tags.get("creation_time") or tags.get("com.apple.quicktime.creationdate")
    if creation:
        # Typical forms: 2024-06-01T18:22:33.000000Z / 2024-06-01T18:22:33+0200
        match = re.match(r"(\d{4})-(\d{2})-(\d{2})", creation)
        if match:
            return "".join(match.groups())
    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return mtime.strftime("%Y%m%d")


def clip_duration(probe: dict) -> float:
    try:
        return float(probe.get("format", {}).get("duration", 0.0))
    except (TypeError, ValueError):
        return 0.0


def extract_frames(path: Path, duration: float, count: int = 3) -> list[bytes]:
    """Grab `count` JPEG frames spread across the clip, downscaled for the API."""
    frames: list[bytes] = []
    # Sample at 15%, 50%, 85% of the duration; a zero/unknown duration
    # falls back to the first frame only.
    if duration > 1:
        offsets = [duration * f for f in (0.15, 0.5, 0.85)][:count]
    else:
        offsets = [0.0]

    with tempfile.TemporaryDirectory() as tmp:
        for i, offset in enumerate(offsets):
            out = Path(tmp) / f"frame_{i}.jpg"
            result = subprocess.run(
                [
                    "ffmpeg", "-v", "quiet", "-ss", f"{offset:.2f}", "-i", str(path),
                    "-frames:v", "1", "-vf", "scale='min(1024,iw)':-2",
                    "-q:v", "4", "-y", str(out),
                ],
                capture_output=True,
            )
            if result.returncode == 0 and out.exists() and out.stat().st_size > 0:
                frames.append(out.read_bytes())
    return frames


def categorize(client: anthropic.Anthropic, frames: list[bytes], filename: str) -> tuple[str, str]:
    """Ask Claude what the video contains. Returns (category, description)."""
    content: list[dict] = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": base64.standard_b64encode(frame).decode("ascii"),
            },
        }
        for frame in frames
    ]
    content.append({
        "type": "text",
        "text": (
            f"These are frames sampled from a video clip named '{filename}'. "
            "Categorize the clip by its main subject so it can be filed into a folder. "
            f"Prefer one of these existing categories when it fits: {', '.join(SUGGESTED_CATEGORIES)}. "
            "Only invent a new category if none of them fit."
        ),
    })

    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
        output_config={"format": {"type": "json_schema", "schema": CATEGORY_SCHEMA}},
    )
    if response.stop_reason == "refusal":
        return "misc", "categorization declined"
    text = next(b.text for b in response.content if b.type == "text")
    data = json.loads(text)
    category = slugify(data.get("category", "misc")) or "misc"
    return category, data.get("description", "")


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:40]


def unique_destination(dest: Path) -> Path:
    """Avoid overwriting: file.mp4 -> file_1.mp4, file_2.mp4, ..."""
    if not dest.exists():
        return dest
    stem, suffix = dest.stem, dest.suffix
    for i in range(1, 1000):
        candidate = dest.with_name(f"{stem}_{i}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"too many name collisions for {dest}")


def main() -> None:
    global MODEL
    parser = argparse.ArgumentParser(description="Organize video clips into YYYYMMDD/category folders using Claude.")
    parser.add_argument("source", type=Path, help="Folder containing the clips (searched recursively)")
    parser.add_argument("--dest", type=Path, default=None,
                        help="Destination root (default: <source>/organized)")
    parser.add_argument("--copy", action="store_true", help="Copy files instead of moving them")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without touching files")
    parser.add_argument("--category-first", action="store_true",
                        help="Use <category>/<YYYYMMDD>/ layout instead of <YYYYMMDD>/<category>/")
    parser.add_argument("--model", default=MODEL, help=f"Claude model to use (default: {MODEL})")
    args = parser.parse_args()

    which_or_die("ffmpeg")
    which_or_die("ffprobe")

    source = args.source.expanduser().resolve()
    if not source.is_dir():
        sys.exit(f"error: {source} is not a directory")
    dest_root = (args.dest.expanduser().resolve() if args.dest else source / "organized")
    MODEL = args.model

    videos = [v for v in find_videos(source) if dest_root not in v.parents]
    if not videos:
        sys.exit(f"No video files found under {source}")
    print(f"Found {len(videos)} clip(s) under {source}")
    print(f"Destination: {dest_root}  ({'copy' if args.copy else 'move'}{', dry-run' if args.dry_run else ''})\n")

    client = anthropic.Anthropic()
    manifest: list[dict] = []
    errors = 0

    for i, video in enumerate(videos, 1):
        rel = video.relative_to(source)
        try:
            probe = ffprobe_json(video)
            date = clip_date(video, probe)
            frames = extract_frames(video, clip_duration(probe))
            if frames:
                category, description = categorize(client, frames, video.name)
            else:
                category, description = "misc", "no frames could be extracted"

            parts = (category, date) if args.category_first else (date, category)
            target_dir = dest_root.joinpath(*parts)
            target = unique_destination(target_dir / video.name)

            print(f"[{i}/{len(videos)}] {rel}  ->  {target.relative_to(dest_root)}")
            if description:
                print(f"          {description}")

            if not args.dry_run:
                target_dir.mkdir(parents=True, exist_ok=True)
                if args.copy:
                    shutil.copy2(video, target)
                else:
                    shutil.move(str(video), target)

            manifest.append({
                "source": str(video),
                "destination": str(target),
                "date": date,
                "category": category,
                "description": description,
            })
        except anthropic.APIError as e:
            errors += 1
            print(f"[{i}/{len(videos)}] {rel}  !!  API error: {e}", file=sys.stderr)
        except Exception as e:  # keep going on a single bad file
            errors += 1
            print(f"[{i}/{len(videos)}] {rel}  !!  {e}", file=sys.stderr)

    if not args.dry_run and manifest:
        dest_root.mkdir(parents=True, exist_ok=True)
        manifest_path = dest_root / "organize_manifest.json"
        existing = []
        if manifest_path.exists():
            try:
                existing = json.loads(manifest_path.read_text())
            except json.JSONDecodeError:
                existing = []
        manifest_path.write_text(json.dumps(existing + manifest, indent=2))
        print(f"\nManifest written to {manifest_path}")

    done = len(manifest)
    print(f"\nDone: {done} organized, {errors} error(s)."
          + (" (dry run — nothing was moved)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
