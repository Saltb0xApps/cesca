import SwiftUI

struct RecapView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let stats = ledger.stats
        let tier = Tiers.name(for: stats.total)
        let shareText = "My week on PomoLeague 🍅\n"
            + (profile.examTag.isEmpty ? "\(tier)\n" : "\(profile.examTag) · \(tier)\n")
            + "\(stats.week) pomos this week · \(stats.total) all-time · \(stats.streak)-day streak 🔥"

        VStack(spacing: 16) {
            VStack(spacing: 8) {
                Text("POMOLEAGUE").font(.caption.weight(.black)).tracking(3).foregroundStyle(.white.opacity(0.8))
                Text(profile.avatar).font(.system(size: 64))
                Text(profile.displayName.isEmpty ? "You" : profile.displayName).font(.title.bold()).foregroundStyle(.white)
                Text(profile.examTag.isEmpty ? tier : "\(profile.examTag) · \(tier)").foregroundStyle(.white.opacity(0.9)).bold()

                VStack(spacing: 0) {
                    Text("\(stats.week)").font(.system(size: 88, weight: .black)).foregroundStyle(.white)
                    Text("pomos this week").foregroundStyle(.white.opacity(0.9)).bold()
                }
                .padding(.vertical, 16)

                HStack(spacing: 10) {
                    mini("\(stats.total)", "all-time")
                    mini("\(stats.streak)🔥", "day streak")
                    mini("\(stats.bestDay)", "best day")
                }
                Text("Study, scored as a sport.").font(.footnote).foregroundStyle(.white.opacity(0.85)).bold().padding(.top, 16)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(RoundedRectangle(cornerRadius: 24).fill(Color.pomoTomato))

            ShareLink(item: shareText) {
                Text("Share my week").font(.headline).foregroundStyle(Color.pomoTomato)
                    .padding(.horizontal, 40).padding(.vertical, 16)
                    .background(RoundedRectangle(cornerRadius: 14).fill(.white))
            }
            Button("Close") { dismiss() }.foregroundStyle(.white.opacity(0.7))
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.pomoInk.ignoresSafeArea())
    }

    private func mini(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title2.bold()).foregroundStyle(.white)
            Text(label).font(.caption2).foregroundStyle(.white.opacity(0.85))
        }
        .frame(minWidth: 92).padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 14).fill(.white.opacity(0.15)))
    }
}
