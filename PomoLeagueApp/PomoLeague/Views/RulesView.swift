import SwiftUI

struct RulesView: View {
    @EnvironmentObject var profile: ProfileStore
    let onStart: () -> Void

    private let rules: [(emoji: String, title: String, body: String)] = [
        ("⏱️", "25 minutes, all-or-nothing.",
         "One round = one pomo. No partial credit. Ever."),
        ("📵", "leave the app, lose the round.",
         "Switch apps for more than ~10 seconds and the round dies."),
        ("🏆", "pomos are your score.",
         "Completed rounds bank to your weekly league total. Chain them for longer sessions."),
    ]

    var body: some View {
        ZStack {
            Color(red: 0.980, green: 0.969, blue: 0.957).ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Icon + heading
                VStack(spacing: 10) {
                    Text("🍅")
                        .font(.system(size: 52))

                    Text("the rules.")
                        .font(.marker(38))
                        .foregroundStyle(Color.pomoRed)
                }
                .padding(.bottom, 32)

                // Rule cards
                VStack(spacing: 10) {
                    ForEach(rules.indices, id: \.self) { i in
                        ruleCard(rules[i])
                    }
                }
                .padding(.horizontal, 24)

                Text("notification peeks are fine — anything longer is not.")
                    .font(.caveat(15))
                    .foregroundStyle(Color.pomoRedFaded)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                    .padding(.top, 16)

                Spacer()

                // CTA
                Button {
                    profile.seenRules = true
                    profile.save()
                    onStart()
                } label: {
                    Text("i'm ready — start →")
                        .font(.caveatBold(24))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(RoundedRectangle(cornerRadius: 4).fill(Color.pomoRed))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private func ruleCard(_ rule: (emoji: String, title: String, body: String)) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text(rule.emoji)
                .font(.system(size: 26))
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 3) {
                Text(rule.title)
                    .font(.caveatBold(18))
                    .foregroundStyle(Color.pomoRed)
                Text(rule.body)
                    .font(.caveat(15))
                    .foregroundStyle(Color.pomoRedFaded)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()
        }
        .sketchCard(padding: 14)
    }
}
