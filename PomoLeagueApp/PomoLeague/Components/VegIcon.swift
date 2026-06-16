import SwiftUI

/// Minimal red line-art vegetables, drawn on a 64×64 grid and stroked via
/// Canvas (ports of the web app's SVGs). Stays crisp at any size.
struct VegIcon: View {
    let type: VegType
    var size: CGFloat = 48
    var color: Color = .pomoTomato
    var lineWidth: CGFloat = 3

    var body: some View {
        Canvas { ctx, sz in
            let s = sz.width / 64
            let style = StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
            for path in VegIcon.paths(type) {
                let scaled = path.applying(CGAffineTransform(scaleX: s, y: s))
                ctx.stroke(scaled, with: .color(color), style: style)
            }
        }
        .frame(width: size, height: size)
    }

    // MARK: path data

    private static func p(_ x: Double, _ y: Double) -> CGPoint { CGPoint(x: x, y: y) }

    private static func line(_ pts: [CGPoint]) -> Path {
        var path = Path()
        guard let first = pts.first else { return path }
        path.move(to: first)
        for pt in pts.dropFirst() { path.addLine(to: pt) }
        return path
    }

    private static func ring(_ cx: Double, _ cy: Double, _ r: Double) -> Path {
        Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
    }

    private static func ellipse(_ cx: Double, _ cy: Double, _ rx: Double, _ ry: Double) -> Path {
        Path(ellipseIn: CGRect(x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2))
    }

    private static func paths(_ type: VegType) -> [Path] {
        switch type {
        case .tomato:
            var calyx = Path()
            for end in [p(25, 11), p(32, 8), p(39, 11), p(21, 16), p(43, 16)] {
                calyx.move(to: p(32, 20)); calyx.addLine(to: end)
            }
            var shine = Path()
            shine.move(to: p(20, 32))
            shine.addCurve(to: p(25, 48), control1: p(18, 38), control2: p(20, 44))
            return [
                ellipse(32, 38, 22, 19),
                calyx,
                line([p(32, 20), p(30, 14), p(32, 9), p(34, 14)]).closed(),
                shine,
            ]
        case .carrot:
            return [
                line([p(24, 24), p(40, 24), p(32, 54)]).closed(),
                line([p(28, 32), p(36, 32)]),
                line([p(30, 40), p(34, 40)]),
                greens([(p(28, 24), p(23, 12)), (p(32, 24), p(32, 9)), (p(36, 24), p(41, 12))]),
            ]
        case .strawberry:
            var body = Path()
            body.move(to: p(32, 22))
            body.addCurve(to: p(32, 54), control1: p(16, 22), control2: p(14, 34))
            body.addCurve(to: p(32, 22), control1: p(50, 34), control2: p(48, 22))
            body.closeSubpath()
            return [
                body,
                greens([(p(24, 22), p(20, 15)), (p(32, 22), p(32, 13)), (p(40, 22), p(44, 15))]),
                ring(27, 32, 1.2), ring(37, 32, 1.2), ring(32, 38, 1.2),
                ring(24, 40, 1.2), ring(40, 40, 1.2),
            ]
        case .pepper:
            var body = Path()
            body.move(to: p(20, 26))
            body.addCurve(to: p(24, 50), control1: p(14, 30), control2: p(14, 44))
            body.addCurve(to: p(34, 50), control1: p(28, 53), control2: p(30, 47))
            body.addCurve(to: p(46, 30), control1: p(44, 52), control2: p(50, 40))
            body.addCurve(to: p(20, 26), control1: p(42, 24), control2: p(26, 22))
            body.closeSubpath()
            return [body, line([p(33, 26), p(33, 16), p(40, 14)])]
        case .corn:
            var husk = Path()
            husk.move(to: p(20, 50)); husk.addCurve(to: p(18, 60), control1: p(14, 54), control2: p(14, 58))
            husk.move(to: p(44, 50)); husk.addCurve(to: p(46, 60), control1: p(50, 54), control2: p(50, 58))
            return [
                ellipse(32, 34, 13, 22),
                line([p(32, 14), p(32, 56)]),
                line([p(24, 24), p(40, 24)]),
                line([p(22, 34), p(42, 34)]),
                line([p(24, 44), p(40, 44)]),
                husk,
            ]
        case .eggplant:
            var body = Path()
            body.move(to: p(22, 30))
            body.addCurve(to: p(38, 52), control1: p(16, 44), control2: p(26, 56))
            body.addCurve(to: p(38, 26), control1: p(50, 47), control2: p(50, 30))
            body.addCurve(to: p(22, 30), control1: p(30, 23), control2: p(26, 24))
            body.closeSubpath()
            return [body, greens([(p(34, 27), p(40, 18)), (p(34, 27), p(30, 19)), (p(34, 27), p(42, 22))])]
        case .broccoli:
            return [
                ring(26, 28, 7), ring(34, 25, 7), ring(42, 29, 6),
                line([p(26, 38), p(24, 52), p(40, 52), p(38, 38)]),
            ]
        case .mushroom:
            var cap = Path()
            cap.move(to: p(14, 34))
            cap.addCurve(to: p(50, 34), control1: p(14, 20), control2: p(50, 20))
            cap.closeSubpath()
            var stem = Path()
            stem.move(to: p(26, 34))
            stem.addLine(to: p(26, 48))
            stem.addCurve(to: p(38, 48), control1: p(26, 52), control2: p(38, 52))
            stem.addLine(to: p(38, 34))
            return [cap, stem, ring(26, 28, 1.6), ring(36, 29, 1.6)]
        }
    }

    private static func greens(_ pairs: [(CGPoint, CGPoint)]) -> Path {
        var path = Path()
        for (a, b) in pairs { path.move(to: a); path.addLine(to: b) }
        return path
    }
}

private extension Path {
    func closed() -> Path {
        var p = self
        p.closeSubpath()
        return p
    }
}
