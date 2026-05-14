import Foundation
import UserNotifications

final class ReminderScheduler {
    private var timer: Timer?
    private(set) var minMinutes: Int = 25
    private(set) var maxMinutes: Int = 75
    private(set) var snoozedUntil: Date?
    private(set) var lastPrompt: Prompt?

    var onPromptFired: ((Prompt) -> Void)?

    func start() {
        scheduleNext()
    }

    func snooze(minutes: Int) {
        snoozedUntil = Date().addingTimeInterval(TimeInterval(minutes * 60))
        scheduleNext(after: TimeInterval(minutes * 60))
    }

    func nudgeNow() {
        fire()
    }

    func setInterval(minMin: Int, maxMin: Int) {
        minMinutes = Swift.max(1, minMin)
        maxMinutes = Swift.max(minMinutes, maxMin)
        scheduleNext()
    }

    private func scheduleNext(after override: TimeInterval? = nil) {
        timer?.invalidate()
        let interval: TimeInterval
        if let override = override {
            interval = override
        } else {
            let span = maxMinutes - minMinutes
            let extra = span > 0 ? Int.random(in: 0...span) : 0
            interval = TimeInterval((minMinutes + extra) * 60)
        }
        let t = Timer(timeInterval: interval, repeats: false) { [weak self] _ in
            self?.fire()
        }
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    private func fire() {
        if let until = snoozedUntil, until > Date() {
            scheduleNext(after: until.timeIntervalSinceNow)
            return
        }
        let prompt = Prompts.random()
        lastPrompt = prompt
        post(prompt)
        onPromptFired?(prompt)
        scheduleNext()
    }

    private func post(_ prompt: Prompt) {
        let content = UNMutableNotificationContent()
        content.title = prompt.title
        content.body = prompt.body
        content.sound = .default
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }
}
