import Foundation

enum VegType: String, CaseIterable, Identifiable {
    case tomato, carrot, strawberry, pepper, corn, eggplant, broccoli, mushroom
    var id: String { rawValue }
    var name: String { rawValue.capitalized }
}

struct Veg: Identifiable {
    var type: VegType
    var unlockAt: Int
    var id: String { type.rawValue }
    var name: String { type.name }
}

enum Veggies {
    static let all: [Veg] = [
        Veg(type: .tomato, unlockAt: 0),
        Veg(type: .carrot, unlockAt: 10),
        Veg(type: .strawberry, unlockAt: 25),
        Veg(type: .pepper, unlockAt: 50),
        Veg(type: .corn, unlockAt: 80),
        Veg(type: .eggplant, unlockAt: 120),
        Veg(type: .broccoli, unlockAt: 180),
        Veg(type: .mushroom, unlockAt: 260),
    ]

    static func isUnlocked(_ veg: Veg, total: Int) -> Bool { total >= veg.unlockAt }
    static func unlockedCount(total: Int) -> Int { all.filter { total >= $0.unlockAt }.count }

    static func next(total: Int) -> (veg: Veg, remaining: Int)? {
        guard let veg = all.first(where: { total < $0.unlockAt }) else { return nil }
        return (veg, veg.unlockAt - total)
    }
}
