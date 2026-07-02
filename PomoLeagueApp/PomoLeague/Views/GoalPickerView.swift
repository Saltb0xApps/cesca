import SwiftUI

struct GoalPickerView: View {
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth
    @State private var goal = 8

    private let presets = [4, 6, 8, 10, 12]

    var body: some View {
        ZStack {
            Color(red: 0.980, green: 0.969, blue: 0.957).ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text("set your\ndaily goal.")
                        .font(.marker(38))
                        .foregroundStyle(Color.pomoRed)
                        .lineSpacing(4)

                    Text("how many rounds will you complete today?")
                        .font(.caveat(17))
                        .foregroundStyle(Color.pomoRedFaded)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 24)
                .padding(.top, 72)
                .padding(.bottom, 36)

                // Big number display
                HStack(alignment: .bottom, spacing: 6) {
                    Text("\(goal)")
                        .font(.marker(88))
                        .foregroundStyle(Color.pomoRed)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("pomos")
                            .font(.caveatBold(22))
                            .foregroundStyle(Color.pomoRedFaded)
                        Text("\(goal * 25 / 60)h \(goal * 25 % 60)m of focus")
                            .font(.caveat(15))
                            .foregroundStyle(Color.pomoRedFaded)
                    }
                    .padding(.bottom, 14)
                }
                .padding(.bottom, 32)

                // Preset buttons
                HStack(spacing: 10) {
                    ForEach(presets, id: \.self) { n in
                        Button { withAnimation(.easeInOut(duration: 0.15)) { goal = n } } label: {
                            Text("\(n)")
                                .font(.caveatBold(22))
                                .foregroundStyle(goal == n ? .white : Color.pomoRed)
                                .frame(width: 54, height: 54)
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(goal == n ? Color.pomoRed : Color.white)
                                        .overlay(RoundedRectangle(cornerRadius: 4)
                                            .stroke(Color.pomoRed, lineWidth: 1.5))
                                )
                        }
                    }
                }
                .padding(.bottom, 16)

                // Custom stepper
                HStack(spacing: 20) {
                    Button {
                        if goal > 1 { withAnimation { goal -= 1 } }
                    } label: {
                        Text("−")
                            .font(.marker(22))
                            .foregroundStyle(Color.pomoRed)
                            .frame(width: 36, height: 36)
                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.pomoRed, lineWidth: 1.5))
                    }

                    Text("custom")
                        .font(.caveat(15))
                        .foregroundStyle(Color.pomoRedFaded)

                    Button {
                        if goal < 16 { withAnimation { goal += 1 } }
                    } label: {
                        Text("+")
                            .font(.marker(22))
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(RoundedRectangle(cornerRadius: 4).fill(Color.pomoRed))
                    }
                }
                .padding(.bottom, 48)

                Spacer()

                // Begin button
                Button(action: begin) {
                    Text("let's begin →")
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
        .onAppear { goal = profile.dailyGoal }
    }

    private func begin() {
        profile.dailyGoal = goal
        profile.hasPickedGoal = true
        profile.seenRules = true
        profile.save()
        SharedStore.sync(today: 0, goal: goal)
        Banking.setDailyGoal(auth: auth, goal: goal)
    }
}
