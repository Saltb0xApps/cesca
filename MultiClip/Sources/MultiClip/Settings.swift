import AppKit
import ServiceManagement

// The welcome / settings window. Shown automatically on first launch to
// explain what MultiClip does, and reachable any time from the Dock menu
// or the dots' right-click menu ("Settings…").

final class SettingsWindowController: NSWindowController {
    static let shared = SettingsWindowController()

    private var comboPopup: NSPopUpButton!
    private var countPopup: NSPopUpButton!
    private var positionPopup: NSPopUpButton!
    private var loginCheckbox: NSButton!

    private let positionValues: [WidgetPlacement] = [.bottom, .side, .notch]

    private init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 500, height: 470),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "MultiClip v\(appVersion)"
        window.isReleasedWhenClosed = false
        super.init(window: window)
        buildUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("not supported")
    }

    func show() {
        refreshValues()
        window?.center()
        NSApp.activate(ignoringOtherApps: true)
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
    }

    // MARK: - UI

    private func buildUI() {
        guard let content = window?.contentView else { return }
        let width = content.bounds.width
        let margin: CGFloat = 28
        let innerWidth = width - margin * 2
        var y = content.bounds.height - 56

        let title = NSTextField(labelWithString: "Welcome to MultiClip 👋")
        title.font = .systemFont(ofSize: 20, weight: .bold)
        title.frame = NSRect(x: margin, y: y, width: innerWidth, height: 28)
        content.addSubview(title)
        y -= 78

        let body = NSTextField(wrappingLabelWithString:
            "Your Mac has a single clipboard — every ⌘C throws away whatever you copied before. " +
            "MultiClip fixes that: each ⌘C fills the next numbered slot, shown as floating dots " +
            "that turn blue when they hold a copy and green once pasted. Hold ⌘ and tap C twice to clear everything."
        )
        body.font = .systemFont(ofSize: 13)
        body.frame = NSRect(x: margin, y: y, width: innerWidth, height: 70)
        content.addSubview(body)
        y -= 46

        // Paste shortcut
        let comboLabel = NSTextField(labelWithString: "Paste shortcut:")
        comboLabel.font = .systemFont(ofSize: 13, weight: .medium)
        comboLabel.frame = NSRect(x: margin, y: y, width: 140, height: 22)
        content.addSubview(comboLabel)

        comboPopup = NSPopUpButton(frame: NSRect(x: margin + 145, y: y - 4, width: innerWidth - 145, height: 28))
        comboPopup.addItems(withTitles: HotkeyCombo.allCases.map(\.title))
        comboPopup.target = self
        comboPopup.action = #selector(comboChanged)
        content.addSubview(comboPopup)
        y -= 42

        // Slot count
        let countLabel = NSTextField(labelWithString: "Number of dots:")
        countLabel.font = .systemFont(ofSize: 13, weight: .medium)
        countLabel.frame = NSRect(x: margin, y: y, width: 140, height: 22)
        content.addSubview(countLabel)

        countPopup = NSPopUpButton(frame: NSRect(x: margin + 145, y: y - 4, width: 100, height: 28))
        countPopup.addItems(withTitles: ["2", "3", "4", "5"])
        countPopup.target = self
        countPopup.action = #selector(countChanged)
        content.addSubview(countPopup)
        y -= 42

        // Position
        let positionLabel = NSTextField(labelWithString: "Dots position:")
        positionLabel.font = .systemFont(ofSize: 13, weight: .medium)
        positionLabel.frame = NSRect(x: margin, y: y, width: 140, height: 22)
        content.addSubview(positionLabel)

        positionPopup = NSPopUpButton(frame: NSRect(x: margin + 145, y: y - 4, width: innerWidth - 145, height: 28))
        positionPopup.addItems(withTitles: [
            "Bottom of the screen",
            "Right side of the screen",
            "Notch island (top center, blends with the camera)",
        ])
        positionPopup.target = self
        positionPopup.action = #selector(positionChanged)
        content.addSubview(positionPopup)
        y -= 42

        // Start at login
        loginCheckbox = NSButton(
            checkboxWithTitle: "Start MultiClip automatically when you log in",
            target: self,
            action: #selector(loginToggled)
        )
        loginCheckbox.frame = NSRect(x: margin, y: y, width: innerWidth, height: 22)
        content.addSubview(loginCheckbox)
        y -= 66

        let tips = NSTextField(wrappingLabelWithString:
            "Tips: hover the dots to see what each slot holds — drag rows up and down to reorder, " +
            "click a row's ✕ to delete it. Paste a slot with your shortcut + its number. " +
            "You can drag the dots anywhere on screen, and right-click them to reopen these settings."
        )
        tips.font = .systemFont(ofSize: 11.5)
        tips.textColor = .secondaryLabelColor
        tips.frame = NSRect(x: margin, y: y - 14, width: innerWidth, height: 64)
        content.addSubview(tips)

        let done = NSButton(title: "Done", target: self, action: #selector(doneTapped))
        done.bezelStyle = .rounded
        done.keyEquivalent = "\r"
        done.frame = NSRect(x: width - margin - 90, y: 20, width: 90, height: 32)
        content.addSubview(done)
    }

    private func refreshValues() {
        guard let delegate = AppDelegate.shared else { return }
        if let index = HotkeyCombo.allCases.firstIndex(of: delegate.hotkeyCombo) {
            comboPopup.selectItem(at: index)
        }
        countPopup.selectItem(at: min(max(slotCount - 2, 0), 3))

        // A custom (dragged) position isn't one of the presets; show it as
        // an extra, informational entry.
        let customTitle = "Custom (where you dragged them)"
        if let existing = positionPopup.item(withTitle: customTitle) {
            positionPopup.menu?.removeItem(existing)
        }
        if ClipWidget.shared.placement == .custom {
            positionPopup.addItem(withTitle: customTitle)
            positionPopup.selectItem(withTitle: customTitle)
        } else if let index = positionValues.firstIndex(of: ClipWidget.shared.placement) {
            positionPopup.selectItem(at: index)
        }

        loginCheckbox.state = SMAppService.mainApp.status == .enabled ? .on : .off
    }

    // MARK: - Actions

    @objc private func comboChanged() {
        let index = comboPopup.indexOfSelectedItem
        guard HotkeyCombo.allCases.indices.contains(index) else { return }
        AppDelegate.shared?.setHotkeyCombo(HotkeyCombo.allCases[index])
    }

    @objc private func countChanged() {
        AppDelegate.shared?.setSlotCount(countPopup.indexOfSelectedItem + 2)
    }

    @objc private func positionChanged() {
        let index = positionPopup.indexOfSelectedItem
        guard positionValues.indices.contains(index) else { return }
        ClipWidget.shared.setPlacement(positionValues[index])
        refreshValues()
    }

    @objc private func loginToggled() {
        do {
            if loginCheckbox.state == .on {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            NSLog("MultiClip: could not update the login item: \(error)")
        }
        refreshValues()
    }

    @objc private func doneTapped() {
        window?.close()
    }
}
