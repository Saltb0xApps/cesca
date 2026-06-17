import SwiftUI

/// A tiny preview of the ikigai mark: four nodes in a diamond sized by fullness, plus a central
/// node sized by convergence. Placeholder until the full `WallpaperView` lands in Phase 2, but
/// already a faithful miniature of the design.
struct MiniMark: View {
    let values: DomainValues

    var body: some View {
        Canvas { context, size in
            let dimension = min(size.width, size.height)
            func point(_ unit: CGPoint) -> CGPoint {
                CGPoint(x: unit.x * size.width, y: unit.y * size.height)
            }

            // Central convergence glow.
            let convergence = values.convergence
            if convergence > 0 {
                let r = dimension * (0.06 + 0.10 * convergence)
                drawDot(context, at: point(DesignTokens.Node.center),
                        radius: r, color: DesignTokens.accent.opacity(0.25 + 0.6 * convergence))
            }

            // Four domain nodes.
            for domain in Domain.allCases {
                let fullness = values.fullness(for: domain)
                let r = dimension * (0.03 + 0.09 * fullness)
                drawDot(context, at: point(DesignTokens.Node.position(for: domain)),
                        radius: r, color: DesignTokens.nodeColor.opacity(0.25 + 0.7 * fullness))
            }
        }
        .background(DesignTokens.background)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func drawDot(_ context: GraphicsContext, at center: CGPoint, radius: CGFloat, color: Color) {
        let rect = CGRect(x: center.x - radius, y: center.y - radius,
                          width: radius * 2, height: radius * 2)
        context.fill(Circle().path(in: rect), with: .color(color))
    }
}
