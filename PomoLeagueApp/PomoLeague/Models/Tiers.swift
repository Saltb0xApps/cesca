import SwiftUI

enum Tiers {
    static let names = ["Bronze", "Silver", "Gold", "Diamond", "Tomato"]
    static let thresholds = [0, 30, 80, 160, 300]
    static let colors: [Color] = [
        Color(red: 0.66, green: 0.44, blue: 0.26),
        Color(red: 0.60, green: 0.64, blue: 0.68),
        Color(red: 0.88, green: 0.69, blue: 0.10),
        Color(red: 0.37, green: 0.79, blue: 0.84),
        .pomoTomato,
    ]

    static func index(for total: Int) -> Int {
        var idx = 0
        for (i, t) in thresholds.enumerated() where total >= t { idx = i }
        return idx
    }

    static func name(for total: Int) -> String { names[index(for: total)] }
    static func color(for total: Int) -> Color { colors[index(for: total)] }

    /// (tier name, pomos remaining) for the next tier, or nil at the top.
    static func next(for total: Int) -> (tier: String, remaining: Int)? {
        let idx = index(for: total)
        guard idx < names.count - 1 else { return nil }
        return (names[idx + 1], thresholds[idx + 1] - total)
    }
}
