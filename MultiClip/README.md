# MultiClip

A tiny macOS clipboard app that lets you hold **three copies at once**, with
live **1 · 2 · 3 buttons in your Dock** that light up as you copy and paste —
plus a small **floating three-dot pill** (like Wispr Flow's) that stays on
top of every app and every space.

## How it works

| Action | What happens |
|---|---|
| `⌘C` | Captures what you copied into the next slot (1 → 2 → 3, then cycles back to 1) |
| `⌘⌥1`, `⌘⌥2`, `⌘⌥3` | Pastes that slot into whatever app you're in |
| Hold `⌘`, tap `C` `C` (twice quickly) | Resets all three slots |

The Dock icon shows the three slots and updates in real time:

- **Gray** — slot is empty
- **Blue** — slot holds something you copied
- **Green** — slot has been pasted

You can also **right-click the Dock icon** to see a preview of each slot,
load one onto the clipboard, or reset.

## The floating dots

A small pill with three dots floats above everything — every app, every
desktop/space, even full-screen apps — using the same colors as the Dock
buttons (gray/blue/green).

- **Hover it** and it grows a bit and shows a preview of what each slot
  holds.
- **While it's expanded, click a dot** to paste that slot straight into the
  app you're working in (clicking doesn't steal focus from your app). A dot
  turns **green** once it has been pasted. Clicks on the collapsed pill do
  nothing, so you can't paste by accident.
- **Right-click it** to choose where it lives — **bottom center** (just above
  the Dock) or **on the side** (right edge) — or to hide it. Your choice is
  remembered. You can bring it back or move it any time from the Dock icon's
  right-click menu too.

> The paste hotkeys are `⌘⌥1/2/3` (not plain `⌘1/2/3`) so they don't clash
> with tab switching in browsers.

The reset gesture requires holding `⌘` down the whole time — you press and
hold `⌘`, then rapidly tap `C` twice. This works even without any
permissions granted: copying the same thing twice within ~0.7 s is also
detected on the clipboard itself and treated as a reset.

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

## Troubleshooting

**Auto-paste or the reset gesture stopped working after rebuilding?**
Rebuilding re-signs the app, and macOS silently invalidates the old
Accessibility grant — even though the checkbox in System Settings still
looks enabled. Fix it with:

```sh
tccutil reset Accessibility com.cesca.multiclip
```

then relaunch the app and grant Accessibility again when prompted.

**A dot turned green** — green just means "this slot has been pasted".
Pasting happens when you press `⌘⌥1/2/3` or click a dot in the expanded
pill. Reset (hold `⌘`, tap `C` `C`) turns everything back to gray.

## Notes

- Text clipboard content is supported (images/files are ignored for now).
- Copy capture works by watching the system pasteboard, so it picks up
  copies from any app, not just `⌘C` in one place.
- Quit from the Dock icon's right-click menu (Quit) like any app.
