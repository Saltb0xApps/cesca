# Adding the home-screen widget (~5 min in Xcode)

The widget lives in its own target, which must be created with Xcode's wizard
(it can't be hand-authored reliably in the project file). The widget's code is
already written — you just create the target and point it at the file.

## 1. Add the Widget Extension target
1. In Xcode: **File → New → Target…**
2. Choose **Widget Extension** → Next.
3. Product name: **PomoLeagueWidget**. Uncheck "Include Live Activity" and
   "Include Configuration Intent". Finish.
4. When prompted to "Activate scheme", click **Activate**.

Xcode generates a starter `PomoLeagueWidget.swift` inside a new group. **Delete
that generated file** (Move to Trash) and instead **add the existing one**:
`PomoLeagueApp/PomoLeagueWidget/PomoLeagueWidget.swift` — drag it into the
widget target, or File → Add Files… and check the **PomoLeagueWidget** target.

## 2. Turn on the App Group (so the app and widget share data)
Do this for **both** targets (PomoLeague and PomoLeagueWidget):
1. Select the target → **Signing & Capabilities** → **+ Capability** →
   **App Groups**.
2. Add a group named exactly: `group.com.cesca.pomoleague`
   (must match `SharedStore.suiteName` in the app and `appGroup` in the widget).

## 3. Run
Build the **PomoLeague** app scheme once and open the app (Home screen) so it
writes today's numbers. Then long-press your iPhone home screen → **+** →
search **PomoLeague** → add the widget.

The app refreshes the widget whenever you open Home or complete a pomo.

## Notes
- If the App Group isn't set up yet, the app still runs fine — the widget just
  shows zeros until the group is connected.
- Both targets need the same **Team** under Signing for App Groups to work on a
  real device.
