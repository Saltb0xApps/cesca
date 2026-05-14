import Foundation

enum PromptKind: CaseIterable {
    case journal, checkIn, breakTime

    var weight: Int {
        switch self {
        case .journal: return 3
        case .checkIn: return 2
        case .breakTime: return 2
        }
    }
}

struct Prompt {
    let kind: PromptKind
    let title: String
    let body: String
}

enum Prompts {
    static let journal: [(String, String)] = [
        ("Journal time", "What's on your mind right now? One sentence is enough."),
        ("Journal time", "What did you do in the last hour? Jot it down."),
        ("Journal time", "Any wins so far today? Write one down."),
        ("Journal time", "What's bugging you? Get it out of your head."),
        ("Journal time", "Name one thing you're grateful for right now."),
        ("Journal time", "What's the most useful thing you learned today?"),
    ]

    static let checkIn: [(String, String)] = [
        ("Quick check-in", "Are you doing what you said you'd be doing?"),
        ("Quick check-in", "Is this the most important thing right now?"),
        ("Quick check-in", "Still on the rails, or off in a tab somewhere?"),
        ("Quick check-in", "What's the next concrete step?"),
        ("Quick check-in", "If you stopped now, would you be proud of the last hour?"),
    ]

    static let breakTime: [(String, String)] = [
        ("Take a break", "Stand up. Drink some water. Look at something far away."),
        ("Take a break", "Eyes off the screen for two minutes."),
        ("Take a break", "Stretch. Your shoulders will thank you."),
        ("Take a break", "Step outside for a moment if you can."),
        ("Take a break", "Breathe. Four in, six out, four times."),
    ]

    static func random() -> Prompt {
        let kinds = PromptKind.allCases.flatMap { Array(repeating: $0, count: $0.weight) }
        let kind = kinds.randomElement() ?? .journal
        let pool: [(String, String)]
        switch kind {
        case .journal: pool = journal
        case .checkIn: pool = checkIn
        case .breakTime: pool = breakTime
        }
        let pick = pool.randomElement() ?? ("Hey", "Hi from your dachshund.")
        return Prompt(kind: kind, title: pick.0, body: pick.1)
    }
}
