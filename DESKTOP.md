# Use Margins as an app on your Mac

No installers, no Gatekeeper warnings. Margins runs a tiny local server and you
open it in your browser — and you can pin it to your Dock so it feels and opens
like a normal app. Your essays are saved as **`.md` files in `~/Documents/Margins`**,
so they're easy to find in Finder, backed up by Time Machine / iCloud, and never
tied to the app.

## Everyday use (simple)

In Terminal, in the project folder:

```bash
npm run margins
```

This builds the app and starts it. Open **http://localhost:3001** in your
browser. When you're done, press `Ctrl-C` in Terminal. Run `npm run margins`
again whenever you want it.

## Always on + pinned to your Dock (recommended)

This makes Margins start automatically every time you log in and stay running in
the background, at a fixed address — so you never touch Terminal again.

```bash
npm run autostart
```

Then open **http://localhost:4321** and add it to your Dock:

- **Safari 17+:** File → **Add to Dock**.
- **Chrome/Edge:** ⋮ menu → **Cast, Save, and Share → Install page as app…**
  (or the install icon in the address bar).

Now Margins has its own icon in your Dock and opens in its own window like any
Mac app — but with none of the "unidentified developer / malware" nonsense,
because it's just your browser opening a page on your own computer.

To turn off auto-start later:

```bash
launchctl unload ~/Library/LaunchAgents/com.margins.server.plist
rm ~/Library/LaunchAgents/com.margins.server.plist
```

## Where your writing lives

- Every essay is a `.md` file in **`~/Documents/Margins`**.
- Saved versions live in `~/Documents/Margins/versions/`.

Because they're plain markdown in your Documents folder:

- **Time Machine** and **iCloud Desktop & Documents** back them up automatically.
- You can open them in any other app (iA Writer, Obsidian, etc.).
- Updating Margins never touches them.

## Updating

```bash
git pull
npm install        # only if dependencies changed
npm run margins    # or, if you use auto-start: npm run autostart
```
