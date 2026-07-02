import SwiftUI
import CoreText

// MARK: - Brand palette (from Figma)
extension Color {
    static let pomoRed      = Color(red: 0.545, green: 0.145, blue: 0.145) // #8b2525
    static let pomoRedFaded = Color(red: 0.545, green: 0.145, blue: 0.145).opacity(0.35)
    static let pomoInk      = Color(red: 0.10, green: 0.04, blue: 0.04)   // ~#200a0a (dark bg)
    static let pomoBg       = Color.white
    static let pomoCard     = Color.white
    static let pomoLine     = Color(red: 0.545, green: 0.145, blue: 0.145) // border = pomoRed

    // Legacy aliases so existing code compiles
    static let pomoTomato     = Color.pomoRed
    static let pomoTomatoDark = Color.pomoRed
    static let pomoSubtle     = Color.pomoRedFaded
    static let pomoBgOld      = Color(red: 0.980, green: 0.969, blue: 0.957)
    static let pomoGood       = Color(red: 0.180, green: 0.620, blue: 0.357)
    static let pomoGold       = Color(red: 0.878, green: 0.694, blue: 0.102)
}

// MARK: - Typography
extension Font {
    /// Permanent Marker — big numbers, primary headings
    static func marker(_ size: CGFloat) -> Font {
        .custom("PermanentMarker-Regular", size: size)
    }
    /// Caveat Regular — labels, body, subtitles
    static func caveat(_ size: CGFloat) -> Font {
        .custom("Caveat-Regular", size: size)
    }
    /// Caveat Bold — pills, buttons, card labels
    static func caveatBold(_ size: CGFloat) -> Font {
        .custom("Caveat-Bold", size: size)
    }
}

// MARK: - Card style (Figma: white bg, 1.5px #8b2525 border, radius 4)
extension View {
    func sketchCard(padding: CGFloat = 20) -> some View {
        self
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.pomoCard)
                    .overlay(RoundedRectangle(cornerRadius: 4)
                        .stroke(Color.pomoRed, lineWidth: 1.5))
            )
    }

    // Legacy
    func pomoCard(padding: CGFloat = 16, radius: CGFloat = 14) -> some View {
        sketchCard(padding: padding)
    }
}

// MARK: - Font registration (call once at launch)
enum FontLoader {
    static func registerAll() {
        for name in ["PermanentMarker-Regular", "Caveat-Regular", "Caveat-Bold"] {
            guard let url = Bundle.main.url(forResource: name, withExtension: "ttf") else {
                print("[FontLoader] missing: \(name).ttf")
                continue
            }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}
