import SwiftUI

struct StatsView: View {
    @EnvironmentObject var ledger: Ledger

    var body: some View {
        let stats = ledger.stats
        let tierIdx = Tiers.index(for: stats.total)
        let next    = Tiers.next(for: stats.total)

        ScrollView {
            VStack(spacing: 0) {
                HStack {
                    Text("your stats.")
                        .font(.marker(32))
                        .foregroundStyle(Color.pomoRed)
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 52)
                .padding(.bottom, 18)

                VStack(spacing: 14) {
                    // Tier + all-time card
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Text(Tiers.names[tierIdx])
                                .font(.caveatBold(14))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 5)
                                .background(Capsule().fill(Tiers.colors[tierIdx]))
                            Spacer()
                            Image(systemName: "trophy")
                                .font(.system(size: 22))
                                .foregroundStyle(Color.pomoRedFaded)
                        }

                        HStack(alignment: .bottom, spacing: 6) {
                            Text("\(stats.total)")
                                .font(.marker(64))
                                .foregroundStyle(Color.pomoRed)
                            Text("pomos")
                                .font(.caveat(17))
                                .foregroundStyle(Color.pomoRedFaded)
                                .padding(.bottom, 12)
                        }
                        .padding(.top, 4)

                        if let next {
                            Text("\(next.remaining) more to reach \(next.tier)")
                                .font(.caveat(15))
                                .foregroundStyle(Color.pomoRedFaded)
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 3).fill(Color.pomoRed.opacity(0.15))
                                    RoundedRectangle(cornerRadius: 3).fill(Color.pomoRed)
                                        .frame(width: geo.size.width * tierPct(stats.total, next: next))
                                }
                            }
                            .frame(height: 6)
                            .padding(.top, 8)
                        } else {
                            Text("top tier reached 🍅")
                                .font(.caveat(15))
                                .foregroundStyle(Color.pomoRedFaded)
                        }
                    }
                    .sketchCard()

                    // 2×3 stat grid
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 14),
                                        GridItem(.flexible(), spacing: 14)],
                              spacing: 14) {
                        MiniStatCard(label: "today",      icon: "calendar",   value: "\(stats.today)")
                        MiniStatCard(label: "this week",  icon: "flame",      value: "\(stats.week)")
                        MiniStatCard(label: "streak",     icon: "flame.fill", value: "\(stats.streak)",        unit: "days")
                        MiniStatCard(label: "freezes",    icon: "snowflake",  value: "\(stats.freezes)",       unit: "left")
                        MiniStatCard(label: "best day",   icon: "star",       value: "\(stats.bestDay)",       unit: "pomos")
                        MiniStatCard(label: "best chain", icon: "link",       value: "\(stats.longestChain)",  unit: "pomos")
                    }

                    // 12-week heatmap
                    VStack(alignment: .leading, spacing: 10) {
                        SketchLabel("12-week activity")
                        Heatmap(pomos: ledger.pomos)
                    }
                    .sketchCard()
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
            }
        }
        .background(Color.pomoBg.ignoresSafeArea())
    }

    private func tierPct(_ total: Int, next: (tier: String, remaining: Int)) -> Double {
        let idx  = Tiers.index(for: total)
        let lo   = Tiers.thresholds[idx]
        let hi   = lo + next.remaining
        guard hi > lo else { return 1 }
        return Double(total - lo) / Double(hi - lo)
    }
}

private struct MiniStatCard: View {
    let label: String
    let icon: String
    let value: String
    var unit: String = "pomos"

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                SketchLabel(label)
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.pomoRedFaded)
            }
            Text(value)
                .font(.marker(44))
                .foregroundStyle(Color.pomoRed)
                .padding(.top, 8)
            Text(unit)
                .font(.caveat(13))
                .foregroundStyle(Color.pomoRedFaded)
                .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .sketchCard()
    }
}

// Keep legacy ProgressBar + StatBox for existing code
struct ProgressBar: View {
    let pct: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.pomoRed.opacity(0.1))
                Capsule().fill(Color.pomoRed).frame(width: geo.size.width * pct)
            }
        }
        .frame(height: 8)
    }
}
