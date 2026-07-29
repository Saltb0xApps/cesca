import AppKit
import Carbon.HIToolbox

// MultiClip — a tiny multi-slot clipboard that lives in the Dock.
//
//   ⌘C             captures into the next free slot (fills 1 → N, cycles)
//   <combo>+1 … 5  pastes that slot into the frontmost app (default ⌘⌥)
//   ⌘ + C C        hold ⌘ and tap C twice to reset all slots
//
// The Dock icon shows one numbered button per slot:
//   gray = empty, blue = holds a copy, green = has been pasted.
//
// Floating dots (Widget.swift) stay on top of every app and space; hover
// them to preview and organize the slots (drag rows to reorder, ✕ to
// delete). Settings (Settings.swift) opens on first launch and via the
// Dock or right-click menus.

let slotCountKey = "slotCount"
var slotCount = min(max(UserDefaults.standard.object(forKey: slotCountKey) as? Int ?? 3, 2), 5)
private let doubleTapWindow: TimeInterval = 0.6
private let doubleCopyResetWindow: TimeInterval = 1.0
private let hotKeySignature: OSType = 0x4D43_4C50 // 'MCLP'

let hotkeyComboKey = "hotkeyCombo"
let appVersion = "1.3"

/// The modifier combination used with 1…5 to paste a slot.
enum HotkeyCombo: String, CaseIterable {
    case cmdOpt
    case cmdCtrl
    case ctrlOpt
    case cmdShift

    var carbonFlags: UInt32 {
        switch self {
        case .cmdOpt: return UInt32(cmdKey) | UInt32(optionKey)
        case .cmdCtrl: return UInt32(cmdKey) | UInt32(controlKey)
        case .ctrlOpt: return UInt32(controlKey) | UInt32(optionKey)
        case .cmdShift: return UInt32(cmdKey) | UInt32(shiftKey)
        }
    }

    var display: String {
        switch self {
        case .cmdOpt: return "⌘⌥"
        case .cmdCtrl: return "⌘⌃"
        case .ctrlOpt: return "⌃⌥"
        case .cmdShift: return "⌘⇧"
        }
    }

    var title: String {
        switch self {
        case .cmdOpt: return "⌘ Command + ⌥ Option + number  (default)"
        case .cmdCtrl: return "⌘ Command + ⌃ Control + number"
        case .ctrlOpt: return "⌃ Control + ⌥ Option + number"
        case .cmdShift: return "⌘ Command + ⇧ Shift + number"
        }
    }
}

enum SlotState {
    case empty
    case filled // copied, waiting to be pasted
    case used   // pasted at least once
}

struct Slot {
    var text: String?
    var state: SlotState = .empty
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    static var shared: AppDelegate!

    private(set) var slots = Array(repeating: Slot(), count: slotCount)
    private var nextIndex = 0

    private var lastChangeCount = NSPasteboard.general.changeCount
    private var suppressCaptureUntil = Date.distantPast

    // Permission-free reset fallback: two copies of the same content in
    // quick succession (what ⌘+C C produces) reset the slots even when the
    // key monitors can't see the keyboard (Accessibility not granted).
    private var lastCopyText: String?
    private var lastCopyTime = Date.distantPast

    // Double-C reset tracking: ⌘ must stay held between the two C taps.
    private var awaitingSecondC = false
    private var firstCDownTime = Date.distantPast

    private var pollTimer: Timer?
    private var hotKeyRefs: [EventHotKeyRef?] = []
    private var keyMonitors: [Any] = []

    private(set) var hotkeyCombo = HotkeyCombo(rawValue: UserDefaults.standard.string(forKey: hotkeyComboKey) ?? "") ?? .cmdOpt

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        AppDelegate.shared = self

        // Belt and suspenders against stale builds: if an older instance is
        // still running, terminate it so this (newer) one takes over.
        if let bundleID = Bundle.main.bundleIdentifier {
            for app in NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
            where app != NSRunningApplication.current {
                app.forceTerminate()
            }
        }

        NSApp.setActivationPolicy(.regular)
        redrawDockIcon()
        installHotKeyHandler()
        registerHotKeys()
        installResetKeyMonitors()
        promptForAccessibilityIfNeeded()
        ClipWidget.shared.start()

