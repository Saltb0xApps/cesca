import Foundation

/// Local pomo ledger — powers personal stats / heatmap / garden and keeps the
/// app fully working offline. When signed in, pomos are also banked server-side
/// (see Banking).
@MainActor
final class Ledger: ObservableObject {
    @Published private(set) var pomos: [Pomo] = []
    /// Day the streak was last broken by a phone penalty. Streak counting ignores
    /// days on/before this (see PomoMath.stats).
    @Published private(set) var streakBrokenOn: Date?

    private let key = "pomoleague.pomos.v1"
    private let brokenKey = "pomoleague.streakBrokenOn.v1"

    init() { load() }

    var stats: Stats { PomoMath.stats(pomos, streakBrokenOn: streakBrokenOn) }

    func load() {
        if let data = UserDefaults.standard.data(forKey: key),
           let saved = try? JSONDecoder.iso.decode([Pomo].self, from: data) {
            pomos = saved
        }
        streakBrokenOn = UserDefaults.standard.object(forKey: brokenKey) as? Date
    }

    func bankLocal(chainIndex: Int, task: String?) {
        let trimmed = task?.trimmingCharacters(in: .whitespacesAndNewlines)
        let pomo = Pomo(
            id: "\(Date().timeIntervalSince1970)-\(Int.random(in: 0..<99999))",
            completedAt: Date(),
            chainIndex: chainIndex,
            task: (trimmed?.isEmpty == false) ? trimmed : nil
        )
        pomos.insert(pomo, at: 0)
        save()
    }

    func clear() {
        pomos = []
        streakBrokenOn = nil
        UserDefaults.standard.removeObject(forKey: key)
        UserDefaults.standard.removeObject(forKey: brokenKey)
    }

    /// Phone-penalty (local half): drop every pomo completed today and break the
    /// streak. The server half is Banking.applyPenalty.
    func applyPenaltyLocal() {
        let cal = Calendar.current
        pomos.removeAll { cal.isDateInToday($0.completedAt) }
        streakBrokenOn = cal.startOfDay(for: Date())
        save()
        UserDefaults.standard.set(streakBrokenOn, forKey: brokenKey)
    }

    private func save() {
        if let data = try? JSONEncoder.iso.encode(pomos) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}

extension JSONEncoder {
    static var iso: JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }
}

extension JSONDecoder {
    static var iso: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }
}
