import SwiftUI

/// 12-week activity grid (columns = weeks, rows = Mon…Sun).
struct Heatmap: View {
    let pomos: [Pomo]
    private let weeks = 12
    private let cell: CGFloat = 13
    private let gap: CGFloat = 3

    private func shade(_ count: Int) -> Color {
        switch count {
        case ..<1: return .pomoLine
        case 1: return Color(red: 0.96, green: 0.72, blue: 0.69)
        case 2...3: return Color(red: 0.93, green: 0.44, blue: 0.39)
        case 4...5: return .pomoTomato
        default: return .pomoTomatoDark
        }
    }

    private var columns: [[Int]] {
        let cal = Calendar.current
        var counts: [String: Int] = [:]
        for p in pomos { counts[PomoMath.dayKey(p.completedAt, cal), default: 0] += 1 }

        var start = cal.startOfDay(for: Date())
        let mondayIndex = (cal.component(.weekday, from: start) + 5) % 7
        start = cal.date(byAdding: .day, value: -(mondayIndex + (weeks - 1) * 7), to: start) ?? start

        var cols: [[Int]] = []
        for w in 0..<weeks {
            var col: [Int] = []
            for d in 0..<7 {
                let day = cal.date(byAdding: .day, value: w * 7 + d, to: start) ?? start
                col.append(day > Date() ? -1 : (counts[PomoMath.dayKey(day, cal)] ?? 0))
            }
            cols.append(col)
        }
        return cols
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Last \(weeks) weeks").font(.subheadline.bold()).foregroundStyle(Color.pomoInk)
            HStack(spacing: gap) {
                ForEach(Array(columns.enumerated()), id: \.offset) { _, col in
                    VStack(spacing: gap) {
                        ForEach(Array(col.enumerated()), id: \.offset) { _, count in
                            RoundedRectangle(cornerRadius: 3)
                                .fill(count < 0 ? Color.clear : shade(count))
                                .frame(width: cell, height: cell)
                        }
                    }
                }
            }
        }
        .pomoCard()
    }
}