        // Fast poll so two quick ⌘C presses are seen as two separate
        // pasteboard changes (the reset gesture) instead of being merged.
        pollTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            self?.pollPasteboard()
        }

        if !UserDefaults.standard.bool(forKey: "didShowWelcome") {
            UserDefaults.standard.set(true, forKey: "didShowWelcome")
            SettingsWindowController.shared.show()
        }
    }

    // MARK: - Clipboard capture

    private func pollPasteboard() {
        let pb = NSPasteboard.general
        guard pb.changeCount != lastChangeCount else { return }
        lastChangeCount = pb.changeCount

        // Right after a double-C reset, the second C's copy still lands on the
        // pasteboard — swallow it so it doesn't refill slot 1.
        guard Date() >= suppressCaptureUntil else { return }

        guard let text = pb.string(forType: .string), !text.isEmpty else { return }

        let now = Date()
        // The lower bound filters out apps that write the pasteboard twice
        // for a single ⌘C (two identical changes milliseconds apart), which
        // would otherwise look like the reset gesture.
        let sinceLastCopy = now.timeIntervalSince(lastCopyTime)
        if text == lastCopyText, sinceLastCopy <= doubleCopyResetWindow, sinceLastCopy >= 0.12 {
            reset()
            return
        }
        lastCopyText = text
        lastCopyTime = now

        // Fill the first empty slot if there is one (e.g. after a deletion),
        // otherwise cycle round-robin.
        let targetIndex = slots.firstIndex(where: { $0.state == .empty }) ?? (nextIndex % slotCount)
        slots[targetIndex] = Slot(text: text, state: .filled)
        nextIndex = (targetIndex + 1) % slotCount
        redrawDockIcon()
    }

    /// Moves a slot to a new position (drag-reorder in the preview panel).
    /// Hotkeys always match the visible order: ⌘⌥1 is the top row.
    func moveSlot(from: Int, to: Int) {
        guard slots.indices.contains(from), slots.indices.contains(to), from != to else { return }
        let moved = slots.remove(at: from)
        slots.insert(moved, at: to)
        redrawDockIcon()
    }

    /// Empties a single slot (the ✕ button in the preview panel).
    func clearSlot(_ index: Int) {
        guard slots.indices.contains(index) else { return }
        slots[index] = Slot()
        redrawDockIcon()
    }

    func reset() {
        slots = Array(repeating: Slot(), count: slotCount)
        nextIndex = 0
        lastCopyText = nil
        redrawDockIcon()
    }

    /// Changes how many slots there are (2–5). Clears everything, since the
    /// slots and their hotkeys are renumbered.
    func setSlotCount(_ count: Int) {
        let clamped = min(max(count, 2), 5)
        guard clamped != slotCount else { return }
        slotCount = clamped
        UserDefaults.standard.set(clamped, forKey: slotCountKey)
        registerHotKeys()
        reset()
        ClipWidget.shared.settingsChanged()
    }

    // MARK: - ⌘ + C C reset detection

    /// Watches raw key events so the reset gesture is: hold ⌘, tap C twice
    /// quickly. Releasing ⌘ between the taps cancels the gesture, so two
    /// separate ⌘C copies never trigger a reset.
    private func installResetKeyMonitors() {
        let keyDownHandler: (NSEvent) -> Void = { [weak self] event in
            self?.handleKeyDown(event)
        }
        let flagsHandler: (NSEvent) -> Void = { [weak self] event in
            if !event.modifierFlags.contains(.command) {
                self?.awaitingSecondC = false
            }
        }

        // Global monitors cover every other app; local ones cover our own.
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .keyDown, handler: keyDownHandler) {
            keyMonitors.append(m)
        }
        if let m = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged, handler: flagsHandler) {
            keyMonitors.append(m)
        }
        keyMonitors.append(NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            keyDownHandler(event)
            return event
        } as Any)
        keyMonitors.append(NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { event in
            flagsHandler(event)
            return event
        } as Any)
    }

    private func handleKeyDown(_ event: NSEvent) {
        guard event.keyCode == UInt16(kVK_ANSI_C),
              event.modifierFlags.contains(.command) else {
            awaitingSecondC = false
            return
        }

        let now = Date()
        if awaitingSecondC, now.timeIntervalSince(firstCDownTime) <= doubleTapWindow {
            // Second C while ⌘ stayed held — reset.
            awaitingSecondC = false
            suppressCaptureUntil = now.addingTimeInterval(0.8)
            reset()
        } else {
            awaitingSecondC = true
            firstCDownTime = now
        }
    }

    // MARK: - Pasting

    func pasteSlot(_ index: Int) {
        guard slots.indices.contains(index), let text = slots[index].text else { return }

        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(text, forType: .string)
        lastChangeCount = pb.changeCount // don't re-capture our own write

        slots[index].state = .used
        redrawDockIcon()
        sendCmdV()
    }

    /// Loads a slot onto the system clipboard without synthesizing ⌘V
    /// (used from the Dock menu, where the frontmost app is ambiguous).
    func loadSlotToClipboard(_ index: Int) {
        guard slots.indices.contains(index), let text = slots[index].text else { return }
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(text, forType: .string)
        lastChangeCount = pb.changeCount
        slots[index].state = .used
        redrawDockIcon()
    }

    private func sendCmdV() {
        guard AXIsProcessTrusted() else { return } // clipboard is set; user can ⌘V manually
        let source = CGEventSource(stateID: .combinedSessionState)
        let vDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: true)
        let vUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_V), keyDown: false)
        vDown?.flags = .maskCommand
        vUp?.flags = .maskCommand
        // Small delay so the ⌥ still held from the hotkey is released first.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            vDown?.post(tap: .cghidEventTap)
            vUp?.post(tap: .cghidEventTap)
        }
    }

    // MARK: - Global hotkeys (⌘⌥1 … ⌘⌥5, one per slot)

    private func installHotKeyHandler() {
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )
        InstallEventHandler(GetApplicationEventTarget(), { _, event, _ -> OSStatus in
            var hotKeyID = EventHotKeyID()
            GetEventParameter(
                event,
                EventParamName(kEventParamDirectObject),
                EventParamType(typeEventHotKeyID),
                nil,
                MemoryLayout<EventHotKeyID>.size,
                nil,
                &hotKeyID
            )
            let index = Int(hotKeyID.id) - 1
            DispatchQueue.main.async {
                AppDelegate.shared.pasteSlot(index)
            }
            return noErr
        }, 1, &eventType, nil, nil)
    }

    private func registerHotKeys() {
        for ref in hotKeyRefs {
            if let ref {
                UnregisterEventHotKey(ref)
            }
        }
        hotKeyRefs.removeAll()

        let keyCodes = [kVK_ANSI_1, kVK_ANSI_2, kVK_ANSI_3, kVK_ANSI_4, kVK_ANSI_5].map { UInt32($0) }
        for i in 0..<min(slotCount, keyCodes.count) {
            var ref: EventHotKeyRef?
            let id = EventHotKeyID(signature: hotKeySignature, id: UInt32(i + 1))
            let status = RegisterEventHotKey(
                keyCodes[i],
                hotkeyCombo.carbonFlags,
                id,
                GetApplicationEventTarget(),
                0,
                &ref
            )
            if status != noErr {
                NSLog("MultiClip: failed to register hotkey \(hotkeyCombo.display)\(i + 1) (status \(status))")
            }
            hotKeyRefs.append(ref)
        }
    }

    /// Changes the paste shortcut modifiers (Settings window).
    func setHotkeyCombo(_ combo: HotkeyCombo) {
        guard combo != hotkeyCombo else { return }
        hotkeyCombo = combo
        UserDefaults.standard.set(combo.rawValue, forKey: hotkeyComboKey)
        registerHotKeys()
        redrawDockIcon()
    }

    // MARK: - Dock icon

    private func redrawDockIcon() {
        let size = NSSize(width: 128, height: 128)
        let currentSlots = slots
        let image = NSImage(size: size, flipped: false) { rect in
            // Dark rounded tile.
            let tile = NSBezierPath(roundedRect: rect.insetBy(dx: 8, dy: 8), xRadius: 26, yRadius: 26)
            NSColor(calibratedRed: 0.11, green: 0.11, blue: 0.12, alpha: 1).setFill()
            tile.fill()

            let count = currentSlots.count
            let areaX: CGFloat = 16
            let areaWidth: CGFloat = 96
            let cellWidth = areaWidth / CGFloat(count)
            let pillWidth = min(cellWidth - 6, 26)
            let fontSize: CGFloat = count >= 4 ? 15 : 22

            for i in 0..<count {
                let cellMidX = areaX + cellWidth * (CGFloat(i) + 0.5)
                let cell = NSRect(x: cellMidX - pillWidth / 2, y: 34, width: pillWidth, height: 60)
                let pill = NSBezierPath(roundedRect: cell, xRadius: min(8, pillWidth / 3), yRadius: min(8, pillWidth / 3))

                let fill: NSColor
                let numberColor: NSColor
                switch currentSlots[i].state {
                case .empty:
                    fill = NSColor(calibratedWhite: 0.28, alpha: 1)
                    numberColor = NSColor(calibratedWhite: 0.65, alpha: 1)
                case .filled:
                    fill = .systemBlue
                    numberColor = .white
                case .used:
                    fill = .systemGreen
                    numberColor = .white
                }
                fill.setFill()
                pill.fill()

                let paragraph = NSMutableParagraphStyle()
                paragraph.alignment = .center
                let attrs: [NSAttributedString.Key: Any] = [
                    .font: NSFont.systemFont(ofSize: fontSize, weight: .bold),
                    .foregroundColor: numberColor,
                    .paragraphStyle: paragraph,
                ]
                let label = NSAttributedString(string: "\(i + 1)", attributes: attrs)
                let textRect = NSRect(x: cell.minX, y: cell.midY - 14, width: cell.width, height: 28)
                label.draw(in: textRect)
            }
            return true
        }
        NSApp.applicationIconImage = image
        ClipWidget.shared.refresh()
    }

    // MARK: - Dock menu

    func applicationDockMenu(_ sender: NSApplication) -> NSMenu? {
        let menu = NSMenu()
        let versionItem = NSMenuItem(title: "MultiClip v\(appVersion)", action: nil, keyEquivalent: "")
        versionItem.isEnabled = false
        menu.addItem(versionItem)
        menu.addItem(.separator())
        for (i, slot) in slots.enumerated() {
            let title: String
            if let text = slot.text {
                let flattened = text.replacingOccurrences(of: "\n", with: " ")
                let preview = flattened.count > 30 ? String(flattened.prefix(30)) + "…" : flattened
                title = "\(i + 1): \(preview)   (\(hotkeyCombo.display)\(i + 1))"
            } else {
                title = "\(i + 1): (empty)"
            }
            let item = NSMenuItem(
                title: title,
                action: slot.text == nil ? nil : #selector(dockLoadSlot(_:)),
                keyEquivalent: ""
            )
            item.target = self
            item.tag = i
            menu.addItem(item)
        }
        menu.addItem(.separator())
        let resetItem = NSMenuItem(title: "Reset Slots   (hold ⌘, tap C twice)", action: #selector(dockReset), keyEquivalent: "")
        resetItem.target = self
        menu.addItem(resetItem)

        menu.addItem(.separator())
        let toggleTitle = ClipWidget.shared.isShown ? "Hide Floating Dots" : "Show Floating Dots"
        let toggleItem = NSMenuItem(title: toggleTitle, action: #selector(dockToggleWidget), keyEquivalent: "")
        toggleItem.target = self
        menu.addItem(toggleItem)

        let bottomItem = NSMenuItem(title: "Dots at the Bottom", action: #selector(dockWidgetBottom), keyEquivalent: "")
        bottomItem.target = self
        bottomItem.state = ClipWidget.shared.placement == .bottom ? .on : .off
        menu.addItem(bottomItem)

        let sideItem = NSMenuItem(title: "Dots on the Side", action: #selector(dockWidgetSide), keyEquivalent: "")
        sideItem.target = self
        sideItem.state = ClipWidget.shared.placement == .side ? .on : .off
        menu.addItem(sideItem)

        let notchItem = NSMenuItem(title: "Notch Island (top center)", action: #selector(dockWidgetNotch), keyEquivalent: "")
        notchItem.target = self
        notchItem.state = ClipWidget.shared.placement == .notch ? .on : .off
        menu.addItem(notchItem)

        menu.addItem(.separator())
        let settingsItem = NSMenuItem(title: "Settings…", action: #selector(dockSettings), keyEquivalent: "")
        settingsItem.target = self
        menu.addItem(settingsItem)

        return menu
    }

    @objc private func dockWidgetNotch() {
        ClipWidget.shared.setPlacement(.notch)
    }

    @objc private func dockSettings() {
        SettingsWindowController.shared.show()
    }

    @objc private func dockToggleWidget() {
        if ClipWidget.shared.isShown {
            ClipWidget.shared.hide()
        } else {
            ClipWidget.shared.show()
        }
    }

    @objc private func dockWidgetBottom() {
        ClipWidget.shared.setPlacement(.bottom)
    }

    @objc private func dockWidgetSide() {
        ClipWidget.shared.setPlacement(.side)
    }

    @objc private func dockLoadSlot(_ sender: NSMenuItem) {
        loadSlotToClipboard(sender.tag)
    }

    @objc private func dockReset() {
        reset()
    }

    // MARK: - Permissions

    private func promptForAccessibilityIfNeeded() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        AXIsProcessTrustedWithOptions(options)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
