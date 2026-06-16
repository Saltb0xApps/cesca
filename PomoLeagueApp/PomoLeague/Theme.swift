import SwiftUI

// Brand palette — mirrors the web app's tokens.
extension Color {
    static let pomoTomato = Color(red: 0.902, green: 0.227, blue: 0.180) // #E63A2E
    static let pomoTomatoDark = Color(red: 0.718, green: 0.110, blue: 0.110) // #B71C1C
    static let pomoInk = Color(red: 0.110, green: 0.102, blue: 0.133) // #1C1A22
    static let pomoSubtle = Color(red: 0.420, green: 0.404, blue: 0.463) // #6B6776
    static let pomoBg = Color(red: 0.980, green: 0.969, blue: 0.957) // #FAF7F4
    static let pomoCard = Color.white
    static let pomoLine = Color(red: 0.925, green: 0.906, blue: 0.882) // #ECE7E1
    static let pomoGood = Color(red: 0.180, green: 0.620, blue: 0.357) // #2E9E5B
    static let pomoGold = Color(red: 0.878, green: 0.694, blue: 0.102) // #E0B11A
}

extension View {
    /// Standard rounded card used across the app.
    func pomoCard(padding: CGFloat = 16, radius: CGFloat = 14) -> some View {
        self
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: radius)
                    .fill(Color.pomoCard)
                    .overlay(RoundedRectangle(cornerRadius: radius).stroke(Color.pomoLine, lineWidth: 1))
            )
    }
}
