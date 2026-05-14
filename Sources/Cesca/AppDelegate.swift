import Cocoa
import UserNotifications

final class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    private var statusItem: NSStatusItem!
    private var scheduler = ReminderScheduler()

    func applicationDidFinishLaunching(_ notification: Notification) {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }

        setupStatusItem()

        scheduler.onPromptFired = { [weak self] _ in
            DispatchQueue.main.async { self?.rebuildMenu() }
        }
        scheduler.start()
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.image = dachshundImage()
            button.imagePosition = .imageOnly
            button.toolTip = "Cesca — your journaling dachshund"
        }
        rebuildMenu()
    }

    private func dachshundImage() -> NSImage {
        if let url = Bundle.module.url(forResource: "dachshund", withExtension: "png"),
           let img = NSImage(contentsOf: url) {
            img.size = NSSize(width: 20, height: 20)
            img.isTemplate = false
            return img
        }
        // Fallback: render an emoji into an NSImage so the status item always shows something.
        let size = NSSize(width: 20, height: 20)
        let img = NSImage(size: size)
        img.lockFocus()
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 16)
        ]
        let str = NSAttributedString(string: "🐕", attributes: attrs)
        str.draw(at: NSPoint(x: 1, y: 1))
        img.unlockFocus()
        return img
    }

    private func rebuildMenu() {
        let menu = NSMenu()

        if let last = scheduler.lastPrompt {
            let header = NSMenuItem(title: last.title, action: nil, keyEquivalent: "")
            header.isEnabled = false
            menu.addItem(header)
            let bodyItem = NSMenuItem(title: last.body, action: nil, keyEquivalent: "")
            bodyItem.isEnabled = false
            menu.addItem(bodyItem)
        } else {
            let header = NSMenuItem(title: "No nudges yet — I'm watching.", action: nil, keyEquivalent: "")
            header.isEnabled = false
            menu.addItem(header)
        }

        menu.addItem(.separator())

        menu.addItem(action(title: "Nudge me now", selector: #selector(nudgeNow)))
        let snooze = NSMenuItem(title: "Snooze", action: nil, keyEquivalent: "")
        let snoozeMenu = NSMenu()
        snoozeMenu.addItem(snoozeItem(minutes: 15))
        snoozeMenu.addItem(snoozeItem(minutes: 30))
        snoozeMenu.addItem(snoozeItem(minutes: 60))
        snoozeMenu.addItem(snoozeItem(minutes: 180))
        snooze.submenu = snoozeMenu
        menu.addItem(snooze)

        let intervalItem = NSMenuItem(
            title: "Interval: \(scheduler.minMinutes)–\(scheduler.maxMinutes) min",
            action: nil, keyEquivalent: ""
        )
        let intervalMenu = NSMenu()
        intervalMenu.addItem(intervalChoice(min: 15, max: 45, label: "Pushy (15–45 min)"))
        intervalMenu.addItem(intervalChoice(min: 25, max: 75, label: "Balanced (25–75 min)"))
        intervalMenu.addItem(intervalChoice(min: 45, max: 120, label: "Chill (45–120 min)"))
        intervalMenu.addItem(intervalChoice(min: 90, max: 180, label: "Background (90–180 min)"))
        intervalItem.submenu = intervalMenu
        menu.addItem(intervalItem)

        menu.addItem(.separator())
        menu.addItem(action(title: "Quit Cesca", selector: #selector(quit)))

        statusItem.menu = menu
    }

    private func action(title: String, selector: Selector) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: selector, keyEquivalent: "")
        item.target = self
        return item
    }

    private func snoozeItem(minutes: Int) -> NSMenuItem {
        let item = NSMenuItem(
            title: "\(minutes) min",
            action: #selector(snoozeAction(_:)),
            keyEquivalent: ""
        )
        item.target = self
        item.tag = minutes
        return item
    }

    private func intervalChoice(min: Int, max: Int, label: String) -> NSMenuItem {
        let item = NSMenuItem(title: label, action: #selector(intervalAction(_:)), keyEquivalent: "")
        item.target = self
        item.representedObject = [min, max]
        if scheduler.minMinutes == min && scheduler.maxMinutes == max {
            item.state = .on
        }
        return item
    }

    @objc private func nudgeNow() {
        scheduler.nudgeNow()
    }

    @objc private func snoozeAction(_ sender: NSMenuItem) {
        scheduler.snooze(minutes: sender.tag)
    }

    @objc private func intervalAction(_ sender: NSMenuItem) {
        guard let pair = sender.representedObject as? [Int], pair.count == 2 else { return }
        scheduler.setInterval(minMin: pair[0], maxMin: pair[1])
        rebuildMenu()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}
