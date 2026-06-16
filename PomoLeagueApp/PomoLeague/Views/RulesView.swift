import SwiftUI

struct RulesView: View {
    @EnvironmentObject var profile: ProfileStore
    let onStart: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            VegIcon(type: .tomato, size: 80)
            Text("One pomo = one focused round").font(.title2.bold())
                .foregroundStyle(Color.pomoInk).multilineTextAlignment(.center)

            rule("⏱️", "25 minutes of focus, then a 5-minute break.")
            rule("📵", "Leave the app and the round dies. No partial credit — ever.")
            rule("🏆", "Completed pomos are your score. Bank as many as you can.")

            Text("Notification peeks are fine. Switching apps for more than ~10 seconds is not.")
                .font(.footnote).foregroundStyle(Color.pomoSubtle).multilineTextAlignment(.center)
            Spacer()

            Button {
                profile.seenRules = true
                profile.save()
                onStart()
            } label: {
                Text("I'm ready — start my first round").font(.headline).foregroundStyle(.white)
                    .frame(maxWidth: .infinity).padding()
                    .background(RoundedRectangle(cornerRadius: 14).fill(Color.pomoTomato))
            }
        }
        .padding(24)
        .background(Color.pomoBg.ignoresSafeArea())
    }

    private func rule(_ emoji: String, _ text: String) -> some View {
        HStack(spacing: 14) {
            Text(emoji).font(.title)
            Text(text).font(.subheadline).foregroundStyle(Color.pomoInk)
            Spacer()
        }
        .pomoCard()
    }
}
