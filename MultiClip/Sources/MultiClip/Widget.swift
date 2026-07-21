import AppKit

// The floating dots widget — three bare dots (no background) that stay on
// top of every space and every app, including full screen.
//
//   • The dots mirror the slots: gray = empty, blue = copied, green = pasted.
//   • Hovering them fades in a translucent, blurred preview panel (native
//     macOS material, like Spotlight) showing what each slot holds, and the
//     dots grow slightly.
//   • Click a dot or a preview row (while the preview is up) to paste that
//     slot into the app you're in.
//   • Right-click for options: bottom or side placement, reset, hide.
//
// The dots panel never moves or resizes — the preview is a second panel
// that fades in beside it — so hover tracking stays stable.

enum WidgetEdge: String {
    case bottom
    case side
}

func widgetDotColor(_ state: SlotState) -> NSColor {
    switch state {
    case .empty: return NSColor(calibratedWhite: 0.55, alpha: 1)
    case .filled: return .systemBlue
    case .used: return .systemGreen
    }
}

final class ClipWidget: NSObject {
    static let shared = ClipWidget()

    private static let edgeKey = "widgetEdge"
    private static let visibleKey = "widgetVisible"

    private let dotsPanel: NSPanel
    private let dotsView = DotsView()
    private let previewPanel: NSPanel
    private let previewView = PreviewView()

    private(set) var edge: WidgetEdge
    private(set) var previewShown = false
    private var insideDots = false
    private var insidePreview = false
    private var pendingHide: DispatchWorkItem?

    var isShown: Bool { dotsPanel.isVisible }

