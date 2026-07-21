# Clip Organizer

A small command-line tool that automatically organizes a folder of video clips:

- **By date** — each clip goes into a `YYYYMMDD` folder based on when it was recorded (read from the video's metadata, falling back to the file's modification time).
- **By content** — Claude looks at a few frames extracted from each clip and decides what it's about (pets, travel, food, screen recordings, …), which becomes a subfolder.

The result looks like:

```
organized/
├── 20240601/
│   ├── travel/
│   │   └── IMG_2041.mp4
│   └── food/
│       └── IMG_2044.mov
└── 20240615/
    └── pets/
        └── VID_0012.mp4
```

## Setup

1. Install [ffmpeg](https://ffmpeg.org) (`brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Ubuntu). Both `ffmpeg` and `ffprobe` need to be on your PATH.
2. Install the Python dependency:

   ```sh
   pip install -r requirements.txt
   ```

3. Set your Anthropic API key:

   ```sh
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

   (If you use the `ant` CLI, an `ant auth login` profile works too — no key needed.)

## Usage

Preview what would happen without touching any files:

```sh
python organize_clips.py ~/Videos/clips --dry-run
```

Actually organize (moves files into `~/Videos/clips/organized/` by default):

```sh
python organize_clips.py ~/Videos/clips
```

Useful options:

| Option | What it does |
|---|---|
| `--dry-run` | Show the plan without moving anything |
| `--copy` | Copy files instead of moving them |
| `--dest DIR` | Put the organized files somewhere else |
| `--category-first` | Use `category/YYYYMMDD/` layout instead of `YYYYMMDD/category/` |
| `--model NAME` | Use a different Claude model (default `claude-opus-4-8`) |

## Notes

- The tool searches the source folder **recursively** and recognizes common video formats (`.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, and more).
- Name collisions are handled by suffixing (`clip.mp4` → `clip_1.mp4`), never by overwriting.
- A `organize_manifest.json` file is written to the destination recording where every clip came from, its date, category, and a one-line description — handy if you ever want to audit or undo a run.
- Categories are folder-friendly slugs. Claude prefers a stable set of common categories (family, pets, food, travel, sports, screen-recording, …) so folders stay consistent across runs, but can invent a new one when nothing fits.
- Clips that fail to process (corrupt file, API error) are skipped with a warning; the rest of the run continues.
