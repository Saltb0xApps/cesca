import SwiftUI

struct StatsView: View {
    @EnvironmentObject var ledger: Ledger
    @State private var showGarden = false

    var body: some View {
        let stats = ledger.stats
        let tierIdx = Tiers.index(for: stats.total)
        let next = Tiers.next(for: stats.total)
        let grown = Veggies.unlockedCount(total: stats.total)
        let nextVeg = Veggies.next(total: stats.total)
        let subjects = PomoMath.subjects(ledger.pomos)

        ScrollView {
            VStack(spacing: 12) {
                HStack {
                    Text("Your stats").font(.largeTitle.bold()).foregroundStyle(Color.pomoInk)
                    Spacer()
                }

                VStack(spacing: 6) {
                    Text(Tiers.names[tierIdx]).font(.headline).foregroundStyle(.white)
                        .padding(.horizontal, 14).padding(.vertical, 6)
                        .background(Capsule().fill(Tiers.colors[tierIdx]))
                    Text("\(stats.total) pomos all-time").font(.headline).foregroundStyle(Color.pomoInk)
                    Text(next.map { "\($0.remaining) more to reach \($0.tier)" } ?? "Top tier reached 🍅")
                        .font(.caption).foregroundStyle(Color.pomoSubtle)
                }
                .frame(maxWidth: .infinity).pomoCard(padding: 18, radius: 16)

                Button { showGarden = true } label: {
                    VStack(spacing: 10) {
                        HStack {
                            Text("Your garden").font(.headline).foregroundStyle(Color.pomoInk)
                            Spacer()
                            Text("\(grown) / \(Veggies.all.count)").font(.headline).foregroundStyle(Color.pomoTomato)
                        }
                        HStack {
                            ForEach(Array(Veggies.all.enumerated()), id: \.offset) { i, v in
                                VegIcon(type: v.type, size: 30, color: i < grown ? .pomoTomato : .pomoLine)
                                if i < Veggies.all.count - 1 { Spacer() }
                            }
                        }
                        HStack {
                            Text(nextVeg.map { "\($0.remaining) more pomos to grow a \($0.veg.name.lowercased()) →" } ?? "All grown 🎉")
                                .font(.caption).foregroundStyle(Color.pomoSubtle)
                            Spacer()
                        }
                    }
                    .pomoCard(padding: 16, radius: 16)
                }
                .buttonStyle(.plain)

                HStack(spacing: 12) {
                    StatBox(value: stats.today, label: "today")
                    StatBox(value: stats.week, label: "this week")
                }
                HStack(spacing: 12) {
                    StatBox(value: stats.streak, label: "day streak 🔥")
                    StatBox(value: stats.freezes, label: "freezes ❄️")
                }
                HStack(spacing: 12) {
                    StatBox(value: stats.bestDay, label: "best day")
                    StatBox(value: stats.longestChain, label: "longest chain")
                }

                if !subjects.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Time by subject").font(.headline).foregroundStyle(Color.pomoInk)
                        ForEach(subjects) { s in
                            let topCount = subjects.first?.count ?? 1
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(s.task).font(.subheadline.bold()).foregroundStyle(Color.pomoInk).lineLimit(1)
                                    Spacer()
                                    Text("\(PomoMath.formatMinutes(s.minutes)) · \(s.count)🍅")
                                        .font(.caption.bold()).foregroundStyle(Color.pomoSubtle)
                                }
                                ProgressBar(pct: topCount > 0 ? max(0.06, Double(s.count) / Double(topCount)) : 0)
                                    .frame(height: 8)
                            }
                        }
                    }
                    .pomoCard(padding: 16, radius: 16)
                }

                Heatmap(pomos: ledger.pomos)
            }
            .padding(16)
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .sheet(isPresented: $showGarden) { GardenView() }
    }
}
