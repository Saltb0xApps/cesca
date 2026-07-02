import Foundation

@MainActor
final class ProfileStore: ObservableObject {
    @Published var displayName = ""
    @Published var avatar = "🍅"
    @Published var examTag = ""
    @Published var seenRules = false
    @Published var seenIntro = false
    @Published var hasPickedGoal = false
    @Published var hasMatchedGoal = false
    @Published var dailyGoal = 8

    // Settings
    @Published var focusDuration = 25
    @Published var shortBreak = 5
    @Published var longBreak = 15
    @Published var autoStartBreak = false
    @Published var strictMode = true
    @Published var notifyRoundComplete = true
    @Published var notifyDailyReminder = false

    private let key = "pomoleague.profile.v1"

    init() { load() }

    // New fields are optional so adding more later won't wipe an existing profile.
    private struct Saved: Codable {
        var displayName: String
        var avatar: String
        var examTag: String
        var seenRules: Bool
        var seenIntro: Bool
        var hasPickedGoal: Bool?
        var hasMatchedGoal: Bool?
        var dailyGoal: Int
        var focusDuration: Int?
        var shortBreak: Int?
        var longBreak: Int?
        var autoStartBreak: Bool?
        var strictMode: Bool?
        var notifyRoundComplete: Bool?
        var notifyDailyReminder: Bool?
    }

    func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let s = try? JSONDecoder().decode(Saved.self, from: data) else { return }
        displayName = s.displayName
        avatar = s.avatar
        examTag = s.examTag
        seenRules = s.seenRules
        seenIntro = s.seenIntro
        hasPickedGoal = s.hasPickedGoal ?? false
        hasMatchedGoal = s.hasMatchedGoal ?? false
        dailyGoal = s.dailyGoal
        focusDuration = s.focusDuration ?? 25
        shortBreak = s.shortBreak ?? 5
        longBreak = s.longBreak ?? 15
        autoStartBreak = s.autoStartBreak ?? false
        strictMode = s.strictMode ?? true
        notifyRoundComplete = s.notifyRoundComplete ?? true
        notifyDailyReminder = s.notifyDailyReminder ?? false
    }

    func save() {
        let s = Saved(displayName: displayName, avatar: avatar, examTag: examTag,
                      seenRules: seenRules, seenIntro: seenIntro,
                      hasPickedGoal: hasPickedGoal, hasMatchedGoal: hasMatchedGoal,
                      dailyGoal: dailyGoal,
                      focusDuration: focusDuration, shortBreak: shortBreak, longBreak: longBreak,
                      autoStartBreak: autoStartBreak, strictMode: strictMode,
                      notifyRoundComplete: notifyRoundComplete, notifyDailyReminder: notifyDailyReminder)
        if let data = try? JSONEncoder().encode(s) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    func setGoal(_ delta: Int) {
        dailyGoal = min(16, max(1, dailyGoal + delta))
        save()
    }
}
