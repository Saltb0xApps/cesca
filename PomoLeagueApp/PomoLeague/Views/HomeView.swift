import SwiftUI

struct HomeView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var tasks: TaskStore

    @State private var showRules = false
    @State private var showRound = false

    var body: some View {
        let stats = ledger.stats
        let goal = profile.dailyGoal
        let pct = goal > 0 ? min(1, Double(stats.today) / Double(goal)) : 0
        let hit = stats.today >= goal

        return VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Today").font(.subheadline.bold()).foregroundStyle(Color.pomoSubtle)
                    Text("🔥 \(stats.streak) day streak").font(.title2.bold()).foregroundStyle(Color.pomoInk)
                }
                Spacer()
                Text("❄️ \(stats.freezes)").font(.headline).foregroundStyle(Color.pomoInk).pomoCard(padding: 10, radius: 12)
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(hit ? "Goal smashed 🎉" : "Today's goal").font(.headline).foregroundStyle(Color.pomoInk)
                    Spacer()
                    Text("\(stats.today) / \(goal)").font(.headline).foregroundStyle(Color.pomoTomato)
                }
                ProgressBar(pct: pct)
                Text(hit ? "Keep going — every pomo counts." : "\(goal - stats.today) more to hit your goal. Change it in Profile.")
                    .font(.caption).foregroundStyle(Color.pomoSubtle)
            }
            .pomoCard()

            HStack(spacing: 12) {
                StatBox(value: stats.week, label: "this week")
                StatBox(value: stats.total, label: "all-time")
            }

            Spacer()

            VStack(alignment: .leading, spacing: 8) {
                Text("Working on").font(.caption.bold()).foregroundStyle(Color.pomoSubtle)
                TextField("e.g. Anatomy, Essay, Problem set…", text: $tasks.currentTask).textFieldStyle(.roundedBorder)
                let recents = PomoMath.recentTasks(ledger.pomos)
                if !recents.isEmpty {
                    FlowChips(items: recents) { tasks.currentTask = $0 }
                }
            }

            Button(action: start) {
                VStack(spacing: 4) {
                    VegIcon(type: .tomato, size: 56, color: .white)
                    Text("START A ROUND").font(.title3.bold()).foregroundStyle(.white)
                    Text("25 min · stay in the app").font(.caption).foregroundStyle(.white.opacity(0.85))
                }
                .frame(width: 220, height: 220)
                .background(Circle().fill(Color.pomoTomato))
            }
            .frame(maxWidth: .infinity)

            Spacer()
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.pomoBg.ignoresSafeArea())
        .sheet(isPresented: $showRules) {
            RulesView { showRules = false; showRound = true }
        }
        .fullScreenCover(isPresented: $showRound) { RoundView() }
    }

    private func start() {
        if profile.seenRules { showRound = true } else { showRules = true }
    }
}

struct ProgressBar: View {
    let pct: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.pomoLine)
                Capsule().fill(Color.pomoTomato).frame(width: geo.size.width * pct)
            }
        }
        .frame(height: 12)
    }
}

struct StatBox: View {
    let value: Int
    let label: String
    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)").font(.system(size: 28, weight: .heavy)).foregroundStyle(Color.pomoInk)
            Text(label).font(.caption).foregroundStyle(Color.pomoSubtle)
        }
        .frame(maxWidth: .infinity)
        .pomoCard()
    }
}
