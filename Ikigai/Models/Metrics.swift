import Foundation

/// The four ikigai domains. Diamond layout: love top, goodAt left, worldNeeds right, paidFor bottom.
enum Domain: String, CaseIterable, Identifiable {
    case love
    case goodAt
    case worldNeeds
    case paidFor

    var id: String { rawValue }

    var title: String {
        switch self {
        case .love: "What you love"
        case .goodAt: "What you're good at"
        case .worldNeeds: "What the world needs"
        case .paidFor: "What you can be paid for"
        }
    }

    var systemImage: String {
        switch self {
        case .love: "heart.fill"
        case .goodAt: "star.fill"
        case .worldNeeds: "globe"
        case .paidFor: "dollarsign.circle.fill"
        }
    }
}

/// A plain value type holding the four domains' items. Shared by the living draft and snapshots
/// so metrics are pure functions of the data and the mark is reproducible.
struct DomainValues: Equatable {
    var love: [String] = []
    var goodAt: [String] = []
    var worldNeeds: [String] = []
    var paidFor: [String] = []

    /// Items in a domain past which a node is considered "full".
    static let fullnessCap = 5

    func items(for domain: Domain) -> [String] {
        switch domain {
        case .love: love
        case .goodAt: goodAt
        case .worldNeeds: worldNeeds
        case .paidFor: paidFor
        }
    }

    /// Normalized item count (0…1), capped at `fullnessCap`. Controls node size/opacity.
    func fullness(for domain: Domain) -> Double {
        let count = items(for: domain).count
        return min(Double(count), Double(Self.fullnessCap)) / Double(Self.fullnessCap)
    }

    /// How evenly all four domains are developed (0…1): min / max of the four counts.
    /// Stays 0 until every domain carries weight. Controls the central glow.
    var convergence: Double {
        let counts = Domain.allCases.map { items(for: $0).count }
        guard let mx = counts.max(), mx > 0 else { return 0 }
        let mn = counts.min() ?? 0
        return Double(mn) / Double(mx)
    }
}
