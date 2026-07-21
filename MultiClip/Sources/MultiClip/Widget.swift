import AppKit

// The floating dots widget — a tiny always-on-top pill (like Wispr Flow's)
// that stays visible on every space and every app, including full screen.
//
//   • Three dots mirror the slots: gray = empty, blue = copied, green = pasted.
//   • Hover it while holding ⌘ and it grows to preview what each slot holds.
//   • Click a dot to paste that slot into the app you're in.
//   • Right-click it to move it to the bottom or the side, or hide it.

enum WidgetEdge: String {
    case bottom
    case side
}

final class ClipWidget {
    static let shared = ClipWidget()

    private static let edgeKey = "widgetEdge"
    private static let visibleKey = "widgetVisible"

    private let panel: NSPanel
    private let view = WidgetView()

    private(set) var edge: WidgetEdge
    private(set) var expanded = false
    private var hovering = false
    private var commandDown = false

    var isShown: Bool { panel.isVisible }

    init() {
        edge = WidgetEdge(rawValue: UserDefaults.standard.string(forKey: Self.edgeKey) ?? "") ?? .bottom

        panel = NSPanel(
            contentRect: .zero,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .statusBar
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.contentView = view

        NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.applyFrame(animated: false)
        }
    }

    func start() {
        applyFrame(animated: false)
        let visible = UserDefaults.standard.object(forKey: Self.visibleKey) as? Bool ?? true
        if visible {
            panel.orderFrontRegardless()
        }
    }

    func show() {
        UserDefaults.standard.set(true, forKey: Self.visibleKey)
        applyFrame(animated: false)
        panel.orderFrontRegardless()
    }

    func hide() {
        UserDefaults.standard.set(false, forKey: Self.visibleKey)
        panel.orderOut(nil)
    }

    func setEdge(_ newEdge: WidgetEdge) {
        edge = newEdge
        UserDefaults.standard.set(newEdge.rawValue, forKey: Self.edgeKey)
        applyFrame(animated: true)
    }

    func refresh() {
        view.needsDisplay = true
    }

    func setCommandDown(_ down: Bool) {
        guard down != commandDown else { return }
        commandDown = down
        updateExpansion()
    }

    func setHovering(_ inside: Bool) {
        guard inside != hovering else { return }
        hovering = inside
        updateExpansion()
    }

    private func updateExpansion() {
        let shouldExpand = hovering && commandDown
        guard shouldExpand != expanded else { return }
        expanded = shouldExpand
        applyFrame(animated: true)
    }

    private func applyFrame(animated: Bool) {
        let frame = desiredFrame()
        guard frame != .zero else { return }
        if animated {
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.18
                context.timingFunction = CAMediaTimingFunction(name: .easeOut)
                panel.animator().setFrame(frame, display: true)
            }
        } else {
            panel.setFrame(frame, display: true)
        }
        view.needsDisplay = true
    }

    private func desiredFrame() -> NSRect {
        let screen = panel.screen ?? NSScreen.main ?? NSScreen.screens.first
        guard let vf = screen?.visibleFrame else { return .zero }

        let size: NSSize
        if expanded {
            size = NSSize(width: 300, height: 96)
        } else if edge == .side {
            size = NSSize(width: 26, height: 86)
        } else {
            size = NSSize(width: 86, height: 26)
        }

        switch edge {
        case .bottom:
            // Centered just above the Dock; grows upward/outward when expanded.
            return NSRect(
                x: (vf.midX - size.width / 2).rounded(),
                y: vf.minY + 10,
                width: size.width,
                height: size.height
            )
        case .side:
            // Hugs the right edge, vertically centered; grows leftward.
            return NSRect(
                x: vf.maxX - size.width - 10,
                y: (vf.midY - size.height / 2).rounded(),
                width: size.width,
                height: size.height
            )
        }
    }
}

