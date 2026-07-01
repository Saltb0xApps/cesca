import Foundation

struct Pomo: Codable, Identifiable {
    var id: String
    var completedAt: Date
    var chainIndex: Int
    var task: String?
}

let pomoMinutes = 25

struct Stats {
    var total = 0
    var today = 0
    var week = 0
    var streak = 0
    var freezes = 0
    var bestDay = 0
    var longestChain = 0
}

struct Subject: Identifiable {
    var task: String
    var count: Int
    var minutes: Int
    var id: String { task }
}

enum PomoMath {
    static func dayKey(_ d: Date, _ cal: Calendar = .current) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return "\(c.year ?? 0)-\(c.month ?? 0)-\(c.day ?? 0)"
    }

    static func startOfWeek(_ d: Date) -> Date {
        mondayCalendar.dateInterval(of: .weekOfYear, for: d)?.start ?? d
    }

    static var mondayCalendar: Calendar {
        var c = Calendar.current
        c.firstWeekday = 2 // Monday
        return c
    }

    static func stats(_ pomos: [Pomo], streakBrokenOn: Date? = nil) -> Stats {
        let cal = Calendar.current
        var s = Stats()
        s.total = pomos.count

        let todayKey = dayKey(Date(), cal)
        let weekStart = startOfWeek(Date())

        var byDay: [String: Int] = [:]
        for p in pomos {
            let k = dayKey(p.completedAt, cal)
            byDay[k, default: 0] += 1
            s.bestDay = max(s.bestDay, byDay[k]!)
            s.longestChain = max(s.longestChain, p.chainIndex + 1)
            if p.completedAt >= weekStart { s.week += 1 }
        }
        s.today = byDay[todayKey] ?? 0

        // streak: consecutive days ending today (or yesterday if none today yet),
        // but never counting days on/before a phone-penalty break.
        let brokenDay = streakBrokenOn.map { cal.startOfDay(for: $0) }
        var streak = 0
        var cursor = cal.startOfDay(for: Date())
        if byDay[dayKey(cursor, cal)] == nil {
            cursor = cal.date(byAdding: .day, value: -1, to: cursor) ?? cursor
        }
        while byDay[dayKey(cursor, cal)] != nil, brokenDay == nil || cursor > brokenDay! {
            streak += 1
            cursor = cal.date(byAdding: .day, value: -1, to: cursor) ?? cursor
        }
        s.streak = streak
        s.freezes = min(2, streak / 7)
        return s
    }

    static func subjects(_ pomos: [Pomo]) -> [Subject] {
        var byTask: [String: Int] = [:]
        for p in pomos {
            let key = (p.task?.isEmpty == false) ? p.task! : "General"
            byTask[key, default: 0] += 1
        }
        return byTask
            .map { Subject(task: $0.key, count: $0.value, minutes: $0.value * pomoMinutes) }
            .sorted { $0.count > $1.count }
    }

    static func recentTasks(_ pomos: [Pomo], limit: Int = 6) -> [String] {
        var seen: [String] = []
        for p in pomos {
            if let t = p.task, !t.isEmpty, !seen.contains(t) { seen.append(t) }
            if seen.count >= limit { break }
        }
        return seen
    }

    static func formatMinutes(_ mins: Int) -> String {
        let h = mins / 60, m = mins % 60
        if h == 0 { return "\(m)m" }
        if m == 0 { return "\(h)h" }
        return "\(h)h \(m)m"
    }
}
