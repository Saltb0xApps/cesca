import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth

    @State private var showRecap = false
    @State private var confirmReset = false

    var body: some View {
        let stats = ledger.stats
        let tier = Tiers.name(for: stats.total)

        return ScrollView {
            VStack(spacing: 12) {
                HStack { Text("Profile").font(.largeTitle.bold()).foregroundStyle(Color.pomoInk); Spacer() }

                VStack(spacing: 6) {
                    Text(profile.avatar).font(.system(size: 48))
                    Text(profile.displayName.isEmpty ? "You" : profile.displayName).font(.title3.bold()).foregroundStyle(Color.pomoInk)
                    Text((profile.examTag.isEmpty ? "" : "\(profile.examTag) · ") + "\(tier) · \(stats.total) pomos · \(stats.streak)-day streak")
                        .font(.subheadline).foregroundStyle(Color.pomoSubtle).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity).pomoCard(padding: 24, radius: 16)

                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 2), spacing: 12) {
                    cell(stats.total, "all-time pomos")
                    cell(stats.week, "this week")
                    cell(stats.bestDay, "best day")
                    cell(stats.longestChain, "longest chain")
                }

                HStack {
                    Text("Daily goal").font(.headline).foregroundStyle(Color.pomoInk)
                    Spacer()
                    HStack(spacing: 16) {
                        stepper("−") { profile.setGoal(-1) }
                        Text("\(profile.dailyGoal)").font(.title3.bold()).foregroundStyle(Color.pomoTomato).frame(minWidth: 24)
                        stepper("+") { profile.setGoal(1) }
                    }
                }
                .pomoCard(padding: 16, radius: 14)

                Button { showRecap = true } label: {
                    Text("📸  Share weekly recap").font(.headline).foregroundStyle(.white)
                        .frame(maxWidth: .infinity).padding()
                        .background(RoundedRectangle(cornerRadius: 14).fill(Color.pomoTomato))
                }

                Button("Reset pomo history") { confirmReset = true }
                    .foregroundStyle(Color.pomoSubtle).bold().padding(.top, 4)
                Button("Sign out") { auth.signOut() }.foregroundStyle(Color.pomoTomatoDark).bold()
            }
            .padding(16)
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .sheet(isPresented: $showRecap) { RecapView() }
        .alert("Reset pomo history?", isPresented: $confirmReset) {
            Button("Cancel", role: .cancel) {}
            Button("Reset", role: .destructive) { ledger.clear() }
        } message: { Text("This clears your local stats on this device.") }
    }

    private func cell(_ value: Int, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)").font(.system(size: 26, weight: .heavy)).foregroundStyle(Color.pomoInk)
            Text(label).font(.caption).foregroundStyle(Color.pomoSubtle)
        }
        .frame(maxWidth: .infinity).pomoCard()
    }

    private func stepper(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(symbol).font(.title2.bold()).foregroundStyle(Color.pomoInk)
                .frame(width: 36, height: 36)
                .background(Circle().fill(Color.pomoBg).overlay(Circle().stroke(Color.pomoLine)))
        }
    }
}
