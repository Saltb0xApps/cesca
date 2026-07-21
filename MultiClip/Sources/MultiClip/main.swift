import AppKit
import Carbon.HIToolbox

// MultiClip — a tiny multi-slot clipboard that lives in the Dock.
//
//   ⌘C           captures into the next free slot (1 → 2 → 3, then cycles)
//   ⌘⌥1 / 2 / 3  pastes that slot into the frontmost app
//   ⌘ + C C      hold ⌘ and tap C twice quickly to reset all slots
//                (releasing ⌘ between the two Cs does NOT reset)
//
// The Dock icon shows three numbered buttons:
//   gray  = empty, blue = holds a copy, green = has been pasted.
//
// A floating three-dot pill (see Widget.swift) also stays on top of every
// app and space; hover it to preview the slots, click a dot (while
// expanded) to paste it, right-click to move it to the bottom/side or
// hide it.

let slotCountKey = "slotCount"
var slotCount = min(max(UserDefaults.standard.object(forKey: slotCountKey) as? Int ?? 3, 2), 5)
private let doubleTapWindow: TimeInterval = 0.5
private let hotKeySignature: OSType = 0x4D43_4C50 // 'MCLP'

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

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        AppDelegate.shared = self
        NSApp.setActivationPolicy(.regular)
        redrawDockIcon()
        installHotKeyHandler()
        registerHotKeys()
        installResetKeyMonitors()
        promptForAccessibilityIfNeeded()
        ClipWidget.shared.start()

        pollTimer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in
            self?.pollPasteboard()
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
        if text == lastCopyText, now.timeIntervalSince(lastCopyTime) <= doubleTapWindow + 0.2 {
            reset()
            return
        }
        lastCopyText = text
        lastCopyTime = now

        slots[nextIndex] = Slot(text: text, state: .filled)
        nextIndex = (nextIndex + 1) % slotCount
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
            RegisterEventHotKey(
                keyCodes[i],
                UInt32(cmdKey) | UInt32(optionKey),
                id,
                GetApplicationEventTarget(),
                0,
                &ref
            )
            hotKeyRefs.append(ref)
        }
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
        for (i, slot) in slots.enumerated() {
            let title: String
            if let text = slot.text {
                let flattened = text.replacingOccurrences(of: "\n", with: " ")
                let preview = flattened.count > 30 ? String(flattened.prefix(30)) + "…" : flattened
                title = "\(i + 1): \(preview)   (⌘⌥\(i + 1))"
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

        return menu
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
