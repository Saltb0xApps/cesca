import SwiftUI

/// Pick today's deep-focus goal. Shown once after the account + profile are set
/// up (gated on profile.hasPickedGoal). Also pushes the goal to the server so
/// the partner feature can evaluate it.
struct GoalPickerView: View {
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth
    @State private var goal = 8

    private let presets = [4, 6, 8, 10, 12]

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color.pomoTomato, Color.pomoTomatoDark],
                           startPoint: .top, endPoint: .bottom).ignoresSafeArea()
            VStack(spacing: 24) {
                Spacer()
                Text("Your goal for today").font(.system(size: 30, weight: .heavy)).foregroundStyle(.white)
                Text("How many deep-focus pomodoros will you complete today?")
                    .font(.body).foregroundStyle(.white.opacity(0.9)).multilineTextAlignment(.center)

                Text("\(goal)").font(.system(size: 88, weight: .black)).foregroundStyle(.white)
                Text("pomodoros · \(goal * pomoMinutes / 60)h \(goal * pomoMinutes % 60)m of focus")
                    .font(.subheadline).foregroundStyle(.white.opacity(0.85))

                HStack(spacing: 10) {
                    ForEach(presets, id: \.self) { n in
                        Button { goal = n } label: {
                            Text("\(n)").font(.headline).foregroundStyle(goal == n ? Color.pomoTomato : .white)
                                .frame(width: 52, height: 52)
                                .background(Circle().fill(goal == n ? Color.white : Color.white.opacity(0.18)))
                        }
                    }
                }
                Spacer()
                Button(action: begin) {
                    Text("Begin").font(.headline).foregroundStyle(Color.pomoTomato)
                        .frame(maxWidth: .infinity).padding()
                        .background(RoundedRectangle(cornerRadius: 16).fill(.white))
                }
            }
            .padding(28)
        }
        .onAppear { goal = profile.dailyGoal }
    }

    private func begin() {
        profile.dailyGoal = goal
        profile.hasPickedGoal = true
        profile.seenRules = true // the intro already set the focus contract
        profile.save()
        SharedStore.sync(today: 0, goal: goal)
        Banking.setDailyGoal(auth: auth, goal: goal)
    }
}
