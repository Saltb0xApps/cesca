import AppKit
import Carbon.HIToolbox

// MultiClip — a tiny multi-slot clipboard that lives in the Dock.
//
//   ⌘C           captures into the next free slot (1 → 2 → 3, then cycles)
//   ⌘⌥1 / 2 / 3  pastes that slot into the frontmost app
//   ⌘C ⌘C        (twice within 0.6 s) resets all slots
//
// The Dock icon shows three numbered buttons:
//   gray  = empty, blue = holds a copy, green = has been pasted.

private let slotCount = 3
private let doubleCopyWindow: TimeInterval = 0.6
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
    private var lastCopyText: String?
    private var lastCopyTime = Date.distantPast

    private var pollTimer: Timer?
    private var hotKeyRefs: [EventHotKeyRef?] = []

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        AppDelegate.shared = self
        NSApp.setActivationPolicy(.regular)
        redrawDockIcon()
        registerHotKeys()
        promptForAccessibilityIfNeeded()

        pollTimer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in
            self?.pollPasteboard()
        }
    }

    // MARK: - Clipboard capture

    private func pollPasteboard() {
        let pb = NSPasteboard.general
        guard pb.changeCount != lastChangeCount else { return }
        lastChangeCount = pb.changeCount

        guard let text = pb.string(forType: .string), !text.isEmpty else { return }

        let now = Date()
        if text == lastCopyText, now.timeIntervalSince(lastCopyTime) <= doubleCopyWindow {
            // ⌘C ⌘C — same content copied twice in quick succession: reset.
            reset()
            lastCopyText = nil
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
        redrawDockIcon()
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

    // MARK: - Global hotkeys (⌘⌥1 / ⌘⌥2 / ⌘⌥3)

    private func registerHotKeys() {
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

        let keyCodes = [UInt32(kVK_ANSI_1), UInt32(kVK_ANSI_2), UInt32(kVK_ANSI_3)]
        for (i, keyCode) in keyCodes.enumerated() {
            var ref: EventHotKeyRef?
            let id = EventHotKeyID(signature: hotKeySignature, id: UInt32(i + 1))
            RegisterEventHotKey(
                keyCode,
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

            for i in 0..<slotCount {
                let cell = NSRect(x: 20 + CGFloat(i) * 32, y: 34, width: 24, height: 60)
                let pill = NSBezierPath(roundedRect: cell, xRadius: 8, yRadius: 8)

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
                    .font: NSFont.systemFont(ofSize: 22, weight: .bold),
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
        let resetItem = NSMenuItem(title: "Reset Slots   (⌘C ⌘C)", action: #selector(dockReset), keyEquivalent: "")
        resetItem.target = self
        menu.addItem(resetItem)
        return menu
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
