import AppKit

// The floating dots widget — bare dots (no background) that stay on top of
// every space and every app, including full screen.
//
//   • The dots mirror the slots: gray = empty, blue = copied, green = pasted.
//   • Drag them anywhere — the position is remembered.
//   • Hovering them fades in a translucent, blurred preview panel (native
//     macOS material, like Spotlight) showing what each slot holds, and the
//     dots grow slightly.
//   • Pasting is done with ⌘⌥1…⌘⌥5 (top/left row first) — clicking never
//     pastes. In the preview you can drag rows up and down to reorder the
//     slots, and hovering a row shows an ✕ to delete just that item.
//   • Right-click for settings: position presets, horizontal/vertical
//     layout, dot size, number of slots, reset, hide.
//
// The dots panel never moves or resizes on hover — the preview is a second
// panel that fades in beside it — so hover tracking stays stable.

enum WidgetPlacement: String {
    case bottom
    case side
    case custom
}

enum WidgetOrientation: String {
    case horizontal
    case vertical
}

enum DotSize: String, CaseIterable {
    case small
    case medium
    case large

    var radius: CGFloat {
        switch self {
        case .small: return 4
        case .medium: return 5.5
        case .large: return 7
        }
    }

    var title: String {
        switch self {
        case .small: return "Small"
        case .medium: return "Medium"
        case .large: return "Large"
        }
    }
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

    private static let placementKey = "widgetPlacement"
    private static let orientationKey = "widgetOrientation"
    private static let dotSizeKey = "widgetDotSize"
    private static let customXKey = "widgetCustomX"
    private static let customYKey = "widgetCustomY"
    private static let visibleKey = "widgetVisible"

    private let dotsPanel: NSPanel
    private let dotsView = DotsView()
    private let previewPanel: NSPanel
    private let previewView = PreviewView()

    private(set) var placement: WidgetPlacement
    private(set) var orientation: WidgetOrientation
    private(set) var dotSize: DotSize
    private(set) var previewShown = false

    private var insideDots = false
    private var insidePreview = false
    private var pendingHide: DispatchWorkItem?

    var isShown: Bool { dotsPanel.isVisible }

    var dotRadius: CGFloat {
        dotSize.radius + (previewShown ? 1.5 : 0)
    }

    private var currentSlotCount: Int {
        AppDelegate.shared?.slots.count ?? 3
    }

