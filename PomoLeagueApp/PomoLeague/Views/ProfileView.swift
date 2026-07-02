import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth

    @State private var showRecap = false
    @State private var showSettings = false
    @State private var confirmReset = false

    var body: some View {
        let stats = ledger.stats
        let tier  = Tiers.name(for: stats.total)

        ScrollView {
            VStack(spacing: 0) {
                // Settings button row
                HStack {
                    Spacer()
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: 20))
                            .foregroundStyle(Color.pomoRedFaded)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 52)

                // Avatar + name header
                VStack(spacing: 8) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.pomoRed, lineWidth: 2)
                            .frame(width: 72, height: 72)
                        Text(profile.avatar.isEmpty ? "🍅" : profile.avatar)
                            .font(.system(size: 40))
                    }
                    .padding(.top, 12)

                    Text(profile.displayName.isEmpty ? "you" : profile.displayName)
                        .font(.marker(26))
                        .foregroundStyle(Color.pomoRed)

                    HStack(spacing: 8) {
                        if !profile.examTag.isEmpty {
                            Text(profile.examTag)
                                .font(.caveat(14))
                                .foregroundStyle(Color.pomoRedFaded)
                        }
                        Text(tier)
                            .font(.caveatBold(13))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(Tiers.color(for: stats.total)))
                        HStack(spacing: 3) {
                            Text("🔥").font(.system(size: 11))
                            Text("\(stats.streak)d")
                                .font(.caveatBold(13))
                                .foregroundStyle(Color.pomoRedFaded)
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.bottom, 20)

                VStack(spacing: 14) {
                    // 2×2 stats
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 14),
                                        GridItem(.flexible(), spacing: 14)],
                              spacing: 14) {
                        PomoStatCard(label: "best day",   value: stats.bestDay)
                        PomoStatCard(label: "this week",  value: stats.week)
                        PomoStatCard(label: "streak",     value: stats.streak)
                        PomoStatCard(label: "all-time",   value: stats.total)
                    }

                    // Daily goal stepper
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            SketchLabel("daily goal")
                            Text("pomos per day")
                                .font(.caveat(13))
                                .foregroundStyle(Color.pomoRedFaded)
                        }
                        Spacer()
                        HStack(spacing: 16) {
                            goalBtn("−") { profile.setGoal(-1) }
                            Text("\(profile.dailyGoal)")
                                .font(.marker(22))
                                .foregroundStyle(Color.pomoRed)
                                .frame(minWidth: 28)
                            goalBtn("+") { profile.setGoal(1) }
                        }
                    }
                    .sketchCard()

                    // Share recap
                    Button { showRecap = true } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "camera")
                                .font(.system(size: 14))
                            Text("share weekly recap")
                                .font(.caveatBold(20))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(RoundedRectangle(cornerRadius: 3).fill(Color.pomoRed))
                    }

                    // Danger zone
                    Button("reset pomo history") { confirmReset = true }
                        .font(.caveat(16))
                        .foregroundStyle(Color.pomoRedFaded)

                    Button("sign out") { auth.signOut() }
                        .font(.caveatBold(16))
                        .foregroundStyle(Color.pomoRed)
                        .padding(.bottom, 8)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
            }
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .sheet(isPresented: $showRecap) { RecapView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .alert("Reset pomo history?", isPresented: $confirmReset) {
            Button("Reset", role: .destructive) { ledger.clear() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This clears all your pomos locally. It can't be undone.")
        }
    }

    private func goalBtn(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caveatBold(20))
                .foregroundStyle(Color.pomoRed)
                .frame(width: 32, height: 32)
                .background(RoundedRectangle(cornerRadius: 3)
                    .stroke(Color.pomoRed, lineWidth: 1.5))
        }
    }
}
