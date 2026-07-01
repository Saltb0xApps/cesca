import SwiftUI
import UIKit

/// First-run introduction: "you've been given this power" → "Give me the power"
/// → choose today's deep-focus goal → into the app.
struct PowerIntroView: View {
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth

    enum Step { case power, goal }
    @State private var step: Step = .power
    @State private var goal = 8

    private let presets = [4, 6, 8, 10, 12]

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color.pomoTomato, Color.pomoTomatoDark],
                           startPoint: .top, endPoint: .bottom).ignoresSafeArea()
            switch step {
            case .power: powerStep
            case .goal: goalStep
            }
        }
        .onAppear { goal = profile.dailyGoal }
    }

    // MARK: Step 1 — the power

    private var powerStep: some View {
        VStack(spacing: 24) {
            Spacer()
            hero
            VStack(spacing: 12) {
                Text("You've been given\nthe power to focus.")
                    .font(.system(size: 32, weight: .heavy))
                    .multilineTextAlignment(.center).foregroundStyle(.white)
                Text("Every distraction fights for your attention. A pomo is 25 minutes where you win — verified, uninterrupted, all-or-nothing.")
                    .font(.body).foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center).padding(.horizontal, 8)
            }
            Spacer()
            Button { withAnimation { step = .goal } } label: {
                Text("Give me the power").font(.headline).foregroundStyle(Color.pomoTomato)
                    .frame(maxWidth: .infinity).padding()
                    .background(RoundedRectangle(cornerRadius: 16).fill(.white))
            }
        }
        .padding(28)
    }

    private var hero: some View {
        Group {
            if UIImage(named: "PowerHero") != nil {
                Image("PowerHero").resizable().scaledToFit()
            } else {
                // Placeholder until you drop your image into the PowerHero asset.
                VegIcon(type: .tomato, size: 160, color: .white, lineWidth: 4)
            }
        }
        .frame(maxHeight: 220)
    }

    // MARK: Step 2 — the goal

    private var goalStep: some View {
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

    private func begin() {
        profile.dailyGoal = goal
        profile.seenIntro = true
        profile.seenRules = true // the intro already set the focus contract
        profile.save()
        auth.enterDemo()
        SharedStore.sync(today: 0, goal: goal)
    }
}