    override init() {
        let defaults = UserDefaults.standard
        placement = WidgetPlacement(rawValue: defaults.string(forKey: Self.placementKey) ?? "") ?? .bottom
        orientation = WidgetOrientation(rawValue: defaults.string(forKey: Self.orientationKey) ?? "") ?? .horizontal
        dotSize = DotSize(rawValue: defaults.string(forKey: Self.dotSizeKey) ?? "") ?? .small

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

    func setPlacement(_ newPlacement: WidgetPlacement) {
        placement = newPlacement
        UserDefaults.standard.set(newPlacement.rawValue, forKey: Self.placementKey)
        // The presets imply an orientation; custom keeps whatever is set.
        switch newPlacement {
        case .bottom: setOrientation(.horizontal)
        case .side: setOrientation(.vertical)
        case .custom: break
        }
        layoutPanels()
        refresh()
    }

    func setOrientation(_ newOrientation: WidgetOrientation) {
        orientation = newOrientation
        UserDefaults.standard.set(newOrientation.rawValue, forKey: Self.orientationKey)
        layoutPanels()
        refresh()
    }

    func setDotSize(_ newSize: DotSize) {
        dotSize = newSize
        UserDefaults.standard.set(newSize.rawValue, forKey: Self.dotSizeKey)
        layoutPanels()
        refresh()
    }

    /// Called when slot count or other outside settings change shape.
    func settingsChanged() {
        layoutPanels()
        refresh()
    }

    func refresh() {
        dotsView.needsDisplay = true
        previewView.needsDisplay = true
    }

    // MARK: - Dragging

    func dotsDragged() {
        pendingHide?.cancel()
        if previewShown {
            previewShown = false
            previewPanel.orderOut(nil)
            refresh()
        }
    }

    func dragEnded() {
        placement = .custom
        let origin = dotsPanel.frame.origin
        let defaults = UserDefaults.standard
        defaults.set(WidgetPlacement.custom.rawValue, forKey: Self.placementKey)
        defaults.set(Double(origin.x), forKey: Self.customXKey)
        defaults.set(Double(origin.y), forKey: Self.customYKey)
        layoutPanels()
        // If the mouse is still on the dots, bring the preview back.
        hoverChanged()
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
        if orientation == .vertical {
            start.origin.x += 8
        } else {
            start.origin.y -= 8
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

    private func dotsPanelSize() -> NSSize {
        let count = CGFloat(currentSlotCount)
        let diameter = dotSize.radius * 2
        let cell = diameter + 14
        let thickness = diameter + 14
        return orientation == .vertical
            ? NSSize(width: thickness, height: cell * count)
            : NSSize(width: cell * count, height: thickness)
    }

    private func layoutPanels() {
        guard let screen = dotsPanel.screen ?? NSScreen.main ?? NSScreen.screens.first else { return }
        let vf = screen.visibleFrame
        let full = screen.frame

        let dotsSize = dotsPanelSize()
        var dotsOrigin: NSPoint
        switch placement {
        case .bottom:
            dotsOrigin = NSPoint(x: (full.midX - dotsSize.width / 2).rounded(), y: vf.minY + 1)
        case .side:
            dotsOrigin = NSPoint(x: full.maxX - dotsSize.width - 4, y: (vf.midY - dotsSize.height / 2).rounded())
        case .custom:
            let defaults = UserDefaults.standard
            dotsOrigin = NSPoint(
                x: defaults.object(forKey: Self.customXKey) as? Double ?? Double(vf.midX),
                y: defaults.object(forKey: Self.customYKey) as? Double ?? Double(vf.minY + 1)
            )
        }
        // Keep the dots on screen whatever happens (resolution changes etc.).
        dotsOrigin.x = min(max(dotsOrigin.x, full.minX), full.maxX - dotsSize.width)
        dotsOrigin.y = min(max(dotsOrigin.y, full.minY), full.maxY - dotsSize.height)
        let dotsFrame = NSRect(origin: dotsOrigin, size: dotsSize)
        dotsPanel.setFrame(dotsFrame, display: true)

        // Preview: beside the dots, wherever there's room.
        let previewSize = NSSize(width: 320, height: CGFloat(currentSlotCount) * 30 + 12)
        var origin: NSPoint
        if orientation == .vertical {
            // Prefer the left of the dots, fall back to the right.
            var x = dotsFrame.minX - previewSize.width - 8
            if x < vf.minX + 8 {
                x = dotsFrame.maxX + 8
            }
            origin = NSPoint(x: x, y: (dotsFrame.midY - previewSize.height / 2).rounded())
        } else {
            // Prefer above the dots, fall back to below.
            var y = dotsFrame.maxY + 8
            if y + previewSize.height > vf.maxY - 8 {
                y = dotsFrame.minY - previewSize.height - 8
            }
            origin = NSPoint(x: (dotsFrame.midX - previewSize.width / 2).rounded(), y: y)
        }
        origin.x = min(max(origin.x, vf.minX + 8), vf.maxX - previewSize.width - 8)
        origin.y = min(max(origin.y, vf.minY + 8), vf.maxY - previewSize.height - 8)
        previewPanel.setFrame(NSRect(origin: origin, size: previewSize), display: true)
        previewView.frame = previewPanel.contentView?.bounds ?? .zero
    }

    // MARK: - Context menu

    func contextMenu() -> NSMenu {
        let menu = NSMenu()

        let positionMenu = NSMenu()
        let bottom = NSMenuItem(title: "At the Bottom", action: #selector(menuBottom), keyEquivalent: "")
        bottom.target = self
        bottom.state = placement == .bottom ? .on : .off
        positionMenu.addItem(bottom)
        let side = NSMenuItem(title: "On the Right Side", action: #selector(menuSide), keyEquivalent: "")
        side.target = self
        side.state = placement == .side ? .on : .off
        positionMenu.addItem(side)
        positionMenu.addItem(.separator())
        let dragHint = NSMenuItem(title: "…or just drag the dots anywhere", action: nil, keyEquivalent: "")
        dragHint.isEnabled = false
        positionMenu.addItem(dragHint)
        let positionItem = NSMenuItem(title: "Position", action: nil, keyEquivalent: "")
        positionItem.submenu = positionMenu
        menu.addItem(positionItem)

        let layoutMenu = NSMenu()
        let horizontal = NSMenuItem(title: "Horizontal", action: #selector(menuHorizontal), keyEquivalent: "")
        horizontal.target = self
        horizontal.state = orientation == .horizontal ? .on : .off
        layoutMenu.addItem(horizontal)
        let vertical = NSMenuItem(title: "Vertical", action: #selector(menuVertical), keyEquivalent: "")
        vertical.target = self
        vertical.state = orientation == .vertical ? .on : .off
        layoutMenu.addItem(vertical)
        let layoutItem = NSMenuItem(title: "Layout", action: nil, keyEquivalent: "")
        layoutItem.submenu = layoutMenu
        menu.addItem(layoutItem)

        let sizeMenu = NSMenu()
        for size in DotSize.allCases {
            let item = NSMenuItem(title: size.title, action: #selector(menuDotSize(_:)), keyEquivalent: "")
            item.target = self
            item.representedObject = size.rawValue
            item.state = dotSize == size ? .on : .off
            sizeMenu.addItem(item)
        }
        let sizeItem = NSMenuItem(title: "Dot Size", action: nil, keyEquivalent: "")
        sizeItem.submenu = sizeMenu
        menu.addItem(sizeItem)

        let countMenu = NSMenu()
        for count in 2...5 {
            let item = NSMenuItem(title: "\(count)", action: #selector(menuSlotCount(_:)), keyEquivalent: "")
            item.target = self
            item.tag = count
            item.state = currentSlotCount == count ? .on : .off
            countMenu.addItem(item)
        }
        let countItem = NSMenuItem(title: "Number of Slots", action: nil, keyEquivalent: "")
        countItem.submenu = countMenu
        menu.addItem(countItem)

        menu.addItem(.separator())

        let reset = NSMenuItem(title: "Reset Slots", action: #selector(menuReset), keyEquivalent: "")
        reset.target = self
        menu.addItem(reset)

        let hideItem = NSMenuItem(title: "Hide Dots (re-show from Dock menu)", action: #selector(menuHide), keyEquivalent: "")
        hideItem.target = self
        menu.addItem(hideItem)

        return menu
    }

    @objc private func menuBottom() { setPlacement(.bottom) }
    @objc private func menuSide() { setPlacement(.side) }
    @objc private func menuHorizontal() { setOrientation(.horizontal) }
    @objc private func menuVertical() { setOrientation(.vertical) }
    @objc private func menuReset() { AppDelegate.shared?.reset() }
    @objc private func menuHide() { hide() }

    @objc private func menuDotSize(_ sender: NSMenuItem) {
        guard let raw = sender.representedObject as? String, let size = DotSize(rawValue: raw) else { return }
        setDotSize(size)
    }

    @objc private func menuSlotCount(_ sender: NSMenuItem) {
        AppDelegate.shared?.setSlotCount(sender.tag)
    }
}

// MARK: - The bare dots

final class DotsView: NSView {
    override var isFlipped: Bool { true }

    private var pressMouse: NSPoint?
    private var pressOrigin: NSPoint?
    private var isDragging = false

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

    override func mouseDown(with event: NSEvent) {
        pressMouse = NSEvent.mouseLocation
        pressOrigin = window?.frame.origin
        isDragging = false
    }

    override func mouseDragged(with event: NSEvent) {
        guard let pressMouse, let pressOrigin, let window else { return }
        let mouse = NSEvent.mouseLocation
        let dx = mouse.x - pressMouse.x
        let dy = mouse.y - pressMouse.y
        if !isDragging, abs(dx) < 4, abs(dy) < 4 { return }
        if !isDragging {
            isDragging = true
            ClipWidget.shared.dotsDragged()
        }
        window.setFrameOrigin(NSPoint(x: pressOrigin.x + dx, y: pressOrigin.y + dy))
    }

    override func mouseUp(with event: NSEvent) {
        defer {
            pressMouse = nil
            pressOrigin = nil
        }
        if isDragging {
            isDragging = false
            ClipWidget.shared.dragEnded()
        }
        // Clicking the dots never pastes — pasting is ⌘⌥1…⌘⌥5.
    }

    override func rightMouseDown(with event: NSEvent) {
        NSMenu.popUpContextMenu(ClipWidget.shared.contextMenu(), with: event, for: self)
    }

    override func draw(_ dirtyRect: NSRect) {
        let slots = AppDelegate.shared?.slots ?? []
        guard !slots.isEmpty else { return }
        let vertical = ClipWidget.shared.orientation == .vertical
        let radius = ClipWidget.shared.dotRadius

        guard let context = NSGraphicsContext.current else { return }
        context.saveGraphicsState()

        // Soft shadow so bare dots stay visible on any wallpaper.
        let shadow = NSShadow()
        shadow.shadowBlurRadius = 4
        shadow.shadowOffset = NSSize(width: 0, height: -1)
        shadow.shadowColor = NSColor.black.withAlphaComponent(0.5)
        shadow.set()

        for i in 0..<slots.count {
            let cell = (vertical ? bounds.height : bounds.width) / CGFloat(slots.count)
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

    private var hoveredRow: Int?
    private var pressPoint: NSPoint?
    private var pressIndex: Int?
    private var isReordering = false
    private var dragTargetIndex: Int?

    private var slotList: [Slot] {
        AppDelegate.shared?.slots ?? []
    }

    private var rowHeight: CGFloat {
        bounds.height / CGFloat(max(slotList.count, 1))
    }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach(removeTrackingArea)
        addTrackingArea(NSTrackingArea(
            rect: .zero,
            options: [.mouseEnteredAndExited, .mouseMoved, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        ))
    }

    override func mouseEntered(with event: NSEvent) {
        ClipWidget.shared.hoverChanged(preview: true)
    }

    override func mouseExited(with event: NSEvent) {
        hoveredRow = nil
        needsDisplay = true
        ClipWidget.shared.hoverChanged(preview: false)
    }

    override func mouseMoved(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        let row = rowIndex(at: point)
        if row != hoveredRow {
            hoveredRow = row
            needsDisplay = true
        }
    }

    private func rowIndex(at point: NSPoint) -> Int? {
        let slots = slotList
        guard !slots.isEmpty else { return nil }
        let index = Int(point.y / (bounds.height / CGFloat(slots.count)))
        return slots.indices.contains(index) ? index : nil
    }

    private func deleteRect(forRow row: Int) -> NSRect {
        let midY = rowHeight * (CGFloat(row) + 0.5)
        return NSRect(x: bounds.width - 30, y: midY - 9, width: 18, height: 18)
    }

    // MARK: Reordering & deleting

    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow, from: nil)
        pressPoint = point
        pressIndex = rowIndex(at: point)
        isReordering = false
        dragTargetIndex = nil
    }

    override func mouseDragged(with event: NSEvent) {
        guard let pressPoint, let pressIndex, slotList.indices.contains(pressIndex) else { return }
        let point = convert(event.locationInWindow, from: nil)
        if !isReordering, abs(point.y - pressPoint.y) < 5 { return }
        isReordering = true
        let count = slotList.count
        dragTargetIndex = min(max(Int(point.y / rowHeight), 0), count - 1)
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        defer {
            pressPoint = nil
            pressIndex = nil
            isReordering = false
            dragTargetIndex = nil
            needsDisplay = true
        }
        if isReordering, let from = pressIndex, let to = dragTargetIndex {
            AppDelegate.shared?.moveSlot(from: from, to: to)
            return
        }
        // Plain click: only the ✕ deletes — clicking never pastes
        // (pasting is ⌘⌥1…⌘⌥5).
        let point = convert(event.locationInWindow, from: nil)
        if let row = rowIndex(at: point),
           slotList[row].text != nil,
           deleteRect(forRow: row).insetBy(dx: -4, dy: -4).contains(point) {
            AppDelegate.shared?.clearSlot(row)
        }
    }

    override func rightMouseDown(with event: NSEvent) {
        NSMenu.popUpContextMenu(ClipWidget.shared.contextMenu(), with: event, for: self)
    }

    // MARK: Drawing

    override func draw(_ dirtyRect: NSRect) {
        var slots = slotList
        guard !slots.isEmpty else { return }

        // While reordering, preview the new arrangement live.
        var draggedDisplayRow: Int?
        if isReordering, let from = pressIndex, let to = dragTargetIndex, slots.indices.contains(from) {
            let moved = slots.remove(at: from)
            slots.insert(moved, at: to)
            draggedDisplayRow = to
        }

        let rowH = bounds.height / CGFloat(slots.count)
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byTruncatingTail

        for i in 0..<slots.count {
            let midY = rowH * (CGFloat(i) + 0.5)
            let rowRect = NSRect(x: 6, y: rowH * CGFloat(i) + 2, width: bounds.width - 12, height: rowH - 4)

            if i == draggedDisplayRow {
                NSColor(calibratedWhite: 1, alpha: 0.16).setFill()
                NSBezierPath(roundedRect: rowRect, xRadius: 8, yRadius: 8).fill()
            } else if i == hoveredRow, !isReordering {
                NSColor(calibratedWhite: 1, alpha: 0.07).setFill()
                NSBezierPath(roundedRect: rowRect, xRadius: 8, yRadius: 8).fill()
            }

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

            // Right side: ✕ to delete on the hovered row, hotkey hint otherwise.
            if i == hoveredRow, !isReordering, slots[i].text != nil {
                let xRect = deleteRect(forRow: i)
                NSColor(calibratedWhite: 1, alpha: 0.18).setFill()
                NSBezierPath(ovalIn: xRect).fill()
                let xParagraph = NSMutableParagraphStyle()
                xParagraph.alignment = .center
                NSAttributedString(string: "✕", attributes: [
                    .font: NSFont.systemFont(ofSize: 10, weight: .semibold),
                    .foregroundColor: NSColor(calibratedWhite: 0.95, alpha: 1),
                    .paragraphStyle: xParagraph,
                ]).draw(in: NSRect(x: xRect.minX, y: xRect.minY + 2.5, width: xRect.width, height: 13))
            } else {
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
}
