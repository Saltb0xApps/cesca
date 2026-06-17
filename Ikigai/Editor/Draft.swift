import Foundation
import Observation

/// The living draft the user keeps mutating. Persisted to UserDefaults so it survives relaunch.
/// "Capture version" clones this into the immutable SwiftData archive.
@MainActor
@Observable
final class Draft {
    var title: String { didSet { save() } }
    var values: DomainValues { didSet { save() } }

    private static let storageKey = "ikigai.draft.v1"

    init() {
        if let data = UserDefaults.standard.data(forKey: Self.storageKey),
           let stored = try? JSONDecoder().decode(Stored.self, from: data) {
            title = stored.title
            values = DomainValues(love: stored.love,
                                  goodAt: stored.goodAt,
                                  worldNeeds: stored.worldNeeds,
                                  paidFor: stored.paidFor)
        } else {
            title = ""
            values = DomainValues()
        }
    }

    func items(for domain: Domain) -> [String] {
        values.items(for: domain)
    }

    func add(_ raw: String, to domain: Domain) {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        switch domain {
        case .love: values.love.append(text)
        case .goodAt: values.goodAt.append(text)
        case .worldNeeds: values.worldNeeds.append(text)
        case .paidFor: values.paidFor.append(text)
        }
    }

    func remove(_ item: String, from domain: Domain) {
        switch domain {
        case .love: values.love.removeAll { $0 == item }
        case .goodAt: values.goodAt.removeAll { $0 == item }
        case .worldNeeds: values.worldNeeds.removeAll { $0 == item }
        case .paidFor: values.paidFor.removeAll { $0 == item }
        }
    }

    /// Build an immutable snapshot from the current draft (for the archive).
    func makeSnapshot() -> IkigaiSnapshot {
        IkigaiSnapshot(love: values.love,
                       goodAt: values.goodAt,
                       worldNeeds: values.worldNeeds,
                       paidFor: values.paidFor,
                       title: title.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    private func save() {
        let stored = Stored(title: title,
                            love: values.love,
                            goodAt: values.goodAt,
                            worldNeeds: values.worldNeeds,
                            paidFor: values.paidFor)
        if let data = try? JSONEncoder().encode(stored) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    private struct Stored: Codable {
        var title: String
        var love: [String]
        var goodAt: [String]
        var worldNeeds: [String]
        var paidFor: [String]
    }
}
