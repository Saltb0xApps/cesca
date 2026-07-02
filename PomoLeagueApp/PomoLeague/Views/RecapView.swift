import SwiftUI

struct RecapView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let stats = ledger.stats
        let tier = Tiers.name(for: stats.total)
        let shareText = "my week on PomoLeague 🍅\n"
            + (profile.examTag.isEmpty ? "\(tier)\n" : "\(profile.examTag) · \(tier)\n")
            + "\(stats.week) pomos · \(stats.total) all-time · \(stats.streak)-day streak 🔥\nstudy, scored as a sport."

        return ZStack {
            Color.pomoInk.ignoresSafeArea()

            VStack(spacing: 16) {
                // Card
                VStack(spacing: 0) {
                    // Top: brandmark
                    HStack {
                        Text("circle of pomodoros")
                            .font(.marker(14))
                            .foregroundStyle(Color.pomoRed.opacity(0.7))
                        Spacer()
                        Text("🍅")
                            .font(.system(size: 20))
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 22)
                    .padding(.bottom, 24)

                    // Avatar + name
                    VStack(spacing: 6) {
                        Text(profile.avatar.isEmpty ? "🍅" : profile.avatar)
                            .font(.system(size: 52))

                        Text(profile.displayName.isEmpty ? "you" : profile.displayName)
                            .font(.marker(28))
                            .foregroundStyle(Color.pomoRed)

                        if !profile.examTag.isEmpty || !tier.isEmpty {
                            Text((profile.examTag.isEmpty ? "" : "\(profile.examTag) · ") + tier)
                                .font(.caveatBold(16))
                                .foregroundStyle(Color.pomoRedFaded)
                        }
                    }
                    .padding(.bottom, 28)

                    // Big number
                    VStack(spacing: 2) {
                        Text("\(stats.week)")
                            .font(.marker(88))
                            .foregroundStyle(Color.pomoRed)
                        Text("pomos this week")
                            .font(.caveatBold(20))
                            .foregroundStyle(Color.pomoRedFaded)
                    }
                    .padding(.bottom, 28)

                    // Mini stats row
                    HStack(spacing: 0) {
                        miniStat("\(stats.total)", "all-time")
                        Divider()
                            .background(Color.pomoRed.opacity(0.2))
                            .frame(height: 40)
                        miniStat("\(stats.streak)🔥", "day streak")
                        Divider()
                            .background(Color.pomoRed.opacity(0.2))
                            .frame(height: 40)
                        miniStat("\(stats.bestDay)", "best day")
                    }
                    .padding(.horizontal, 10)
                    .padding(.bottom, 22)

                    // Tagline
                    Text("study, scored as a sport.")
                        .font(.caveat(15))
                        .foregroundStyle(Color.pomoRedFaded)
                        .padding(.bottom, 20)
                }
                .background(Color.white)
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.pomoRed, lineWidth: 1.5))
                .cornerRadius(4)
                .padding(.horizontal, 20)

                // Share button
                ShareLink(item: shareText) {
                    HStack(spacing: 8) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 14))
                        Text("share my week")
                            .font(.caveatBold(22))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.white, lineWidth: 1.5))
                }
                .padding(.horizontal, 20)

                Button("close") { dismiss() }
                    .font(.caveat(16))
                    .foregroundStyle(Color.white.opacity(0.45))
                    .padding(.bottom, 16)
            }
        }
    }

    private func miniStat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.marker(28))
                .foregroundStyle(Color.pomoRed)
            Text(label)
                .font(.caveat(13))
                .foregroundStyle(Color.pomoRedFaded)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
    }
}
