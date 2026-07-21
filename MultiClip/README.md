# MultiClip

A tiny macOS clipboard app that lets you hold **three copies at once**, with
live **1 · 2 · 3 buttons in your Dock** that light up as you copy and paste.

## How it works

| Action | What happens |
|---|---|
| `⌘C` | Captures what you copied into the next slot (1 → 2 → 3, then cycles back to 1) |
| `⌘⌥1`, `⌘⌥2`, `⌘⌥3` | Pastes that slot into whatever app you're in |
| `⌘C` `⌘C` (twice quickly) | Resets all three slots |

The Dock icon shows the three slots and updates in real time:

- **Gray** — slot is empty
- **Blue** — slot holds something you copied
- **Green** — slot has been pasted

You can also **right-click the Dock icon** to see a preview of each slot,
load one onto the clipboard, or reset.

> The paste hotkeys are `⌘⌥1/2/3` (not plain `⌘1/2/3`) so they don't clash
> with tab switching in browsers.

## Build & run

Requires macOS 13+ and the Xcode Command Line Tools (`xcode-select --install`).

```sh
cd MultiClip
make run
```

This builds the app, wraps it in `MultiClip.app`, and opens it. The 1-2-3
icon appears in your Dock immediately.

### One-time permission

The first launch asks for **Accessibility** access
(System Settings → Privacy & Security → Accessibility → enable MultiClip).
This is what lets `⌘⌥1/2/3` type the paste into the frontmost app for you.
Until it's granted, the hotkeys still load the slot onto the clipboard — you
just press `⌘V` yourself.

## Notes

- Text clipboard content is supported (images/files are ignored for now).
- Copy capture works by watching the system pasteboard, so it picks up
  copies from any app, not just `⌘C` in one place.
- Quit from the Dock icon's right-click menu (Quit) like any app.