    override init() {
        edge = WidgetEdge(rawValue: UserDefaults.standard.string(forKey: Self.edgeKey) ?? "") ?? .bottom

        dotsPanel = Self.makePanel()
        dotsPanel.hasShadow = false
        dotsPanel.contentView = dotsView

        previewPanel = Self.makePanel()
        previewPanel.hasShadow = true
        let effect = NSVisualEffectView()
        effect.material = .hudWindow
        effect.blendingMode = .behindWindow
        effect.state = .active
        effect.wantsLayer = true
        effect.layer?.cornerRadius = 14
        effect.layer?.masksToBounds = true
        previewView.autoresizingMask = [.width, .height]
        effect.addSubview(previewView)
        previewPanel.contentView = effect

        super.init()

        NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.layoutPanels()
        }
    }

    private static func makePanel() -> NSPanel {
        let panel = NSPanel(
            contentRect: .zero,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.level = .statusBar
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        return panel
    }

    // MARK: - Public API

    func start() {
        layoutPanels()
        let visible = UserDefaults.standard.object(forKey: Self.visibleKey) as? Bool ?? true
        if visible {
            dotsPanel.orderFrontRegardless()
        }
    }

    func show() {
        UserDefaults.standard.set(true, forKey: Self.visibleKey)
        layoutPanels()
        dotsPanel.orderFrontRegardless()
    }

    func hide() {
        UserDefaults.standard.set(false, forKey: Self.visibleKey)
        previewPanel.orderOut(nil)
        previewShown = false
        dotsPanel.orderOut(nil)
    }

    func setEdge(_ newEdge: WidgetEdge) {
        edge = newEdge
        UserDefaults.standard.set(newEdge.rawValue, forKey: Self.edgeKey)
        layoutPanels()
        refresh()
    }

    func refresh() {
        dotsView.needsDisplay = true
        previewView.needsDisplay = true
    }

    // MARK: - Hover handling

    func hoverChanged(dots: Bool? = nil, preview: Bool? = nil) {
        if let dots { insideDots = dots }
        if let preview { insidePreview = preview }
        pendingHide?.cancel()

        if insideDots || insidePreview {
            showPreview()
        } else {
            // Grace period so moving the mouse between the dots and the
            // preview doesn't collapse it.
            let work = DispatchWorkItem { [weak self] in
                guard let self, !self.insideDots, !self.insidePreview else { return }
                self.hidePreview()
            }
            pendingHide = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3, execute: work)
        }
    }

    private func showPreview() {
        guard !previewShown, dotsPanel.isVisible else { return }
        previewShown = true
        layoutPanels()

        let target = previewPanel.frame
        var start = target
        switch edge {
        case .bottom: start.origin.y -= 8
        case .side: start.origin.x += 8
        }
        previewPanel.setFrame(start, display: false)
        previewPanel.alphaValue = 0
        previewPanel.orderFrontRegardless()

        NSAnimationContext.runAnimationGroup { context in
            context.duration = 0.16
            context.timingFunction = CAMediaTimingFunction(name: .easeOut)
            previewPanel.animator().alphaValue = 1
            previewPanel.animator().setFrame(target, display: true)
        }
        refresh()
    }

    private func hidePreview() {
        guard previewShown else { return }
        previewShown = false
        NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.14
            self.previewPanel.animator().alphaValue = 0
        }, completionHandler: { [weak self] in
            guard let self, !self.previewShown else { return }
            self.previewPanel.orderOut(nil)
        })
        refresh()
    }

    // MARK: - Layout

    private func layoutPanels() {
        guard let screen = dotsPanel.screen ?? NSScreen.main ?? NSScreen.screens.first else { return }
        let vf = screen.visibleFrame
        let full = screen.frame

        let dotsSize = edge == .side ? NSSize(width: 22, height: 78) : NSSize(width: 78, height: 22)
        let dotsFrame: NSRect
        switch edge {
        case .bottom:
            // As low as possible while staying visible: the Dock draws over
            // anything placed inside its strip, so sit right on top of the
            // visible-area floor (which is the screen bottom when the Dock
            // is hidden or on another edge).
            dotsFrame = NSRect(
                x: (full.midX - dotsSize.width / 2).rounded(),
                y: vf.minY + 1,
                width: dotsSize.width,
                height: dotsSize.height
            )
        case .side:
            dotsFrame = NSRect(
                x: full.maxX - dotsSize.width - 4,
                y: (vf.midY - dotsSize.height / 2).rounded(),
                width: dotsSize.width,
                height: dotsSize.height
            )
        }
        dotsPanel.setFrame(dotsFrame, display: true)

        let previewSize = NSSize(width: 320, height: 104)
        var origin: NSPoint
        switch edge {
        case .bottom:
            origin = NSPoint(x: (dotsFrame.midX - previewSize.width / 2).rounded(), y: dotsFrame.maxY + 8)
        case .side:
            origin = NSPoint(x: dotsFrame.minX - previewSize.width - 8, y: (dotsFrame.midY - previewSize.height / 2).rounded())
        }
        origin.x = min(max(origin.x, vf.minX + 8), vf.maxX - previewSize.width - 8)
        origin.y = min(max(origin.y, vf.minY + 8), vf.maxY - previewSize.height - 8)
        previewPanel.setFrame(NSRect(origin: origin, size: previewSize), display: true)
        previewView.frame = previewPanel.contentView?.bounds ?? .zero
    }

    // MARK: - Context menu

    func contextMenu() -> NSMenu {
        let menu = NSMenu()

        let bottom = NSMenuItem(title: "Keep at the Bottom", action: #selector(menuBottom), keyEquivalent: "")
        bottom.target = self
        bottom.state = edge == .bottom ? .on : .off
        menu.addItem(bottom)

        let side = NSMenuItem(title: "Keep on the Side", action: #selector(menuSide), keyEquivalent: "")
        side.target = self
        side.state = edge == .side ? .on : .off
        menu.addItem(side)

        menu.addItem(.separator())

        let reset = NSMenuItem(title: "Reset Slots", action: #selector(menuReset), keyEquivalent: "")
        reset.target = self
        menu.addItem(reset)

        let hideItem = NSMenuItem(title: "Hide Dots (re-show from Dock menu)", action: #selector(menuHide), keyEquivalent: "")
        hideItem.target = self
        menu.addItem(hideItem)

        return menu
    }

    @objc private func menuBottom() { setEdge(.bottom) }
    @objc private func menuSide() { setEdge(.side) }
    @objc private func menuReset() { AppDelegate.shared?.reset() }
    @objc private func menuHide() { hide() }
}

// MARK: - The bare dots

final class DotsView: NSView {
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
        ClipWidget.shared.hoverChanged(dots: true)
    }

    override func mouseExited(with event: NSEvent) {
        ClipWidget.shared.hoverChanged(dots: false)
    }

    override func mouseUp(with event: NSEvent) {
        // Pasting from the dots only works while the preview is up, so a
        // stray click can never paste something you haven't seen.
        guard ClipWidget.shared.previewShown else { return }
        let point = convert(event.locationInWindow, from: nil)
        let vertical = ClipWidget.shared.edge == .side
        let cell = (vertical ? bounds.height : bounds.width) / CGFloat(slotCount)
        let index = Int((vertical ? point.y : point.x) / cell)
        if (0..<slotCount).contains(index) {
            AppDelegate.shared?.pasteSlot(index)
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        NSMenu.popUpContextMenu(ClipWidget.shared.contextMenu(), with: event, for: self)
    }

    override func draw(_ dirtyRect: NSRect) {
        let slots = AppDelegate.shared?.slots ?? Array(repeating: Slot(), count: slotCount)
        let vertical = ClipWidget.shared.edge == .side
        let radius: CGFloat = ClipWidget.shared.previewShown ? 5.5 : 4

        guard let context = NSGraphicsContext.current else { return }
        context.saveGraphicsState()

        // Soft shadow so bare dots stay visible on any wallpaper.
        let shadow = NSShadow()
        shadow.shadowBlurRadius = 4
        shadow.shadowOffset = NSSize(width: 0, height: -1)
        shadow.shadowColor = NSColor.black.withAlphaComponent(0.5)
        shadow.set()

        for i in 0..<slotCount {
            let cell = (vertical ? bounds.height : bounds.width) / CGFloat(slotCount)
            let center = vertical
                ? NSPoint(x: bounds.midX, y: cell * (CGFloat(i) + 0.5))
                : NSPoint(x: cell * (CGFloat(i) + 0.5), y: bounds.midY)
            let dotRect = NSRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
            let dot = NSBezierPath(ovalIn: dotRect)
            widgetDotColor(slots[i].state).setFill()
            dot.fill()
            NSColor.white.withAlphaComponent(0.9).setStroke()
            dot.lineWidth = 1
            dot.stroke()
        }

        context.restoreGraphicsState()
    }
}

// MARK: - The frosted preview

final class PreviewView: NSView {
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
        ClipWidget.shared.hoverChanged(preview: true)
    }

    override func mouseExited(with event: NSEvent) {
        ClipWidget.shared.hoverChanged(preview: false)
    }

    override func mouseUp(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        let index = Int(point.y / (bounds.height / CGFloat(slotCount)))
        if (0..<slotCount).contains(index) {
            AppDelegate.shared?.pasteSlot(index)
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        NSMenu.popUpContextMenu(ClipWidget.shared.contextMenu(), with: event, for: self)
    }

    override func draw(_ dirtyRect: NSRect) {
        let slots = AppDelegate.shared?.slots ?? Array(repeating: Slot(), count: slotCount)
        let rowHeight = bounds.height / CGFloat(slotCount)
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byTruncatingTail

        for i in 0..<slotCount {
            let midY = rowHeight * (CGFloat(i) + 0.5)

            let r: CGFloat = 6
            let dot = NSBezierPath(ovalIn: NSRect(x: 20 - r, y: midY - r, width: r * 2, height: r * 2))
            widgetDotColor(slots[i].state).setFill()
            dot.fill()

            let text: String
            let color: NSColor
            if let slotText = slots[i].text {
                text = slotText.replacingOccurrences(of: "\n", with: " ")
                color = NSColor(calibratedWhite: 0.95, alpha: 1)
            } else {
                text = "(empty)"
                color = NSColor(calibratedWhite: 0.55, alpha: 1)
            }
            NSAttributedString(string: text, attributes: [
                .font: NSFont.systemFont(ofSize: 12),
                .foregroundColor: color,
                .paragraphStyle: paragraph,
            ]).draw(in: NSRect(x: 36, y: midY - 8, width: bounds.width - 96, height: 17))

            let hintParagraph = NSMutableParagraphStyle()
            hintParagraph.alignment = .right
            NSAttributedString(string: "⌘⌥\(i + 1)", attributes: [
                .font: NSFont.systemFont(ofSize: 11),
                .foregroundColor: NSColor(calibratedWhite: 0.5, alpha: 1),
                .paragraphStyle: hintParagraph,
            ]).draw(in: NSRect(x: bounds.width - 56, y: midY - 7, width: 44, height: 15))
        }
    }
}
