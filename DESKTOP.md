# Margins as a Mac app

This turns Margins into a real macOS application you can keep in your Dock and
open any time — no Terminal needed after the first setup. Your essays are saved
as **`.md` files in `~/Documents/Margins`**, so they're easy to find in Finder,
included in Time Machine / iCloud backups, and never tied to the app itself.

## One-time setup (in Terminal)

```bash
cd ~/Desktop/cesca        # wherever you cloned it
git pull                  # get the latest
npm install               # downloads Electron the first time (~1–2 min)
```

## Option A — just run it as an app (quickest)

```bash
npm run app
```

This builds the app and opens it in its own window. Great for everyday use. To
stop it, close the window (and `Ctrl-C` in Terminal). Run `npm run app` whenever
you want it again.

## Option B — build a real installable app (put it in Applications)

```bash
npm run dist:mac
```

When it finishes, open the `release/` folder — you'll find **`Margins-0.1.0.dmg`**
(and `Margins-0.1.0-arm64.dmg` on Apple Silicon). Double-click the `.dmg`, then
drag **Margins** into your **Applications** folder. Now it's a normal Mac app:
launch it from Spotlight or the Dock, keep it there for good.

### First launch: "unidentified developer"

Because this is your own app (not signed with an Apple Developer account),
macOS may refuse to open it the first time. To allow it:

- **Right-click** the Margins app → **Open** → **Open** in the dialog, **or**
- **System Settings → Privacy & Security** → scroll down → **Open Anyway**.

You only need to do this once.

## Where your writing lives

- Every essay is a `.md` file in **`~/Documents/Margins`**.
- Saved versions live in `~/Documents/Margins/versions/`.
- In the app menu: **File → Reveal Essays Folder in Finder** (or **Margins →
  Where are my essays?**) opens that folder any time.

Because the files are plain markdown in your Documents folder:

- **Time Machine** and **iCloud Desktop & Documents** back them up automatically.
- You can open, read, or edit them in any other app (iA Writer, Obsidian, etc.).
- Reinstalling or updating Margins never touches them.

## Updating the app

```bash
git pull
npm install        # only if dependencies changed
npm run dist:mac   # rebuild; reinstall from the new .dmg
```

Your essays in `~/Documents/Margins` are untouched by updates.
