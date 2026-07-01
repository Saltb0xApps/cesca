import Foundation

@MainActor
final class ProfileStore: ObservableObject {
    @Published var displayName = ""
    @Published var avatar = "🍅"
    @Published var examTag = ""
    @Published var seenRules = false
    @Published var seenIntro = false
    @Published var hasPickedGoal = false
    @Published var dailyGoal = 8

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
        var dailyGoal: Int
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
        dailyGoal = s.dailyGoal
    }

    func save() {
        let s = Saved(displayName: displayName, avatar: avatar, examTag: examTag,
                      seenRules: seenRules, seenIntro: seenIntro, hasPickedGoal: hasPickedGoal,
                      dailyGoal: dailyGoal)
        if let data = try? JSONEncoder().encode(s) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    func setGoal(_ delta: Int) {
        dailyGoal = min(16, max(1, dailyGoal + delta))
        save()
    }
}
