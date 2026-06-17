import Foundation
import SwiftData

@Model
final class IkigaiSnapshot {
    var id: UUID
    var createdAt: Date
    var title: String
    var love: [String]
    var goodAt: [String]
    var worldNeeds: [String]
    var paidFor: [String]

    // Stored as Int64: SwiftData crashes persisting UInt64 values above Int64.max.
    // Use UInt64(bitPattern: seed) when seeding the generative mark.
    var seed: Int64

    init(love: [String] = [],
         goodAt: [String] = [],
         worldNeeds: [String] = [],
         paidFor: [String] = [],
         title: String = "") {
        self.id = UUID()
        self.createdAt = .now
        self.title = title
        self.love = love
        self.goodAt = goodAt
        self.worldNeeds = worldNeeds
        self.paidFor = paidFor
        self.seed = .random(in: .min ... .max)
    }
}

extension IkigaiSnapshot {
    var domainValues: DomainValues {
        DomainValues(love: love, goodAt: goodAt, worldNeeds: worldNeeds, paidFor: paidFor)
    }

    func fullness(for domain: Domain) -> Double {
        domainValues.fullness(for: domain)
    }

    var convergence: Double {
        domainValues.convergence
    }
}
