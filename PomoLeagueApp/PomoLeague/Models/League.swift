import Foundation

struct Member: Identifiable {
    var id: String
    var name: String
    var avatar: String
    var pomos: Int
    var isYou: Bool
}

struct Cohort {
    var tierName: String
    var tierIndex: Int
    var weekStart: Date
    var weekEnd: Date
    var members: [Member] // ranked desc
    var yourRank: Int
    var teamTotal: Int
    var teamGoal: Int
    var promoteCount: Int
    var relegateCount: Int
}

enum DemoLeague {
    private static let names = [
        "Maya", "Leo", "Aria", "Kai", "Nora", "Eli", "Zoe", "Omar", "Ivy", "Finn",
        "Luna", "Jude", "Mira", "Theo", "Sana", "Cole", "Remy", "Nina", "Asha", "Dev",
        "Yuki", "Bea", "Hugo", "Lena", "Rey", "Tariq", "Esme", "Niko", "Priya", "Wren",
    ]
    private static let avatars = ["🦉", "🔥", "📚", "🧠", "⚡️", "🌙", "☕️", "🎯", "🐢", "🦊", "🌵", "🍀"]
    private static let cohortSize = 20
    static let teamGoal = 300

    // Seeded PRNG (mulberry32-style) for a stable weekly cohort.
    private struct RNG {
        var state: UInt32
        mutating func next() -> Double {
            state = state &+ 0x6D2B79F5
            var t = state
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
        }
    }

    private static func seed(_ s: String) -> UInt32 {
        var h: UInt32 = 2166136261
        for b in s.utf8 { h = (h ^ UInt32(b)) &* 16777619 }
        return h
    }

    static func cohort(pomos: [Pomo], total: Int, youName: String, youAvatar: String, now: Date = Date()) -> Cohort {
        let weekStart = PomoMath.startOfWeek(now)
        let weekEnd = Calendar.current.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        var rng = RNG(state: seed(PomoMath.dayKey(weekStart)))
        let hoursIntoWeek = min(168, max(0, now.timeIntervalSince(weekStart) / 3600))

        var pool = names
        for i in stride(from: pool.count - 1, to: 0, by: -1) {
            let j = Int(rng.next() * Double(i + 1))
            pool.swapAt(i, j)
        }

        var members: [Member] = []
        for i in 0..<(cohortSize - 1) {
            let base = Int(rng.next() * 3)
            let rate = 0.03 + rng.next() * 0.24
            let count = min(60, base + Int(rate * hoursIntoWeek))
            members.append(Member(
                id: "bot-\(i)",
                name: i < pool.count ? pool[i] : "Rival \(i)",
                avatar: avatars[Int(rng.next() * Double(avatars.count))],
                pomos: count,
                isYou: false
            ))
        }

        let weekly = pomos.filter { $0.completedAt >= weekStart }.count
        members.append(Member(id: "you", name: youName, avatar: youAvatar, pomos: weekly, isYou: true))
        members.sort { $0.pomos != $1.pomos ? $0.pomos > $1.pomos : ($0.isYou && !$1.isYou) }

        let rank = (members.firstIndex { $0.isYou } ?? 0) + 1
        let teamTotal = members.reduce(0) { $0 + $1.pomos }
        let idx = Tiers.index(for: total)

        return Cohort(
            tierName: Tiers.names[idx],
            tierIndex: idx,
            weekStart: weekStart,
            weekEnd: weekEnd,
            members: members,
            yourRank: rank,
            teamTotal: teamTotal,
            teamGoal: teamGoal,
            promoteCount: 5,
            relegateCount: 5
        )
    }
}
