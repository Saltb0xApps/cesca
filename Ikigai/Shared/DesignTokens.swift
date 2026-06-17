import SwiftUI

/// Colors, mark geometry, and layout constants. The single place the visual language lives.
enum DesignTokens {
    /// Pure near-black background.
    static let background = Color(red: 0x05 / 255, green: 0x06 / 255, blue: 0x0A / 255)

    static let nodeColor = Color.white
    static let accent = Color(red: 0.55, green: 0.80, blue: 1.0)

    /// Diamond node positions in unit space (0…1). Anchored in the vertical middle so the
    /// lock-screen-safe top (~25%) and bottom (~15%) stay calm.
    enum Node {
        static let love = CGPoint(x: 0.50, y: 0.36)
        static let goodAt = CGPoint(x: 0.30, y: 0.50)
        static let worldNeeds = CGPoint(x: 0.70, y: 0.50)
        static let paidFor = CGPoint(x: 0.50, y: 0.64)
        static let center = CGPoint(x: 0.50, y: 0.50)

        static func position(for domain: Domain) -> CGPoint {
            switch domain {
            case .love: love
            case .goodAt: goodAt
            case .worldNeeds: worldNeeds
            case .paidFor: paidFor
            }
        }
    }
}
