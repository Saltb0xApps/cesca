import SwiftUI

/// A field of tomatoes — `filled` are solid, the rest are faint outlines. Used
/// as the visual "background" of today's completed pomos.
struct TomatoField: View {
    let filled: Int
    let total: Int
    var iconSize: CGFloat = 34

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: iconSize + 6), spacing: 8)], spacing: 8) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                VegIcon(type: .tomato, size: iconSize, color: i < filled ? .pomoTomato : .pomoLine)
            }
        }
    }
}