final class WidgetView: NSView {
    override var isFlipped: Bool { true }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach(removeTrackingArea)
        addTrackingArea(NSTrackingArea(
            rect: .zero,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        ))
    }

    override func mouseEntered(with event: NSEvent) {
        ClipWidget.shared.setHovering(true)
    }

    override func mouseExited(with event: NSEvent) {
        ClipWidget.shared.setHovering(false)
    }

    override func mouseUp(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        if let index = slotIndex(at: point) {
            AppDelegate.shared?.pasteSlot(index)
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        let menu = NSMenu()

        let bottom = NSMenuItem(title: "Keep at the Bottom", action: #selector(chooseBottom), keyEquivalent: "")
        bottom.target = self
        bottom.state = ClipWidget.shared.edge == .bottom ? .on : .off
        menu.addItem(bottom)

        let side = NSMenuItem(title: "Keep on the Side", action: #selector(chooseSide), keyEquivalent: "")
        side.target = self
        side.state = ClipWidget.shared.edge == .side ? .on : .off
        menu.addItem(side)

        menu.addItem(.separator())

        let reset = NSMenuItem(title: "Reset Slots", action: #selector(resetSlots), keyEquivalent: "")
        reset.target = self
        menu.addItem(reset)

        let hideItem = NSMenuItem(title: "Hide Dots (re-show from Dock menu)", action: #selector(hideWidget), keyEquivalent: "")
        hideItem.target = self
        menu.addItem(hideItem)

        NSMenu.popUpContextMenu(menu, with: event, for: self)
    }

    @objc private func chooseBottom() { ClipWidget.shared.setEdge(.bottom) }
    @objc private func chooseSide() { ClipWidget.shared.setEdge(.side) }
    @objc private func resetSlots() { AppDelegate.shared?.reset() }
    @objc private func hideWidget() { ClipWidget.shared.hide() }

    private func slotIndex(at point: NSPoint) -> Int? {
        guard bounds.width > 0, bounds.height > 0 else { return nil }
        let index: Int
        if ClipWidget.shared.expanded || ClipWidget.shared.edge == .side {
            index = Int(point.y / (bounds.height / CGFloat(slotCount)))
        } else {
            index = Int(point.x / (bounds.width / CGFloat(slotCount)))
        }
        return (0..<slotCount).contains(index) ? index : nil
    }

    // MARK: - Drawing

    override func draw(_ dirtyRect: NSRect) {
        let slots = AppDelegate.shared?.slots ?? Array(repeating: Slot(), count: slotCount)

        let radius: CGFloat = ClipWidget.shared.expanded ? 14 : min(bounds.width, bounds.height) / 2
        let bg = NSBezierPath(roundedRect: bounds, xRadius: radius, yRadius: radius)
        NSColor(calibratedRed: 0.11, green: 0.11, blue: 0.12, alpha: 0.94).setFill()
        bg.fill()

        if ClipWidget.shared.expanded {
            drawExpanded(slots)
        } else {
            drawCollapsed(slots)
        }
    }

    private func dotColor(for state: SlotState) -> NSColor {
        switch state {
        case .empty: return NSColor(calibratedWhite: 0.4, alpha: 1)
        case .filled: return .systemBlue
        case .used: return .systemGreen
        }
    }

    private func drawCollapsed(_ slots: [Slot]) {
        let vertical = ClipWidget.shared.edge == .side
        let r: CGFloat = 5
        for i in 0..<slotCount {
            let center: NSPoint
            if vertical {
                let cell = bounds.height / CGFloat(slotCount)
                center = NSPoint(x: bounds.midX, y: cell * (CGFloat(i) + 0.5))
            } else {
                let cell = bounds.width / CGFloat(slotCount)
                center = NSPoint(x: cell * (CGFloat(i) + 0.5), y: bounds.midY)
            }
            let dot = NSBezierPath(ovalIn: NSRect(x: center.x - r, y: center.y - r, width: r * 2, height: r * 2))
            dotColor(for: slots[i].state).setFill()
            dot.fill()
        }
    }

    private func drawExpanded(_ slots: [Slot]) {
        let rowHeight = bounds.height / CGFloat(slotCount)
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byTruncatingTail

        for i in 0..<slotCount {
            let midY = rowHeight * (CGFloat(i) + 0.5)

            let r: CGFloat = 7
            let dot = NSBezierPath(ovalIn: NSRect(x: 18 - r, y: midY - r, width: r * 2, height: r * 2))
            dotColor(for: slots[i].state).setFill()
            dot.fill()

            let text: String
            let color: NSColor
            if let slotText = slots[i].text {
                text = slotText.replacingOccurrences(of: "\n", with: " ")
                color = NSColor(calibratedWhite: 0.92, alpha: 1)
            } else {
                text = "(empty)"
                color = NSColor(calibratedWhite: 0.55, alpha: 1)
            }
            let attrs: [NSAttributedString.Key: Any] = [
                .font: NSFont.systemFont(ofSize: 11),
                .foregroundColor: color,
                .paragraphStyle: paragraph,
            ]
            let textRect = NSRect(x: 34, y: midY - 8, width: bounds.width - 46, height: 16)
            NSAttributedString(string: text, attributes: attrs).draw(in: textRect)
        }
    }
}
