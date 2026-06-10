import SwiftUI

// MARK: - Pixel palette
// A tiny fixed palette. Every sprite is just a grid of these characters,
// which keeps the whole game's art as readable text (no binary assets).

enum Palette {
    static func color(for ch: Character) -> Color? {
        switch ch {
        case ".", " ": return nil                       // transparent
        case "k": return Color(red: 0.10, green: 0.08, blue: 0.12) // outline
        case "w": return Color(red: 0.96, green: 0.96, blue: 0.92) // white
        case "g": return Color(red: 0.32, green: 0.72, blue: 0.34) // leaf green
        case "G": return Color(red: 0.17, green: 0.46, blue: 0.22) // dark green
        case "s": return Color(red: 0.22, green: 0.55, blue: 0.26) // stem
        case "r": return Color(red: 0.90, green: 0.25, blue: 0.22) // red
        case "R": return Color(red: 0.64, green: 0.13, blue: 0.13) // dark red
        case "o": return Color(red: 0.95, green: 0.55, blue: 0.16) // orange
        case "y": return Color(red: 0.98, green: 0.82, blue: 0.22) // yellow
        case "Y": return Color(red: 0.84, green: 0.60, blue: 0.11) // deep yellow
        case "p": return Color(red: 0.56, green: 0.26, blue: 0.66) // purple
        case "P": return Color(red: 0.38, green: 0.15, blue: 0.49) // dark purple
        case "b": return Color(red: 0.56, green: 0.36, blue: 0.21) // brown
        case "B": return Color(red: 0.38, green: 0.22, blue: 0.12) // dark brown
        case "d": return Color(red: 0.37, green: 0.25, blue: 0.16) // dirt
        case "X": return Color(red: 0.20, green: 0.12, blue: 0.08) // rot
        case "m": return Color(red: 0.95, green: 0.45, blue: 0.66) // pink
        default:  return nil
        }
    }
}

// MARK: - Sprite

/// A pixel sprite stored as rows of characters. Rows may be ragged;
/// the renderer treats missing/extra cells as transparent.
struct PixelSprite {
    let rows: [String]
    var height: Int { rows.count }
    var width: Int { rows.map { $0.count }.max() ?? 0 }
}

/// Renders a `PixelSprite` as crisp filled squares (no anti-aliasing),
/// which gives the blocky, pixelated look on any screen size.
struct PixelSpriteView: View {
    let sprite: PixelSprite

    var body: some View {
        Canvas { ctx, size in
            let cols = sprite.width
            let rows = sprite.height
            guard cols > 0, rows > 0 else { return }
            let cell = min(size.width / CGFloat(cols), size.height / CGFloat(rows))
            let ox = (size.width  - cell * CGFloat(cols)) / 2
            let oy = (size.height - cell * CGFloat(rows)) / 2
            for (y, row) in sprite.rows.enumerated() {
                for (x, ch) in row.enumerated() {
                    guard let color = Palette.color(for: ch) else { continue }
                    let rect = CGRect(x: ox + CGFloat(x) * cell,
                                      y: oy + CGFloat(y) * cell,
                                      width: cell + 0.6, height: cell + 0.6)
                    ctx.fill(Path(rect), with: .color(color))
                }
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Pixel styling helpers

extension Font {
    /// Monospaced heavy font approximates a pixel font without bundling a TTF.
    static func pixel(_ size: CGFloat) -> Font {
        .system(size: size, weight: .heavy, design: .monospaced)
    }
}

extension View {
    func pixelText(_ size: CGFloat) -> some View {
        self.font(.pixel(size)).tracking(1)
    }
}

/// App color theme.
enum Theme {
    static let sky      = Color(red: 0.40, green: 0.70, blue: 0.92)
    static let skyLow   = Color(red: 0.70, green: 0.88, blue: 0.98)
    static let soil     = Color(red: 0.37, green: 0.25, blue: 0.16)
    static let soilDark = Color(red: 0.28, green: 0.18, blue: 0.11)
    static let ink      = Color(red: 0.12, green: 0.10, blue: 0.14)
    static let grass    = Color(red: 0.34, green: 0.66, blue: 0.32)
}
